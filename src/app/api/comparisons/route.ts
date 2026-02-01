import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Comparison from '@/models/Comparison';
import { generateShortId } from '@/lib/utils';

export async function GET(req: NextRequest) {
    await dbConnect();

    try {
        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('clientId');

        if (!clientId) {
            return NextResponse.json([]); // Return empty if no client ID provided
        }

        // Fetch recent comparisons for this client
        const comparisons = await Comparison.find({ clientId })
            .select('shortId originalName modifiedName stats aiSummary createdAt') // Exclude content
            .sort({ createdAt: -1 })
            .limit(50);

        // Map to client history format
        const history = comparisons.map(comp => ({
            id: comp.shortId, // Use shortId for the frontend ID
            name: `${comp.originalName} vs ${comp.modifiedName}`,
            createdAt: comp.createdAt,
            originalDocName: comp.originalName,
            modifiedDocName: comp.modifiedName,
            stats: comp.stats,
            aiSummary: comp.aiSummary,
            // We don't send diffs or content here to save bandwidth
        }));

        return NextResponse.json(history);
    } catch (error) {
        console.error('Error fetching comparisons:', error);
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    await dbConnect();

    try {
        const body = await req.json();

        if (!body.clientId) {
            return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
        }

        // Check for duplicate comparison (same client, same files, same content)
        // This prevents polluting history with Identical comparisons
        const existingComparison = await Comparison.findOne({
            clientId: body.clientId,
            originalName: body.originalDocName,
            modifiedName: body.modifiedDocName,
            // We can check content length as a quick proxy, or a hash ideally. 
            // For now, let's check recent history to avoid spamming.
            // Or better, check the exact content if not too expensive. MongoDB handles large strings decently.
            originalContent: body.originalContent,
            modifiedContent: body.modifiedContent
        }).select('shortId _id');

        if (existingComparison) {
            return NextResponse.json({ id: existingComparison.shortId, _id: existingComparison._id }, { status: 200 });
        }

        // Generate a friendly short ID if not provided (server-side generation is safer)
        const shortId = generateShortId();

        const comparison = await Comparison.create({
            shortId,
            clientId: body.clientId,
            originalName: body.originalDocName,
            modifiedName: body.modifiedDocName,
            originalContent: body.originalContent,
            modifiedContent: body.modifiedContent,
            diffs: body.diffs,
            stats: body.stats,
            aiSummary: body.aiSummary ? {
                summary: body.aiSummary.summary,
                keyChanges: body.aiSummary.keyChanges,
                impactLevel: body.aiSummary.impactLevel
            } : null,

        });

        // Return the shortId so the client can navigate to /s/[shortId]
        return NextResponse.json({ id: comparison.shortId, _id: comparison._id }, { status: 201 });
    } catch (error) {
        console.error('Error saving comparison:', error);
        return NextResponse.json({ error: 'Failed to save comparison' }, { status: 500 });
    }
}
