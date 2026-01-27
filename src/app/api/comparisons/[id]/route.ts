import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Comparison from '@/models/Comparison';

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function GET(req: NextRequest, props: Props) {
    await dbConnect();
    const params = await props.params;

    try {
        // Try finding by shortId first (common case), then _id
        let comparison = await Comparison.findOne({ shortId: params.id });

        if (!comparison && mongoose.Types.ObjectId.isValid(params.id)) {
            comparison = await Comparison.findById(params.id);
        }

        if (!comparison) {
            return NextResponse.json({ error: 'Comparison not found' }, { status: 404 });
        }

        // Return full details including content and diffs
        return NextResponse.json({
            id: comparison.shortId,
            _id: comparison._id,
            originalDocName: comparison.originalName,
            modifiedDocName: comparison.modifiedName,
            originalContent: comparison.originalContent,
            modifiedContent: comparison.modifiedContent,
            diffs: comparison.diffs,
            stats: comparison.stats,
            mergeActions: comparison.mergeActions,
            aiSummary: comparison.aiSummary,
            createdAt: comparison.createdAt
        });
    } catch (error) {
        console.error('Error fetching comparison details:', error);
        return NextResponse.json({ error: 'Failed to fetch comparison details' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, props: Props) {
    await dbConnect();
    const params = await props.params;

    try {
        const body = await req.json();
        const { action, diffId, aiSummary } = body;

        let query = { shortId: params.id };
        // If not found by shortId, try _id
        if (!await Comparison.exists(query) && mongoose.Types.ObjectId.isValid(params.id)) {
            // @ts-ignore
            query = { _id: params.id };
        }

        if (action && diffId) {
            // Update merge action
            await Comparison.updateOne(
                query,
                {
                    $push: {
                        mergeActions: {
                            diffId,
                            action,
                            timestamp: new Date()
                        }
                    }
                }
            );
        }

        if (aiSummary) {
            // Update AI Summary
            await Comparison.updateOne(
                query,
                { $set: { aiSummary } }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating comparison:', error);
        return NextResponse.json({ error: 'Failed to update comparison' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, props: Props) {
    await dbConnect();
    const params = await props.params;

    try {
        const result = await Comparison.deleteOne({ shortId: params.id });

        if (result.deletedCount === 0 && mongoose.Types.ObjectId.isValid(params.id)) {
            await Comparison.deleteOne({ _id: params.id });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting comparison:', error);
        return NextResponse.json({ error: 'Failed to delete comparison' }, { status: 500 });
    }
}

import mongoose from 'mongoose';
