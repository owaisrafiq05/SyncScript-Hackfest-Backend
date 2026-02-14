import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppLoggerService } from 'src/common/services/logger.service';
import { throwError } from 'src/common/utils/helpers';

const ENHANCE_SYSTEM_PROMPT = `You are a helpful assistant that improves research annotation notes written in Markdown.
Given markdown content, you will:
- Fix grammar and spelling
- Improve clarity and flow
- Preserve all markdown formatting (headers, lists, code blocks, links)
- Keep the same structure and intent; do not add new sections or remove content
- Return ONLY the enhanced markdown, no preamble or explanation`;

@Injectable()
export class GeminiEnhanceService {
  private readonly logger = new AppLoggerService(GeminiEnhanceService.name);

  constructor(private readonly configService: ConfigService) {}

  async enhanceMarkdown(contentMarkdown: string): Promise<string> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey?.trim()) {
      this.logger.warn('GEMINI_API_KEY is not set');
      throw throwError(
        'AI enhance is not configured (missing GEMINI_API_KEY)',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const trimmed = contentMarkdown?.trim() ?? '';
    if (!trimmed) {
      throw throwError('Content is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: ENHANCE_SYSTEM_PROMPT,
      });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: trimmed }] }],
      });
      const response = result.response;
      if (!response?.text) {
        throw new Error('Empty response from Gemini');
      }
      return response.text().trim();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gemini request failed';
      this.logger.error('Gemini enhance failed', err instanceof Error ? err.stack : String(err), GeminiEnhanceService.name);
      throw throwError(message, HttpStatus.BAD_GATEWAY);
    }
  }
}
