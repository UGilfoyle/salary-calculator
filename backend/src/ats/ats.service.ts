import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as mammoth from 'mammoth';
import { AtsUsage } from './entities/ats-usage.entity';
import { AtsCheck } from './entities/ats-check.entity';

// PDF parsing using pdf-parse (CommonJS compatible, works in Node.js)
let pdfParse: ((buffer: Buffer) => Promise<{ text: string }>) | null = null;
let pdfParseLoadError: Error | null = null;

// Lazy load pdf-parse
const loadPdfParse = async (): Promise<(buffer: Buffer) => Promise<{ text: string }>> => {
  if (pdfParse) {
    return pdfParse;
  }

  if (pdfParseLoadError) {
    throw pdfParseLoadError;
  }

  try {
    // pdf-parse is a CommonJS module, use require()
    const pdfParseModule = require('pdf-parse');
    
    // pdf-parse exports the function directly
    if (typeof pdfParseModule === 'function') {
      pdfParse = pdfParseModule;
    } else if (pdfParseModule && typeof pdfParseModule.default === 'function') {
      pdfParse = pdfParseModule.default;
    } else if (pdfParseModule && typeof pdfParseModule.pdfParse === 'function') {
      pdfParse = pdfParseModule.pdfParse;
    } else {
      throw new Error('pdf-parse module format is unexpected. Got type: ' + typeof pdfParseModule);
    }
    
    console.log('pdf-parse loaded successfully');
    return pdfParse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to load pdf-parse:', errorMessage);
    
    const finalError = new BadRequestException(
      `PDF parsing is not available. Please ensure pdf-parse is installed. Error: ${errorMessage}`
    );
    pdfParseLoadError = finalError;
    throw finalError;
  }
};

// OCR support for scanned PDFs (optional, will fallback gracefully if not available)
let tesseractWorker: any = null;
let ocrAvailable = false;
let ocrLoadError: Error | null = null;

const loadOCR = async (): Promise<boolean> => {
  if (ocrAvailable) return true;
  if (ocrLoadError) return false;

  try {
    // Try to load tesseract.js for OCR
    const Tesseract = require('tesseract.js');
    if (Tesseract && Tesseract.createWorker) {
      console.log('Initializing Tesseract OCR worker...');
      tesseractWorker = await Tesseract.createWorker('eng');
      ocrAvailable = true;
      console.log('OCR (Tesseract.js) loaded successfully');
      return true;
    }
    throw new Error('Tesseract.createWorker not available');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn('OCR not available (tesseract.js not installed or failed to load):', errorMsg);
    ocrLoadError = error instanceof Error ? error : new Error(errorMsg);
    return false;
  }
};

// Function to extract text from PDF using OCR (for scanned PDFs)
const extractTextFromPdfWithOCR = async (buffer: Buffer): Promise<string> => {
  const ocrReady = await loadOCR();
  if (!ocrReady || !tesseractWorker) {
    throw new BadRequestException(
      'OCR is not available. Please install tesseract.js or use a PDF with selectable text.'
    );
  }

  try {
    // Use pdfjs-dist to render PDF pages to images, then OCR them
    // pdfjs-dist is already installed in the project
    let pdfjs: any = null;
    try {
      pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
    } catch (e) {
      // Fallback: try direct require
      pdfjs = require('pdfjs-dist');
    }

    if (!pdfjs) {
      throw new Error('pdfjs-dist not available');
    }

    console.log('Attempting OCR on PDF...');
    
    // Load PDF document
    const loadingTask = pdfjs.getDocument({ data: buffer });
    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    
    console.log(`PDF has ${numPages} page(s), processing with OCR...`);
    
    let allText = '';
    
    // Process each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR quality
      
      // Create a canvas to render the page
      const { createCanvas } = require('canvas');
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      
      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
      
      // Convert canvas to image buffer
      const imageBuffer = canvas.toBuffer('image/png');
      
      // OCR the image
      console.log(`OCR processing page ${pageNum}/${numPages}...`);
      const result = await tesseractWorker.recognize(imageBuffer);
      const pageText = result.data.text || '';
      
      if (pageText.trim().length > 0) {
        allText += pageText + '\n\n';
        console.log(`Extracted ${pageText.length} characters from page ${pageNum}`);
      }
    }
    
    if (!allText || allText.trim().length < 10) {
      throw new BadRequestException(
        'OCR could not extract meaningful text from the PDF. The image quality may be too low or the PDF may be corrupted.'
      );
    }
    
    console.log(`Successfully extracted ${allText.length} characters using OCR from ${numPages} page(s)`);
    return allText.trim();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('OCR error:', errorMessage);
    
    // Check if it's a missing dependency error
    if (errorMessage.includes('canvas') || errorMessage.includes('Cannot find module')) {
      throw new BadRequestException(
        'OCR requires additional dependencies (canvas package). ' +
        'For now, please use a PDF with selectable text, or contact support for OCR setup.'
      );
    }
    
    throw new BadRequestException(
      `OCR failed: ${errorMessage}. Please try with a higher quality scanned PDF or use a text-based PDF.`
    );
  }
};

