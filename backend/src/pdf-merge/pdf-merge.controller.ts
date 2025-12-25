import {
    Controller,
    Post,
    Body,
    UseInterceptors,
    UploadedFiles,
    UploadedFile,
    Res,
    UseGuards,
    BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { PdfMergeService } from './pdf-merge.service';
import { PdfSignService, SignatureOptions } from './pdf-sign.service';
import { PdfCompressService } from './pdf-compress.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/pdf-merge')
@UseGuards(JwtAuthGuard)
export class PdfMergeController {
    constructor(
        private readonly pdfMergeService: PdfMergeService,
        private readonly pdfSignService: PdfSignService,
        private readonly pdfCompressService: PdfCompressService,
    ) { }

    @Post('merge')
    @UseInterceptors(
        FilesInterceptor('files', 20, {
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB per file
            },
            fileFilter: (req, file, callback) => {
                if (file.mimetype !== 'application/pdf') {
                    return callback(
                        new BadRequestException('Only PDF files are allowed'),
                        false,
                    );
                }
                callback(null, true);
            },
        }),
    )
    async mergePdfs(
        @UploadedFiles() files: Express.Multer.File[],
        @Res() res: Response,
    ): Promise<void> {
        if (!files || files.length < 2) {
            throw new BadRequestException('At least 2 PDF files are required');
        }

        const mergedPdf = await this.pdfMergeService.mergePdfs(files);

        // Set headers for file download
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="merged-${Date.now()}.pdf"`,
            'Content-Length': mergedPdf.length,
        });

        res.send(mergedPdf);
    }

    @Post('info')
    @UseInterceptors(
        FilesInterceptor('files', 20, {
            limits: {
                fileSize: 10 * 1024 * 1024,
            },
            fileFilter: (req, file, callback) => {
                if (file.mimetype !== 'application/pdf') {
                    return callback(
                        new BadRequestException('Only PDF files are allowed'),
                        false,
                    );
                }
                callback(null, true);
            },
        }),
    )
    async getPdfsInfo(
        @UploadedFiles() files: Express.Multer.File[],
    ): Promise<{ files: Array<{ pageCount: number; fileName: string; fileSize: number }> }> {
        if (!files || files.length === 0) {
            throw new BadRequestException('At least 1 PDF file is required');
        }

        const fileInfos = await Promise.all(
            files.map((file) => this.pdfMergeService.getPdfInfo(file)),
        );

        return { files: fileInfos };
    }

    @Post('sign')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB
            },
            fileFilter: (req, file, callback) => {
                if (file.mimetype !== 'application/pdf') {
                    return callback(
                        new BadRequestException('Only PDF files are allowed'),
                        false,
                    );
                }
                callback(null, true);
            },
        }),
    )
    async signPdf(
        @UploadedFile() file: Express.Multer.File,
        @Body('signatureImage') signatureImage: string,
        @Body('signerName') signerName: string,
        @Body('addTimestamp') addTimestamp: string,
        @Body('pageNumber') pageNumber: string,
        @Body('x') x: string,
        @Body('y') y: string,
        @Body('width') width: string,
        @Res() res: Response,
    ): Promise<void> {
        if (!file) {
            throw new BadRequestException('PDF file is required');
        }

        if (!signatureImage) {
            throw new BadRequestException('Signature image is required');
        }

        const options: SignatureOptions = {
            signatureImageBase64: signatureImage,
            signerName: signerName || undefined,
            addTimestamp: addTimestamp === 'true',
            pageNumber: pageNumber ? parseInt(pageNumber, 10) : undefined,
            x: x ? parseFloat(x) : undefined,
            y: y ? parseFloat(y) : undefined,
            width: width ? parseFloat(width) : undefined,
        };

        const signedPdf = await this.pdfSignService.signPdf(file, options);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="signed-${Date.now()}.pdf"`,
            'Content-Length': signedPdf.length,
        });

        res.send(signedPdf);
    }

    @Post('sign/preview')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: {
                fileSize: 10 * 1024 * 1024,
            },
            fileFilter: (req, file, callback) => {
                if (file.mimetype !== 'application/pdf') {
                    return callback(
                        new BadRequestException('Only PDF files are allowed'),
                        false,
                    );
                }
                callback(null, true);
            },
        }),
    )
    async getSignPreview(
        @UploadedFile() file: Express.Multer.File,
    ): Promise<{ pageCount: number; fileName: string; fileSize: number; dimensions: { width: number; height: number } }> {
        if (!file) {
            throw new BadRequestException('PDF file is required');
        }

        return this.pdfSignService.getPdfPreview(file);
    }

    @Post('compress')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: {
                fileSize: 50 * 1024 * 1024, // 50MB for compression
            },
            fileFilter: (req, file, callback) => {
                if (file.mimetype !== 'application/pdf') {
                    return callback(
                        new BadRequestException('Only PDF files are allowed'),
                        false,
                    );
                }
                callback(null, true);
            },
        }),
    )
    async compressPdf(
        @UploadedFile() file: Express.Multer.File,
        @Res() res: Response,
    ): Promise<void> {
        if (!file) {
            throw new BadRequestException('PDF file is required');
        }

        const result = await this.pdfCompressService.compressPdf(file);

        // Set headers for file download with compression stats
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="compressed-${Date.now()}.pdf"`,
            'Content-Length': result.buffer.length,
            'X-Original-Size': result.stats.originalSize.toString(),
            'X-Compressed-Size': result.stats.compressedSize.toString(),
            'X-Saved-Percentage': result.stats.savedPercentage.toString(),
        });

        res.send(result.buffer);
    }

    @Post('compress/preview')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: {
                fileSize: 50 * 1024 * 1024,
            },
            fileFilter: (req, file, callback) => {
                if (file.mimetype !== 'application/pdf') {
                    return callback(
                        new BadRequestException('Only PDF files are allowed'),
                        false,
                    );
                }
                callback(null, true);
            },
        }),
    )
    async getCompressPreview(
        @UploadedFile() file: Express.Multer.File,
    ): Promise<{ pageCount: number; fileName: string; fileSize: number; estimatedSavings: string }> {
        if (!file) {
            throw new BadRequestException('PDF file is required');
        }

        return this.pdfCompressService.getCompressionPreview(file);
    }
}
