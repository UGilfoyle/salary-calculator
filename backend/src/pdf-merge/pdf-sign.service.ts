import { Injectable, BadRequestException } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface SignatureOptions {
    signatureImageBase64: string; // Data URL or base64 encoded PNG
    pageNumber?: number; // 1-indexed, defaults to last page
    x?: number; // X position (0-1 as percentage from left)
    y?: number; // Y position (0-1 as percentage from bottom)
    width?: number; // Width as percentage of page width (0-1)
    signerName?: string; // Name to display below signature
    addTimestamp?: boolean; // Add date/time below signature
}

@Injectable()
export class PdfSignService {
    private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    async signPdf(
        file: Express.Multer.File,
        options: SignatureOptions,
    ): Promise<Buffer> {
        // Validate file
        if (!file || !file.buffer) {
            throw new BadRequestException('PDF file is required');
        }

        if (file.size > this.MAX_FILE_SIZE) {
            throw new BadRequestException(
                `File size exceeds 10MB limit. Size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
            );
        }

        if (file.mimetype !== 'application/pdf') {
            throw new BadRequestException('Only PDF files are accepted');
        }

        // Validate signature
        if (!options.signatureImageBase64) {
            throw new BadRequestException('Signature image is required');
        }

        try {
            // Load the PDF
            const pdfDoc = await PDFDocument.load(file.buffer, {
                ignoreEncryption: true,
            });

            const pages = pdfDoc.getPages();
            if (pages.length === 0) {
                throw new BadRequestException('PDF has no pages');
            }

            // Determine which page to sign (default: last page)
            const pageIndex = options.pageNumber
                ? Math.min(Math.max(options.pageNumber - 1, 0), pages.length - 1)
                : pages.length - 1;

            const page = pages[pageIndex];
            const { width: pageWidth, height: pageHeight } = page.getSize();

            // Extract base64 image data
            let imageData = options.signatureImageBase64;
            if (imageData.includes(',')) {
                imageData = imageData.split(',')[1];
            }

            // Embed the signature image
            const signatureImage = await pdfDoc.embedPng(
                Buffer.from(imageData, 'base64'),
            );

            // Calculate dimensions and position
            const signatureWidth = (options.width || 0.2) * pageWidth; // Default 20% of page width
            const aspectRatio = signatureImage.height / signatureImage.width;
            const signatureHeight = signatureWidth * aspectRatio;

            // Position (default: bottom-right corner)
            const x = options.x !== undefined
                ? options.x * pageWidth
                : pageWidth - signatureWidth - 50;
            const y = options.y !== undefined
                ? options.y * pageHeight
                : 50;

            // Draw the signature
            page.drawImage(signatureImage, {
                x,
                y,
                width: signatureWidth,
                height: signatureHeight,
            });

            // Add signer name if provided
            if (options.signerName || options.addTimestamp) {
                const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                const fontSize = 10;
                let textY = y - 15;

                if (options.signerName) {
                    page.drawText(options.signerName, {
                        x: x,
                        y: textY,
                        size: fontSize,
                        font,
                        color: rgb(0.2, 0.2, 0.2),
                    });
                    textY -= 12;
                }

                if (options.addTimestamp) {
                    const timestamp = new Date().toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                    });
                    page.drawText(`Signed: ${timestamp}`, {
                        x: x,
                        y: textY,
                        size: fontSize - 1,
                        font,
                        color: rgb(0.4, 0.4, 0.4),
                    });
                }
            }

            // Save the signed PDF
            const signedPdfBytes = await pdfDoc.save();
            return Buffer.from(signedPdfBytes);
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Failed to sign PDF: ${errorMessage}`);
        }
    }

    async getPdfPreview(file: Express.Multer.File): Promise<{
        pageCount: number;
        fileName: string;
        fileSize: number;
        dimensions: { width: number; height: number };
    }> {
        if (file.mimetype !== 'application/pdf') {
            throw new BadRequestException('Only PDF files are accepted');
        }

        try {
            const pdfDoc = await PDFDocument.load(file.buffer, {
                ignoreEncryption: true,
            });

            const pages = pdfDoc.getPages();
            const firstPage = pages[0];
            const { width, height } = firstPage.getSize();

            return {
                pageCount: pdfDoc.getPageCount(),
                fileName: file.originalname,
                fileSize: file.size,
                dimensions: { width, height },
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Failed to read PDF: ${errorMessage}`);
        }
    }
}
