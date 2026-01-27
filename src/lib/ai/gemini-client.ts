import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DiffResult, AISummary } from '@/types/document';

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

/**
 * Generate AI summary of document changes
 */
export async function generateChangeSummary(
    changes: DiffResult[],
    originalDocName: string,
    modifiedDocName: string,
    language: 'en' | 'vi' = 'en'
): Promise<AISummary> {
    console.log(`[Gemini] Starting generation through model: gemini-1.5-flash`);
    console.log(`[Gemini] API Key: ${API_KEY}`);
    if (!API_KEY) {
        console.warn('Gemini API key not configured');
        return {
            id: crypto.randomUUID(),
            comparisonId: '',
            summary: language === 'vi'
                ? 'Chức năng tóm tắt AI chưa được cấu hình. Vui lòng kiểm tra API Key.'
                : 'AI Summary is not configured. Please check your API Key.',
            summaryVi: undefined,
            keyChanges: [],
            impactLevel: 'minor',
            generatedAt: new Date(),
        };
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Build context from changes
    const changesContext = buildChangesContext(changes);

    const prompt = language === 'vi'
        ? buildVietnamesePrompt(changesContext, originalDocName, modifiedDocName)
        : buildEnglishPrompt(changesContext, originalDocName, modifiedDocName);

    console.log(`[Gemini] Starting generation through model: gemini-1.5-flash`);
    console.log(`[Gemini] Prompt length: ${prompt.length}`);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log(`[Gemini] Response received: ${text.substring(0, 100)}...`);

    // Parse the AI response
    const parsed = parseAIResponse(text, language);

    return {
        id: crypto.randomUUID(),
        comparisonId: '', // Will be set by caller
        summary: parsed.summary,
        summaryVi: language === 'vi' ? parsed.summary : undefined,
        keyChanges: parsed.keyChanges,
        impactLevel: parsed.impactLevel,
        generatedAt: new Date(),
    };
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
            context += `${i + 1}. "${a.modified?.text?.slice(0, 200)}..."\n`;
        });
        context += '\n';
    }

    if (deletions.length > 0) {
        context += `DELETIONS (${deletions.length}):\n`;
        deletions.slice(0, 10).forEach((d, i) => {
            context += `${i + 1}. "${d.original?.text?.slice(0, 200)}..."\n`;
        });
        context += '\n';
    }

    if (modifications.length > 0) {
        context += `MODIFICATIONS (${modifications.length}):\n`;
        modifications.slice(0, 10).forEach((m, i) => {
            context += `${i + 1}. FROM: "${m.original?.text?.slice(0, 100)}..." TO: "${m.modified?.text?.slice(0, 100)}..."\n`;
        });
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

Guidelines:
- "minor": Small formatting or typo fixes
- "moderate": Content updates that don't change meaning significantly
- "major": Significant content changes, additions, or deletions

Respond ONLY with the JSON object, no additional text.`;
}

function buildVietnamesePrompt(changesContext: string, originalDoc: string, modifiedDoc: string): string {
    return `Bạn là chuyên gia so sánh tài liệu. Phân tích các thay đổi sau đây giữa hai tài liệu và cung cấp bản tóm tắt có cấu trúc.

So sánh tài liệu: "${originalDoc}" → "${modifiedDoc}"

${changesContext}

Vui lòng cung cấp phản hồi theo định dạng JSON sau:
{
  "summary": "Tóm tắt ngắn gọn 2-3 câu về những gì đã thay đổi tổng thể",
  "keyChanges": ["Thay đổi chính 1", "Thay đổi chính 2", "Thay đổi chính 3"],
  "impactLevel": "minor|moderate|major"
}

Hướng dẫn:
- "minor": Sửa lỗi định dạng nhỏ hoặc lỗi chính tả
- "moderate": Cập nhật nội dung không thay đổi ý nghĩa đáng kể
- "major": Thay đổi nội dung quan trọng, bổ sung hoặc xóa

Chỉ trả lời bằng đối tượng JSON, không có văn bản bổ sung.`;
}

function parseAIResponse(text: string, language: 'en' | 'vi'): {
    summary: string;
    keyChanges: string[];
    impactLevel: 'minor' | 'moderate' | 'major';
} {
    try {
        // Try to extract JSON from response
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

    // Fallback
    return {
        summary: language === 'vi'
            ? 'Đã phát hiện thay đổi giữa các tài liệu.'
            : 'Changes detected between documents.',
        keyChanges: [],
        impactLevel: 'moderate',
    };
}
