
export interface DiffChange {
    id: string;
    type: 'added' | 'removed' | 'modified';
    text: string; // For modified, this is the NEW text
    oldText?: string; // For modified, this is the OLD text
    index: number;
}

export function parseDiffChanges(html: string): { changes: DiffChange[], injectedHtml: string } {
    if (typeof window === 'undefined') return { changes: [], injectedHtml: html };
    if (!html) return { changes: [], injectedHtml: '' };

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const changes: DiffChange[] = [];
    let index = 0;

    const elements = Array.from(doc.querySelectorAll('ins, del'));
    const processedElements = new Set<Element>();

    for (let i = 0; i < elements.length; i++) {
        const current = elements[i];
        if (processedElements.has(current)) continue;

        const currentType = current.tagName.toLowerCase() === 'ins' ? 'added' : 'removed';
        const currentText = current.textContent || ''; // Allow empty text if semantic?

        const changeId = `change-${index}`;

        // Check for Replacement (Modified)
        // A replacement is typically a DEL followed immediately by an INS
        // We look ahead to n+1
        let isReplaced = false;
        let nextElement: Element | null = null;

        if (i + 1 < elements.length) {
            const next = elements[i + 1];
            // Check if next is not processed (it shouldn't be)
            if (!processedElements.has(next)) {
                const nextType = next.tagName.toLowerCase() === 'ins' ? 'added' : 'removed';
                // If current is removed and next is added
                if (currentType === 'removed' && nextType === 'added') {
                    // Check adjacency:
                    // Ideally next should be the immediate next sibling or close to it.
                    // But html-diff-js might output them together.
                    // We'll trust the order in the list for now implies semantic replacement if they are close.
                    isReplaced = true;
                    nextElement = next;
                }
            }
        }

        if (isReplaced && nextElement) {
            const nextText = nextElement.textContent || '';

            // Create Modified Change
            changes.push({
                id: changeId,
                type: 'modified',
                text: nextText,
                oldText: currentText,
                index
            });

            // Tag both elements
            current.id = changeId;
            current.setAttribute('data-diff-id', changeId);
            current.setAttribute('data-diff-type', 'modified-old');

            nextElement.id = `${changeId}-new`;
            nextElement.setAttribute('data-diff-id', changeId);
            nextElement.setAttribute('data-diff-type', 'modified-new');

            processedElements.add(current);
            processedElements.add(nextElement);
        } else {
            // Single Addition or Removal
            changes.push({
                id: changeId,
                type: currentType,
                text: currentText,
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
