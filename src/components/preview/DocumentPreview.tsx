'use client';

import { useRef, useEffect, useState } from 'react';
import { FileText, FileSpreadsheet, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocumentContent } from '@/types/document';

interface DocumentPreviewProps {
    document: DocumentContent;
    diffHtml?: string;
    className?: string;
    showOriginal?: boolean;
    scrollRef?: React.RefObject<HTMLDivElement | null>;
    zoomLevel?: number;
    showHeader?: boolean;
}

export function DocumentPreview({
    document,
    diffHtml,
    className,
    showOriginal = false,
    scrollRef,
    zoomLevel = 100,
    showHeader = true
}: DocumentPreviewProps) {
    const internalRef = useRef<HTMLDivElement>(null);
    const contentRef = scrollRef || internalRef;

    const formatIcon = {
        docx: FileText,
        pdf: File,
        xlsx: FileSpreadsheet,
    };

    const Icon = formatIcon[document.format] || FileText;
    const htmlToRender = diffHtml || document.htmlContent;

    return (
        <div className={cn("doc-preview flex flex-col h-full bg-white dark:bg-slate-900 border border-border/50 shadow-sm rounded-lg overflow-hidden", className)}>
            {showHeader && (
                <div className="flex items-center justify-between p-3 border-b bg-muted/30 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                            <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium truncate max-w-[200px]">{document.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {document.format.toUpperCase()} • {(document.metadata.fileSize / 1024).toFixed(1)} KB
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div
                ref={contentRef}
                className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth bg-white dark:bg-black/20 scrollbar-hide-when-inactive"
                style={{ scrollBehavior: 'auto' }} // Important for sync scroll to be instant. 'smooth' can cause lag in sync.
            >
                <div
                    className="doc-preview-content p-8 min-h-full transition-transform origin-top-left"
                    style={{
                        transform: `scale(${zoomLevel / 100})`,
                        width: `${100 * (100 / zoomLevel)}%`
                    }}
                >
                    <div style={{ fontSize: `${(zoomLevel / 100)}rem` }}>
                        {htmlToRender ? (
                            <div
                                dangerouslySetInnerHTML={{ __html: htmlToRender }}
                                className="document-html-content prose dark:prose-invert max-w-none"
                            />
                        ) : (
                            <div className="space-y-3 whitespace-pre-wrap">
                                {document.paragraphs.map((para, index) => (
                                    <p key={para.id || index} className="text-sm leading-relaxed">
                                        {para.text}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface SideBySidePreviewProps {
    originalDoc: DocumentContent;
    modifiedDoc: DocumentContent;
    originalDiffHtml?: string;
    modifiedDiffHtml?: string;
    zoomLevel?: number;
    isSyncScroll?: boolean;
    currentChangeIndex?: number;
    onChangesFound?: (count: number) => void;
    mergeActions?: Record<string, 'accept' | 'reject'>;
    onMergeAction?: (diffId: string, action: 'accept' | 'reject') => void;
}

export function SideBySidePreview({
    originalDoc,
    modifiedDoc,
    originalDiffHtml,
    modifiedDiffHtml,
    zoomLevel = 100,
    isSyncScroll = true,
    currentChangeIndex = -1,
    onChangesFound,
    mergeActions = {},
    onMergeAction
}: SideBySidePreviewProps) {
    const originalRef = useRef<HTMLDivElement>(null);
    const modifiedRef = useRef<HTMLDivElement>(null);
    const [changeElements, setChangeElements] = useState<HTMLElement[]>([]);

    // Hover State
    const [hoveredDiffId, setHoveredDiffId] = useState<string | null>(null);
    const [hoverPosition, setHoverPosition] = useState<{ top: number, left: number } | null>(null);

    // Sync Scroll State
    const scrollingSource = useRef<'original' | 'modified' | 'auto-nav' | null>(null);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

    // Scan for changes in the DOM
    useEffect(() => {
        const timer = setTimeout(() => {
            const container = modifiedRef.current;
            if (!container) return;

            // Find valid diff elements
            const elements = Array.from(
                container.querySelectorAll('ins, del, .diff-added, .diff-removed, span[style*="background-color"]')
            ) as HTMLElement[];

            setChangeElements(elements);
            if (onChangesFound) {
                onChangesFound(elements.length);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [modifiedDiffHtml, modifiedDoc, onChangesFound]);

    // Handle Hover Interaction
    useEffect(() => {
        const container = modifiedRef.current;
        if (!container) return;

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Check if we are hovering a change element
            // We injected IDs like "change-N", and data-diff-id
            const diffEl = target.closest('[id^="change-"], [data-diff-id], ins, del');

            if (diffEl) {
                const id = diffEl.getAttribute('data-diff-id') || diffEl.id;
                if (id) {
                    const rect = diffEl.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();

                    setHoveredDiffId(id);
                    // Position relative to container
                    setHoverPosition({
                        top: rect.top - containerRect.top + container.scrollTop - 40, // Above the element
                        left: rect.left - containerRect.left + (rect.width / 2)
                    });
                    return;
                }
            }
            // If strictly inside the container but not on a diff, clear? 
            // We want to keep it if hovering the popover itself?
            // For simplicity, we clear if we move too far, but let's strictly check target.
        };

        const handleMouseOut = (e: MouseEvent) => {
            // Optional: debounce closing to allow moving to popover
        };

        // We use a simpler approach: attach enter/leave to valid elements in the scan effect?
        // Or event delegation. Delegation is better for performance but "mouseover" bubbles.
        container.addEventListener('mouseover', handleMouseOver);

        return () => {
            container.removeEventListener('mouseover', handleMouseOver);
        };
    }, [changeElements, modifiedDiffHtml]); // Re-bind if DOM changes

    // Close hover when scrolling
    useEffect(() => {
        const clearHover = () => setHoveredDiffId(null);
        originalRef.current?.addEventListener('scroll', clearHover);
        modifiedRef.current?.addEventListener('scroll', clearHover);
        return () => {
            originalRef.current?.removeEventListener('scroll', clearHover);
            modifiedRef.current?.removeEventListener('scroll', clearHover);
        };
    }, []);


    // Handle Scrolling to Change
    useEffect(() => {
        if (currentChangeIndex >= 0 && currentChangeIndex < changeElements.length) {
            const el = changeElements[currentChangeIndex];
            if (el) {
                changeElements.forEach(e => {
                    e.style.outline = '';
                    e.style.boxShadow = '';
                    e.style.zIndex = '';
                    if (e.dataset.highlighted) {
                        e.style.backgroundColor = e.dataset.origBg || '';
                        delete e.dataset.highlighted;
                    }
                });

                el.style.transition = 'all 0.5s ease';
                el.style.outline = '3px solid #3b82f6';
                el.style.outlineOffset = '4px';
                el.style.boxShadow = '0 0 0 6px rgba(59, 130, 246, 0.2)';
                el.style.borderRadius = '4px';
                el.style.zIndex = '10';

                if (scrollingSource) scrollingSource.current = 'auto-nav';

                el.scrollIntoView({ behavior: 'auto', block: 'center' });

                setTimeout(() => {
                    if (scrollingSource.current === 'auto-nav') scrollingSource.current = null;
                }, 500);
            }
        }
    }, [currentChangeIndex, changeElements]);

    // Optimized Sync Scrolling
    useEffect(() => {
        if (!isSyncScroll) return;

        const original = originalRef.current;
        const modified = modifiedRef.current;
        if (!original || !modified) return;

        const handleScroll = (source: 'original' | 'modified') => {
            if (scrollingSource.current && scrollingSource.current !== source) return;

            scrollingSource.current = source;
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

            scrollTimeout.current = setTimeout(() => {
                scrollingSource.current = null;
            }, 100);

            const sourceEl = source === 'original' ? original : modified;
            const targetEl = source === 'original' ? modified : original;

            const percentage = sourceEl.scrollTop / (sourceEl.scrollHeight - sourceEl.clientHeight);

            if (targetEl.scrollHeight > targetEl.clientHeight) {
                targetEl.scrollTop = percentage * (targetEl.scrollHeight - targetEl.clientHeight);
            }
        };

        const onOriginalScroll = () => handleScroll('original');
        const onModifiedScroll = () => handleScroll('modified');

        original.addEventListener('scroll', onOriginalScroll, { passive: true });
        modified.addEventListener('scroll', onModifiedScroll, { passive: true });

        return () => {
            original.removeEventListener('scroll', onOriginalScroll);
            modified.removeEventListener('scroll', onModifiedScroll);
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        };
    }, [isSyncScroll]);

    return (
        <div className="grid grid-cols-2 gap-6 h-full p-6 bg-muted/10 relative">
            {/* Original Panel */}
            <div className="flex flex-col h-full relative group overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-xl">
                <DocumentPreview
                    document={originalDoc}
                    diffHtml={originalDiffHtml}
                    showOriginal={true}
                    className="h-full border border-border/60"
                    scrollRef={originalRef}
                    zoomLevel={zoomLevel}
                    showHeader={false}
                />
            </div>

            {/* Modified Panel */}
            <div className="flex flex-col h-full relative group overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-xl">
                <DocumentPreview
                    document={modifiedDoc}
                    diffHtml={modifiedDiffHtml}
                    className="h-full border border-border/60"
                    scrollRef={modifiedRef}
                    zoomLevel={zoomLevel}
                    showHeader={false}
                />

                {/* Hover Action Popover determined by state */}
                {hoveredDiffId && hoverPosition && onMergeAction && (
                    <div
                        className="absolute z-50 flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border animate-in fade-in zoom-in-95 duration-200"
                        style={{ top: hoverPosition.top, left: hoverPosition.left, transform: 'translateX(-50%)' }}
                        onMouseEnter={() => {/* Keep open */ }}
                        onMouseLeave={() => setHoveredDiffId(null)}
                    >
                        {/* Status Indicator if already merged */}
                        {mergeActions[hoveredDiffId] ? (
                            <span className={cn(
                                "text-xs font-medium px-2 py-1 rounded",
                                mergeActions[hoveredDiffId] === 'accept' ? "text-green-600 bg-green-100" : "text-red-600 bg-red-100"
                            )}>
                                {mergeActions[hoveredDiffId] === 'accept' ? 'Accepted' : 'Rejected'}
                            </span>
                        ) : null}

                        <button
                            className="p-1 hover:bg-green-100 text-green-600 rounded"
                            onClick={() => onMergeAction(hoveredDiffId, 'accept')}
                            title="Accept Change"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </button>
                        <button
                            className="p-1 hover:bg-red-100 text-red-600 rounded"
                            onClick={() => onMergeAction(hoveredDiffId, 'reject')}
                            title="Reject Change"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
