'use client';

import { useComparisonStore } from '@/stores/comparison-store';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, Trash2, Clock, Loader2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { translations } from '@/lib/i18n';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ShareDialog } from '@/components/share/ShareDialog';

export function HistoryModal() {
    const {
        history,
        setHistory,
        language,
        reset,
        setIsLoadingHistory,
        isLoadingHistory,
        clientId
    } = useComparisonStore();
    const t = translations[language];
    const [isOpen, setIsOpen] = useState(false);
    const [localLoading, setLocalLoading] = useState(false);

    // Fetch history when modal opens
    useEffect(() => {
        if (isOpen && clientId) {
            fetchHistory();
        }
    }, [isOpen, clientId]);

    const fetchHistory = async () => {
        if (!clientId) return;
        setLocalLoading(true);
        try {
            const res = await fetch(`/api/comparisons?clientId=${clientId}`);
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
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden md:flex">
                    <History className="w-4 h-4 mr-2" />
                    {t.history}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 border-b shrink-0 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <History className="w-5 h-5" />
                        {t.comparisonHistory}
                    </DialogTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchHistory}
                        disabled={localLoading}
                        className="h-8 w-8 p-0"
                    >
                        <RefreshCw className={cn("w-4 h-4", localLoading && "animate-spin")} />
                    </Button>
                </DialogHeader>

                {localLoading && history.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
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
                                    className="p-4 hover:bg-muted/50 transition-colors group cursor-pointer relative grid grid-cols-[1fr_auto] gap-4 items-start"
                                    onClick={() => handleRestore(item.id)}
                                >
                                    <div className="space-y-2 min-w-0">
                                        <div className="flex items-center gap-2 text-base">
                                            <span className="font-semibold text-foreground/90 truncate max-w-[200px] xl:max-w-[300px]" title={item.originalDocName}>{item.originalDocName}</span>
                                            <span className="text-muted-foreground shrink-0 text-sm">vs</span>
                                            <span className="font-semibold text-foreground/90 truncate max-w-[200px] xl:max-w-[300px]" title={item.modifiedDocName}>{item.modifiedDocName}</span>
                                        </div>

                                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {formatDate(item.createdAt)}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-green-600 bg-green-50 px-1.5 py-0 h-5">+{item.stats.additions}</Badge>
                                                <Badge variant="outline" className="text-red-600 bg-red-50 px-1.5 py-0 h-5">-{item.stats.deletions}</Badge>
                                                <Badge variant="outline" className="text-blue-600 bg-blue-50 px-1.5 py-0 h-5">~{item.stats.modifications}</Badge>
                                            </div>
                                        </div>

                                        {item.aiSummary && (
                                            <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground mt-2">
                                                <div className="flex gap-2">
                                                    <span className="mt-0.5 shrink-0">✨</span>
                                                    <div className="line-clamp-2">
                                                        {typeof item.aiSummary === 'string' ? item.aiSummary : item.aiSummary.summary}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity self-center">
                                        <ShareDialog id={item.id} language={language} />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={(e) => handleDelete(item.id, e)}
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </DialogContent>
        </Dialog>
    );
}
