'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ArrowRight, GitCompare, ArrowLeftRight, ChevronUp, ChevronDown, Menu, RefreshCw, X, FolderInput, Loader2, Zap, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileUploader } from '@/components/upload/FileUploader';
import { DiffViewer } from '@/components/diff/DiffViewer';
import { ChangesSidebar } from '@/components/diff/ChangesSidebar';
import { DocumentPreview, SideBySidePreview } from '@/components/preview/DocumentPreview';
import { AnimatedCompareButton } from '@/components/ui/AnimatedCompareButton';
import { useComparisonStore } from '@/stores/comparison-store';
import { parseDocument } from '@/lib/parsers';
import { compareDocuments } from '@/lib/diff/diff-engine';
import { generateChangeSummary } from '@/app/actions/ai';
import { translations } from '@/lib/i18n';
import htmldiff from 'htmldiff-js';
import { parseDiffChanges, DiffChange } from '@/lib/diff-parser';
import { cn, generateShortId } from '@/lib/utils';
import { ShareDialog } from '@/components/share/ShareDialog';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';


export default function HomePage() {
  const {
    originalDoc,
    modifiedDoc,
    comparisonResult,
    aiSummary,
    isComparing,
    isGeneratingSummary,
    viewMode,
    language,
    isLoadingHistory,
    setOriginalDoc,
    setModifiedDoc,
    setComparisonResult,
    setIsComparing,
    setAISummary,
    setIsGeneratingSummary,
    // updateHistoryItem removed
    history,
    reset,
    clientId,
    ensureClientId
  } = useComparisonStore();

  const t = translations[language];
  const router = useRouter();

  useEffect(() => {
    ensureClientId();
  }, [ensureClientId]);

  // Local state
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [modifiedFile, setModifiedFile] = useState<File | null>(null);

  // Sync local file state with store (e.g. on reset)
  useEffect(() => {
    if (!originalDoc) setOriginalFile(null);
    if (!modifiedDoc) setModifiedFile(null);
  }, [originalDoc, modifiedDoc]);
  const [originalLoading, setOriginalLoading] = useState(false);
  const [modifiedLoading, setModifiedLoading] = useState(false);
  const [activeView, setActiveView] = useState<'diff' | 'preview'>('preview');
  const [isSyncScroll, setIsSyncScroll] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  // Resize Handler
  const startResizing = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(250, Math.min(600, e.clientX)); // Constraints
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Hidden inputs for replacing files
  const replaceOriginalRef = useRef<HTMLInputElement>(null);
  const replaceModifiedRef = useRef<HTMLInputElement>(null);

  // New state for HTML diffs
  const [htmlDiffContent, setHtmlDiffContent] = useState<string | null>(null);
  const [changes, setChanges] = useState<DiffChange[]>([]);
  const [changeList, setChangeList] = useState<DiffChange[]>([]); // Derived list for sidebar
  const [currentChangeIndex, setCurrentChangeIndex] = useState(-1);

  // Load from URL if present
  // Note: We use window.location because Next.js params in client component might need mapping in layout or just clean URL reading
  useEffect(() => {
    // Basic check for /s/[id] in client logic if not passing props
    // A more robust way is getting params from layout, but splitting logic:
    // If URL has path /s/..., fetch API.
    const path = window.location.pathname;
    if (path.startsWith('/s/') && !comparisonResult && !isLoadingHistory) {
      const shortId = path.split('/s/')[1];
      if (shortId) {
        // Trigger restore from sidebar logic or local fetch
        // But sidebar component is separate. Let's do a quick fetch here for direct link access
        fetch(`/api/comparisons/${shortId}`)
          .then(async (res) => {
            if (res.ok) {
              const data = await res.json();
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
            }
          })
          .catch(console.error);
      }
    }
  }, []);



  // Compute stats
  const totalStats = useMemo(() => {
    if (!comparisonResult) return { additions: 0, deletions: 0, modifications: 0 };
    return comparisonResult.stats;
  }, [comparisonResult]);

  const canCompare = originalDoc && modifiedDoc;
  const showResults = !!comparisonResult;

  // Compute HTML diff when results are ready
  useEffect(() => {
    if (comparisonResult && originalDoc?.htmlContent && modifiedDoc?.htmlContent) {
      console.log('HTMDiff Type:', typeof htmldiff, htmldiff);
      let diffHtml = '';

      try {
        // Try as function first
        diffHtml = (htmldiff as any)(originalDoc.htmlContent, modifiedDoc.htmlContent);
      } catch (err) {
        console.warn('htmldiff function call failed, trying execute property or class:', err);
        try {
          // Try as object with execute
          if ((htmldiff as any).execute) {
            diffHtml = (htmldiff as any).execute(originalDoc.htmlContent, modifiedDoc.htmlContent);
          }
          // Try as Class
          else {
            const instance = new (htmldiff as any)();
            if (instance.execute) {
              diffHtml = instance.execute(originalDoc.htmlContent, modifiedDoc.htmlContent);
            }
          }
        } catch (e2) {
          console.error('All htmldiff attempts failed:', e2);
          // Fallback to simple comparison if possible or empty
          diffHtml = "Error generating diff - check console";
        }
      }

      setHtmlDiffContent(diffHtml);

      const { changes: parsedChanges, injectedHtml } = parseDiffChanges(diffHtml);

      // Update the HTML content with the one that has IDs injected
      setHtmlDiffContent(injectedHtml);
      setChanges(parsedChanges);

      // Filter changes for sidebar list (exclude minor whitespace if needed, for now keep all)
      setChangeList(parsedChanges);
    }
  }, [comparisonResult, originalDoc, modifiedDoc]);

  // Sync scroll implementation
  const handleDiffClick = useCallback((diff: any) => {
    // Highlight or scroll to specific diff
    // console.log("Clicked diff", diff);
  }, []);

  const totalDetectedChanges = changeList.length;

  const scrollToChange = useCallback((index: number) => {
    if (index < 0 || index >= changeList.length) return;

    setCurrentChangeIndex(index);
    const change = changeList[index];
    const element = document.getElementById(change.id);

    if (element) {
      // In SideBySidePreview, we need to scroll the container, not the window
      // Try to find scrollable parent
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Also highlight
      // Add 'ring' class temporary? Or we rely on currentChangeIndex state in styling
    } else if (activeView === 'diff') {
      // Fallback for DiffView based on index mapping if possible, 
      // but DiffView uses raw text diffs, not HTML diff IDs.
      // We'll try finding the 'diff-index' ID we injected
      // This mapping is loose because changeList comes from HTML diff, DiffViewer from text diff.
      // They might not match 1:1 index.
      // Ideally, we scroll to the Nth change in the diff viewer.

      // Simple heuristic: Text diff chunks != HTML diff tags.
      // For now, let's just support HTML preview scrolling or try finding diff-N
      // If we want accurate scrolling in Raw Diff, we need to map stored diffs.
      const rawDiffEl = document.getElementById(`diff-${index}`);
      if (rawDiffEl) rawDiffEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [changeList, activeView]);

  const handleOriginalSelect = useCallback(async (file: File) => {
    setOriginalFile(file);
    setOriginalLoading(true);
    try {
      const doc = await parseDocument(file);
      setOriginalDoc(doc);
    } catch (err) {
      console.error('Failed to parse original document:', err);
      toast.error('Failed to parse original document');
    } finally {
      setOriginalLoading(false);
    }
  }, [setOriginalDoc]);

  const handleModifiedSelect = useCallback(async (file: File) => {
    setModifiedFile(file);
    setModifiedLoading(true);
    try {
      const doc = await parseDocument(file);
      setModifiedDoc(doc);
    } catch (err) {
      console.error('Failed to parse modified document:', err);
      toast.error('Failed to parse modified document');
    } finally {
      setModifiedLoading(false);
    }
  }, [setModifiedDoc]);

  const runComparison = useCallback(async (docOriginal: any, docModified: any) => {
    if (!docOriginal || !docModified) return;

    setIsComparing(true);
    try {
      // 1. Run local comparison logic
      const result = await compareDocuments(docOriginal, docModified);

      // 2. Persist to API with Timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      const saveResponse = await fetch('/api/comparisons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          originalDocName: docOriginal.name,
          modifiedDocName: docModified.name,
          originalContent: docOriginal.htmlContent,
          modifiedContent: docModified.htmlContent,
          diffs: result.diffs,
          stats: result.stats,
          aiSummary: null // No AI summary yet
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!saveResponse.ok) throw new Error('Failed to save to database');
      const savedData = await saveResponse.json();

      setComparisonResult(result); // Using local result which matches types
      // Update result ID with the one from DB (shortId)
      setComparisonResult({ ...result, id: savedData.id });

      // 3. Update URL
      window.history.pushState({}, '', `/s/${savedData.id}`);

    } catch (err: any) {
      console.error("Comparison Error", err);
      if (err.name === 'AbortError') {
        toast.error("Comparison request timed out (60s). Please try again.");
      } else {
        toast.error("Comparison failed or storage limit reached.");
      }
    } finally {
      setIsComparing(false);
    }
  }, [setComparisonResult, setIsComparing, clientId]);

  const handleCompare = useCallback(() => {
    runComparison(originalDoc, modifiedDoc);
  }, [originalDoc, modifiedDoc, runComparison]);

  const handleSwap = useCallback(async () => {
    if (!originalDoc || !modifiedDoc) return;

    // Swap state
    const tempDoc = originalDoc;
    const tempFile = originalFile;

    setOriginalDoc(modifiedDoc);
    setModifiedDoc(tempDoc);

    setOriginalFile(modifiedFile);
    setModifiedFile(tempFile);

    // Re-run comparison immediately with swapped refs
    await runComparison(modifiedDoc, originalDoc);
    // Clear AI summary because context changed
    setAISummary(null);
  }, [originalDoc, modifiedDoc, originalFile, modifiedFile, setOriginalDoc, setModifiedDoc, setAISummary, runComparison]);

  const handleReplaceOriginal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleOriginalSelect(file);
    // Auto re-compare is handled by user clicking Compare again or we could force it here.
    // Given the flow, requiring a click is safer to avoid flashing state.
  };

  const handleReplaceModified = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleModifiedSelect(file);
  };

  const handleGenerateAI = useCallback(async () => {
    if (!comparisonResult) return;
    setIsGeneratingSummary(true);
    try {
      const summary = await generateChangeSummary(
        comparisonResult.diffs,
        comparisonResult.originalDoc.name,
        comparisonResult.modifiedDoc.name,
        language
      );
      setAISummary(summary);

      // Save AI summary to DB
      await fetch(`/api/comparisons/${comparisonResult.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiSummary: summary })
      });

    } catch (err) {
      console.error("AI Generation failed", err);
      toast.error("AI Generation failed");
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [comparisonResult, language, setAISummary, setIsGeneratingSummary, t]);



  const handleLogoClick = useCallback(() => {
    // Full reset
    reset();
    setOriginalFile(null);
    setModifiedFile(null);
    // Clear URL
    window.history.pushState({}, '', '/');
  }, [reset]);

  // Loading Overlay
  if (isLoadingHistory) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background z-50 fixed inset-0">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading comparison...</p>
      </div>
    );
  }

  return (
    <main className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">

        {/* Helper text when empty */}
        {/* Helper text when empty - Removed background icon as requested */}
        {!showResults && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            {/* Background icon removed */}
          </div>
        )}

        {/* Upload View */}
        {!showResults && (
          <div className="h-full overflow-hidden p-4 md:p-6 animate-in fade-in zoom-in-95 duration-300 relative z-10 w-full flex flex-col">
            <div className="max-w-[1920px] mx-auto w-full h-full flex flex-col">

              <div className="flex-1 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-4 md:gap-8 items-stretch w-full h-full">
                {/* Original Uploader */}
                <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                  <div className="absolute inset-0 flex flex-col">
                    <div className="p-4 bg-white/50 dark:bg-black/20 text-center border-b border-dashed border-slate-200 dark:border-slate-800 shrink-0">
                      <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-200">{t.uploadOriginal}</h3>
                    </div>
                    <div className="flex-1 relative">
                      <FileUploader
                        label={t.uploadOriginal}
                        onFileSelect={handleOriginalSelect}
                        isLoading={originalLoading}
                        file={originalFile}
                        className="h-full border-none rounded-none bg-transparent hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                      />
                    </div>
                  </div>
                </div>

                {/* Compare Action */}
                <div className="flex items-center justify-center py-4 md:py-0 relative z-20">
                  <AnimatedCompareButton
                    onClick={handleCompare}
                    disabled={!canCompare}
                    isComparing={isComparing}
                    canCompare={!!canCompare}
                  />
                </div>

                {/* Modified Uploader */}
                <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
                  <div className="absolute inset-0 flex flex-col">
                    <div className="p-4 bg-white/50 dark:bg-black/20 text-center border-b border-dashed border-slate-200 dark:border-slate-800 shrink-0">
                      <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-200">{t.uploadModified}</h3>
                    </div>
                    <div className="flex-1 relative">
                      <FileUploader
                        label={t.uploadModified}
                        onFileSelect={handleModifiedSelect}
                        isLoading={modifiedLoading}
                        file={modifiedFile}
                        className="h-full border-none rounded-none bg-transparent hover:bg-purple-50/50 dark:hover:bg-purple-900/10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comparison Results */}
        {showResults && comparisonResult && (
          <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Toolbar Area */}
            <div className="h-14 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 shrink-0 z-20 shadow-sm gap-4">

              {/* Left: Back */}
              {/* Left: Back */}
              <Button variant="ghost" size="sm" onClick={() => {
                setComparisonResult(null);
                setAISummary(null);
                window.history.pushState({}, '', '/');
              }} className="text-muted-foreground hover:text-foreground shrink-0">
                <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                {t.back}
              </Button>

              {/* Center: File Swap & Names */}
              <div className="flex-1 flex items-center justify-center gap-3 text-sm font-medium overflow-hidden">
                {/* Original Name - Click to Replace */}
                <div
                  className="flex items-center gap-2 group cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors max-w-[30%]"
                  onClick={() => replaceOriginalRef.current?.click()}
                  title="Click to replace original file"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 group-hover:scale-125 transition-transform" />
                  <span className="truncate">{originalDoc?.name}</span>
                  <FolderInput className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                </div>

                {/* Swap Button */}
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0" onClick={handleSwap} title={t.swap}>
                  <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
                </Button>

                {/* Modified Name - Click to Replace */}
                <div
                  className="flex items-center gap-2 group cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors max-w-[30%]"
                  onClick={() => replaceModifiedRef.current?.click()}
                  title="Click to replace modified file"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 group-hover:scale-125 transition-transform" />
                  <span className="truncate">{modifiedDoc?.name}</span>
                  <FolderInput className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Share Button (New) */}
                <ShareDialog
                  id={comparisonResult.id} // Needs shortId
                  language={language}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 hidden md:flex text-muted-foreground hover:text-foreground"
                      title={t.share}
                    >
                      <FolderInput className="w-4 h-4 rotate-90" />
                      {t.share}
                    </Button>
                  }
                />


                {/* Navigation Controls in Toolbar */}
                {totalDetectedChanges > 0 && (
                  <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 border mr-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => scrollToChange(Math.max(0, currentChangeIndex - 1))}
                      disabled={currentChangeIndex <= 0}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <span className="text-xs font-mono w-16 text-center select-none">
                      {currentChangeIndex + 1} / {totalDetectedChanges}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => scrollToChange(Math.min(changeList.length - 1, currentChangeIndex + 1))}
                      disabled={currentChangeIndex >= changeList.length - 1}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Mobile Menu (placeholder) */}
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Left Sidebar: Changes List */}
              {activeView === 'preview' && (
                <>
                  <ChangesSidebar
                    changes={changeList}
                    selectedIndex={currentChangeIndex}
                    onSelectChange={scrollToChange}
                    width={sidebarWidth}
                    stats={totalStats}
                    aiSummary={aiSummary}
                    isAiLoading={isGeneratingSummary}
                    onGenerateAi={handleGenerateAI}
                    canGenerateAi={!!comparisonResult}
                    language={language}
                  />
                  {/* Resize Handle */}
                  <div
                    className={cn(
                      "w-1 cursor-col-resize hover:bg-blue-500 hover:w-1.5 transition-all z-50 select-none touch-none flex items-center justify-center bg-border",
                      isResizing && "bg-blue-500 w-1.5"
                    )}
                    onMouseDown={startResizing}
                  />
                </>
              )}

              {/* Main View */}
              <div className="flex-1 flex flex-col min-w-0 bg-secondary/10">
                {/* View Toggles */}
                <div className="flex items-center justify-between px-4 py-2 border-b bg-background/50">
                  <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                    <Button
                      variant={activeView === 'preview' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveView('preview')}
                      className="h-7 text-xs"
                    >
                      {t.visualPreview}
                    </Button>
                    <Button
                      variant={activeView === 'diff' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveView('diff')}
                      className="h-7 text-xs"
                    >
                      {t.rawDiff}
                    </Button>
                  </div>

                  <div className="h-6 w-px bg-border/60 mx-2" />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSyncScroll(!isSyncScroll)}
                    className={cn("h-7 text-xs gap-1.5", isSyncScroll ? "bg-primary/10 text-primary" : "text-muted-foreground")}
                    title="Sync Scroll"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    {t.syncScroll}
                  </Button>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* AI Summary Trigger Removed/Moved to Left Sidebar if needed, here we simplify */}
                  {!aiSummary && !isGeneratingSummary && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-900/20"
                      onClick={handleGenerateAI}
                    >
                      <Zap className="w-3 h-3" />
                      {t.analyzeWithAI}
                    </Button>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden relative">
                  {activeView === 'diff' ? (
                    <div className="p-4 h-full overflow-hidden">
                      <DiffViewer
                        diffs={comparisonResult.diffs}
                        viewMode={viewMode}
                        onDiffClick={handleDiffClick}
                      />
                    </div>
                  ) : (
                    <div className="h-full overflow-hidden">
                      {htmlDiffContent ? (
                        <SideBySidePreview
                          originalDoc={originalDoc!}
                          modifiedDoc={modifiedDoc!}
                          modifiedDiffHtml={htmlDiffContent || undefined}
                          currentChangeIndex={currentChangeIndex}
                          isSyncScroll={isSyncScroll}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Sidebar: AI Summary Removed as requested */}

            </div>
          </div>
        )}

        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={replaceOriginalRef}
          className="hidden"
          accept=".docx,.pdf,.xlsx"
          onChange={handleReplaceOriginal}
        />
        <input
          type="file"
          ref={replaceModifiedRef}
          className="hidden"
          accept=".docx,.pdf,.xlsx"
          onChange={handleReplaceModified}
        />
      </div>
    </main>
  );
}
