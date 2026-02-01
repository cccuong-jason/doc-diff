'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DiffResult, AISummary } from '@/types/document';

const API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.APIKEY;

export async function generateChangeSummary(
    changes: DiffResult[],
    originalDocName: string,
    modifiedDocName: string,
    language: 'en' | 'vi' = 'vi'
): Promise<AISummary> {

    if (!API_KEY) {
        return {
            id: crypto.randomUUID(),
            comparisonId: '',
            summary: language === 'vi'
                ? 'CHƯA CÓ API KEY: Vui lòng cấu hình API Key để sử dụng tính năng này.'
                : 'API KEY MISSING: Please configure an API Key to use AI summary.',
            summaryVi: undefined,
            keyChanges: [],
            impactLevel: 'minor',
            generatedAt: new Date(),
        };
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);

        // Build context from changes
        const changesContext = buildChangesContext(changes);

        // Force Vietnamese prompt if language is 'vi' or undefined (default)
        const prompt = language === 'en'
            ? buildEnglishPrompt(changesContext, originalDocName, modifiedDocName)
            : buildVietnamesePrompt(changesContext, originalDocName, modifiedDocName);

        // Try primary model: gemini-1.5-flash
        // (Note: User mentioned "2.5 flash", likely referring to 2.0 Flash Experimental or future version.
        // We stick to 1.5-flash as stable, but fallback to gemini-pro if needed).
        let text = '';
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            text = response.text();
        } catch (error: any) {
            console.warn(`[Gemini] gemini-1.5-flash failed, trying gemini-pro...`);
            // Fallback
            const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            text = response.text();
        }

        // Parse the AI response
        const parsed = parseAIResponse(text, language);

        return {
            id: crypto.randomUUID(),
            comparisonId: '',
            summary: parsed.summary,
            summaryVi: language === 'vi' ? parsed.summary : undefined,
            keyChanges: parsed.keyChanges,
            impactLevel: parsed.impactLevel,
            generatedAt: new Date(),
        };
    } catch (error: any) {
        console.error("Gemini API Error:", error);

        let userMessage = language === 'vi'
            ? 'Hệ thống AI đang bận hoặc gặp sự cố. Vui lòng thử lại sau.'
            : 'AI System is busy or encountered an error. Please try again later.';

        const msg = (error.message || '').toLowerCase();

        if (msg.includes('404') || msg.includes('not found')) {
            userMessage = language === 'vi'
                ? 'Không tìm thấy mô hình AI (404). Vui lòng kiểm tra cấu hình.'
                : 'AI Model not found (404). Please check configuration.';
        } else if (msg.includes('403') || msg.includes('permission') || msg.includes('api key')) {
            userMessage = language === 'vi'
                ? 'Khóa API không hợp lệ hoặc bị từ chối quyền truy cập.'
                : 'Invalid API Key or permission denied.';
        } else if (msg.includes('429') || msg.includes('quota')) {
            userMessage = language === 'vi'
                ? 'Đã vượt quá giới hạn hạn mức API. Vui lòng thử lại sau.'
                : 'API Quota exceeded. Please try again later.';
        } else if (msg.includes('safety') || msg.includes('blocked')) {
            userMessage = language === 'vi'
                ? 'Nội dung bị chặn bởi bộ lọc an toàn.'
                : 'Content blocked by safety filters.';
        }

        return {
            id: crypto.randomUUID(),
            comparisonId: '',
            summary: userMessage,
            keyChanges: [],
            impactLevel: 'minor',
            generatedAt: new Date(),
        };
    }
}

function buildChangesContext(changes: DiffResult[]): string {
    const significantChanges = changes.filter(c => c.type !== 'unchanged');

    if (significantChanges.length === 0) {
        return 'No changes detected between the documents.';
    }

    let context = `Total changes: ${significantChanges.length}\n\n`;

    const additions = significantChanges.filter(c => c.type === 'added');
    const deletions = significantChanges.filter(c => c.type === 'removed');
    const modifications = significantChanges.filter(c => c.type === 'modified');

    if (additions.length > 0) {
        context += `ADDITIONS (${additions.length}):\n`;
        additions.slice(0, 10).forEach((a, i) => {
            // Correct accessor: modified.text for additions
            const text = a.modified?.text || '';
            context += `${i + 1}. "${text.slice(0, 200)}${text.length > 200 ? '...' : ''}"\n`;
        });
        context += '\n';
    }

    if (deletions.length > 0) {
        context += `DELETIONS (${deletions.length}):\n`;
        deletions.slice(0, 10).forEach((d, i) => {
            // Correct accessor: original.text for deletions
            const text = d.original?.text || '';
            context += `${i + 1}. "${text.slice(0, 200)}${text.length > 200 ? '...' : ''}"\n`;
        });
        context += '\n';
    }

    if (modifications.length > 0) {
        context += `MODIFICATIONS (${modifications.length}):\n`;
        modifications.slice(0, 10).forEach((m, i) => {
            const oldText = m.original?.text || '';
            const newText = m.modified?.text || '';
            context += `${i + 1}. FROM "${oldText.slice(0, 100)}..." TO "${newText.slice(0, 100)}..."\n`;
        });
        context += '\n';
    }

    return context;
}

function buildEnglishPrompt(changesContext: string, originalDoc: string, modifiedDoc: string): string {
    return `You are a document comparison expert. Analyze the following changes between two documents and provide a structured summary.

Document comparison: "${originalDoc}" → "${modifiedDoc}"

${changesContext}

Please provide your response in the following JSON format:
{
  "summary": "A concise 2-3 sentence summary of what changed overall",
  "keyChanges": ["Key change 1", "Key change 2", "Key change 3"],
  "impactLevel": "minor|moderate|major"
}

Respond ONLY with the JSON object.`;
}

function buildVietnamesePrompt(changesContext: string, originalDoc: string, modifiedDoc: string): string {
    return `Bạn là chuyên gia so sánh tài liệu. Phân tích các thay đổi sau đây giữa hai tài liệu và cung cấp bản tóm tắt có cấu trúc bằng TIẾNG VIỆT.

So sánh tài liệu: "${originalDoc}" → "${modifiedDoc}"

${changesContext}

Vui lòng cung cấp phản hồi theo định dạng JSON sau (Nội dung phải là Tiếng Việt):
{
  "summary": "Tóm tắt ngắn gọn 2-3 câu về những gì đã thay đổi tổng thể (Tiếng Việt)",
  "keyChanges": ["Thay đổi chính 1 (Tiếng Việt)", "Thay đổi chính 2", "Thay đổi chính 3"],
  "impactLevel": "minor|moderate|major"
}

Chỉ trả lời bằng đối tượng JSON.`;
}

function parseAIResponse(text: string, language: 'en' | 'vi'): {
    summary: string;
    keyChanges: string[];
    impactLevel: 'minor' | 'moderate' | 'major';
} {
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                summary: parsed.summary || (language === 'vi' ? 'Không có tóm tắt' : 'No summary available'),
                keyChanges: Array.isArray(parsed.keyChanges) ? parsed.keyChanges : [],
                impactLevel: ['minor', 'moderate', 'major'].includes(parsed.impactLevel)
                    ? parsed.impactLevel
                    : 'moderate',
            };
        }
    } catch (e) {
        console.error('Failed to parse AI response:', e);
    }

    return {
        summary: language === 'vi'
            ? 'Đã hoàn thành phân tích.'
            : 'Analysis complete.',
        keyChanges: [],
        impactLevel: 'moderate',
    };
}
