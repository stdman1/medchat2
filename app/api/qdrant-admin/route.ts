// app/api/qdrant-admin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { QdrantClient } from '@qdrant/js-client-rest';

export const dynamic = 'force-dynamic';

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME = 'medical_chunks';

// Type definitions for better type safety
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

// GET - Browse collection data
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 QDRANT-ADMIN API: Browse data');
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    console.log(`📊 Parameters: limit=${limit}, offset=${offset}`);

    // Browse points using scroll
    const results = await qdrant.scroll(COLLECTION_NAME, {
      limit,
      offset,
      with_payload: true,
      with_vector: false
    }) as QdrantScrollResult;

    console.log(`✅ Retrieved ${results.points?.length || 0} points`);

    // Format data properly with type safety
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
      next_page_offset: results.next_page_offset || null,
      has_more: !!results.next_page_offset
    });

  } catch (error) {
    console.error('❌ QDRANT-ADMIN Browse Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      action: 'browse'
    }, { status: 500 });
  }
}

// PUT - Update a point
export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 QDRANT-ADMIN API: Update point');
    
    const body = await request.json();
    const { id, content, metadata } = body;

    if (!id || !content) {
      return NextResponse.json({
        success: false,
        error: 'ID and content are required'
      }, { status: 400 });
    }

    // Get current point with type safety
    const currentPoints = await qdrant.retrieve(COLLECTION_NAME, {
      ids: [parseInt(id.toString())],
      with_payload: true,
      with_vector: true
    }) as QdrantPoint[];

    if (currentPoints.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Point ${id} not found`
      }, { status: 404 });
    }

    const currentPoint = currentPoints[0];

    // Update point with proper type handling
    await qdrant.upsert(COLLECTION_NAME, {
      wait: true,
      points: [{
        id: parseInt(id.toString()),
        vector: currentPoint.vector as number[],
        payload: {
          content: content,
          source: metadata?.source || '',
          topic: metadata?.topic || '',
          risk_level: metadata?.risk_level || ''
        }
      }]
    });

    console.log(`✅ Updated point ${id}`);

    return NextResponse.json({
      success: true,
      message: `Point ${id} updated successfully`
    });

  } catch (error) {
    console.error('❌ QDRANT-ADMIN Update Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      action: 'update'
    }, { status: 500 });
  }
}

// DELETE - Delete a point
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ QDRANT-ADMIN API: Delete point');
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID parameter is required'
      }, { status: 400 });
    }

    // Delete point with proper type conversion
    await qdrant.delete(COLLECTION_NAME, {
      wait: true,
      points: [parseInt(id.toString())]
    });

    console.log(`✅ Deleted point ${id}`);

    return NextResponse.json({
      success: true,
      message: `Point ${id} deleted successfully`
    });

  } catch (error) {
    console.error('❌ QDRANT-ADMIN Delete Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      action: 'delete'
    }, { status: 500 });
  }
}