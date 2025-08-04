// lib/news-manager.ts
import { promises as fs } from 'fs';
import path from 'path';

// Types cho News System
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

const NEWS_FILE_PATH = path.join(process.cwd(), 'data', 'news.json');

// Đọc news database
export async function readNewsDatabase(): Promise<NewsDatabase> {
  try {
    const fileContent = await fs.readFile(NEWS_FILE_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading news database:', error);
    // Return default structure nếu file không tồn tại
    return {
      articles: [],
      used_chunk_ids: [],
      stats: { total_generated: 0, last_generated: null, cycle_count: 0 },
      settings: { max_articles: 50, auto_reset_cycle: true }
    };
  }
}

// Ghi news database
export async function writeNewsDatabase(data: NewsDatabase): Promise<boolean> {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(NEWS_FILE_PATH);
    await fs.mkdir(dataDir, { recursive: true });
    
    await fs.writeFile(NEWS_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing news database:', error);
    return false;
  }
}

// Thêm bài viết mới
export async function addNewsArticle(article: Omit<NewsArticle, 'id' | 'created_at'>): Promise<string | null> {
  try {
    const db = await readNewsDatabase();
    
    const newArticle: NewsArticle = {
      ...article,
      id: `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString()
    };
    
    db.articles.unshift(newArticle); // Thêm vào đầu mảng
    db.stats.total_generated += 1;
    db.stats.last_generated = new Date().toISOString();
    
    // Giới hạn số bài viết
    if (db.articles.length > db.settings.max_articles) {
      db.articles = db.articles.slice(0, db.settings.max_articles);
    }
    
    const success = await writeNewsDatabase(db);
    return success ? newArticle.id : null;
  } catch (error) {
    console.error('Error adding news article:', error);
    return null;
  }
}

// Cập nhật bài viết
export async function updateNewsArticle(id: string, updates: Partial<Omit<NewsArticle, 'id' | 'created_at'>>): Promise<boolean> {
  try {
    const db = await readNewsDatabase();
    
    const articleIndex = db.articles.findIndex(article => article.id === id);
    
    if (articleIndex === -1) {
      console.error(`Article with ID ${id} not found`);
      return false;
    }
    
    // Update article with new data
    db.articles[articleIndex] = {
      ...db.articles[articleIndex],
      ...updates,
      // Preserve original id and created_at
      id: db.articles[articleIndex].id,
      created_at: db.articles[articleIndex].created_at
    };
    
    const success = await writeNewsDatabase(db);
    
    if (success) {
      console.log(`✅ Article ${id} updated successfully`);
    }
    
    return success;
  } catch (error) {
    console.error('Error updating news article:', error);
    return false;
  }
}

// Xóa bài viết
export async function deleteNewsArticle(id: string): Promise<boolean> {
  try {
    const db = await readNewsDatabase();
    
    const articleIndex = db.articles.findIndex(article => article.id === id);
    
    if (articleIndex === -1) {
      console.error(`Article with ID ${id} not found`);
      return false;
    }
    
    // Remove article from array
    const deletedArticle = db.articles.splice(articleIndex, 1)[0];
    
    // Update stats
    db.stats.total_generated = Math.max(0, db.stats.total_generated - 1);
    
    const success = await writeNewsDatabase(db);
    
    if (success) {
      console.log(`✅ Article "${deletedArticle.title}" (${id}) deleted successfully`);
    }
    
    return success;
  } catch (error) {
    console.error('Error deleting news article:', error);
    return false;
  }
}

// Lấy danh sách bài viết
export async function getNewsArticles(limit?: number): Promise<NewsArticle[]> {
  try {
    const db = await readNewsDatabase();
    return limit ? db.articles.slice(0, limit) : db.articles;
  } catch (error) {
    console.error('Error getting news articles:', error);
    return [];
  }
}

// Lấy bài viết theo ID
export async function getNewsArticleById(id: string): Promise<NewsArticle | null> {
  try {
    const db = await readNewsDatabase();
    return db.articles.find(article => article.id === id) || null;
  } catch (error) {
    console.error('Error getting news article by ID:', error);
    return null;
  }
}

// Thêm chunk ID vào used list
export async function addUsedChunkId(chunkId: number): Promise<boolean> {
  try {
    const db = await readNewsDatabase();
    
    if (!db.used_chunk_ids.includes(chunkId)) {
      db.used_chunk_ids.push(chunkId);
    }
    
    return await writeNewsDatabase(db);
  } catch (error) {
    console.error('Error adding used chunk ID:', error);
    return false;
  }
}

// Lấy danh sách chunk IDs đã sử dụng
export async function getUsedChunkIds(): Promise<number[]> {
  try {
    const db = await readNewsDatabase();
    return db.used_chunk_ids;
  } catch (error) {
    console.error('Error getting used chunk IDs:', error);
    return [];
  }
}

// Reset used chunk IDs (bắt đầu cycle mới)
export async function resetUsedChunkIds(): Promise<boolean> {
  try {
    const db = await readNewsDatabase();
    db.used_chunk_ids = [];
    db.stats.cycle_count += 1;
    
    return await writeNewsDatabase(db);
  } catch (error) {
    console.error('Error resetting used chunk IDs:', error);
    return false;
  }
}

// Lấy thống kê
export async function getNewsStats() {
  try {
    const db = await readNewsDatabase();
    return {
      total_articles: db.articles.length,
      used_chunks: db.used_chunk_ids.length,
      ...db.stats
    };
  } catch (error) {
    console.error('Error getting news stats:', error);
    return null;
  }
}

// Tìm kiếm bài viết
export async function searchNewsArticles(query: string, limit?: number): Promise<NewsArticle[]> {
  try {
    const db = await readNewsDatabase();
    const lowerQuery = query.toLowerCase();
    
    const filtered = db.articles.filter(article => 
      article.title.toLowerCase().includes(lowerQuery) ||
      article.content.toLowerCase().includes(lowerQuery) ||
      article.summary.toLowerCase().includes(lowerQuery) ||
      article.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
    
    return limit ? filtered.slice(0, limit) : filtered;
  } catch (error) {
    console.error('Error searching news articles:', error);
    return [];
  }
}

// Lấy bài viết theo category
export async function getNewsArticlesByCategory(category: string, limit?: number): Promise<NewsArticle[]> {
  try {
    const db = await readNewsDatabase();
    const filtered = db.articles.filter(article => article.category === category);
    return limit ? filtered.slice(0, limit) : filtered;
  } catch (error) {
    console.error('Error getting news articles by category:', error);
    return [];
  }
}

// Lấy bài viết có tag cụ thể
export async function getNewsArticlesByTag(tag: string, limit?: number): Promise<NewsArticle[]> {
  try {
    const db = await readNewsDatabase();
    const filtered = db.articles.filter(article => 
      article.tags.some(t => t.toLowerCase() === tag.toLowerCase())
    );
    return limit ? filtered.slice(0, limit) : filtered;
  } catch (error) {
    console.error('Error getting news articles by tag:', error);
    return [];
  }
}

// Lấy bài viết mới nhất
export async function getLatestNewsArticles(limit: number = 5): Promise<NewsArticle[]> {
  try {
    const db = await readNewsDatabase();
    // Articles are already sorted by creation time (newest first)
    return db.articles.slice(0, limit);
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