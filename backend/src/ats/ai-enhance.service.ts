import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface EnhancementResult {
    enhanced: string;
    suggestions: string[];
    actionVerbs: string[];
    keywords: string[];
}

@Injectable()
export class AiEnhanceService {
    private readonly logger = new Logger(AiEnhanceService.name);

    // Using HuggingFace Inference API - free tier
    // You can use: mistralai/Mistral-7B-Instruct-v0.3 or HuggingFaceH4/zephyr-7b-beta
    private readonly HF_API_URL = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3';
    private readonly HF_API_KEY = process.env.HUGGINGFACE_API_KEY || '';

    async enhanceResumeText(text: string, type: 'bullet' | 'summary' | 'full'): Promise<EnhancementResult> {
        if (!this.HF_API_KEY) {
            this.logger.warn('HuggingFace API key not configured, using fallback enhancement');
            return this.fallbackEnhancement(text, type);
        }

        try {
            const prompt = this.buildPrompt(text, type);

            const response = await axios.post(
                this.HF_API_URL,
                {
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: 500,
                        temperature: 0.7,
                        top_p: 0.9,
                        do_sample: true,
                        return_full_text: false,
                    },
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.HF_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                }
            );

            const generatedText = response.data[0]?.generated_text || '';
            return this.parseEnhancedResponse(generatedText, text);
        } catch (error) {
            this.logger.error('HuggingFace API error:', error);
            return this.fallbackEnhancement(text, type);
        }
    }

    private buildPrompt(text: string, type: string): string {
        if (type === 'bullet') {
            return `<s>[INST] You are a professional resume writer. Improve this bullet point to be more impactful. Use strong action verbs, add quantifiable results where possible, and make it ATS-friendly.

Original: "${text}"

Provide ONLY the improved bullet point, nothing else. [/INST]`;
        }

        if (type === 'summary') {
            return `<s>[INST] You are a professional resume writer. Improve this professional summary to be more compelling and ATS-optimized. Keep it concise (2-3 sentences).

Original: "${text}"

Provide ONLY the improved summary, nothing else. [/INST]`;
        }

        return `<s>[INST] You are a professional resume writer. Analyze and improve this resume content. Focus on:
1. Stronger action verbs
2. Quantifiable achievements
3. Industry keywords
4. Clear, concise language

Content: "${text}"

Provide the improved version and list 3 key improvements made. [/INST]`;
    }

    private parseEnhancedResponse(response: string, original: string): EnhancementResult {
        // Clean up the response
        let enhanced = response.trim();

        // Remove any markdown or extra formatting
        enhanced = enhanced.replace(/^\*\*.*?\*\*\s*/g, '');
        enhanced = enhanced.replace(/^[-•]\s*/g, '');

        // Extract suggestions if present
        const suggestions = this.extractSuggestions(enhanced);

        // If parsing fails, return cleaned response
        if (!enhanced || enhanced.length < 10) {
            enhanced = original;
        }

        return {
            enhanced,
            suggestions: suggestions.length > 0 ? suggestions : [
                'Added stronger action verbs',
                'Improved clarity and impact',
                'Made content more ATS-friendly',
            ],
            actionVerbs: this.extractActionVerbs(enhanced),
            keywords: this.extractKeywords(enhanced),
        };
    }

    private extractSuggestions(text: string): string[] {
        const suggestions: string[] = [];
        const lines = text.split('\n');

        for (const line of lines) {
            if (line.match(/^\d+\.|^-|^•/)) {
                suggestions.push(line.replace(/^\d+\.\s*|^[-•]\s*/, '').trim());
            }
        }

        return suggestions.slice(0, 5);
    }

    private extractActionVerbs(text: string): string[] {
        const actionVerbs = [
            'achieved', 'improved', 'developed', 'managed', 'implemented',
            'created', 'designed', 'built', 'led', 'increased', 'optimized',
            'delivered', 'executed', 'launched', 'established', 'generated',
            'reduced', 'enhanced', 'streamlined', 'coordinated', 'analyzed',
            'spearheaded', 'orchestrated', 'pioneered', 'transformed',
        ];

        const found: string[] = [];
        const lowerText = text.toLowerCase();

        for (const verb of actionVerbs) {
            if (lowerText.includes(verb)) {
                found.push(verb);
            }
        }

        return found;
    }

    private extractKeywords(text: string): string[] {
        const keywords = [
            'project management', 'team leadership', 'data analysis',
            'strategic planning', 'cross-functional', 'stakeholder',
            'revenue growth', 'cost reduction', 'performance improvement',
            'agile', 'scrum', 'software development', 'customer success',
        ];

        const found: string[] = [];
        const lowerText = text.toLowerCase();

        for (const keyword of keywords) {
            if (lowerText.includes(keyword)) {
                found.push(keyword);
            }
        }

        return found;
    }

    // Fallback when API is not available
    private fallbackEnhancement(text: string, type: string): EnhancementResult {
        let enhanced = text;
        const suggestions: string[] = [];

        // Simple rule-based improvements
        const weakVerbs = {
            'helped': 'facilitated',
            'worked on': 'developed',
            'was responsible for': 'managed',
            'did': 'executed',
            'made': 'created',
            'got': 'achieved',
            'used': 'leveraged',
            'had': 'maintained',
        };

        for (const [weak, strong] of Object.entries(weakVerbs)) {
            if (text.toLowerCase().includes(weak)) {
                enhanced = enhanced.replace(new RegExp(weak, 'gi'), strong);
                suggestions.push(`Replaced "${weak}" with "${strong}" for stronger impact`);
            }
        }

        // Add quantification suggestion if no numbers present
        if (!/\d+/.test(text)) {
            suggestions.push('Consider adding quantifiable metrics (e.g., percentages, dollar amounts, team sizes)');
        }

        // Check for passive voice patterns
        if (/was\s+\w+ed|were\s+\w+ed|been\s+\w+ed/i.test(text)) {
            suggestions.push('Convert passive voice to active voice for stronger impact');
        }

        return {
            enhanced,
            suggestions: suggestions.length > 0 ? suggestions : [
                'Add specific metrics and numbers',
                'Use stronger action verbs',
                'Include industry-relevant keywords',
            ],
            actionVerbs: this.extractActionVerbs(enhanced),
            keywords: this.extractKeywords(enhanced),
        };
    }

    // Enhance multiple bullet points
    async enhanceBulletPoints(bullets: string[]): Promise<string[]> {
        const enhanced: string[] = [];

        for (const bullet of bullets) {
            const result = await this.enhanceResumeText(bullet, 'bullet');
            enhanced.push(result.enhanced);
        }

        return enhanced;
    }

    // Generate suggestions for missing sections
    async generateSectionContent(
        sectionType: 'summary' | 'skills' | 'experience',
        context: { title?: string; industry?: string; experience?: string }
    ): Promise<string> {
        if (!this.HF_API_KEY) {
            return this.getFallbackContent(sectionType, context);
        }

        const prompt = this.buildSectionPrompt(sectionType, context);

        try {
            const response = await axios.post(
                this.HF_API_URL,
                {
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: 300,
                        temperature: 0.8,
                        top_p: 0.9,
                    },
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.HF_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                }
            );

            return response.data[0]?.generated_text?.trim() || this.getFallbackContent(sectionType, context);
        } catch (error) {
            return this.getFallbackContent(sectionType, context);
        }
    }

    private buildSectionPrompt(
        sectionType: string,
        context: { title?: string; industry?: string }
    ): string {
        const { title = 'Professional', industry = 'Technology' } = context;

        if (sectionType === 'summary') {
            return `<s>[INST] Write a professional resume summary for a ${title} in the ${industry} industry. Keep it to 2-3 sentences, focusing on key skills and achievements. [/INST]`;
        }

        if (sectionType === 'skills') {
            return `<s>[INST] List 8-10 relevant technical and soft skills for a ${title} in the ${industry} industry. Format as comma-separated values. [/INST]`;
        }

        return `<s>[INST] Write 3 impactful bullet points for a ${title} position in ${industry}. Use strong action verbs and include metrics. [/INST]`;
    }

    private getFallbackContent(
        sectionType: string,
        context: { title?: string; industry?: string }
    ): string {
        const { title = 'Professional' } = context;

        if (sectionType === 'summary') {
            return `Results-driven ${title} with proven track record of delivering high-impact solutions. Skilled in strategic planning, team leadership, and driving measurable business outcomes.`;
        }

        if (sectionType === 'skills') {
            return 'Project Management, Team Leadership, Data Analysis, Strategic Planning, Communication, Problem Solving, Stakeholder Management, Process Improvement';
        }

        return '• Led cross-functional initiatives resulting in 25% improvement in efficiency\n• Managed team of 5+ professionals to deliver projects on time and within budget\n• Developed and implemented strategies that increased revenue by $500K annually';
    }
}
