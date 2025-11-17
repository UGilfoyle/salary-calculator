import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { User } from '../user/entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private readonly UPI_ID: string;
  private readonly MERCHANT_NAME: string;
  private readonly PAYMENT_SECRET: string;
  private readonly PREMIUM_DURATION_DAYS = 30; // Premium valid for 30 days per payment

  constructor(
    private configService: ConfigService,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.UPI_ID = this.configService.get<string>('UPI_ID') || '';
    this.MERCHANT_NAME = this.configService.get<string>('MERCHANT_NAME') || 'SalaryCalc';
    this.PAYMENT_SECRET = this.configService.get<string>('PAYMENT_SECRET') || crypto.randomBytes(32).toString('hex');
  }

  async createUPIOrder(userId: string, amount: number, checkId?: string): Promise<{ orderId: string; upiId: string; merchantName: string; amount: number; expiresAt: Date }> {
    if (!this.UPI_ID) {
      throw new BadRequestException('UPI payment is not configured. Please contact support.');
    }

    // Generate unique order ID
    const orderId = `UPI_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    
    // Set expiration time (10 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Create payment record
    const payment = this.paymentRepository.create({
      userId,
      orderId,
      amount,
      status: PaymentStatus.PENDING,
      paymentMethod: 'UPI',
      checkId,
      expiresAt,
      notes: 'ATS Resume Enhancement - Premium Features',
    });

    await this.paymentRepository.save(payment);

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
      return payment; // Already verified
    }

    if (payment.expiresAt && payment.expiresAt < new Date()) {
      payment.status = PaymentStatus.EXPIRED;
      await this.paymentRepository.save(payment);
      throw new BadRequestException('Payment has expired. Please create a new order.');
    }

    // In production, you would verify with UPI gateway or bank API
    // For now, we'll mark as processing and require manual verification
    // You can integrate with UPI verification APIs here
    
    payment.status = PaymentStatus.PROCESSING;
    if (upiTransactionId) {
      payment.upiTransactionId = upiTransactionId;
    }
    if (upiReferenceId) {
      payment.upiReferenceId = upiReferenceId;
    }

    await this.paymentRepository.save(payment);

    // TODO: Add actual UPI verification logic here
    // For now, we'll auto-complete after processing (you can change this)
    // In production, verify with your payment gateway or bank
    
    return payment;
  }

  async confirmPayment(orderId: string, userId: string): Promise<Payment> {
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
      throw new BadRequestException('Payment has expired');
    }

    // Mark as completed
    payment.status = PaymentStatus.COMPLETED;
    await this.paymentRepository.save(payment);

    // Activate premium status for user
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      const now = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.PREMIUM_DURATION_DAYS);

      // If user already has premium and it hasn't expired, extend it
      if (user.isPremium && user.premiumExpiresAt && user.premiumExpiresAt > now) {
        // Extend from current expiration date
        const currentExpiry = new Date(user.premiumExpiresAt);
        currentExpiry.setDate(currentExpiry.getDate() + this.PREMIUM_DURATION_DAYS);
        user.premiumExpiresAt = currentExpiry;
      } else {
        // Set new premium expiration
        user.isPremium = true;
        user.premiumExpiresAt = expiresAt;
      }

      await this.userRepository.save(user);
    }

    return payment;
  }

  async getPaymentStatus(orderId: string, userId: string): Promise<Payment> {
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
}