// Function to extract text from PDF using pdf-parse
const extractTextFromPdf = async (buffer: Buffer, tryOCR: boolean = true): Promise<string> => {
  const pdfParser = await loadPdfParse();
  
  try {
    // Validate buffer
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('PDF file is empty or invalid');
    }

    // Check if it's actually a PDF by checking the header
    const pdfHeader = buffer.slice(0, 4).toString();
    if (pdfHeader !== '%PDF') {
      throw new BadRequestException('File does not appear to be a valid PDF file');
    }

    // Parse PDF and extract text
    const data = await pdfParser(buffer);
    
    // pdf-parse returns an object with a 'text' property and metadata
    let text = '';
    if (typeof data === 'string') {
      text = data;
    } else if (data && typeof data === 'object') {
      // Check for text property
      if ('text' in data) {
        text = data.text || '';
      }
      // Log metadata for debugging
      if (data.info) {
        console.log('PDF Info:', JSON.stringify(data.info));
      }
      if (data.metadata) {
        console.log('PDF Metadata:', JSON.stringify(data.metadata));
      }
      if (data.numpages !== undefined) {
        console.log('PDF Pages:', data.numpages);
      }
    } else {
      text = String(data || '');
    }
    
    // Clean up text (remove excessive whitespace but preserve structure)
    text = text.replace(/\s+/g, ' ').trim();
    
    // More lenient check - allow very short text (might be a simple resume)
    if (!text || text.length < 10) {
      // Check if PDF has pages
      const numPages = (data && typeof data === 'object' && 'numpages' in data) ? data.numpages : 0;
      
      // If no text found and OCR is enabled, try OCR as fallback
      if (numPages > 0 && tryOCR) {
        console.log('No text found in PDF, attempting OCR...');
        try {
          return await extractTextFromPdfWithOCR(buffer);
        } catch (ocrError) {
          // If OCR fails, throw the original error
          console.warn('OCR fallback failed:', ocrError instanceof Error ? ocrError.message : String(ocrError));
          throw new BadRequestException(
            `Could not extract text from PDF. The PDF appears to be image-based (scanned) or contains only images. ` +
            `OCR attempt failed: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}. ` +
            `Please use a PDF with selectable text, or ensure your scanned PDF has good image quality. ` +
            `PDF has ${numPages} page(s) but no extractable text was found.`
          );
        }
      }
      
      if (numPages > 0) {
        throw new BadRequestException(
          `Could not extract text from PDF. The PDF appears to be image-based (scanned) or contains only images. ` +
          `Please use a PDF with selectable text, or convert your scanned PDF to text using OCR software first. ` +
          `PDF has ${numPages} page(s) but no extractable text was found.`
        );
      } else {
        throw new BadRequestException(
          'Could not extract text from PDF. The file may be empty, corrupted, password-protected, or contain only images. ' +
          'Please ensure the PDF contains selectable text and is not a scanned image.'
        );
      }
    }
    
    console.log(`Successfully extracted ${text.length} characters from PDF`);
    return text;
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('PDF parsing error:', errorMessage);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Provide more specific error messages
    if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
      throw new BadRequestException(
        'PDF is password-protected. Please remove the password and try again.'
      );
    } else if (errorMessage.includes('corrupt') || errorMessage.includes('invalid')) {
      throw new BadRequestException(
        'PDF file appears to be corrupted or invalid. Please try with a different PDF file.'
      );
    } else {
      throw new BadRequestException(
        `Failed to parse PDF: ${errorMessage}. ` +
        `Please ensure the file is a valid PDF with selectable text (not a scanned image) and is not password-protected.`
      );
    }
  }
};

