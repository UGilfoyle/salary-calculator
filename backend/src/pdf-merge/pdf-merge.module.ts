import { Module } from '@nestjs/common';
import { PdfMergeController } from './pdf-merge.controller';
import { PdfMergeService } from './pdf-merge.service';
import { PdfSignService } from './pdf-sign.service';
import { PdfCompressService } from './pdf-compress.service';

@Module({
    controllers: [PdfMergeController],
    providers: [PdfMergeService, PdfSignService, PdfCompressService],
    exports: [PdfMergeService, PdfSignService, PdfCompressService],
})
export class PdfMergeModule { }
