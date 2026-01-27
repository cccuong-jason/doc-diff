// Document types for unified content representation across formats

export type DocumentFormat = 'docx' | 'pdf' | 'xlsx';

export interface DocumentMetadata {
    fileName: string;
    fileSize: number;
    format: DocumentFormat;
    pageCount?: number;
    sheetCount?: number;
    createdAt?: Date;
    modifiedAt?: Date;
}

export interface TextStyle {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
}

export interface Paragraph {
    id: string;
    text: string;
    style?: TextStyle;
    position: {
        page?: number;
        sheet?: string;
        index: number;
    };
}

export interface TableCell {
    text: string;
    rowSpan?: number;
    colSpan?: number;
    style?: TextStyle;
}

export interface Table {
    id: string;
    rows: TableCell[][];
    position: {
        page?: number;
        sheet?: string;
        index: number;
    };
}

export interface DocumentContent {
    id: string;
    name: string;
    format: DocumentFormat;
    uploadedAt: Date;
    paragraphs: Paragraph[];
    tables?: Table[];
    metadata: DocumentMetadata;
    rawContent?: string; // For text-based diffing
    htmlContent?: string; // For visual document preview
}

// Diff types
export type ChangeType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface WordDiff {
    value: string;
    type: ChangeType;
}

export interface DiffResult {
    id: string;
    type: ChangeType;
    original?: Paragraph;
    modified?: Paragraph;
    wordDiffs?: WordDiff[];
}

export interface ComparisonResult {
    id: string;
    createdAt: Date;
    originalDoc: DocumentContent;
    modifiedDoc: DocumentContent;
    diffs: DiffResult[];
    stats: {
        totalChanges: number;
        additions: number;
        deletions: number;
        modifications: number;
        words?: {
            added: number;
            removed: number;
        };
        chars?: {
            added: number;
            removed: number;
        };
    };
}

// AI Summary types
export interface AISummary {
    id: string;
    comparisonId: string;
    summary: string;
    summaryVi?: string; // Vietnamese translation
    keyChanges: string[];
    impactLevel: 'minor' | 'moderate' | 'major';
    generatedAt: Date;
}

// History types
export interface ComparisonHistory {
    id: string;
    name: string;
    createdAt: Date;
    originalDocName: string;
    modifiedDocName: string;
    stats: {
        totalChanges: number;
        additions: number;
        deletions: number;
        modifications: number;
        words?: {
            added: number;
            removed: number;
        };
        chars?: {
            added: number;
            removed: number;
        };
    };
    aiSummary?: string | AISummary;
    diffs?: DiffResult[];
    originalContent?: string;
    modifiedContent?: string;
}

// Merge types
export interface MergeAction {
    diffId: string;
    action: 'accept' | 'reject' | 'pending';
    timestamp: Date;
}

export interface MergeState {
    comparisonId: string;
    actions: MergeAction[];
    pendingChanges: number;
}
