import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { User } from '../user/entities/user.entity';
import * as crypto from 'crypto';

// Simple in-memory cache as fallback if Redis is not available
const paymentCache = new Map<string, { status: PaymentStatus; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Optional Redis client
let redisClient: any = null;
let redisAvailable = false;

const initRedis = async (configService: ConfigService) => {
  try {
    const Redis = require('ioredis');
    const redisUrl = configService.get<string>('REDIS_URL');

    if (redisUrl) {
      redisClient = new Redis(redisUrl);
      await redisClient.ping();
      redisAvailable = true;
      console.log('✅ Redis connected successfully');
    } else {
      console.log('⚠️ REDIS_URL not set, using in-memory cache');
    }
  } catch (error) {
    console.log('⚠️ Redis not available, using in-memory cache:', error instanceof Error ? error.message : 'Unknown error');
    redisAvailable = false;
  }
};

@Injectable()
export class PaymentService {
  private readonly UPI_ID: string;
  private readonly MERCHANT_NAME: string;
  private readonly PAYMENT_SECRET: string;
  private readonly PREMIUM_DURATION_DAYS = 30;
  private redisInitialized = false;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.UPI_ID = this.configService.get<string>('UPI_ID') || '8979594537@ybl';
    this.MERCHANT_NAME = this.configService.get<string>('MERCHANT_NAME') || 'SalaryCalc Premium';
    this.PAYMENT_SECRET = this.configService.get<string>('PAYMENT_SECRET') || crypto.randomBytes(32).toString('hex');

    // Initialize Redis asynchronously
    this.initializeRedis();
  }

  private async initializeRedis() {
    if (!this.redisInitialized) {
      this.redisInitialized = true;
      await initRedis(this.configService);
    }
  }

  // Cache helpers
  private async setCache(key: string, value: any, ttlSeconds: number = 600): Promise<void> {
    if (redisAvailable && redisClient) {
      await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
    } else {
      paymentCache.set(key, { ...value, timestamp: Date.now() });
      // Clean old entries
      for (const [k, v] of paymentCache.entries()) {
        if (Date.now() - v.timestamp > CACHE_TTL) {
          paymentCache.delete(k);
        }
      }
    }
  }

  private async getCache(key: string): Promise<any | null> {
    if (redisAvailable && redisClient) {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } else {
      const cached = paymentCache.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached;
      }
      return null;
    }
  }

  async createUPIOrder(userId: string, amount: number, checkId?: string): Promise<{ orderId: string; upiId: string; merchantName: string; amount: number; expiresAt: Date }> {
    if (!this.UPI_ID) {
      throw new BadRequestException('UPI payment is not configured. Please contact support.');
    }

    const orderId = `UPI_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const payment = this.paymentRepository.create({
      userId,
      orderId,
      amount,
      status: PaymentStatus.PENDING,
      paymentMethod: 'UPI',
      checkId,
      expiresAt,
      notes: 'ATS Resume Enhancement - Premium Features (75% Off)',
    });

    await this.paymentRepository.save(payment);

    // Cache the pending payment
    await this.setCache(`payment:${orderId}`, {
      status: PaymentStatus.PENDING,
      userId,
      amount,
      createdAt: new Date().toISOString(),
    });

    return {
      orderId,
      upiId: this.UPI_ID,
      merchantName: this.MERCHANT_NAME,
      amount,
      expiresAt,
    };
  }

  async verifyPayment(orderId: string, userId: string, upiTransactionId?: string, upiReferenceId?: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { orderId, userId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return payment;
    }

    if (payment.expiresAt && payment.expiresAt < new Date()) {
      payment.status = PaymentStatus.EXPIRED;
      await this.paymentRepository.save(payment);
      await this.setCache(`payment:${orderId}`, { status: PaymentStatus.EXPIRED });
      throw new BadRequestException('Payment has expired. Please create a new order.');
    }

    payment.status = PaymentStatus.PROCESSING;
    if (upiTransactionId) {
      payment.upiTransactionId = upiTransactionId;
    }
    if (upiReferenceId) {
      payment.upiReferenceId = upiReferenceId;
    }

    await this.paymentRepository.save(payment);
    await this.setCache(`payment:${orderId}`, {
      status: PaymentStatus.PROCESSING,
      upiTransactionId,
    });

    return payment;
  }

  async confirmPayment(orderId: string, userId: string, transactionId?: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { orderId, userId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return payment;
    }

    if (payment.expiresAt && payment.expiresAt < new Date()) {
      payment.status = PaymentStatus.EXPIRED;
      await this.paymentRepository.save(payment);
      await this.setCache(`payment:${orderId}`, { status: PaymentStatus.EXPIRED });
      throw new BadRequestException('Payment has expired');
    }

    // Store transaction ID if provided
    if (transactionId) {
      payment.upiTransactionId = transactionId;

      // Basic validation: UPI transaction IDs are usually 12-35 characters
      if (transactionId.length < 8) {
        throw new BadRequestException('Invalid transaction ID format');
      }
    }

    // Mark as completed
    payment.status = PaymentStatus.COMPLETED;
    await this.paymentRepository.save(payment);

    // Update cache
    await this.setCache(`payment:${orderId}`, {
      status: PaymentStatus.COMPLETED,
      completedAt: new Date().toISOString(),
    });

    // Activate premium status for user
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      const now = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.PREMIUM_DURATION_DAYS);

      if (user.isPremium && user.premiumExpiresAt && user.premiumExpiresAt > now) {
        const currentExpiry = new Date(user.premiumExpiresAt);
        currentExpiry.setDate(currentExpiry.getDate() + this.PREMIUM_DURATION_DAYS);
        user.premiumExpiresAt = currentExpiry;
      } else {
        user.isPremium = true;
        user.premiumExpiresAt = expiresAt;
      }

      await this.userRepository.save(user);
    }

    return payment;
  }

  async getPaymentStatus(orderId: string, userId: string): Promise<Payment> {
    // Check cache first
    const cached = await this.getCache(`payment:${orderId}`);
    if (cached && cached.status === PaymentStatus.COMPLETED) {
      // Return from DB for complete data but cache indicates it's done
    }

    const payment = await this.paymentRepository.findOne({
      where: { orderId, userId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  getUPIDetails() {
    return {
      upiId: this.UPI_ID,
      merchantName: this.MERCHANT_NAME,
    };
  }

  // Check if user has valid premium subscription
  async isPremiumUser(userId: string): Promise<boolean> {
    const cacheKey = `premium:${userId}`;
    const cached = await this.getCache(cacheKey);

    if (cached !== null) {
      return cached.isPremium;
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return false;

    const isPremium = user.isPremium && user.premiumExpiresAt && user.premiumExpiresAt > new Date();

    // Cache the result for 5 minutes
    await this.setCache(cacheKey, { isPremium }, 300);

    return isPremium;
  }
}
