import type { DocumentContent, Paragraph, DocumentMetadata } from '@/types/document';

/**
 * Parse PDF file and extract text content
 * Uses dynamic import to avoid SSR issues with pdfjs-dist
 */
export async function parsePdf(file: File): Promise<DocumentContent> {
    try {
        // Dynamically import pdfjs-dist to avoid SSR issues
        const pdfjsLib = await import('pdfjs-dist');

        // Configure PDF.js worker
        // We use the specific version to ensure compatibility
        // If the version is not available on the object, fallback to a known compatible version or the package version
        const version = pdfjsLib.version || '4.10.38';
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();

        // Load the document
        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            useSystemFonts: true, // Use system fonts to avoid font loading errors
        });

        const pdf = await loadingTask.promise;
        const paragraphs: Paragraph[] = [];
        let rawContent = '';
        let paragraphIndex = 0;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            // Sort items by vertical position first (top to bottom), then horizontal (left to right)
            // The transform[5] is the y-coordinate (origin at bottom-left in PDF usually, but pdf.js normalizes)
            // Note: PDF coordinates: (0,0) is usually bottom-left. 
            // We want to process top-to-bottom. Higher y means higher up on the page.
            const items = textContent.items.filter((item) => 'str' in item) as any[];

            // Simple sorting might be needed if the PDF stream order isn't visual order
            // items.sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);

            let currentParagraph = '';
            let lastY = -1;

            for (const item of items) {
                const text = item.str;
                const y = item.transform[5];

                // Check for new line/paragraph
                // If y changes significantly (e.g., > 10 units), treat as new line
                if (lastY !== -1 && Math.abs(y - lastY) > 8) {
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

                // Append text (add space if needed, though PDF text extraction is tricky with spacing)
                // We'll add a space if the previous char wasn't a space
                if (currentParagraph && !currentParagraph.endsWith(' ') && !text.startsWith(' ')) {
                    currentParagraph += ' ';
                }
                currentParagraph += text;
                lastY = y;
            }

            // Flush last paragraph of the page
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

        // Generate simple HTML for visual diff
        const htmlContent = paragraphs.map(p => `<p id="${p.id}">${p.text}</p>`).join('');

        return {
            id: crypto.randomUUID(),
            name: file.name,
            format: 'pdf',
            uploadedAt: new Date(),
            paragraphs,
            metadata,
            rawContent,
            htmlContent,
            fileUrl: typeof window !== 'undefined' ? URL.createObjectURL(file) : undefined,
        };
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error(`Failed to parse PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
