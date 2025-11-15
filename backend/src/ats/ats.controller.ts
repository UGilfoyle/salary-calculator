import {
    Controller,
    Post,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { AtsService, AtsCheckResult } from './ats.service';
import { memoryStorage } from 'multer';

@Controller('api/ats')
export class AtsController {
    constructor(private readonly atsService: AtsService) { }

    @Post('check')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: {
                fileSize: 2 * 1024 * 1024, // 2MB
            },
            fileFilter: (req, file, cb) => {
                const allowedMimeTypes = [
                    'application/pdf',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/msword',
                ];
                if (allowedMimeTypes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new BadRequestException('Only PDF and DOCX files are allowed'), false);
                }
            },
        }),
    )
    async checkResume(
        @UploadedFile() file: Express.Multer.File,
        @CurrentUser() user: User,
    ): Promise<AtsCheckResult & { remaining: number; resetAt: Date }> {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Check usage limit
        const usageCheck = await this.atsService.checkUsageLimit(user.id);
        if (!usageCheck.allowed) {
            const resetTime = new Date(usageCheck.resetAt).toLocaleString();
            throw new ForbiddenException(
                `You have reached the limit of 3 checks. Your limit will reset at ${resetTime}`,
            );
        }

        // Parse file
        const resumeText = await this.atsService.parseFile(file);

        // Check ATS
        const result = await this.atsService.checkAts(resumeText);
        result.fileSize = file.size;

        // Record usage
        await this.atsService.recordUsage(user.id);

        // Get updated usage info
        const updatedUsage = await this.atsService.checkUsageLimit(user.id);

        return {
            ...result,
            remaining: updatedUsage.remaining,
            resetAt: updatedUsage.resetAt,
        };
    }

    @Post('usage')
    @UseGuards(JwtAuthGuard)
    async getUsage(@CurrentUser() user: User) {
        return this.atsService.checkUsageLimit(user.id);
    }
}

