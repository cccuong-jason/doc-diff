'use client';

import { ComparisonHistory } from '@/types/document';
import { useComparisonStore } from '@/stores/comparison-store';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, Trash2, Clock, Loader2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { translations } from '@/lib/i18n';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ShareDialog } from '@/components/share/ShareDialog';

export function HistorySidebar() {
    const {
        history,
        setHistory,
        language,
        reset,
        setIsLoadingHistory,
        isLoadingHistory
    } = useComparisonStore();
    const t = translations[language];
    const [isOpen, setIsOpen] = useState(false);
    const [localLoading, setLocalLoading] = useState(false);

    // Fetch history when sidebar opens
    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen]);

    const fetchHistory = async () => {
        setLocalLoading(true);
        try {
            const res = await fetch('/api/comparisons');
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
            toast.error('Failed to load history');
        } finally {
            setLocalLoading(false);
        }
    };

    const handleRestore = async (shortId: string) => {
        setIsLoadingHistory(true);
        setIsOpen(false); // Close immediately for better UX
        reset(); // Clear current state

        try {
            const res = await fetch(`/api/comparisons/${shortId}`);
            if (!res.ok) throw new Error('Failed to fetch details');

            const fullComparison = await res.json();

            // Transform API response to store format if needed, 
            // but our API structure should match what we expect in restoreSession
            // Actually, restoreSession expects ComparisonHistory items with content.
            // Let's manually reconstruct the doc structure here similar to store.restoreSession

            useComparisonStore.setState({
                originalDoc: {
                    id: 'restored-original',
                    name: fullComparison.originalDocName,
                    format: 'docx',
                    uploadedAt: new Date(fullComparison.createdAt),
                    paragraphs: [],
                    metadata: { fileName: fullComparison.originalDocName, fileSize: 0, format: 'docx' },
                    htmlContent: fullComparison.originalContent
                },
                modifiedDoc: {
                    id: 'restored-modified',
                    name: fullComparison.modifiedDocName,
                    format: 'docx',
                    uploadedAt: new Date(fullComparison.createdAt),
                    paragraphs: [],
                    metadata: { fileName: fullComparison.modifiedDocName, fileSize: 0, format: 'docx' },
                    htmlContent: fullComparison.modifiedContent
                },
                comparisonResult: {
                    id: fullComparison.id, // shortId
                    createdAt: new Date(fullComparison.createdAt),
                    originalDoc: {
                        id: 'restored-original',
                        name: fullComparison.originalDocName,
                        format: 'docx',
                        uploadedAt: new Date(fullComparison.createdAt),
                        paragraphs: [],
                        metadata: { fileName: fullComparison.originalDocName, fileSize: 0, format: 'docx' },
                    },
                    modifiedDoc: {
                        id: 'restored-modified',
                        name: fullComparison.modifiedDocName,
                        format: 'docx',
                        uploadedAt: new Date(fullComparison.createdAt),
                        paragraphs: [],
                        metadata: { fileName: fullComparison.modifiedDocName, fileSize: 0, format: 'docx' },
                    },
                    diffs: fullComparison.diffs || [],
                    stats: fullComparison.stats,
                },
                mergeActions: fullComparison.mergeActions || [],
                aiSummary: fullComparison.aiSummary,
                isComparing: false,
            });

            // Update URL
            window.history.pushState({}, '', `/s/${shortId}`);

        } catch (error) {
            console.error('Failed to restore session:', error);
            toast.error('Failed to load comparison details');
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await fetch(`/api/comparisons/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setHistory(history.filter(h => h.id !== id));
                toast.success('Deleted comparison');
            } else {
                throw new Error('Failed to delete');
            }
        } catch (error) {
            toast.error('Failed to delete comparison');
        }
    };

    const formatDate = (date: Date) => {
        try {
            return formatDistanceToNow(new Date(date), { addSuffix: true });
        } catch (e) {
            return 'Just now';
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden md:flex">
                    <History className="w-4 h-4 mr-2" />
                    {t.history}
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[340px] sm:w-[500px] flex flex-col p-0 z-[100]">
                <SheetHeader className="p-6 border-b shrink-0">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="flex items-center gap-2">
                            <History className="w-5 h-5" />
                            {t.comparisonHistory}
                        </SheetTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchHistory}
                            disabled={localLoading}
                            className="h-8 w-8 p-0"
                        >
                            <RefreshCw className={cn("w-4 h-4", localLoading && "animate-spin")} />
                        </Button>
                    </div>
                </SheetHeader>

                {localLoading && history.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Clock className="w-8 h-8 opacity-50" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">{t.noHistory}</h3>
                        <p className="text-sm max-w-[250px]">
                            {language === 'vi'
                                ? 'Các bản so sánh của bạn sẽ xuất hiện ở đây.'
                                : 'Your document comparisons will appear here.'}
                        </p>
                    </div>
                ) : (
                    <ScrollArea className="flex-1">
                        <div className="divide-y divide-border">
                            {history.map((item) => (
                                <div
                                    key={item.id}
                                    className="p-4 hover:bg-muted/50 transition-colors group cursor-pointer relative"
                                    onClick={() => handleRestore(item.id)}
                                >
                                    <div className="flex flex-col gap-1 mb-2">
                                        <div className="flex items-center justify-between gap-2 w-full">
                                            <div className="font-medium text-sm truncate flex-1 flex items-center gap-1.5 min-w-0" title={item.name}>
                                                <span className="truncate flex-1 font-semibold text-foreground/80">{item.originalDocName}</span>
                                                <span className="text-muted-foreground shrink-0 text-xs">vs</span>
                                                <span className="truncate flex-1 font-semibold text-foreground/80">{item.modifiedDocName}</span>
                                            </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                                            {formatDate(item.createdAt)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 mb-3">
                                        <Badge variant="outline" className="text-green-600 border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 text-[10px] h-5 px-1.5">
                                            +{item.stats.additions}
                                        </Badge>
                                        <Badge variant="outline" className="text-red-600 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-[10px] h-5 px-1.5">
                                            -{item.stats.deletions}
                                        </Badge>
                                        <Badge variant="outline" className="text-blue-600 border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 text-[10px] h-5 px-1.5">
                                            ~{item.stats.modifications}
                                        </Badge>
                                    </div>

                                    {item.aiSummary && (
                                        <div className="bg-muted/50 p-3 rounded text-xs text-muted-foreground">
                                            <div className="flex gap-2">
                                                <span className="mt-0.5 shrink-0">✨</span>
                                                <div className="line-clamp-2">
                                                    {typeof item.aiSummary === 'string' ? item.aiSummary : item.aiSummary.summary}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 bottom-4 bg-background/80 backdrop-blur-sm rounded-lg shadow-sm border p-0.5 z-10">
                                        <ShareDialog id={item.id} language={language} />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive hover:text-destructive"
                                            onClick={(e) => handleDelete(item.id, e)}
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {/* Loading skeleton at bottom if needed */}
                        </div>
                    </ScrollArea>
                )}
            </SheetContent>
        </Sheet>
    );
}
