import type { DocumentContent, DiffResult, MergeAction } from '@/types/document';

/**
 * Generate merged content based on original document and merge actions.
 * 
 * Strategy:
 * - We reconstruct the content by iterating through the diffs.
 * - Current Diff Engine logic:
 *   - 'added': New text in Modified.
 *   - 'removed': Text removed from Original.
 *   - 'modified': Text changed from Original to Modified.
 *   - 'unchanged': Text in both.
 * 
 * Merge Logic:
 * - Diffs are largely linear if we follow the "Unified" flow.
 * - However, our `diffs` array is a flat list of changes.
 * 
 * We need to be careful about order. The `diffs` array returned by `compareDocuments`
 * is generally in order of appearance.
 */
export function generateMergedContent(
    original: DocumentContent,
    diffs: DiffResult[],
    actions: MergeAction[]
): string {
    let content = '';
    const actionMap = new Map(actions.map(a => [a.diffId, a.action]));

    // We process diffs in order.
    // Assumption: The diffs array covers the entire document content (unchanged parts included).
    // If `diffs` only contains changes, we might miss unchanged parts if the diff implementation isn't "full coverage".
    // Looking at `diff-engine.ts`, it uses `Diff.diffArrays` on paragraphs and pushes 'unchanged' diffs too.
    // So iterating `diffs` should reconstruct the full file.

    diffs.forEach(diff => {
        const action = actionMap.get(diff.id);

        switch (diff.type) {
            case 'unchanged':
                // Always keep unchanged content
                if (diff.original) {
                    content += diff.original.text + '\n';
                } else if (diff.modified) {
                    content += diff.modified.text + '\n';
                }
                break;

            case 'added':
                // It's in Modified, not in Original.
                // If ACCEPT -> Include it. (Treat as "Yes, add this")
                // If REJECT -> Exclude it. (Treat as "No, don't add this")
                // If PENDING/None -> Default: IGNORE (Don't add). Keep Original state.
                if (action === 'accept') {
                    if (diff.modified) {
                        content += diff.modified.text + '\n';
                    }
                }
                break;

            case 'removed':
                // It was in Original, removal proposed.
                // If ACCEPT -> Remove it (Don't include).
                // If REJECT -> Keep it (Include it).
                // If PENDING/None -> Default: IGNORE (Keep it). Keep Original state.
                if (action === 'reject' || !action) {
                    if (diff.original) {
                        content += diff.original.text + '\n';
                    }
                }
                break;

            case 'modified':
                // Changed from Old to New.
                // If ACCEPT -> Use New.
                // If REJECT -> Use Old.
                // If PENDING/None -> Default: IGNORE (Use Old).
                if (action === 'accept') {
                    if (diff.modified) {
                        content += diff.modified.text + '\n';
                    }
                } else {
                    if (diff.original) {
                        content += diff.original.text + '\n';
                    }
                }
                break;
        }
    });

    return content;
}

/**
 * Generate HTML representation of merged content for export
 */
export function generateMergedHtml(
    original: DocumentContent,
    diffs: DiffResult[],
    actions: MergeAction[]
): string {
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Merged Document - ${original.name}</title>
        <style>
            body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; }
            p { margin-bottom: 1em; }
        </style>
    </head>
    <body>
    <h1>Merged: ${original.name}</h1>
    <hr/>
    `;

    const content = generateMergedContent(original, diffs, actions);

    // Simple line-break to paragraph conversion
    const paragraphs = content.split('\n');
    paragraphs.forEach(p => {
        if (p.trim()) {
            html += `<p>${p}</p>`;
        }
    });

    html += `
    </body>
    </html>
    `;

    return html;
}
