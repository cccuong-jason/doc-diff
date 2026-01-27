import { parseDocx } from './docx-parser';
import { parsePdf } from './pdf-parser';
import { parseXlsx } from './xlsx-parser';
import type { DocumentContent, DocumentFormat } from '@/types/document';

/**
 * Detect document format from file extension
 */
export function detectFormat(file: File): DocumentFormat | null {
    const extension = file.name.split('.').pop()?.toLowerCase();

    switch (extension) {
        case 'docx':
        case 'doc':
            return 'docx';
        case 'pdf':
            return 'pdf';
        case 'xlsx':
        case 'xls':
            return 'xlsx';
        default:
            return null;
    }
}

/**
 * Get supported file extensions
 */
export function getSupportedExtensions(): string[] {
    return ['.docx', '.doc', '.pdf', '.xlsx', '.xls'];
}

/**
 * Get accept string for file input
 */
export function getAcceptString(): string {
    return '.docx,.doc,.pdf,.xlsx,.xls,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';
}

/**
 * Parse any supported document format
 */
export async function parseDocument(file: File): Promise<DocumentContent> {
    const format = detectFormat(file);

    if (!format) {
        throw new Error(`Unsupported file format: ${file.name}`);
    }

    switch (format) {
        case 'docx':
            return parseDocx(file);
        case 'pdf':
            return parsePdf(file);
        case 'xlsx':
            return parseXlsx(file);
        default:
            throw new Error(`Parser not implemented for format: ${format}`);
    }
}

export { parseDocx, parsePdf, parseXlsx };
