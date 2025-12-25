import { Controller, Post, Body, UseGuards, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import * as fs from 'fs';
import * as path from 'path';

// Price configuration: ₹119 with 75% off = ₹30
const ORIGINAL_PRICE = 119;
const DISCOUNT_PERCENT = 75;
const DISCOUNTED_PRICE = Math.round(ORIGINAL_PRICE * (1 - DISCOUNT_PERCENT / 100)); // ₹30

@Controller('api/payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  @Post('create-upi-order')
  @UseGuards(JwtAuthGuard)
  async createUPIOrder(
    @CurrentUser() user: User,
    @Body() body: { checkId?: string },
  ) {
    const amount = DISCOUNTED_PRICE; // ₹24 INR - 75% off!

    const order = await this.paymentService.createUPIOrder(
      user.id,
      amount,
      body.checkId,
    );

    return {
      orderId: order.orderId,
      amount: order.amount,
      originalPrice: ORIGINAL_PRICE,
      discountPercent: DISCOUNT_PERCENT,
      upiId: order.upiId,
      merchantName: order.merchantName,
      expiresAt: order.expiresAt,
    };
  }

  @Post('verify-upi')
  @UseGuards(JwtAuthGuard)
  async verifyUPIPayment(
    @CurrentUser() user: User,
    @Body() body: {
      orderId: string;
      upiTransactionId?: string;
      upiReferenceId?: string;
    },
  ) {
    const payment = await this.paymentService.verifyPayment(
      body.orderId,
      user.id,
      body.upiTransactionId,
      body.upiReferenceId,
    );

    return {
      success: true,
      payment: {
        orderId: payment.orderId,
        status: payment.status,
        amount: payment.amount,
      },
    };
  }

  @Post('confirm-payment')
  @UseGuards(JwtAuthGuard)
  async confirmPayment(
    @CurrentUser() user: User,
    @Body() body: { orderId: string; transactionId?: string },
  ) {
    const payment = await this.paymentService.confirmPayment(
      body.orderId,
      user.id,
      body.transactionId,
    );

    return {
      success: true,
      payment: {
        orderId: payment.orderId,
        status: payment.status,
        amount: payment.amount,
        checkId: payment.checkId,
      },
    };
  }

  @Get('status/:orderId')
  @UseGuards(JwtAuthGuard)
  async getPaymentStatus(
    @CurrentUser() user: User,
    @Param('orderId') orderId: string,
  ) {
    const payment = await this.paymentService.getPaymentStatus(orderId, user.id);

    return {
      orderId: payment.orderId,
      status: payment.status,
      amount: payment.amount,
      createdAt: payment.createdAt,
      expiresAt: payment.expiresAt,
    };
  }

  @Get('upi-details')
  @UseGuards(JwtAuthGuard)
  async getUPIDetails() {
    const details = this.paymentService.getUPIDetails();
    return {
      ...details,
      originalPrice: ORIGINAL_PRICE,
      discountedPrice: DISCOUNTED_PRICE,
      discountPercent: DISCOUNT_PERCENT,
    };
  }

  @Get('qr-code')
  @UseGuards(JwtAuthGuard)
  async getQRCode(@Res() res: Response) {
    // Try multiple paths for QR code
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'payment', 'upi-qr-code.png'),
      path.join(__dirname, 'upi-qr-code.png'),
      path.join(__dirname, '..', 'payment', 'upi-qr-code.png'),
    ];

    let qrCodePath = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        qrCodePath = p;
        break;
      }
    }

    if (qrCodePath) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      const fileStream = fs.createReadStream(qrCodePath);
      fileStream.pipe(res);
    } else {
      console.log('QR code not found. Tried paths:', possiblePaths);
      res.status(404).json({ error: 'QR code not found' });
    }
  }

  @Get('pricing')
  async getPricing() {
    return {
      originalPrice: ORIGINAL_PRICE,
      discountedPrice: DISCOUNTED_PRICE,
      discountPercent: DISCOUNT_PERCENT,
      currency: 'INR',
      features: [
        'Grammar & Spelling Check',
        'Typography Analysis',
        'ATS Score Optimization',
        'Keyword Enhancement',
        'Professional Templates',
        '30-Day Premium Access',
      ],
    };
  }
}
