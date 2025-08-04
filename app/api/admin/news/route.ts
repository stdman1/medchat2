// app/api/admin/news/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getNewsArticles, 
  getNewsArticleById, 
  addNewsArticle,
  updateNewsArticle,
  deleteNewsArticle,
  getNewsStats 
} from '../../../../lib/news-manager';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Lấy danh sách articles hoặc article theo ID
export async function GET(request: NextRequest) {
  try {
    console.log('📰 NEWS API: Getting articles...');
    
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('id');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    
    if (articleId) {
      // Lấy article cụ thể theo ID
      const article = await getNewsArticleById(articleId);
      
      if (!article) {
        return NextResponse.json({
          success: false,
          error: 'Article not found'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        article,
        timestamp: new Date().toISOString()
      });
    } else {
      // Lấy danh sách articles
      const articles = await getNewsArticles(limit);
      const stats = await getNewsStats();
      
      console.log(`✅ Retrieved ${articles.length} articles`);
      
      return NextResponse.json({
        success: true,
        articles,
        stats,
        total: articles.length,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ NEWS API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      articles: [],
      stats: null
    }, { status: 500 });
  }
}

// POST - Thêm article mới (manual)
export async function POST(request: NextRequest) {
  try {
    console.log('➕ NEWS API: Adding new article...');
    
    const body = await request.json();
    const { title, content, summary, category, tags, source_chunk_id } = body;
    
    // Validate required fields
    if (!title || !content) {
      return NextResponse.json({
        success: false,
        error: 'Title and content are required'
      }, { status: 400 });
    }

    // Validate title length
    if (title.trim().length < 10) {
      return NextResponse.json({
        success: false,
        error: 'Title must be at least 10 characters long'
      }, { status: 400 });
    }

    // Validate content length
    if (content.trim().length < 100) {
      return NextResponse.json({
        success: false,
        error: 'Content must be at least 100 characters long'
      }, { status: 400 });
    }
    
    // Create new article data
    const newArticleData = {
      title: title.trim(),
      content: content.trim(),
      summary: summary?.trim() || content.substring(0, 200) + '...',
      category: category || 'medical',
      tags: Array.isArray(tags) ? tags : [],
      source_chunk_id: source_chunk_id ? parseInt(source_chunk_id) : 0,
      image_url: body.image_url || undefined
    };
    
    const articleId = await addNewsArticle(newArticleData);
    
    if (!articleId) {
      return NextResponse.json({
        success: false,
        error: 'Failed to add article to database'
      }, { status: 500 });
    }
    
    console.log(`✅ New article added with ID: ${articleId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Article created successfully',
      article_id: articleId,
      timestamp: new Date().toISOString()
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Add article error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add article'
    }, { status: 500 });
  }
}

// PUT - Cập nhật article
export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 NEWS API: Updating article...');
    
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('id');
    
    if (!articleId) {
      return NextResponse.json({
        success: false,
        error: 'Article ID is required'
      }, { status: 400 });
    }
    
    const body = await request.json();
    const { title, content, summary, category, tags, image_url } = body;
    
    // Validate required fields
    if (!title || !content) {
      return NextResponse.json({
        success: false,
        error: 'Title and content are required'
      }, { status: 400 });
    }

    // Validate title length
    if (title.trim().length < 10) {
      return NextResponse.json({
        success: false,
        error: 'Title must be at least 10 characters long'
      }, { status: 400 });
    }

    // Validate content length
    if (content.trim().length < 100) {
      return NextResponse.json({
        success: false,
        error: 'Content must be at least 100 characters long'
      }, { status: 400 });
    }
    
    // Check if article exists
    const existingArticle = await getNewsArticleById(articleId);
    if (!existingArticle) {
      return NextResponse.json({
        success: false,
        error: 'Article not found'
      }, { status: 404 });
    }
    
    // Prepare update data - THÊM image_url
    const updateData = {
      title: title.trim(),
      content: content.trim(),
      summary: summary?.trim() || content.substring(0, 200) + '...',
      category: category || existingArticle.category,
      tags: Array.isArray(tags) ? tags : existingArticle.tags,
      image_url: image_url !== undefined ? image_url : existingArticle.image_url
    };
    
    // Actually update the article using the lib function
    const success = await updateNewsArticle(articleId, updateData);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update article in database'
      }, { status: 500 });
    }
    
    // Get updated article to return
    const updatedArticle = await getNewsArticleById(articleId);
    
    console.log(`✅ Article ${articleId} updated successfully`);
    
    return NextResponse.json({
      success: true,
      message: 'Article updated successfully',
      article: updatedArticle,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Update article error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update article'
    }, { status: 500 });
  }
}

// DELETE - Xóa article
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ NEWS API: Deleting article...');
    
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('id');
    
    if (!articleId) {
      return NextResponse.json({
        success: false,
        error: 'Article ID is required'
      }, { status: 400 });
    }
    
    // Check if article exists before deletion
    const existingArticle = await getNewsArticleById(articleId);
    if (!existingArticle) {
      return NextResponse.json({
        success: false,
        error: 'Article not found'
      }, { status: 404 });
    }
    
    // Store article title for response message
    const articleTitle = existingArticle.title;
    
    // Actually delete the article using the lib function
    const success = await deleteNewsArticle(articleId);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete article from database'
      }, { status: 500 });
    }
    
    console.log(`✅ Article "${articleTitle}" (${articleId}) deleted successfully`);
    
    return NextResponse.json({
      success: true,
      message: `Article "${articleTitle}" deleted successfully`,
      deleted_article: {
        id: articleId,
        title: articleTitle
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Delete article error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete article'
    }, { status: 500 });
  }
}

// OPTIONS - CORS support
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}