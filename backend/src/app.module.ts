import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalaryModule } from './salary/salary.module';
import { AuthModule } from './auth/auth.module';
import { AtsModule } from './ats/ats.module';
import { PaymentModule } from './payment/payment.module';
import { StatisticsModule } from './statistics/statistics.module';
import { SalaryCalculation } from './salary/entities/salary-calculation.entity';
import { CityTaxData } from './salary/entities/city-tax-data.entity';
import { User } from './user/entities/user.entity';
import { AtsUsage } from './ats/entities/ats-usage.entity';
import { AtsCheck } from './ats/entities/ats-check.entity';
import { Payment } from './payment/entities/payment.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      // Support DATABASE_URL (for Neon, Railway, etc.) or individual parameters
      url: process.env.DATABASE_URL,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'salary_calculator',
      entities: [SalaryCalculation, CityTaxData, User, AtsUsage, AtsCheck, Payment],
      // Enable synchronize - set to true to auto-create tables (use migrations in production for safety)
      synchronize: true, // Temporarily enabled to create missing tables
      logging: process.env.NODE_ENV === 'development',
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
    }),
    SalaryModule,
    AuthModule,
    AtsModule,
    PaymentModule,
    StatisticsModule,
  ],
})
export class AppModule { }

