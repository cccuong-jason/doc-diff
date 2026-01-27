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
    mergeActions?: Record<string, 'accept' | 'reject'>; // Map diffId -> action
    onMergeAction?: (diffId: string, action: 'accept' | 'reject') => void;
}

export function DiffViewer({
    diffs,
    viewMode,
    onDiffClick,
    selectedDiffId,
    mergeActions = {},
    onMergeAction
}: DiffViewerProps) {
    const filteredDiffs = useMemo(() =>
        diffs.filter(d => d.type !== 'unchanged' || viewMode === 'unified'),
        [diffs, viewMode]
    );

    if (viewMode === 'side-by-side') {
        return <SideBySideView diffs={diffs} onDiffClick={onDiffClick} selectedDiffId={selectedDiffId} mergeActions={mergeActions} onMergeAction={onMergeAction} />;
    }

    if (viewMode === 'inline') {
        return <InlineView diffs={filteredDiffs} onDiffClick={onDiffClick} selectedDiffId={selectedDiffId} mergeActions={mergeActions} onMergeAction={onMergeAction} />;
    }

    return <UnifiedView diffs={diffs} onDiffClick={onDiffClick} selectedDiffId={selectedDiffId} mergeActions={mergeActions} onMergeAction={onMergeAction} />;
}

function SideBySideView({
    diffs,
    onDiffClick,
    selectedDiffId,
    mergeActions,
    onMergeAction
}: {
    diffs: DiffResult[];
    onDiffClick?: (diff: DiffResult) => void;
    selectedDiffId?: string;
    mergeActions: Record<string, 'accept' | 'reject'>;
    onMergeAction?: (diffId: string, action: 'accept' | 'reject') => void;
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
                            mergeAction={mergeActions[diff.id]}
                            onMergeAction={onMergeAction}
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
                            mergeAction={mergeActions[diff.id]}
                            onMergeAction={onMergeAction}
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
    selectedDiffId,
    mergeActions,
    onMergeAction
}: {
    diffs: DiffResult[];
    onDiffClick?: (diff: DiffResult) => void;
    selectedDiffId?: string;
    mergeActions: Record<string, 'accept' | 'reject'>;
    onMergeAction?: (diffId: string, action: 'accept' | 'reject') => void;
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
    selectedDiffId,
    mergeActions,
    onMergeAction
}: {
    diffs: DiffResult[];
    onDiffClick?: (diff: DiffResult) => void;
    selectedDiffId?: string;
    mergeActions: Record<string, 'accept' | 'reject'>;
    onMergeAction?: (diffId: string, action: 'accept' | 'reject') => void;
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
                            selectedDiffId === diff.id && 'ring-2 ring-inset ring-primary',
                            // Merge visual states
                            mergeActions[diff.id] === 'reject' && 'opacity-50 grayscale decoration-slate-500',
                            mergeActions[diff.id] === 'accept' && 'ring-1 ring-green-500/50'
                        )}
                        onClick={() => onDiffClick?.(diff)}
                    >
                        {/* Merge Controls (Absolute positioned or inline) */}
                        {diff.type !== 'unchanged' && onMergeAction && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 p-0.5 rounded shadow-sm z-10">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onMergeAction(diff.id, 'accept'); }}
                                    className={cn("p-1 rounded hover:bg-green-100 dark:hover:bg-green-900 text-green-600", mergeActions[diff.id] === 'accept' && "bg-green-100 dark:bg-green-900 font-bold")}
                                    title="Accept Change"
                                >
                                    <span className="sr-only">Accept</span>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onMergeAction(diff.id, 'reject'); }}
                                    className={cn("p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-600", mergeActions[diff.id] === 'reject' && "bg-red-100 dark:bg-red-900 font-bold")}
                                    title="Reject Change"
                                >
                                    <span className="sr-only">Reject</span>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                        )}

                        <span className="inline-block w-8 text-muted-foreground text-right mr-4 shrink-0 select-none">
                            {index + 1}
                        </span>
                        <span className="inline-block w-4 text-center mr-2 shrink-0 select-none">
                            {diff.type === 'added' && <span className="text-green-600">+</span>}
                            {diff.type === 'removed' && <span className="text-red-600">−</span>}
                            {diff.type === 'modified' && <span className="text-yellow-600">~</span>}
                        </span>
                        <span className={cn("flex-1 whitespace-pre-wrap break-words", mergeActions[diff.id] === 'reject' && diff.type === 'added' && "line-through decoration-red-400")}>
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
    mergeAction,
    onMergeAction,
    id
}: {
    diff: DiffResult;
    side: 'original' | 'modified';
    index: number;
    onClick?: () => void;
    isSelected?: boolean;
    mergeAction?: 'accept' | 'reject';
    onMergeAction?: (diffId: string, action: 'accept' | 'reject') => void;
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
                isSelected && 'ring-2 ring-primary',
                // Merge states
                mergeAction === 'reject' && 'opacity-60 grayscale',
                mergeAction === 'accept' && 'ring-1 ring-green-600/30'
            )}
            onClick={onClick}
        >
            {/* Merge Controls */}
            {!showEmpty && diff.type !== 'unchanged' && onMergeAction && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-black/90 p-0.5 rounded shadow-sm z-10 border">
                    <button
                        onClick={(e) => { e.stopPropagation(); onMergeAction(diff.id, 'accept'); }}
                        className={cn("p-1 rounded hover:bg-green-100 dark:hover:bg-green-900 text-green-600", mergeAction === 'accept' && "bg-green-100 dark:bg-green-900 font-bold")}
                        title="Accept Change"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onMergeAction(diff.id, 'reject'); }}
                        className={cn("p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-600", mergeAction === 'reject' && "bg-red-100 dark:bg-red-900 font-bold")}
                        title="Reject Change"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            )}
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
