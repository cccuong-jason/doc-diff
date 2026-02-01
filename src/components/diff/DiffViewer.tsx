'use client';

import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DiffResult, WordDiff } from '@/types/document';

interface DiffViewerProps {
    diffs: DiffResult[];
    viewMode: 'side-by-side' | 'inline' | 'unified';
    onDiffClick?: (diff: DiffResult) => void;
    selectedDiffId?: string;
}

export function DiffViewer({
    diffs,
    viewMode,
    onDiffClick,
    selectedDiffId
}: DiffViewerProps) {
    const filteredDiffs = useMemo(() =>
        diffs.filter(d => d.type !== 'unchanged' || viewMode === 'unified'),
        [diffs, viewMode]
    );

    if (viewMode === 'side-by-side') {
        return <SideBySideView diffs={diffs} onDiffClick={onDiffClick} selectedDiffId={selectedDiffId} />;
    }

    if (viewMode === 'inline') {
        return <InlineView diffs={filteredDiffs} onDiffClick={onDiffClick} selectedDiffId={selectedDiffId} />;
    }

    return <UnifiedView diffs={diffs} onDiffClick={onDiffClick} selectedDiffId={selectedDiffId} />;
}

function SideBySideView({
    diffs,
    onDiffClick,
    selectedDiffId
}: {
    diffs: DiffResult[];
    onDiffClick?: (diff: DiffResult) => void;
    selectedDiffId?: string;
}) {
    return (
        <div className="grid grid-cols-2 gap-4 h-full">
            <div className="space-y-1">
                <div className="flex items-center gap-2 mb-3 px-2">
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        Original
                    </Badge>
                </div>
                <ScrollArea className="h-[500px] rounded-lg border bg-muted/20 p-4">
                    {diffs.map((diff, index) => (
                        <DiffLine
                            key={diff.id}
                            id={`diff-${index}`}
                            diff={diff}
                            side="original"
                            index={index}
                            onClick={() => onDiffClick?.(diff)}
                            isSelected={selectedDiffId === diff.id}
                        />
                    ))}
                </ScrollArea>
            </div>

            <div className="space-y-1">
                <div className="flex items-center gap-2 mb-3 px-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Modified
                    </Badge>
                </div>
                <ScrollArea className="h-[500px] rounded-lg border bg-muted/20 p-4">
                    {diffs.map((diff, index) => (
                        <DiffLine
                            key={diff.id}
                            id={`diff-modified-${index}`}
                            diff={diff}
                            side="modified"
                            index={index}
                            onClick={() => onDiffClick?.(diff)}
                            isSelected={selectedDiffId === diff.id}
                        />
                    ))}
                </ScrollArea>
            </div>
        </div>
    );
}

