import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalaryController } from './salary.controller';
import { SalaryService } from './salary.service';
import { SalaryCalculation } from './entities/salary-calculation.entity';
import { CityTaxData } from './entities/city-tax-data.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SalaryCalculation, CityTaxData])],
  controllers: [SalaryController],
  providers: [SalaryService],
  exports: [SalaryService],
})
export class SalaryModule {}

