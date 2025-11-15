import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AtsController } from './ats.controller';
import { AtsService } from './ats.service';
import { AtsUsage } from './entities/ats-usage.entity';
import { AtsCheck } from './entities/ats-check.entity';

@Module({
    imports: [TypeOrmModule.forFeature([AtsUsage, AtsCheck])],
    controllers: [AtsController],
    providers: [AtsService],
})
export class AtsModule { }

