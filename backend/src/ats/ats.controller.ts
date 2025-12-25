import {
    Controller,
    Post,
    Get,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    ForbiddenException,
    Param,
    NotFoundException,
    Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { AtsService, AtsCheckResult } from './ats.service';
import { AiEnhanceService } from './ai-enhance.service';
import { memoryStorage } from 'multer';

@Controller('api/ats')
export class AtsController {
    constructor(
        private readonly atsService: AtsService,
        private readonly aiEnhanceService: AiEnhanceService,
    ) { }

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
    ): Promise<AtsCheckResult & { remaining: number; resetAt: Date; checkId: string }> {
        try {
            // Log for debugging (remove in production if needed)
            if (!user) {
                console.error('No user found in request - authentication failed');
                throw new BadRequestException('Authentication failed. Please log in again.');
            }

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

            // Check if user is premium (including free trial until Feb 24, 2025)
            const now = new Date();
            const freePremiumUntil = new Date('2025-02-24');
            const isFreeTrial = now < freePremiumUntil;
            const isPremium = isFreeTrial || (
                user.isPremium &&
                user.premiumExpiresAt &&
                user.premiumExpiresAt > now
            );

            // Check ATS
            const result = await this.atsService.checkAts(resumeText, isPremium);
            result.fileSize = file.size;

            // AUTO-GENERATE PREMIUM FEATURES for premium users
            if (isPremium) {
                const premiumFeatures = await this.atsService.generatePremiumEnhancements(
                    resumeText,
                    result,
                );
                (result as any).premiumFeatures = premiumFeatures;
            }

            // Save check result to database (including resume text for premium features)
            const savedCheck = await this.atsService.saveCheckResult(user.id, result, resumeText);

            // Record usage
            await this.atsService.recordUsage(user.id);

            // Get updated usage info
            const updatedUsage = await this.atsService.checkUsageLimit(user.id);

            return {
                ...result,
                checkId: savedCheck.id,
                remaining: updatedUsage.remaining,
                resetAt: updatedUsage.resetAt,
            };
        } catch (error) {
            console.error('Error in checkResume:', error);
            if (error instanceof BadRequestException || error instanceof ForbiddenException) {
                throw error;
            }
            throw new BadRequestException(`Failed to process resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    @Get('history')
    @UseGuards(JwtAuthGuard)
    async getHistory(@CurrentUser() user: User) {
        return this.atsService.getUserChecks(user.id);
    }

    @Get('history/:id')
    @UseGuards(JwtAuthGuard)
    async getCheckById(@CurrentUser() user: User, @Param('id') id: string) {
        return this.atsService.getCheckById(id, user.id);
    }

    @Post('premium/enhance')
    @UseGuards(JwtAuthGuard)
    async enhanceWithPremium(
        @CurrentUser() user: User,
        @Body() body: { checkId: string; resumeText?: string },
    ) {
        const check = await this.atsService.getCheckById(body.checkId, user.id);

        // Use stored resume text if not provided
        const resumeText = body.resumeText || check.resumeText;
        if (!resumeText) {
            throw new BadRequestException('Resume text is required for premium features');
        }

        // Reconstruct check result from saved data
        const checkResult = {
            score: check.score,
            suggestions: check.suggestions || [],
            strengths: check.strengths || [],
            weaknesses: check.weaknesses || [],
            keywordMatches: check.keywordMatches,
            totalKeywords: check.totalKeywords,
            fileSize: check.fileSize,
            wordCount: check.wordCount,
            detailedAnalysis: check.detailedAnalysis || {
                keywordDensity: 0,
                sectionCompleteness: 0,
                actionVerbUsage: 0,
                quantifiableResults: 0,
                technicalSkills: 0,
                formattingScore: 0,
                atsCompatibility: 0,
            },
        };

        const premiumFeatures = await this.atsService.generatePremiumEnhancements(
            resumeText,
            checkResult as any,
        );

        return {
            ...checkResult,
            premiumFeatures,
        };
    }

    // AI Enhancement Endpoint
    @Post('ai/enhance')
    @UseGuards(JwtAuthGuard)
    async aiEnhanceText(
        @CurrentUser() user: User,
        @Body() body: { text: string; type: 'bullet' | 'summary' | 'full' },
    ) {
        // Check if user is premium (free trial until Feb 24, 2025)
        const now = new Date();
        const freePremiumUntil = new Date('2025-02-24');
        const isFreeTrial = now < freePremiumUntil;
        const isPremium = isFreeTrial || (
            user.isPremium &&
            user.premiumExpiresAt &&
            user.premiumExpiresAt > now
        );

        if (!isPremium) {
            throw new ForbiddenException('AI enhancement is a premium feature');
        }

        if (!body.text || body.text.trim().length === 0) {
            throw new BadRequestException('Text is required for enhancement');
        }

        return this.aiEnhanceService.enhanceResumeText(body.text, body.type || 'bullet');
    }

    // AI Generate Section Content
    @Post('ai/generate')
    @UseGuards(JwtAuthGuard)
    async aiGenerateContent(
        @CurrentUser() user: User,
        @Body() body: {
            sectionType: 'summary' | 'skills' | 'experience';
            context: { title?: string; industry?: string };
        },
    ) {
        // Check if user is premium (free trial until Feb 24, 2025)
        const now = new Date();
        const freePremiumUntil = new Date('2025-02-24');
        const isFreeTrial = now < freePremiumUntil;
        const isPremium = isFreeTrial || (
            user.isPremium &&
            user.premiumExpiresAt &&
            user.premiumExpiresAt > now
        );

        if (!isPremium) {
            throw new ForbiddenException('AI content generation is a premium feature');
        }

        const content = await this.aiEnhanceService.generateSectionContent(
            body.sectionType,
            body.context || {},
        );

        return { content };
    }

    @Post('usage')
    @UseGuards(JwtAuthGuard)
    async getUsage(@CurrentUser() user: User) {
        return this.atsService.checkUsageLimit(user.id);
    }
}
