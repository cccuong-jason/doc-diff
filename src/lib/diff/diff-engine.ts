import * as Diff from 'diff';
import type {
    DocumentContent,
    Paragraph,
    DiffResult,
    WordDiff,
    ComparisonResult,
    ChangeType
} from '@/types/document';

/**
 * Compare two documents and generate diff results
 */
export function compareDocuments(
    original: DocumentContent,
    modified: DocumentContent
): ComparisonResult {
    const diffs: DiffResult[] = [];

    // Use line-based diff for paragraphs
    const originalLines = original.paragraphs.map(p => p.text);
    const modifiedLines = modified.paragraphs.map(p => p.text);

    const lineDiffs = Diff.diffArrays(originalLines, modifiedLines);

    let originalIndex = 0;
    let modifiedIndex = 0;

    lineDiffs.forEach(part => {
        if (part.added) {
            // New lines in modified document
            part.value.forEach((text) => {
                diffs.push({
                    id: crypto.randomUUID(),
                    type: 'added',
                    modified: {
                        id: modified.paragraphs[modifiedIndex]?.id || crypto.randomUUID(),
                        text,
                        position: { index: modifiedIndex },
                    },
                });
                modifiedIndex++;
            });
        } else if (part.removed) {
            // Lines removed from original
            part.value.forEach((text) => {
                diffs.push({
                    id: crypto.randomUUID(),
                    type: 'removed',
                    original: {
                        id: original.paragraphs[originalIndex]?.id || crypto.randomUUID(),
                        text,
                        position: { index: originalIndex },
                    },
                });
                originalIndex++;
            });
        } else {
            // Unchanged lines - but check for word-level changes
            part.value.forEach((text) => {
                const origPara = original.paragraphs[originalIndex];
                const modPara = modified.paragraphs[modifiedIndex];

                if (origPara && modPara && origPara.text !== modPara.text) {
                    // Word-level differences
                    const wordDiffs = getWordDiffs(origPara.text, modPara.text);
                    diffs.push({
                        id: crypto.randomUUID(),
                        type: 'modified',
                        original: origPara,
                        modified: modPara,
                        wordDiffs,
                    });
                } else {
                    diffs.push({
                        id: crypto.randomUUID(),
                        type: 'unchanged',
                        original: origPara,
                        modified: modPara,
                    });
                }
                originalIndex++;
                modifiedIndex++;
            });
        }
    });

    // Calculate statistics
    const stats = {
        totalChanges: diffs.filter(d => d.type !== 'unchanged').length,
        additions: diffs.filter(d => d.type === 'added').length,
        deletions: diffs.filter(d => d.type === 'removed').length,
        modifications: diffs.filter(d => d.type === 'modified').length,
        words: {
            added: 0,
            removed: 0
        },
        chars: {
            added: 0,
            removed: 0
        }
    };

    // Calculate word/char stats
    diffs.forEach(d => {
        if (d.type === 'added' && d.modified) {
            stats.words.added += d.modified.text.split(/\s+/).length;
            stats.chars.added += d.modified.text.length;
        } else if (d.type === 'removed' && d.original) {
            stats.words.removed += d.original.text.split(/\s+/).length;
            stats.chars.removed += d.original.text.length;
        } else if (d.type === 'modified' && d.original && d.modified) {
            // Rough estimate for modified: difference in length
            const origWords = d.original.text.split(/\s+/).length;
            const modWords = d.modified.text.split(/\s+/).length;
            const origChars = d.original.text.length;
            const modChars = d.modified.text.length;

            if (modWords > origWords) stats.words.added += (modWords - origWords);
            else stats.words.removed += (origWords - modWords);

            if (modChars > origChars) stats.chars.added += (modChars - origChars);
            else stats.chars.removed += (origChars - modChars);
        }
    });

    return {
        id: crypto.randomUUID(),
        createdAt: new Date(),
        originalDoc: original,
        modifiedDoc: modified,
        diffs,
        stats,
    };
}

/**
 * Get word-level differences between two strings
 */
export function getWordDiffs(original: string, modified: string): WordDiff[] {
    const wordDiffs: WordDiff[] = [];
    const diff = Diff.diffWords(original, modified);

    diff.forEach(part => {
        let type: ChangeType = 'unchanged';
        if (part.added) type = 'added';
        else if (part.removed) type = 'removed';

        wordDiffs.push({
            value: part.value,
            type,
        });
    });

    return wordDiffs;
}

/**
 * Get character-level differences between two strings
 */
export function getCharDiffs(original: string, modified: string): WordDiff[] {
    const charDiffs: WordDiff[] = [];
    const diff = Diff.diffChars(original, modified);

    diff.forEach(part => {
        let type: ChangeType = 'unchanged';
        if (part.added) type = 'added';
        else if (part.removed) type = 'removed';

        charDiffs.push({
            value: part.value,
            type,
        });
    });

    return charDiffs;
}

/**
 * Generate a text representation of the diff for export
 */
export function generateDiffText(comparison: ComparisonResult): string {
    let output = `Comparison: ${comparison.originalDoc.name} vs ${comparison.modifiedDoc.name}\n`;
    output += `Generated: ${comparison.createdAt.toISOString()}\n`;
    output += `\n--- Statistics ---\n`;
    output += `Total Changes: ${comparison.stats.totalChanges}\n`;
    output += `Additions: ${comparison.stats.additions}\n`;
    output += `Deletions: ${comparison.stats.deletions}\n`;
    output += `Modifications: ${comparison.stats.modifications}\n`;
    output += `\n--- Changes ---\n\n`;

    comparison.diffs.forEach((diff, index) => {
        if (diff.type === 'unchanged') return;

        output += `[${index + 1}] ${diff.type.toUpperCase()}\n`;
        if (diff.original) {
            output += `  - ${diff.original.text}\n`;
        }
        if (diff.modified) {
            output += `  + ${diff.modified.text}\n`;
        }
        output += '\n';
    });

    return output;
}