export interface AtsCheckResult {
  score: number;
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
  keywordMatches: number;
  totalKeywords: number;
  fileSize: number;
  wordCount: number;
  detailedAnalysis: {
    keywordDensity: number;
    sectionCompleteness: number;
    actionVerbUsage: number;
    quantifiableResults: number;
    technicalSkills: number;
    formattingScore: number;
    atsCompatibility: number;
  };
  // Premium features
  premiumFeatures?: {
    optimizedKeywords: string[];
    industrySpecificSuggestions: string[];
    resumeOptimizationTips: string[];
    missingKeywords: string[];
    keywordReplacements: Array<{ current: string; suggested: string; reason: string }>;
  };
}

@Injectable()
export class AtsService {
  private readonly MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  private readonly MAX_TRIES = 3;
  private readonly RESET_HOURS = 12;

  // Comprehensive ATS keywords that work for 95% of companies
  // These keywords are commonly searched by ATS systems across industries
  private readonly ATS_KEYWORDS = [
    // Core resume sections
    'skills', 'experience', 'education', 'certification', 'achievement', 'qualification',
    'summary', 'objective', 'profile', 'professional', 'career',
    
    // Soft skills (universally valued)
    'leadership', 'communication', 'teamwork', 'collaboration', 'problem solving',
    'analytical', 'critical thinking', 'adaptability', 'initiative', 'innovation',
    'management', 'organization', 'planning', 'strategy', 'decision making',
    
    // Technical skills (broad coverage)
    'technical', 'proficient', 'expert', 'knowledge', 'competent', 'skilled',
    'javascript', 'python', 'java', 'sql', 'database', 'api', 'rest', 'web',
    'cloud', 'aws', 'azure', 'gcp', 'devops', 'ci/cd', 'git', 'github',
    'agile', 'scrum', 'project management', 'software', 'development',
    
    // Action verbs (ATS systems look for these)
    'achieved', 'improved', 'developed', 'managed', 'implemented', 'created',
    'designed', 'built', 'led', 'increased', 'optimized', 'delivered',
    'executed', 'launched', 'established', 'generated', 'reduced', 'enhanced',
    
    // Education & credentials
    'bachelor', 'master', 'phd', 'degree', 'diploma', 'certified', 'certification',
    'university', 'college', 'institute', 'course', 'training', 'workshop',
    
    // Quantifiable terms (ATS systems favor metrics)
    'percent', 'percentage', 'million', 'billion', 'thousand', 'increased by',
    'decreased by', 'reduced by', 'improved by', 'saved', 'generated',
    
    // Industry-agnostic terms
    'client', 'customer', 'stakeholder', 'vendor', 'partner', 'collaboration',
    'process', 'workflow', 'efficiency', 'productivity', 'quality', 'standard',
    'compliance', 'regulation', 'security', 'risk', 'analysis', 'reporting',
    
    // Modern workplace terms
    'remote', 'hybrid', 'cross-functional', 'multidisciplinary', 'diverse',
    'inclusive', 'sustainability', 'digital transformation', 'automation',
  ];

  constructor(
    @InjectRepository(AtsUsage)
    private atsUsageRepository: Repository<AtsUsage>,
    @InjectRepository(AtsCheck)
    private atsCheckRepository: Repository<AtsCheck>,
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

    // Calculate next reset time based on oldest usage in the last 12 hours
    const resetAt = new Date();
    if (recentUsage > 0) {
      // Find the oldest usage in the last 12 hours (not all time)
      const oldestUsage = await this.atsUsageRepository.findOne({
        where: {
          userId,
          createdAt: MoreThan(resetTime),
        },
        order: { createdAt: 'ASC' },
      });
      if (oldestUsage) {
        // Reset time is 12 hours after the oldest usage in the window
        resetAt.setTime(oldestUsage.createdAt.getTime() + this.RESET_HOURS * 60 * 60 * 1000);
      } else {
        // Fallback: reset in 12 hours from now
        resetAt.setTime(Date.now() + this.RESET_HOURS * 60 * 60 * 1000);
      }
    } else {
      // No recent usage, reset time is 12 hours from now
      resetAt.setTime(Date.now() + this.RESET_HOURS * 60 * 60 * 1000);
    }

    return { allowed, remaining, resetAt };
  }

