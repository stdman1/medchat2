import { NextRequest, NextResponse } from 'next/server';
import { 
  generateNewsArticle, 
  generateMultipleNews, 
  testNewsGeneration 
} from '../../../../lib/news-generator';
import { getChunkSelectionStats, testQdrantConnection } from '../../../../lib/chunk-selector';

export const dynamic = 'force-dynamic';

// POST: Generate tin tức tự động
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'single';
    const count = searchParams.get('count');

    console.log(`🚀 Admin generate news - Action: ${action}`);

    switch (action) {
      case 'single':
        // Tạo 1 bài tin tức
        const result = await generateNewsArticle();
        
        return NextResponse.json({
          success: result.success,
          message: result.message,
          article: result.article,
          generation_details: result.generation_details
        });

      case 'multiple':
        // Tạo nhiều bài tin tức
        const newsCount = count ? parseInt(count) : 3;
        
        if (newsCount > 10) {
          return NextResponse.json(
            { error: 'Maximum 10 articles per batch' },
            { status: 400 }
          );
        }
        
        const results = await generateMultipleNews(newsCount);
        const successCount = results.filter(r => r.success).length;
        
        return NextResponse.json({
          success: successCount > 0,
          message: `Generated ${successCount}/${newsCount} articles successfully`,
          results,
          summary: {
            total: newsCount,
            success: successCount,
            failed: newsCount - successCount
          }
        });

      case 'test':
        // Test generation
        const testResult = await testNewsGeneration();
        
        return NextResponse.json({
          success: testResult.success,
          message: 'Test completed',
          test_result: testResult
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: single, multiple, or test' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in POST /api/admin/generate-news:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET: Lấy thông tin stats và health check
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'stats';

    switch (action) {
      case 'stats':
        // Lấy thống kê chunk selection
        const chunkStats = await getChunkSelectionStats();
        
        // Import news stats
        const { getNewsStats } = await import('../../../../lib/news-manager');
        const newsStats = await getNewsStats();
        
        return NextResponse.json({
          success: true,
          chunk_stats: chunkStats,
          news_stats: newsStats,
          timestamp: new Date().toISOString()
        });

      case 'health':
        // Health check cho các services
        const qdrantStatus = await testQdrantConnection();
        
        return NextResponse.json({
          success: true,
          health: {
            qdrant_connection: qdrantStatus,
            openai_configured: !!process.env.OPENAI_API_KEY,
            timestamp: new Date().toISOString()
          }
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: stats or health' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in GET /api/admin/generate-news:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Reset used chunks cycle
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action !== 'reset-cycle') {
      return NextResponse.json(
        { error: 'Invalid action. Use: reset-cycle' },
        { status: 400 }
      );
    }

    // Import reset function
    const { resetUsedChunkIds } = await import('../../../../lib/news-manager');
    const success = await resetUsedChunkIds();
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to reset chunk cycle' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Chunk cycle reset successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in DELETE /api/admin/generate-news:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS: CORS support
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}