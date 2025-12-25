import { Injectable, BadRequestException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';

@Injectable()
export class PdfMergeService {
    private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
    private readonly MAX_FILES = 20; // Maximum files to merge

    async mergePdfs(files: Express.Multer.File[]): Promise<Buffer> {
        if (!files || files.length < 2) {
            throw new BadRequestException('At least 2 PDF files are required for merging');
        }

        if (files.length > this.MAX_FILES) {
            throw new BadRequestException(`Maximum ${this.MAX_FILES} files can be merged at once`);
        }

        // Validate all files
        for (const file of files) {
            if (file.size > this.MAX_FILE_SIZE) {
                throw new BadRequestException(
                    `File "${file.originalname}" exceeds 10MB limit. Size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
                );
            }

            if (file.mimetype !== 'application/pdf') {
                throw new BadRequestException(
                    `File "${file.originalname}" is not a PDF. Only PDF files can be merged.`
                );
            }

            // Validate PDF header
            const header = file.buffer.slice(0, 4).toString();
            if (header !== '%PDF') {
                throw new BadRequestException(
                    `File "${file.originalname}" is not a valid PDF file.`
                );
            }
        }

        try {
            // Create a new PDF document
            const mergedPdf = await PDFDocument.create();

            // Process each file
            for (const file of files) {
                try {
                    const pdfDoc = await PDFDocument.load(file.buffer, {
                        ignoreEncryption: true,
                    });

                    const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                    pages.forEach((page) => mergedPdf.addPage(page));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    throw new BadRequestException(
                        `Failed to process "${file.originalname}": ${errorMessage}. ` +
                        `The file may be corrupted, password-protected, or in an unsupported format.`
                    );
                }
            }

            // Save the merged PDF
            const mergedPdfBytes = await mergedPdf.save();

            return Buffer.from(mergedPdfBytes);
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Failed to merge PDFs: ${errorMessage}`);
        }
    }

    async getPdfInfo(file: Express.Multer.File): Promise<{
        pageCount: number;
        fileName: string;
        fileSize: number;
    }> {
        if (file.mimetype !== 'application/pdf') {
            throw new BadRequestException('Only PDF files are accepted');
        }

        try {
            const pdfDoc = await PDFDocument.load(file.buffer, {
                ignoreEncryption: true,
            });

            return {
                pageCount: pdfDoc.getPageCount(),
                fileName: file.originalname,
                fileSize: file.size,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Failed to read PDF info: ${errorMessage}`);
        }
    }
}
