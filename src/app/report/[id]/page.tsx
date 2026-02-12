'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { translations } from '@/lib/i18n';
import type { ComparisonResult, AISummary } from '@/types/document';
import { cn } from '@/lib/utils';

export default function ReportPage() {
    const params = useParams();
    const id = params.id as string;
    const [data, setData] = useState<{ comparison: ComparisonResult; aiSummary: AISummary | null } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Default language to Vi for report or detect from user usage? 
    // Ideally we pass Lang in URL query, but for now fixed or browser default.
    // Let's assume passed in query or stored. We'll default to 'vi' as requested by user preference in history.
    const language = 'vi';
    const t = translations[language];

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            try {
                const res = await fetch(`/api/comparisons/${id}`);
                if (!res.ok) throw new Error('Report not found');
                const json = await res.json();

                // Transform API response to ComparisonResult structure
                const comparison: ComparisonResult = {
                    id: json.id,
                    createdAt: new Date(json.createdAt),
                    originalDoc: {
                        id: 'orig',
                        name: json.originalDocName,
                        format: 'docx',
                        uploadedAt: new Date(json.createdAt),
                        paragraphs: [],
                        metadata: { fileName: json.originalDocName, fileSize: 0, format: 'docx' },
                        // we don't need full content for report usually, just diffs
                    },
                    modifiedDoc: {
                        id: 'mod',
                        name: json.modifiedDocName,
                        format: 'docx',
                        uploadedAt: new Date(json.createdAt),
                        paragraphs: [],
                        metadata: { fileName: json.modifiedDocName, fileSize: 0, format: 'docx' }
                    },
                    diffs: json.diffs || [],
                    stats: json.stats
                };

                setData({ comparison, aiSummary: json.aiSummary });
            } catch (err) {
                console.error(err);
                setError('Failed to load report data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <p className="text-destructive font-medium">{error || 'Report not found'}</p>
                <Button variant="outline" onClick={() => window.close()}>Close</Button>
            </div>
        );
    }

    const { comparison, aiSummary } = data;

    return (
        <div className="min-h-screen bg-white text-black p-8 md:p-12 print:p-0 max-w-4xl mx-auto">
            {/* Print Header - Hidden in Print if desired, or kept as actions */}
            <div className="mb-8 flex items-center justify-between print:hidden">
                <Button variant="outline" onClick={() => window.history.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t.back}
                </Button>
                <Button onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" />
                    {t.download} {t.preview} (PDF)
                </Button>
            </div>

            {/* Report Content */}
            <div className="space-y-8" id="report-content">
                {/* Header */}
                <div className="border-b pb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-3xl font-bold text-slate-900">{t.comparisonHistory} Report</h1>
                        <span className="text-slate-500 text-sm">
                            {new Date().toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
                                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-8 text-sm">
                        <div>
                            <p className="text-slate-500 mb-1">{t.uploadOriginal}</p>
                            <p className="font-medium text-lg">{comparison.originalDoc.name}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 mb-1">{t.uploadModified}</p>
                            <p className="font-medium text-lg">{comparison.modifiedDoc.name}</p>
                        </div>
                    </div>
                </div>

                {/* AI Summary */}
                {aiSummary && (
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 print:border hover:border-slate-200 transition-colors">
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-xl font-semibold text-slate-800">{t.aiSummary}</h2>
                            <Badge variant={
                                aiSummary.impactLevel === 'major' ? 'destructive' :
                                    aiSummary.impactLevel === 'moderate' ? 'default' : 'secondary'
                            }>
                                {t[aiSummary.impactLevel] || aiSummary.impactLevel} Impact
                            </Badge>
                        </div>

                        <p className="text-slate-700 leading-relaxed mb-6 whitespace-pre-wrap">
                            {language === 'vi' ? aiSummary.summaryVi || aiSummary.summary : aiSummary.summary}
                        </p>

                        {aiSummary.keyChanges && aiSummary.keyChanges.length > 0 && (
                            <div>
                                <h3 className="font-medium text-slate-900 mb-3">{t.keyChanges}</h3>
                                <ul className="list-disc pl-5 space-y-2 text-slate-700">
                                    {aiSummary.keyChanges.map((change, i) => (
                                        <li key={i} className="pl-1">{change}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Statistics */}
                <div>
                    <h2 className="text-xl font-semibold text-slate-800 mb-4">Statistics</h2>
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-4 rounded-lg border text-center">
                            <div className="text-2xl font-bold text-slate-900">{comparison.stats.totalChanges}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-wide">Total Changes</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                            <div className="text-2xl font-bold text-green-700">+{comparison.stats.additions}</div>
                            <div className="text-xs text-green-600 uppercase tracking-wide">{t.additions}</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-center">
                            <div className="text-2xl font-bold text-red-700">-{comparison.stats.deletions}</div>
                            <div className="text-xs text-red-600 uppercase tracking-wide">{t.deletions}</div>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 text-center">
                            <div className="text-2xl font-bold text-amber-700">~{comparison.stats.modifications}</div>
                            <div className="text-xs text-amber-600 uppercase tracking-wide">{t.modifications}</div>
                        </div>
                    </div>
                </div>

                {/* Compare Table */}
                <div>
                    <h2 className="text-xl font-semibold text-slate-800 mb-4">{t.viewDetails}</h2>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600 font-medium border-b">
                                <tr>
                                    <th className="py-3 px-4 w-16">#</th>
                                    <th className="py-3 px-4 w-24">Type</th>
                                    <th className="py-3 px-4">{t.original}</th>
                                    <th className="py-3 px-4">{t.modified}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {comparison.diffs.map((diff, index) => {
                                    if (diff.type === 'unchanged') return null;
                                    return (
                                        <tr key={index} className="break-inside-avoid">
                                            <td className="py-3 px-4 text-slate-500 font-mono">{index + 1}</td>
                                            <td className="py-3 px-4">
                                                <Badge variant="outline" className={cn(
                                                    "capitalize",
                                                    diff.type === 'added' && "border-green-200 text-green-700 bg-green-50",
                                                    diff.type === 'removed' && "border-red-200 text-red-700 bg-red-50",
                                                    diff.type === 'modified' && "border-amber-200 text-amber-700 bg-amber-50"
                                                )}>
                                                    {diff.type}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4 font-mono text-xs bg-red-50/30 w-[35%] align-top whitespace-pre-wrap">
                                                {diff.type === 'added' ? '' : diff.original?.text || diff.wordDiffs?.filter(w => w.type !== 'added').map(w => w.value).join('')}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-xs bg-green-50/30 w-[35%] align-top whitespace-pre-wrap">
                                                {diff.type === 'removed' ? '' : diff.modified?.text || diff.wordDiffs?.filter(w => w.type !== 'removed').map(w => w.value).join('')}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="text-center text-slate-400 text-xs py-8 border-t mt-12">
                    Generated by DocDiff - AI Powered Document Comparison
                </div>
            </div>
        </div>
        </div >
    );
}
