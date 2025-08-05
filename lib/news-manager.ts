// lib/news-manager.ts
import { prisma } from './prisma';

// Types cho News System (giữ nguyên interface để tương thích)
export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  summary: string;
  image_url?: string;
  source_chunk_id: number;
  created_at: string;
  tags: string[];
  category: 'medical' | 'health' | 'research' | 'news';
}

export interface NewsDatabase {
  articles: NewsArticle[];
  used_chunk_ids: number[];
  stats: {
    total_generated: number;
    last_generated: string | null;
    cycle_count: number;
  };
  settings: {
    max_articles: number;
    auto_reset_cycle: boolean;
  };
}

// Helper function để khởi tạo stats nếu chưa có
async function ensureStatsExists() {
  try {
    const existingStats = await prisma.generationStats.findFirst();
    if (!existingStats) {
      await prisma.generationStats.create({
        data: {
          total_generated: 0,
          cycle_count: 0,
          max_articles: 50,
          auto_reset_cycle: true
        }
      });
    }
  } catch (error) {
    console.error('Error ensuring stats exists:', error);
  }
}

// Đọc news database (compatibility function)
export async function readNewsDatabase(): Promise<NewsDatabase> {
  try {
    await ensureStatsExists();
    
    const [articles, usedChunks, stats] = await Promise.all([
      prisma.article.findMany({
        orderBy: { created_at: 'desc' }
      }),
      prisma.usedChunk.findMany(),
      prisma.generationStats.findFirst()
    ]);

    // Transform database data to match original interface
    const transformedArticles: NewsArticle[] = articles.map((article: any) => ({
      id: article.id,
      title: article.title,
      content: article.content,
      summary: article.summary,
      image_url: article.image_url || undefined,
      source_chunk_id: article.source_chunk_id || 0,
      created_at: article.created_at.toISOString(),
      tags: article.tags,
      category: article.category as 'medical' | 'health' | 'research' | 'news'
    }));

    return {
      articles: transformedArticles,
      used_chunk_ids: usedChunks.map((chunk: { chunk_id: number }) => chunk.chunk_id),
      stats: {
        total_generated: stats?.total_generated || 0,
        last_generated: stats?.last_generated?.toISOString() || null,
        cycle_count: stats?.cycle_count || 0
      },
      settings: {
        max_articles: stats?.max_articles || 50,
        auto_reset_cycle: stats?.auto_reset_cycle || true
      }
    };
  } catch (error) {
    console.error('Error reading news database:', error);
    // Return default structure nếu có lỗi
    return {
      articles: [],
      used_chunk_ids: [],
      stats: { total_generated: 0, last_generated: null, cycle_count: 0 },
      settings: { max_articles: 50, auto_reset_cycle: true }
    };
  }
}

// Ghi news database (deprecated - chỉ để compatibility)
export async function writeNewsDatabase(_data: NewsDatabase): Promise<boolean> {
  console.warn('writeNewsDatabase is deprecated when using Postgres');
  return true;
}

// Thêm bài viết mới
export async function addNewsArticle(article: Omit<NewsArticle, 'id' | 'created_at'>): Promise<string | null> {
  try {
    await ensureStatsExists();

    const newArticle = await prisma.article.create({
      data: {
        title: article.title,
        content: article.content,
        summary: article.summary,
        image_url: article.image_url,
        source_chunk_id: article.source_chunk_id,
        tags: article.tags,
        category: article.category
      }
    });

    // Update stats
    await prisma.generationStats.updateMany({
      data: {
        total_generated: { increment: 1 },
        last_generated: new Date()
      }
    });

    // Clean up old articles if needed
    const stats = await prisma.generationStats.findFirst();
    if (stats) {
      const totalArticles = await prisma.article.count();
      if (totalArticles > stats.max_articles) {
        const oldestArticles = await prisma.article.findMany({
          orderBy: { created_at: 'asc' },
          take: totalArticles - stats.max_articles,
          select: { id: true }
        });
        
        await prisma.article.deleteMany({
          where: {
            id: { in: oldestArticles.map((a: { id: string }) => a.id) }
          }
        });
      }
    }

    console.log(`✅ Article added successfully: ${newArticle.id}`);
    return newArticle.id;
  } catch (error) {
    console.error('Error adding news article:', error);
    return null;
  }
}

