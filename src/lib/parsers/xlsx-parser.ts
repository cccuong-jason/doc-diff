import * as XLSX from 'xlsx';
import type { DocumentContent, Paragraph, DocumentMetadata, Table, TableCell } from '@/types/document';

/**
 * Parse Excel file and extract content
 */
export async function parseXlsx(file: File): Promise<DocumentContent> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const paragraphs: Paragraph[] = [];
    const tables: Table[] = [];
    let paragraphIndex = 0;
    let rawContent = '';

    workbook.SheetNames.forEach((sheetName, sheetIndex) => {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 });

        // Add sheet header as paragraph
        paragraphs.push({
            id: `p-${paragraphIndex++}`,
            text: `[Sheet: ${sheetName}]`,
            position: { sheet: sheetName, index: paragraphIndex },
        });
        rawContent += `[Sheet: ${sheetName}]\n`;

        // Convert to table structure
        const tableRows: TableCell[][] = [];

        // Cast to unknown first to satisfy TypeScript strict mode
        const rows = jsonData as unknown[];
        rows.forEach((row, rowIndex) => {
            if (Array.isArray(row) && row.length > 0) {
                const cells: TableCell[] = row.map(cell => ({
                    text: cell !== null && cell !== undefined ? String(cell) : '',
                }));
                tableRows.push(cells);

                // Also add as paragraph for text-based diff
                const rowText = row
                    .map(cell => (cell !== null && cell !== undefined ? String(cell) : ''))
                    .filter(Boolean)
                    .join(' | ');

                if (rowText.trim()) {
                    paragraphs.push({
                        id: `p-${paragraphIndex++}`,
                        text: rowText,
                        position: { sheet: sheetName, index: rowIndex },
                    });
                    rawContent += rowText + '\n';
                }
            }
        });

        if (tableRows.length > 0) {
            tables.push({
                id: `table-${sheetIndex}`,
                rows: tableRows,
                position: { sheet: sheetName, index: sheetIndex },
            });
        }

        rawContent += '\n';
    });

    const metadata: DocumentMetadata = {
        fileName: file.name,
        fileSize: file.size,
        format: 'xlsx',
        sheetCount: workbook.SheetNames.length,
    };

    return {
        id: crypto.randomUUID(),
        name: file.name,
        format: 'xlsx',
        uploadedAt: new Date(),
        paragraphs,
        tables,
        metadata,
        rawContent,
    };
}