function InlineView({
    diffs,
    onDiffClick,
    selectedDiffId
}: {
    diffs: DiffResult[];
    onDiffClick?: (diff: DiffResult) => void;
    selectedDiffId?: string;
}) {
    return (
        <ScrollArea className="h-[600px] rounded-lg border bg-muted/20 p-4">
            {diffs.map((diff, index) => (
                <div
                    key={diff.id}
                    className={cn(
                        'py-2 px-3 rounded-md mb-2 cursor-pointer transition-colors',
                        selectedDiffId === diff.id && 'ring-2 ring-primary'
                    )}
                    onClick={() => onDiffClick?.(diff)}
                >
                    {diff.type === 'removed' && (
                        <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-2 rounded">
                            <span className="text-red-500 mr-2">−</span>
                            {diff.original?.text}
                        </div>
                    )}
                    {diff.type === 'added' && (
                        <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 p-2 rounded">
                            <span className="text-green-500 mr-2">+</span>
                            {diff.modified?.text}
                        </div>
                    )}
                    {diff.type === 'modified' && (
                        <div className="space-y-1">
                            <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-2 rounded">
                                <span className="text-red-500 mr-2">−</span>
                                <WordDiffDisplay wordDiffs={diff.wordDiffs} side="original" />
                            </div>
                            <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 p-2 rounded">
                                <span className="text-green-500 mr-2">+</span>
                                <WordDiffDisplay wordDiffs={diff.wordDiffs} side="modified" />
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </ScrollArea>
    );
}

function UnifiedView({
    diffs,
    onDiffClick,
    selectedDiffId
}: {
    diffs: DiffResult[];
    onDiffClick?: (diff: DiffResult) => void;
    selectedDiffId?: string;
}) {
    return (
        <ScrollArea className="h-[600px] rounded-lg border bg-muted/20">
            <div className="font-mono text-sm">
                {diffs.map((diff, index) => (
                    <div
                        key={diff.id}
                        className={cn(
                            'px-4 py-1 border-l-4 cursor-pointer transition-colors group relative flex items-start',
                            diff.type === 'unchanged' && 'border-transparent bg-background',
                            diff.type === 'added' && 'border-green-500 bg-green-50 dark:bg-green-900/20',
                            diff.type === 'removed' && 'border-red-500 bg-red-50 dark:bg-red-900/20',
                            diff.type === 'modified' && 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
                            selectedDiffId === diff.id && 'ring-2 ring-inset ring-primary'
                        )}
                        onClick={() => onDiffClick?.(diff)}
                    >


                        <span className="inline-block w-8 text-muted-foreground text-right mr-4 shrink-0 select-none">
                            {index + 1}
                        </span>
                        <span className="inline-block w-4 text-center mr-2 shrink-0 select-none">
                            {diff.type === 'added' && <span className="text-green-600">+</span>}
                            {diff.type === 'removed' && <span className="text-red-600">−</span>}
                            {diff.type === 'modified' && <span className="text-yellow-600">~</span>}
                        </span>
                        <span className={cn("flex-1 whitespace-pre-wrap break-words")}>
                            {diff.type === 'modified' ? (
                                <WordDiffDisplay wordDiffs={diff.wordDiffs} side="modified" />
                            ) : (
                                diff.original?.text || diff.modified?.text
                            )}
                        </span>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}

function DiffLine({
    diff,
    side,
    index,
    onClick,
    isSelected,
    id
}: {
    diff: DiffResult;
    side: 'original' | 'modified';
    index: number;
    onClick?: () => void;
    isSelected?: boolean;
    id?: string;
}) {
    const text = side === 'original' ? diff.original?.text : diff.modified?.text;
    const showEmpty =
        (side === 'original' && diff.type === 'added') ||
        (side === 'modified' && diff.type === 'removed');

    return (
        <div
            id={id}
            className={cn(
                'py-1 px-2 rounded text-sm font-mono cursor-pointer transition-colors group relative',
                diff.type === 'unchanged' && 'text-muted-foreground',
                diff.type === 'added' && side === 'modified' && 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
                diff.type === 'removed' && side === 'original' && 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
                diff.type === 'modified' && 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
                showEmpty && 'bg-muted/50 h-6',
                showEmpty && 'bg-muted/50 h-6',
                isSelected && 'ring-2 ring-primary'
            )}
            onClick={onClick}
        >

            {!showEmpty && (
                <>
                    <span className="inline-block w-6 text-muted-foreground text-right mr-2">
                        {index + 1}
                    </span>
                    {diff.type === 'modified' && diff.wordDiffs ? (
                        <WordDiffDisplay wordDiffs={diff.wordDiffs} side={side} />
                    ) : (
                        text
                    )}
                </>
            )}
        </div>
    );
}

function WordDiffDisplay({
    wordDiffs,
    side
}: {
    wordDiffs?: WordDiff[];
    side: 'original' | 'modified';
}) {
    if (!wordDiffs) return null;

    return (
        <span>
            {wordDiffs.map((wd, i) => {
                if (wd.type === 'unchanged') {
                    return <span key={i}>{wd.value}</span>;
                }
                if (wd.type === 'removed' && side === 'original') {
                    return (
                        <span key={i} className="bg-red-300 dark:bg-red-700 px-0.5 rounded">
                            {wd.value}
                        </span>
                    );
                }
                if (wd.type === 'added' && side === 'modified') {
                    return (
                        <span key={i} className="bg-green-300 dark:bg-green-700 px-0.5 rounded">
                            {wd.value}
                        </span>
                    );
                }
                return null;
            })}
        </span>
    );
}
