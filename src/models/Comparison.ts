import mongoose, { Schema, Document } from 'mongoose';


// We'll store the full comparison result, but optimizing what we fetch
// The interface extends Document from mongoose, but we want to align with our types
export interface IComparison extends Document {
    shortId: string; // Friendly ID for URLs
    originalName: string;
    modifiedName: string;
    originalContent: string; // Stored as HTML or text
    modifiedContent: string; // Stored as HTML or text
    diffs: any[]; // Storing DiffResult[] as mixed or strict structure
    stats: {
        totalChanges: number;
        additions: number;
        deletions: number;
        modifications: number;
    };

    aiSummary: {
        summary: string;
        keyChanges: string[];
        impactLevel: 'minor' | 'moderate' | 'major';
    } | null;
    clientId: string; // Client session ID
    createdAt: Date;
    updatedAt: Date;
}

const ComparisonSchema: Schema = new Schema({
    shortId: { type: String, required: true, unique: true, index: true },
    clientId: { type: String, required: true, index: true }, // Index for fast retrieval by user
    originalName: { type: String, required: true },
    modifiedName: { type: String, required: true },
    // We intentionally don't index content for now to save space, but could for search later
    originalContent: { type: String, required: false }, // Optional if we want to save space
    modifiedContent: { type: String, required: false },
    diffs: { type: Schema.Types.Mixed, required: true }, // Array of diff objects
    stats: {
        totalChanges: { type: Number, default: 0 },
        additions: { type: Number, default: 0 },
        deletions: { type: Number, default: 0 },
        modifications: { type: Number, default: 0 }
    },

    aiSummary: {
        summary: String,
        keyChanges: [String],
        impactLevel: { type: String, enum: ['minor', 'moderate', 'major'] }
    }
}, {
    timestamps: true
});

// Prevent model overwrite in development
export default mongoose.models.Comparison || mongoose.model<IComparison>('Comparison', ComparisonSchema);
