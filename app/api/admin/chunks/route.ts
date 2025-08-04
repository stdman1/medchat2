// app/api/admin/chunks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { QdrantClient } from '@qdrant/js-client-rest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Initialize Qdrant client
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME = 'medical_chunks';

interface QdrantPoint {
  id: string | number;
  vector?: number[] | number[][];
  // FIX 1: Thay any thành Record<string, unknown>
  payload?: Record<string, unknown>;
}

interface QdrantScrollResult {
  points: QdrantPoint[];
  next_page_offset?: string | number | null;
}

// GET - Browse chunks with pagination
export async function GET(request: NextRequest) {
  try {
    console.log('📊 CHUNKS API: Browsing medical chunks...');
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    console.log(`📋 Parameters: limit=${limit}, offset=${offset}`);

    // Check if collection exists
    try {
      await qdrant.getCollection(COLLECTION_NAME);
    } catch (error) {
      console.error('❌ Collection not found:', error);
      return NextResponse.json({
        success: false,
        error: 'Medical chunks collection not found. Please run migration first.',
        data: []
      }, { status: 404 });
    }

    // Browse points using scroll
    const results = await qdrant.scroll(COLLECTION_NAME, {
      limit,
      offset,
      with_payload: true,
      with_vector: false
    }) as QdrantScrollResult;

    console.log(`✅ Retrieved ${results.points?.length || 0} points`);

    // Format data properly
    const formattedData = (results.points || []).map((point: QdrantPoint) => ({
      id: point.id,
      payload: {
        content: point.payload?.content || 'No content',
        source: point.payload?.source || 'Unknown',
        topic: point.payload?.topic || 'General',
        risk_level: point.payload?.risk_level || 'Low'
      }
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      total: formattedData.length,
      offset: offset,
      limit: limit,
      has_more: !!results.next_page_offset
    });

  } catch (error) {
    console.error('❌ Browse chunks error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to browse chunks',
      data: []
    }, { status: 500 });
  }
}

// PUT - Update chunk content and metadata
export async function PUT(request: NextRequest) {
  // FIX 2: Thay any thành Record<string, unknown>
  let requestBody: Record<string, unknown> = {};
  
  try {
    console.log('✏️ CHUNKS API: Updating chunk...');
    
    requestBody = await request.json();
    const { id, content, source, topic, risk_level } = requestBody;

    // Validation
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Chunk ID is required'
      }, { status: 400 });
    }

    if (!content || !String(content).trim()) {
      return NextResponse.json({
        success: false,
        error: 'Content cannot be empty'
      }, { status: 400 });
    }

    console.log(`🎯 Attempting to update chunk: ${id}`);

    // Try to convert to number if it's numeric, otherwise keep as string
    let pointId: string | number = String(id);
    if (!isNaN(Number(id))) {
      pointId = parseInt(String(id));
    }

    // Get current point to preserve vector
    const currentPoints = await qdrant.retrieve(COLLECTION_NAME, {
      ids: [pointId],
      with_payload: true,
      with_vector: true
    });

    if (currentPoints.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Chunk ${id} not found`
      }, { status: 404 });
    }

    const currentPoint = currentPoints[0];

    // Update point with new content and metadata, keeping original vector
    await qdrant.upsert(COLLECTION_NAME, {
      wait: true,
      points: [{
        id: pointId,
        vector: currentPoint.vector as number[],
        payload: {
          content: String(content).trim(),
          source: source || currentPoint.payload?.source || 'Unknown',
          topic: topic || currentPoint.payload?.topic || 'General',
          risk_level: risk_level || currentPoint.payload?.risk_level || 'Low'
        }
      }]
    });

    console.log(`✅ Chunk ${id} updated successfully`);

    return NextResponse.json({
      success: true,
      message: `Chunk ${id} updated successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Update chunk error:', error);
    
    // More detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Failed to update chunk';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    
    console.error('❌ Update error details:', errorDetails);
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      chunk_id: requestBody?.id || 'unknown',
      error_details: errorDetails
    }, { status: 500 });
  }
}

// POST - Add new chunk
export async function POST(request: NextRequest) {
  try {
    console.log('➕ CHUNKS API: Adding new chunk...');
    
    const body = await request.json();
    const { content, source, topic, risk_level } = body;

    // Validation
    if (!content || !content.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Content is required'
      }, { status: 400 });
    }

    // Generate embedding for the content (you'd need to implement this)
    // For now, we'll use a placeholder vector
    const vector = new Array(384).fill(0).map(() => Math.random() - 0.5);
    
    // Generate new ID
    const timestamp = Date.now();
    const newId = `chunk_${timestamp}`;

    // Add to Qdrant
    await qdrant.upsert(COLLECTION_NAME, {
      wait: true,
      points: [{
        id: newId,
        vector: vector,
        payload: {
          content: content.trim(),
          source: source || 'Manual Entry',
          topic: topic || 'General',
          risk_level: risk_level || 'Low'
        }
      }]
    });

    console.log(`✅ New chunk ${newId} added successfully`);

    return NextResponse.json({
      success: true,
      message: `Chunk ${newId} added successfully`,
      chunk_id: newId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Add chunk error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add chunk'
    }, { status: 500 });
  }
}

// DELETE - Remove chunk by ID
export async function DELETE(request: NextRequest) {
  let chunkId: string | null = null;
  
  try {
    console.log('🗑️ CHUNKS API: Deleting chunk...');
    
    const { searchParams } = new URL(request.url);
    chunkId = searchParams.get('id');
    
    if (!chunkId) {
      return NextResponse.json({
        success: false,
        error: 'Chunk ID is required'
      }, { status: 400 });
    }

    console.log(`🎯 Attempting to delete chunk: ${chunkId}`);

    // Try to convert to number if it's numeric, otherwise keep as string
    let pointId: string | number = chunkId;
    if (!isNaN(Number(chunkId))) {
      pointId = parseInt(chunkId);
    }

    // Delete from Qdrant
    await qdrant.delete(COLLECTION_NAME, {
      wait: true,
      points: [pointId]
    });

    console.log(`✅ Chunk ${chunkId} deleted successfully`);

    return NextResponse.json({
      success: true,
      message: `Chunk ${chunkId} deleted successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Delete chunk error:', error);
    
    // More detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete chunk';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    
    console.error('❌ Delete error details:', errorDetails);
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      chunk_id: chunkId || 'unknown',
      error_details: errorDetails
    }, { status: 500 });
  }
}