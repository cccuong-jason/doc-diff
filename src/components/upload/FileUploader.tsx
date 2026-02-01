'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, Check, AlertCircle, FileSpreadsheet, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getAcceptString, detectFormat } from '@/lib/parsers';
import { cn } from '@/lib/utils';
import { useComparisonStore } from '@/stores/comparison-store';
import { translations } from '@/lib/i18n';

interface FileUploaderProps {
    label: string;
    onFileSelect: (file: File) => void;
    onFileParsed?: () => void;
    isLoading?: boolean;
    error?: string;
    file?: File | null;
    className?: string;
}

export function FileUploader({
    label,
    onFileSelect,
    isLoading = false,
    error,
    file,
    className,
}: FileUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const { language } = useComparisonStore();
    const t = translations[language];

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && detectFormat(droppedFile)) {
            onFileSelect(droppedFile);
        }
    }, [onFileSelect]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && detectFormat(selectedFile)) {
            onFileSelect(selectedFile);
        }
    }, [onFileSelect]);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFormatIcon = (format: string | null) => {
        switch (format) {
            case 'docx': return FileText;
            case 'xlsx': return FileSpreadsheet;
            case 'pdf': return File;
            default: return Upload;
        }
    };

    const format = file ? detectFormat(file) : null;
    const FormatIcon = getFormatIcon(format);

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
                'relative rounded-2xl transition-all duration-300 min-h-[200px] flex flex-col items-center justify-center',
                isDragging && 'scale-[1.02] ring-2 ring-primary ring-offset-2',
                error && 'ring-2 ring-destructive',
                file && !error && 'has-file',
                className
            )}
        >
            <input
                type="file"
                accept={getAcceptString()}
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={isLoading}
            />

            {isLoading ? (
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="font-medium">{t.processing}</p>
                        <p className="text-sm text-muted-foreground mt-1">{t.extracting}</p>
                    </div>
                    <Progress value={65} className="w-48 h-2" />
                </div>
            ) : file ? (
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-green-500/30">
                            <FormatIcon className="w-10 h-10 text-green-600" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                            <Check className="w-5 h-5 text-white" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="font-semibold text-lg truncate max-w-[250px]">{file.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {formatFileSize(file.size)} • {format?.toUpperCase()}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 relative z-20"
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                    >
                        {t.replaceFile}
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center border-2 border-dashed border-primary/30 group-hover:border-primary/50 transition-colors">
                        <Upload className="w-10 h-10 text-primary/50 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-center">
                        <p className="font-semibold text-lg">{t.dropHere}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t.clickToBrowse}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-medium">DOCX</span>
                        <span className="px-2 py-1 rounded-md bg-red-500/10 text-red-600 text-xs font-medium">PDF</span>
                        <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-600 text-xs font-medium">XLSX</span>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                    <span className="text-sm text-destructive">{error}</span>
                </div>
            )}
        </div>
    );
}
