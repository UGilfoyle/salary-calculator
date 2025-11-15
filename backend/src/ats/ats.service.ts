import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { AtsUsage } from './entities/ats-usage.entity';

export interface AtsCheckResult {
  score: number;
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
  keywordMatches: number;
  totalKeywords: number;
  fileSize: number;
  wordCount: number;
}

@Injectable()
export class AtsService {
  private readonly MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  private readonly MAX_TRIES = 3;
  private readonly RESET_HOURS = 12;

  // Common ATS keywords to check
  private readonly ATS_KEYWORDS = [
    'skills', 'experience', 'education', 'certification', 'achievement',
    'leadership', 'project', 'team', 'communication', 'problem solving',
    'analytical', 'technical', 'professional', 'bachelor', 'master',
    'degree', 'certified', 'proficient', 'expert', 'knowledge',
    'responsibility', 'accomplishment', 'result', 'improve', 'increase',
    'develop', 'manage', 'implement', 'create', 'design', 'build',
    'javascript', 'python', 'java', 'react', 'node', 'sql', 'database',
    'api', 'rest', 'git', 'agile', 'scrum', 'devops', 'cloud', 'aws',
  ];

  constructor(
    @InjectRepository(AtsUsage)
    private atsUsageRepository: Repository<AtsUsage>,
  ) {}

  async checkUsageLimit(userId: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const resetTime = new Date();
    resetTime.setHours(resetTime.getHours() - this.RESET_HOURS);

    // Count usage in last 12 hours
    const recentUsage = await this.atsUsageRepository.count({
      where: {
        userId,
        createdAt: MoreThan(resetTime),
      },
    });

    const remaining = Math.max(0, this.MAX_TRIES - recentUsage);
    const allowed = remaining > 0;

    // Calculate next reset time
    const resetAt = new Date();
    if (recentUsage > 0) {
      const oldestUsage = await this.atsUsageRepository.findOne({
        where: { userId },
        order: { createdAt: 'ASC' },
      });
      if (oldestUsage) {
        resetAt.setTime(oldestUsage.createdAt.getTime() + this.RESET_HOURS * 60 * 60 * 1000);
      }
    }

    return { allowed, remaining, resetAt };
  }

  async recordUsage(userId: string): Promise<void> {
    const usage = this.atsUsageRepository.create({ userId });
    await this.atsUsageRepository.save(usage);
  }

  async parseFile(file: Express.Multer.File): Promise<string> {
    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds 2MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF and DOCX files are allowed');
    }

    try {
      if (file.mimetype === 'application/pdf') {
        const data = await pdfParse(file.buffer);
        return data.text;
      } else if (
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'application/msword'
      ) {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        return result.value;
      }
    } catch (error) {
      throw new BadRequestException('Failed to parse file. Please ensure it is a valid PDF or DOCX file.');
    }
  }

  async checkAts(resumeText: string): Promise<AtsCheckResult> {
    const lowerText = resumeText.toLowerCase();
    const words = resumeText.split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;

    // Count keyword matches
    const matchedKeywords = this.ATS_KEYWORDS.filter(keyword =>
      lowerText.includes(keyword.toLowerCase())
    );
    const keywordMatches = matchedKeywords.length;
    const totalKeywords = this.ATS_KEYWORDS.length;

    // Calculate score (0-100)
    const keywordScore = (keywordMatches / totalKeywords) * 60; // 60% weight
    const lengthScore = Math.min(wordCount / 500, 1) * 40; // 40% weight (optimal ~500 words)
    const score = Math.round(keywordScore + lengthScore);

    // Generate suggestions
    const suggestions: string[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (keywordMatches < totalKeywords * 0.3) {
      weaknesses.push('Low keyword density - add more relevant skills and keywords');
      suggestions.push('Include more industry-specific keywords and technical skills');
    } else {
      strengths.push('Good keyword coverage');
    }

    if (wordCount < 300) {
      weaknesses.push('Resume is too short - may lack detail');
      suggestions.push('Expand on your experience and achievements');
    } else if (wordCount > 1000) {
      weaknesses.push('Resume is too long - ATS systems prefer concise resumes');
      suggestions.push('Condense your resume to 1-2 pages');
    } else {
      strengths.push('Appropriate resume length');
    }

    // Check for common sections
    const hasContact = /email|phone|contact|address/i.test(resumeText);
    const hasExperience = /experience|work|employment|position/i.test(resumeText);
    const hasEducation = /education|degree|university|college|bachelor|master/i.test(resumeText);
    const hasSkills = /skills|technical|proficient|expert/i.test(resumeText);

    if (!hasContact) {
      weaknesses.push('Missing contact information');
      suggestions.push('Add email and phone number');
    } else {
      strengths.push('Contact information present');
    }

    if (!hasExperience) {
      weaknesses.push('Missing work experience section');
      suggestions.push('Add a detailed work experience section');
    } else {
      strengths.push('Work experience section present');
    }

    if (!hasEducation) {
      weaknesses.push('Missing education section');
      suggestions.push('Add your educational background');
    } else {
      strengths.push('Education section present');
    }

    if (!hasSkills) {
      weaknesses.push('Missing skills section');
      suggestions.push('Add a dedicated skills section');
    } else {
      strengths.push('Skills section present');
    }

    // Check for action verbs
    const actionVerbs = ['achieved', 'improved', 'developed', 'managed', 'implemented', 'created', 'designed', 'built', 'led', 'increased'];
    const hasActionVerbs = actionVerbs.some(verb => lowerText.includes(verb));
    if (!hasActionVerbs) {
      suggestions.push('Use more action verbs to describe your achievements');
    } else {
      strengths.push('Good use of action verbs');
    }

    return {
      score,
      suggestions,
      strengths,
      weaknesses,
      keywordMatches,
      totalKeywords,
      fileSize: 0, // Will be set by controller
      wordCount,
    };
  }
}