  async recordUsage(userId: string): Promise<void> {
    const usage = this.atsUsageRepository.create({ userId });
    await this.atsUsageRepository.save(usage);
  }

  async parseFile(file: Express.Multer.File): Promise<string> {
    // Validate file exists
    if (!file || !file.buffer) {
      throw new BadRequestException('File is missing or invalid');
    }

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
      let text = '';
      
      if (file.mimetype === 'application/pdf') {
        try {
          text = await extractTextFromPdf(file.buffer);
        } catch (pdfError) {
          console.error('PDF parsing error details:', pdfError);
          if (pdfError instanceof BadRequestException) {
            throw pdfError;
          }
          const errorMessage = pdfError instanceof Error ? pdfError.message : 'Unknown error';
          throw new BadRequestException(`Failed to parse PDF file: ${errorMessage}. Please ensure the file is not password-protected or corrupted.`);
        }
      } else if (
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'application/msword'
      ) {
        try {
          const result = await mammoth.extractRawText({ buffer: file.buffer });
          text = result?.value || '';
        } catch (docxError) {
          console.error('DOCX parsing error details:', docxError);
          const errorMessage = docxError instanceof Error ? docxError.message : 'Unknown error';
          throw new BadRequestException(`Failed to parse DOCX file: ${errorMessage}. Please ensure the file is not corrupted.`);
        }
      }

      if (!text || text.trim().length === 0) {
        throw new BadRequestException('Could not extract text from file. The file may be empty, corrupted, or password-protected.');
      }

      return text.trim();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('File parsing error:', error);
      throw new BadRequestException(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async checkAts(resumeText: string, isPremium: boolean = false): Promise<AtsCheckResult> {
    if (!resumeText || resumeText.trim().length === 0) {
      throw new BadRequestException('Resume text is empty');
    }

    const lowerText = resumeText.toLowerCase();
    const words = resumeText.split(/\s+/).filter(word => word.length > 0);
    const wordCount = Math.max(words.length, 1); // Prevent division by zero

    // Count keyword matches (case-insensitive, partial word matching)
    const matchedKeywords = this.ATS_KEYWORDS.filter(keyword => {
      const keywordLower = keyword.toLowerCase();
      // Check for exact match or as part of a word
      return lowerText.includes(keywordLower) || 
             new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lowerText);
    });
    const keywordMatches = matchedKeywords.length;
    const totalKeywords = this.ATS_KEYWORDS.length;

    // Detailed analysis metrics
    // Keyword density: number of matched keywords per 1000 words
    const keywordDensity = wordCount > 0 
      ? Math.round((keywordMatches / wordCount) * 1000 * 100) / 100 
      : 0; // per 1000 words
    
    // Section completeness (0-100)
    const sections = {
      contact: /email|phone|contact|address|mobile|telephone/i.test(resumeText),
      experience: /experience|work|employment|position|role|job|career/i.test(resumeText),
      education: /education|degree|university|college|bachelor|master|phd|diploma/i.test(resumeText),
      skills: /skills|technical|proficient|expert|competencies|abilities/i.test(resumeText),
    };
    const sectionCompleteness = Math.round(
      (Object.values(sections).filter(Boolean).length / Object.keys(sections).length) * 100
    );

    // Action verb usage
    const actionVerbs = ['achieved', 'improved', 'developed', 'managed', 'implemented', 'created', 'designed', 'built', 'led', 'increased', 'optimized', 'delivered', 'executed', 'launched', 'established', 'generated', 'reduced', 'enhanced'];
    const foundActionVerbs = actionVerbs.filter(verb => lowerText.includes(verb));
    const actionVerbUsage = Math.min(Math.round((foundActionVerbs.length / actionVerbs.length) * 100), 100);

    // Quantifiable results (numbers, percentages, metrics)
    const quantifiablePattern = /\d+%|\d+\s*(million|billion|thousand|k|m|b)|increased by|decreased by|reduced by|improved by|\$\d+|\d+\s*(users|customers|projects|team members)/i;
    const hasQuantifiableResults = quantifiablePattern.test(resumeText);
    const quantifiableResults = hasQuantifiableResults ? 100 : 0;

    // Technical skills detection (broad coverage)
    const techKeywords = ['javascript', 'python', 'java', 'react', 'node', 'sql', 'database', 'api', 'git', 'docker', 'kubernetes', 'aws', 'cloud', 'azure', 'gcp', 'devops', 'agile', 'scrum', 'typescript', 'html', 'css'];
    const foundTechSkills = techKeywords.filter(keyword => lowerText.includes(keyword));
    const technicalSkills = Math.min(Math.round((foundTechSkills.length / techKeywords.length) * 100), 100);

    // Formatting score (ATS-friendly formatting checks)
    const formattingChecks = {
      hasBulletPoints: /[•\-\*]|\d+\./i.test(resumeText), // Bullet points or numbered lists
      hasDates: /\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}/i.test(resumeText), // Dates present
      hasHeaders: /^(experience|education|skills|summary|objective|profile|qualifications)/im.test(resumeText), // Clear section headers
      noSpecialChars: !/[^\w\s\.,;:!?\-\(\)\/@]/.test(resumeText), // No unusual special characters that break ATS
      properLength: wordCount >= 300 && wordCount <= 1000, // Optimal resume length
    };
    const formattingScore = Math.round(
      (Object.values(formattingChecks).filter(Boolean).length / Object.keys(formattingChecks).length) * 100
    );

    // Overall ATS Compatibility Score (0-100)
    // This represents how well the resume will parse in 95% of ATS systems
    const atsCompatibility = Math.round(
      (keywordMatches / totalKeywords) * 30 + // 30% weight on keywords
      (sectionCompleteness / 100) * 25 + // 25% weight on sections
      (formattingScore / 100) * 20 + // 20% weight on formatting
      (actionVerbUsage / 100) * 10 + // 10% weight on action verbs
      (quantifiableResults / 100) * 10 + // 10% weight on metrics
      (technicalSkills / 100) * 5 // 5% weight on technical skills
    );

    // Calculate overall ATS score (0-100) - optimized for 95% of ATS systems
    // This score represents how well the resume will perform across most ATS platforms
    const keywordScore = Math.min((keywordMatches / totalKeywords) * 100, 100) * 0.30; // 30% weight
    const lengthScore = Math.min(Math.max(wordCount / 500, 0), 1) * 100 * 0.15; // 15% weight (optimal: 400-600 words)
    const sectionScore = sectionCompleteness * 0.25; // 25% weight
    const formattingScoreWeight = formattingScore * 0.15; // 15% weight
    const actionVerbScore = actionVerbUsage * 0.10; // 10% weight
    const quantifiableScore = quantifiableResults * 0.05; // 5% weight
    const score = Math.min(Math.round(keywordScore + lengthScore + sectionScore + formattingScoreWeight + actionVerbScore + quantifiableScore), 100);

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

    if (!sections.contact) {
      weaknesses.push('Missing contact information');
      suggestions.push('Add email and phone number');
    } else {
      strengths.push('Contact information present');
    }

    if (!sections.experience) {
      weaknesses.push('Missing work experience section');
      suggestions.push('Add a detailed work experience section');
    } else {
      strengths.push('Work experience section present');
    }

    if (!sections.education) {
      weaknesses.push('Missing education section');
      suggestions.push('Add your educational background');
    } else {
      strengths.push('Education section present');
    }

    if (!sections.skills) {
      weaknesses.push('Missing skills section');
      suggestions.push('Add a dedicated skills section');
    } else {
      strengths.push('Skills section present');
    }

    if (foundActionVerbs.length === 0) {
      weaknesses.push('No action verbs found');
      suggestions.push('Use action verbs to describe achievements (e.g., achieved, improved, developed)');
    } else if (foundActionVerbs.length < 3) {
      suggestions.push('Use more action verbs to strengthen your achievements');
    } else {
      strengths.push(`Good use of action verbs (${foundActionVerbs.length} found)`);
    }

    if (!hasQuantifiableResults) {
      weaknesses.push('Missing quantifiable results');
      suggestions.push('Add numbers, percentages, and metrics to show impact (e.g., "increased revenue by 30%")');
    } else {
      strengths.push('Quantifiable results present');
    }

    if (technicalSkills < 30) {
      suggestions.push('Add more technical skills relevant to your field');
    } else {
      strengths.push(`Strong technical skills coverage (${foundTechSkills.length} skills found)`);
    }

    // Formatting suggestions
    if (formattingScore < 80) {
      if (!formattingChecks.hasBulletPoints) {
        suggestions.push('Use bullet points to make your resume more scannable for ATS systems');
      }
      if (!formattingChecks.hasDates) {
        suggestions.push('Include dates for your work experience and education');
      }
      if (!formattingChecks.hasHeaders) {
        suggestions.push('Use clear section headers (Experience, Education, Skills) for better ATS parsing');
      }
      if (wordCount < 300) {
        suggestions.push('Expand your resume with more details (ATS systems prefer 400-600 words)');
      } else if (wordCount > 1000) {
        suggestions.push('Consider condensing your resume to 1-2 pages for better ATS compatibility');
      }
    } else {
      strengths.push('Resume formatting is ATS-friendly');
    }

    // General ATS optimization suggestions
    if (atsCompatibility < 70) {
      suggestions.push('Optimize your resume for ATS systems by adding more relevant keywords and improving structure');
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
      detailedAnalysis: {
        keywordDensity,
        sectionCompleteness,
        actionVerbUsage,
        quantifiableResults,
        technicalSkills,
        formattingScore,
        atsCompatibility,
      },
    };
  }

