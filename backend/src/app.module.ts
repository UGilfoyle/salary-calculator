import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalaryModule } from './salary/salary.module';
import { AuthModule } from './auth/auth.module';
import { AtsModule } from './ats/ats.module';
import { SalaryCalculation } from './salary/entities/salary-calculation.entity';
import { User } from './user/entities/user.entity';
import { AtsUsage } from './ats/entities/ats-usage.entity';

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
      entities: [SalaryCalculation, User, AtsUsage],
      synchronize: process.env.NODE_ENV !== 'production', // Auto-sync in dev only
      logging: process.env.NODE_ENV === 'development',
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
    }),
    SalaryModule,
    AuthModule,
    AtsModule,
  ],
})
export class AppModule { }

