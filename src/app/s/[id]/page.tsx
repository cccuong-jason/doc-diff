'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useComparisonStore } from '@/stores/comparison-store';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function RestoreSessionPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    // Removed restoreSession from destructuring
    const { history } = useComparisonStore();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const loadSession = async () => {
            try {
                // Try from Store History first (lightweight)
                const sessionFromHistory = history.find(h => h.id === id);

                // Fetch full details from API
                const res = await fetch(`/api/comparisons/${id}`);
                if (!res.ok) throw new Error("Comparison not found");

                const data = await res.json();

                // Manually restore state
                useComparisonStore.setState({
                    originalDoc: {
                        id: 'restored-original',
                        name: data.originalDocName,
                        format: 'docx',
                        uploadedAt: new Date(data.createdAt),
                        paragraphs: [],
                        metadata: { fileName: data.originalDocName, fileSize: 0, format: 'docx' },
                        htmlContent: data.originalContent
                    },
                    modifiedDoc: {
                        id: 'restored-modified',
                        name: data.modifiedDocName,
                        format: 'docx',
                        uploadedAt: new Date(data.createdAt),
                        paragraphs: [],
                        metadata: { fileName: data.modifiedDocName, fileSize: 0, format: 'docx' },
                        htmlContent: data.modifiedContent
                    },
                    comparisonResult: {
                        id: data.id,
                        createdAt: new Date(data.createdAt),
                        originalDoc: { id: 'restored', name: data.originalDocName, format: 'docx', uploadedAt: new Date(), paragraphs: [], metadata: { fileName: data.originalDocName, fileSize: 0, format: 'docx' } },
                        modifiedDoc: { id: 'restored', name: data.modifiedDocName, format: 'docx', uploadedAt: new Date(), paragraphs: [], metadata: { fileName: data.modifiedDocName, fileSize: 0, format: 'docx' } },
                        diffs: data.diffs || [],
                        stats: data.stats
                    },

                    aiSummary: data.aiSummary,
                    isComparing: false
                });

                // Redirect to home (which will read store)
                // We shouldn't need logic in Home to parse URL if we populate store here.
                // But we probably want the URL to stay /s/id? 
                // Using router.push('/') changes URL.
                // For now, matching old behavior:
                router.push('/');

            } catch (err) {
                console.error("Failed to restore", err);
                setError("Comparison session not found or expired.");
            }
        };

        loadSession();

    }, [id, history, router]);

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <div className="bg-destructive/10 p-4 rounded-full mb-4">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Session Not Found</h1>
                <p className="text-muted-foreground max-w-md mb-6">{error}</p>
                <Link href="/">
                    <Button>Return Home</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Restoring session...</p>
        </div>
    );
}
