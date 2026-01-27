import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    DocumentContent,
    ComparisonResult,
    MergeAction,
    AISummary,
    ComparisonHistory
} from '@/types/document';
import type { Language } from '@/lib/i18n';

interface ComparisonState {
    // Documents
    originalDoc: DocumentContent | null;
    modifiedDoc: DocumentContent | null;

    // Comparison
    comparisonResult: ComparisonResult | null;
    isComparing: boolean;

    // AI
    aiSummary: AISummary | null;
    isGeneratingSummary: boolean;

    // Merge
    mergeActions: MergeAction[];

    // UI State
    viewMode: 'side-by-side' | 'inline' | 'unified';
    language: Language;

    // History (Now fetched from API)
    history: ComparisonHistory[];
    isLoadingHistory: boolean;

    // Actions
    setOriginalDoc: (doc: DocumentContent | null) => void;
    setModifiedDoc: (doc: DocumentContent | null) => void;
    setComparisonResult: (result: ComparisonResult | null) => void;
    setIsComparing: (isComparing: boolean) => void;
    setAISummary: (summary: AISummary | null) => void;
    setIsGeneratingSummary: (isGenerating: boolean) => void;
    addMergeAction: (action: MergeAction) => void;
    removeMergeAction: (diffId: string) => void;
    resetMergeActions: () => void;
    setMergeActions: (actions: MergeAction[]) => void;
    setViewMode: (mode: 'side-by-side' | 'inline' | 'unified') => void;
    setLanguage: (lang: Language) => void;

    // History Actions
    setHistory: (history: ComparisonHistory[]) => void;
    setIsLoadingHistory: (isLoading: boolean) => void;

    // Client Identity
    clientId: string | null;
    setClientId: (id: string) => void;
    ensureClientId: () => void; // Generates one if missing

    reset: () => void;
}

const initialState = {
    originalDoc: null,
    modifiedDoc: null,
    comparisonResult: null,
    isComparing: false,
    aiSummary: null,
    isGeneratingSummary: false,
    mergeActions: [],
    viewMode: 'side-by-side' as const,
    language: 'en' as Language,
    history: [],
    isLoadingHistory: false,
    clientId: null
};

export const useComparisonStore = create<ComparisonState>()(
    persist(
        (set, get) => ({
            ...initialState,

            setOriginalDoc: (doc) => set({ originalDoc: doc }),
            setModifiedDoc: (doc) => set({ modifiedDoc: doc }),
            setComparisonResult: (result) => set({ comparisonResult: result }),
            setIsComparing: (isComparing) => set({ isComparing }),
            setAISummary: (summary) => set({ aiSummary: summary }),
            setIsGeneratingSummary: (isGenerating) => set({ isGeneratingSummary: isGenerating }),

            addMergeAction: (action) => set((state) => ({
                mergeActions: [
                    ...state.mergeActions.filter(a => a.diffId !== action.diffId),
                    action
                ]
            })),

            removeMergeAction: (diffId) => set((state) => ({
                mergeActions: state.mergeActions.filter(a => a.diffId !== diffId)
            })),

            resetMergeActions: () => set({ mergeActions: [] }),
            setMergeActions: (actions) => set({ mergeActions: actions }),

            setViewMode: (mode) => set({ viewMode: mode }),
            setLanguage: (lang) => set({ language: lang }),

            setHistory: (history) => set({ history }),
            setIsLoadingHistory: (isLoading) => set({ isLoadingHistory: isLoading }),

            setClientId: (id) => set({ clientId: id }),
            ensureClientId: () => {
                const { clientId } = get();
                if (!clientId) {
                    // Simple UUID generation
                    const newId = crypto.randomUUID();
                    set({ clientId: newId });
                }
            },

            reset: () => set({
                originalDoc: null,
                modifiedDoc: null,
                comparisonResult: null,
                isComparing: false,
                aiSummary: null,
                isGeneratingSummary: false,
                mergeActions: [],
                // We do NOT reset clientId or history on general reset
            }),
        }),
        {
            name: 'doc-diff-settings',
            partialize: (state) => ({
                viewMode: state.viewMode,
                language: state.language,
                clientId: state.clientId // Persist clientId
            }),
        }
    )
);
