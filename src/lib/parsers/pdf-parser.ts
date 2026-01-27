import type { DocumentContent, Paragraph, DocumentMetadata } from '@/types/document';

/**
 * Parse PDF file and extract text content
 * Uses dynamic import to avoid SSR issues with pdfjs-dist
 */
export async function parsePdf(file: File): Promise<DocumentContent> {
    // Dynamically import pdfjs-dist to avoid SSR issues
    const pdfjsLib = await import('pdfjs-dist');

    // Configure PDF.js worker
    // Use unpkg as a reliable CDN for the worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const paragraphs: Paragraph[] = [];
    let rawContent = '';
    let paragraphIndex = 0;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Group text items into paragraphs
        let currentParagraph = '';
        let lastY = -1;

        for (const item of textContent.items) {
            if ('str' in item) {
                const textItem = item as { str: string; transform: number[] };
                const y = textItem.transform[5];

                // New line detected (y position changed significantly)
                if (lastY !== -1 && Math.abs(y - lastY) > 5) {
                    if (currentParagraph.trim()) {
                        paragraphs.push({
                            id: `p-${paragraphIndex++}`,
                            text: currentParagraph.trim(),
                            position: { page: pageNum, index: paragraphIndex },
                        });
                        rawContent += currentParagraph.trim() + '\n';
                    }
                    currentParagraph = '';
                }

                currentParagraph += textItem.str + ' ';
                lastY = y;
            }
        }

        // Don't forget the last paragraph on the page
        if (currentParagraph.trim()) {
            paragraphs.push({
                id: `p-${paragraphIndex++}`,
                text: currentParagraph.trim(),
                position: { page: pageNum, index: paragraphIndex },
            });
            rawContent += currentParagraph.trim() + '\n';
        }
    }

    const metadata: DocumentMetadata = {
        fileName: file.name,
        fileSize: file.size,
        format: 'pdf',
        pageCount: pdf.numPages,
    };

    return {
        id: crypto.randomUUID(),
        name: file.name,
        format: 'pdf',
        uploadedAt: new Date(),
        paragraphs,
        metadata,
        rawContent,
    };
}