// Cập nhật bài viết
export async function updateNewsArticle(id: string, updates: Partial<Omit<NewsArticle, 'id' | 'created_at'>>): Promise<boolean> {
  try {
    const updateData: {
      title?: string;
      content?: string;
      summary?: string;
      image_url?: string | null;
      tags?: string[];
      category?: string;
      source_chunk_id?: number | null;
    } = {};
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.summary !== undefined) updateData.summary = updates.summary;
    if (updates.image_url !== undefined) updateData.image_url = updates.image_url;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.source_chunk_id !== undefined) updateData.source_chunk_id = updates.source_chunk_id;

    await prisma.article.update({
      where: { id },
      data: updateData
    });

    console.log(`✅ Article ${id} updated successfully`);
    return true;
  } catch (error) {
    console.error('Error updating news article:', error);
    return false;
  }
}

// Xóa bài viết
export async function deleteNewsArticle(id: string): Promise<boolean> {
  try {
    const deletedArticle = await prisma.article.delete({
      where: { id }
    });

    // Update stats
    await prisma.generationStats.updateMany({
      data: {
        total_generated: { decrement: 1 }
      }
    });

    console.log(`✅ Article "${deletedArticle.title}" (${id}) deleted successfully`);
    return true;
  } catch (error) {
    console.error('Error deleting news article:', error);
    return false;
  }
}

// Lấy danh sách bài viết
export async function getNewsArticles(limit?: number): Promise<NewsArticle[]> {
  try {
    const articles = await prisma.article.findMany({
      orderBy: { created_at: 'desc' },
      ...(limit && { take: limit })
    });

    return articles.map((article: any) => ({
      id: article.id,
      title: article.title,
      content: article.content,
      summary: article.summary,
      image_url: article.image_url || undefined,
      source_chunk_id: article.source_chunk_id || 0,
      created_at: article.created_at.toISOString(),
      tags: article.tags,
      category: article.category as 'medical' | 'health' | 'research' | 'news'
    }));
  } catch (error) {
    console.error('Error getting news articles:', error);
    return [];
  }
}

// Lấy bài viết theo ID
export async function getNewsArticleById(id: string): Promise<NewsArticle | null> {
  try {
    const article = await prisma.article.findUnique({
      where: { id }
    });

    if (!article) return null;

    return {
      id: article.id,
      title: article.title,
      content: article.content,
      summary: article.summary,
      image_url: article.image_url || undefined,
      source_chunk_id: article.source_chunk_id || 0,
      created_at: article.created_at.toISOString(),
      tags: article.tags,
      category: article.category as 'medical' | 'health' | 'research' | 'news'
    };
  } catch (error) {
    console.error('Error getting news article by ID:', error);
    return null;
  }
}

// Thêm chunk ID vào used list
export async function addUsedChunkId(chunkId: number): Promise<boolean> {
  try {
    await prisma.usedChunk.upsert({
      where: { chunk_id: chunkId },
      update: {},
      create: { chunk_id: chunkId }
    });

    return true;
  } catch (error) {
    console.error('Error adding used chunk ID:', error);
    return false;
  }
}

// Lấy danh sách chunk IDs đã sử dụng
export async function getUsedChunkIds(): Promise<number[]> {
  try {
    const usedChunks = await prisma.usedChunk.findMany({
      select: { chunk_id: true }
    });

    return usedChunks.map((chunk: { chunk_id: number }) => chunk.chunk_id);
  } catch (error) {
    console.error('Error getting used chunk IDs:', error);
    return [];
  }
}

// Reset used chunk IDs (bắt đầu cycle mới)
export async function resetUsedChunkIds(): Promise<boolean> {
  try {
    await prisma.usedChunk.deleteMany();
    
    await prisma.generationStats.updateMany({
      data: {
        cycle_count: { increment: 1 }
      }
    });

    return true;
  } catch (error) {
    console.error('Error resetting used chunk IDs:', error);
    return false;
  }
}