  // Premium enhancement features
  async generatePremiumEnhancements(resumeText: string, checkResult: AtsCheckResult): Promise<AtsCheckResult['premiumFeatures']> {
    const lowerText = resumeText.toLowerCase();
    const words = resumeText.split(/\s+/).filter(word => word.length > 0);

    // Find missing important keywords from comprehensive ATS keywords
    const missingKeywords: string[] = [];
    const foundKeywords = new Set<string>();
    
    this.ATS_KEYWORDS.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      if (lowerText.includes(keywordLower)) {
        foundKeywords.add(keywordLower);
      } else {
        // Only suggest high-value keywords
        if (this.isHighValueKeyword(keywordLower)) {
          missingKeywords.push(keyword);
        }
      }
    });

    // Generate optimized keywords (prioritized by importance)
    const optimizedKeywords = this.generateOptimizedKeywords(lowerText, missingKeywords.slice(0, 20));

    // General ATS optimization suggestions
    const industrySuggestions = this.generateIndustrySuggestions(checkResult);

    // Resume optimization tips
    const optimizationTips = this.generateOptimizationTips(checkResult, resumeText);

    // Keyword replacement suggestions
    const keywordReplacements = this.generateKeywordReplacements(resumeText, lowerText);

    return {
      optimizedKeywords: optimizedKeywords.slice(0, 30),
      industrySpecificSuggestions: industrySuggestions,
      resumeOptimizationTips: optimizationTips,
      missingKeywords: missingKeywords.slice(0, 25),
      keywordReplacements: keywordReplacements.slice(0, 15),
    };
  }

  private isHighValueKeyword(keyword: string): boolean {
    const highValue = [
      'leadership', 'communication', 'problem solving', 'analytical',
      'cloud', 'aws', 'azure', 'docker', 'kubernetes', 'devops',
      'python', 'java', 'javascript', 'react', 'node', 'sql', 'database',
      'agile', 'scrum', 'project management', 'api', 'rest',
      'certified', 'certification', 'degree', 'bachelor', 'master',
    ];
    return highValue.some(hv => keyword.includes(hv) || hv.includes(keyword));
  }

  private generateOptimizedKeywords(resumeText: string, missingKeywords: string[]): string[] {
    // Prioritize keywords based on industry trends
    const prioritized = missingKeywords.sort((a, b) => {
      const aPriority = this.getKeywordPriority(a);
      const bPriority = this.getKeywordPriority(b);
      return bPriority - aPriority;
    });
    return prioritized;
  }

  private getKeywordPriority(keyword: string): number {
    // Higher priority for trending/important keywords
    if (keyword.includes('machine learning') || keyword.includes('ai')) return 10;
    if (keyword.includes('cloud') || keyword.includes('aws') || keyword.includes('azure')) return 9;
    if (keyword.includes('docker') || keyword.includes('kubernetes')) return 8;
    if (keyword.includes('system design') || keyword.includes('distributed')) return 8;
    if (keyword.includes('python') || keyword.includes('java') || keyword.includes('javascript')) return 7;
    return 5;
  }

  private generateIndustrySuggestions(
    checkResult: AtsCheckResult
  ): string[] {
    const suggestions: string[] = [];
    
    // General ATS optimization advice
    if (checkResult.detailedAnalysis.technicalSkills < 50) {
      suggestions.push('Add more technical skills relevant to your field to improve ATS matching');
    }
    if (checkResult.detailedAnalysis.quantifiableResults === 0) {
      suggestions.push('Include metrics and numbers to quantify your achievements (e.g., "increased performance by 40%")');
    }
    if (checkResult.detailedAnalysis.formattingScore < 80) {
      suggestions.push('Improve resume formatting with clear section headers, bullet points, and proper structure');
    }
    if (checkResult.detailedAnalysis.atsCompatibility < 70) {
      suggestions.push('Focus on adding more ATS-friendly keywords and improving overall resume structure');
    }
    if (checkResult.detailedAnalysis.keywordDensity < 20) {
      suggestions.push('Increase keyword density by naturally incorporating more relevant industry terms');
    }

    return suggestions;
  }

  private generateOptimizationTips(checkResult: AtsCheckResult, resumeText: string): string[] {
    const tips: string[] = [];

    if (checkResult.score < 70) {
      tips.push('Your resume needs optimization. Focus on adding more relevant keywords and quantifiable achievements.');
    }

    if (checkResult.detailedAnalysis.sectionCompleteness < 100) {
      tips.push('Ensure all sections (Contact, Experience, Education, Skills) are clearly labeled and complete.');
    }

    if (checkResult.detailedAnalysis.actionVerbUsage < 50) {
      tips.push('Use more action verbs to start bullet points (e.g., "Developed", "Implemented", "Led", "Optimized").');
    }

    if (checkResult.wordCount < 300) {
      tips.push('Expand your resume with more detailed descriptions of your achievements and responsibilities.');
    } else if (checkResult.wordCount > 800) {
      tips.push('Consider condensing your resume to 1-2 pages for better ATS compatibility.');
    }

    // Formatting tips
    if (!/^\s*[A-Z]/.test(resumeText)) {
      tips.push('Ensure your resume starts with a clear header section with your name and contact information.');
    }

    return tips;
  }

  private generateKeywordReplacements(resumeText: string, lowerText: string): Array<{ current: string; suggested: string; reason: string }> {
    const replacements: Array<{ current: string; suggested: string; reason: string }> = [];

    // Common weak words to replace
    const weakWords = {
      'worked on': 'developed',
      'did': 'implemented',
      'made': 'created',
      'helped': 'contributed to',
      'tried': 'attempted',
      'fixed': 'resolved',
      'used': 'utilized',
      'good at': 'proficient in',
      'know': 'experienced with',
    };

    Object.entries(weakWords).forEach(([weak, strong]) => {
      if (lowerText.includes(weak)) {
        replacements.push({
          current: weak,
          suggested: strong,
          reason: `"${strong}" is more impactful and ATS-friendly than "${weak}"`,
        });
      }
    });

    return replacements;
  }

  async saveCheckResult(userId: string, result: AtsCheckResult, resumeText?: string): Promise<AtsCheck> {
    const check = this.atsCheckRepository.create({
      userId,
      score: result.score,
      keywordMatches: result.keywordMatches,
      totalKeywords: result.totalKeywords,
      wordCount: result.wordCount,
      fileSize: result.fileSize,
      suggestions: result.suggestions,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      companyComparisons: {}, // No longer used, kept for backward compatibility
      detailedAnalysis: result.detailedAnalysis,
      resumeText: resumeText || null, // Store resume text for premium features
    });
    return await this.atsCheckRepository.save(check);
  }

  async getUserChecks(userId: string): Promise<AtsCheck[]> {
    return this.atsCheckRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50, // Limit to last 50 checks
    });
  }

  async getCheckById(id: string, userId: string): Promise<AtsCheck> {
    const check = await this.atsCheckRepository.findOne({
      where: { id, userId },
    });
    if (!check) {
      throw new NotFoundException('Check not found');
    }
    return check;
  }
}

