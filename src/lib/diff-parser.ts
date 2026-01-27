
export interface DiffChange {
    id: string;
    type: 'added' | 'removed' | 'modified';
    text: string; // For modified, this is the NEW text
    oldText?: string; // For modified, this is the OLD text
    index: number;
}

export function parseDiffChanges(html: string): { changes: DiffChange[], injectedHtml: string } {
    if (typeof window === 'undefined') return { changes: [], injectedHtml: html }; // Server-side safety
    if (!html) return { changes: [], injectedHtml: '' };

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const changes: DiffChange[] = [];
    let index = 0;

    // Get all ins and del elements in document order
    const elements = Array.from(doc.querySelectorAll('ins, del'));

    const processedElements = new Set<Element>();

    for (let i = 0; i < elements.length; i++) {
        const current = elements[i];
        if (processedElements.has(current)) continue;

        const next = i + 1 < elements.length ? elements[i + 1] : null;

        const currentType = current.tagName.toLowerCase() === 'ins' ? 'added' : 'removed';
        const currentText = current.textContent?.trim() || '';

        if (!currentText) continue;

        // Check for Replacement (Replaced): del followed by ins (or ins followed by del, though diff usually puts del first)
        // Usually: <del>old</del><ins>new</ins>
        // We also check if they are "close" in DOM? 
        // querySelectorAll returns them in order. If they are adjacent siblings or close, we merge.
        // For simplicity, if they are consecutive in our list and the next one is the opposite type, we merge.
        // But strictly, a "replacement" is a del immediately followed by an ins.

        let isReplaced = false;
        if (next && !processedElements.has(next)) {
            const nextType = next.tagName.toLowerCase() === 'ins' ? 'added' : 'removed';
            // If current is removed and next is added (typical replacement)
            if (currentType === 'removed' && nextType === 'added') {
                // Check if they are effectively adjacent?
                // We'll assume yes if they are consecutive in our list. 
                // (Refinement: Check if next.previousSibling === current? Or just assume diff tool output structure)
                isReplaced = true;
            }
        }

        const changeId = `change-${index}`;

        if (isReplaced && next) {
            const nextText = next.textContent?.trim() || '';
            changes.push({
                id: changeId,
                type: 'modified',
                text: nextText.length > 200 ? nextText.substring(0, 200) + '...' : nextText,
                oldText: currentText.length > 200 ? currentText.substring(0, 200) + '...' : currentText,
                index
            });

            current.id = changeId;
            current.setAttribute('data-diff-id', changeId);
            current.setAttribute('data-diff-type', 'modified-old');

            next.setAttribute('data-diff-id', changeId);
            next.setAttribute('data-diff-type', 'modified-new');
            next.id = `${changeId}-new`;

            processedElements.add(current);
            processedElements.add(next);
        } else {
            changes.push({
                id: changeId,
                type: currentType,
                text: currentText.length > 200 ? currentText.substring(0, 200) + '...' : currentText,
                index
            });

            current.id = changeId;
            current.setAttribute('data-diff-id', changeId);
            current.setAttribute('data-diff-type', currentType);

            processedElements.add(current);
        }
        index++;
    }

    return { changes, injectedHtml: doc.body.innerHTML };
}