// Lấy thống kê
export async function getNewsStats() {
  try {
    await ensureStatsExists();
    
    const [articleCount, usedChunkCount, stats] = await Promise.all([
      prisma.article.count(),
      prisma.usedChunk.count(),
      prisma.generationStats.findFirst()
    ]);

    return {
      total_articles: articleCount,
      used_chunks: usedChunkCount,
      total_generated: stats?.total_generated || 0,
      last_generated: stats?.last_generated?.toISOString() || null,
      cycle_count: stats?.cycle_count || 0
    };
  } catch (error) {
    console.error('Error getting news stats:', error);
    return null;
  }
}

// Tìm kiếm bài viết
export async function searchNewsArticles(query: string, limit?: number): Promise<NewsArticle[]> {
  try {
    const articles = await prisma.article.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { summary: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } }
        ]
      },
      orderBy: { created_at: 'desc' },
      ...(limit && { take: limit })
    });

    return articles.map((article: any) => ({
      id: article.id,
      title: article.title,
      content: article.content,
      summary: article.summary,
      image_url: article.image_url || undefined,
      source_chunk_id: article.source_chunk_id || 0,
      created_at: article.created_at.toISOString(),
      tags: article.tags,
      category: article.category as 'medical' | 'health' | 'research' | 'news'
    }));
  } catch (error) {
    console.error('Error searching news articles:', error);
    return [];
  }
}

// Lấy bài viết theo category
export async function getNewsArticlesByCategory(category: string, limit?: number): Promise<NewsArticle[]> {
  try {
    const articles = await prisma.article.findMany({
      where: { category },
      orderBy: { created_at: 'desc' },
      ...(limit && { take: limit })
    });

    return articles.map((article: any) => ({
      id: article.id,
      title: article.title,
      content: article.content,
      summary: article.summary,
      image_url: article.image_url || undefined,
      source_chunk_id: article.source_chunk_id || 0,
      created_at: article.created_at.toISOString(),
      tags: article.tags,
      category: article.category as 'medical' | 'health' | 'research' | 'news'
    }));
  } catch (error) {
    console.error('Error getting news articles by category:', error);
    return [];
  }
}

// Lấy bài viết có tag cụ thể
export async function getNewsArticlesByTag(tag: string, limit?: number): Promise<NewsArticle[]> {
  try {
    const articles = await prisma.article.findMany({
      where: {
        tags: { has: tag }
      },
      orderBy: { created_at: 'desc' },
      ...(limit && { take: limit })
    });

    return articles.map((article: any) => ({
      id: article.id,
      title: article.title,
      content: article.content,
      summary: article.summary,
      image_url: article.image_url || undefined,
      source_chunk_id: article.source_chunk_id || 0,
      created_at: article.created_at.toISOString(),
      tags: article.tags,
      category: article.category as 'medical' | 'health' | 'research' | 'news'
    }));
  } catch (error) {
    console.error('Error getting news articles by tag:', error);
    return [];
  }
}

// Lấy bài viết mới nhất
export async function getLatestNewsArticles(limit: number = 5): Promise<NewsArticle[]> {
  try {
    const articles = await prisma.article.findMany({
      orderBy: { created_at: 'desc' },
      take: limit
    });

    return articles.map((article: any) => ({
      id: article.id,
      title: article.title,
      content: article.content,
      summary: article.summary,
      image_url: article.image_url || undefined,
      source_chunk_id: article.source_chunk_id || 0,
      created_at: article.created_at.toISOString(),
      tags: article.tags,
      category: article.category as 'medical' | 'health' | 'research' | 'news'
    }));
  } catch (error) {
    console.error('Error getting latest news articles:', error);
    return [];
  }
}

// Create named object before exporting as default to fix ESLint warning
const newsManagerUtils = {
  readNewsDatabase,
  writeNewsDatabase,
  addNewsArticle,
  updateNewsArticle,
  deleteNewsArticle,
  getNewsArticles,
  getNewsArticleById,
  addUsedChunkId,
  getUsedChunkIds,
  resetUsedChunkIds,
  getNewsStats,
  searchNewsArticles,
  getNewsArticlesByCategory,
  getNewsArticlesByTag,
  getLatestNewsArticles
};

// Export named object as default
export default newsManagerUtils;