import { NextRequest, NextResponse } from 'next/server';
import { 
  getNewsArticles, 
  getNewsArticleById, 
  getNewsStats 
} from '../../../lib/news-manager';

export const dynamic = 'force-dynamic';

// GET: Lấy danh sách tin tức hoặc tin tức theo ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('id');
    const limit = searchParams.get('limit');
    const stats = searchParams.get('stats');

    // Lấy thống kê
    if (stats === 'true') {
      const newsStats = await getNewsStats();
      
      if (!newsStats) {
        return NextResponse.json(
          { error: 'Failed to get news statistics' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        stats: newsStats
      });
    }

    // Lấy tin tức theo ID
    if (articleId) {
      const article = await getNewsArticleById(articleId);
      
      if (!article) {
        return NextResponse.json(
          { error: 'Article not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        article
      });
    }

    // Lấy danh sách tin tức
    const limitNumber = limit ? parseInt(limit) : undefined;
    const articles = await getNewsArticles(limitNumber);
    
    return NextResponse.json({
      success: true,
      articles,
      count: articles.length
    });

  } catch (error) {
    console.error('Error in GET /api/news:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Tạo tin tức mới (manual)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { title, content, summary, source_chunk_id } = body;
    
    if (!title || !content || !summary || !source_chunk_id) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content, summary, source_chunk_id' },
        { status: 400 }
      );
    }

    // Import here to avoid circular dependencies
    const { addNewsArticle } = await import('../../../lib/news-manager');
    
    const articleData = {
      title: title.trim(),
      content: content.trim(),
      summary: summary.trim(),
      image_url: body.image_url || undefined,
      source_chunk_id: source_chunk_id,
      tags: body.tags || [],
      category: body.category || 'medical'
    };
    
    const articleId = await addNewsArticle(articleData);
    
    if (!articleId) {
      return NextResponse.json(
        { error: 'Failed to create article' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      article_id: articleId,
      message: 'Article created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/news:', error);
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}