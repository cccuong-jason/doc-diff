import mammoth from 'mammoth';
import type { DocumentContent, Paragraph, DocumentMetadata, Table, TableCell } from '@/types/document';

/**
 * Parse DOCX file and extract content with HTML representation
 */
export async function parseDocx(file: File): Promise<DocumentContent> {
    const arrayBuffer = await file.arrayBuffer();

    // Extract text with mammoth
    const textResult = await mammoth.extractRawText({ arrayBuffer });

    // Convert to styled HTML for preview
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });

    // Parse paragraphs from raw text
    const rawParagraphs = textResult.value.split('\n').filter(p => p.trim());
    const paragraphs: Paragraph[] = rawParagraphs.map((text, index) => ({
        id: `p-${index}`,
        text: text.trim(),
        position: { index },
    }));

    // Extract tables from HTML
    const tables = extractTablesFromHtml(htmlResult.value);

    const metadata: DocumentMetadata = {
        fileName: file.name,
        fileSize: file.size,
        format: 'docx',
    };

    return {
        id: crypto.randomUUID(),
        name: file.name,
        format: 'docx',
        uploadedAt: new Date(),
        paragraphs,
        tables,
        metadata,
        rawContent: textResult.value,
        htmlContent: wrapHtmlContent(htmlResult.value),
    };
}

/**
 * Wrap HTML content with proper styling
 */
function wrapHtmlContent(html: string): string {
    return `
    <div class="docx-content">
      <style>
        .docx-content {
          font-family: 'Segoe UI', system-ui, sans-serif;
          line-height: 1.6;
          color: inherit;
        }
        .docx-content h1 { font-size: 2em; font-weight: 700; margin: 1em 0 0.5em; }
        .docx-content h2 { font-size: 1.5em; font-weight: 600; margin: 0.8em 0 0.4em; }
        .docx-content h3 { font-size: 1.25em; font-weight: 600; margin: 0.6em 0 0.3em; }
        .docx-content p { margin: 0.5em 0; }
        .docx-content table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        .docx-content th, .docx-content td { 
          border: 1px solid rgba(128, 128, 128, 0.3); 
          padding: 8px 12px; 
          text-align: left; 
        }
        .docx-content th { background: rgba(128, 128, 128, 0.1); font-weight: 600; }
        .docx-content ul, .docx-content ol { margin: 0.5em 0; padding-left: 1.5em; }
        .docx-content li { margin: 0.25em 0; }
        .docx-content strong { font-weight: 600; }
        .docx-content em { font-style: italic; }
      </style>
      ${html}
    </div>
  `;
}

/**
 * Extract tables from HTML content
 */
function extractTablesFromHtml(html: string): Table[] {
    // Simple regex-based extraction since we're in a non-browser environment during build
    const tables: Table[] = [];
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;

    let tableMatch;
    let tableIndex = 0;

    while ((tableMatch = tableRegex.exec(html)) !== null) {
        const tableHtml = tableMatch[1];
        const rows: TableCell[][] = [];

        let rowMatch;
        while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
            const rowHtml = rowMatch[1];
            const cells: TableCell[] = [];

            let cellMatch;
            while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
                const cellText = cellMatch[1].replace(/<[^>]*>/g, '').trim();
                cells.push({
                    text: cellText,
                    rowSpan: 1,
                    colSpan: 1,
                });
            }

            if (cells.length > 0) {
                rows.push(cells);
            }
        }

        if (rows.length > 0) {
            tables.push({
                id: `table-${tableIndex}`,
                rows,
                position: { index: tableIndex },
            });
            tableIndex++;
        }
    }

    return tables;
}
