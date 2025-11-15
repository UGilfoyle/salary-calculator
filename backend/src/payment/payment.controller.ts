import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@Controller('api/payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-upi-order')
  @UseGuards(JwtAuthGuard)
  async createUPIOrder(
    @CurrentUser() user: User,
    @Body() body: { checkId?: string },
  ) {
    const amount = 99; // ₹99 INR
    
    const order = await this.paymentService.createUPIOrder(
      user.id,
      amount,
      body.checkId,
    );
    
    return {
      orderId: order.orderId,
      amount: order.amount,
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
    @Body() body: { orderId: string },
  ) {
    const payment = await this.paymentService.confirmPayment(
      body.orderId,
      user.id,
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
    return this.paymentService.getUPIDetails();
  }
}

