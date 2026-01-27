'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Copy, Check, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export function ShareDialog({ id, language, trigger }: { id: string, language: string, trigger?: React.ReactNode }) {
    const [copied, setCopied] = useState(false);
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${id}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success(language === 'vi' ? 'Đã sao chép liên kết!' : 'Link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Share"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Share2 className="w-3.5 h-3.5" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle>{language === 'vi' ? 'Chia sẻ so sánh' : 'Share Comparison'}</DialogTitle>
                    <DialogDescription>
                        {language === 'vi'
                            ? 'Bất kỳ ai có liên kết này đều có thể xem so sánh này.'
                            : 'Anyone with this link can view this comparison.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2 mt-2">
                    <div className="grid flex-1 gap-2">
                        <label htmlFor="link" className="sr-only">Link</label>
                        <input
                            id="link"
                            defaultValue={url}
                            readOnly
                            className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                    <Button type="button" size="sm" className="px-3" onClick={handleCopy}>
                        {copied ? (
                            <Check className="h-4 w-4" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                        <span className="sr-only">Copy</span>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
