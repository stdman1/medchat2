// lib/news-generator.ts
import OpenAI from 'openai';
import { selectRandomChunk, SelectedChunk } from './chunk-selector';
import { addNewsArticle, addUsedChunkId, NewsArticle } from './news-manager';
import { downloadAndStoreImage } from './image-storage';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GeneratedNews {
  success: boolean;
  article: NewsArticle | null;
  message: string;
  generation_details?: {
    chunk_id: number;
    image_generated: boolean;
    image_downloaded: boolean;
    image_url?: string;
    cycle_reset?: boolean;
  };
}

// Template prompts cho GPT
const NEWS_GENERATION_PROMPT = `Bạn là chuyên gia viết tin tức y tế. Hãy viết lại thông tin dưới đây thành một bài tin tức y tế dễ hiểu, hấp dẫn và chính xác.

YÊU CẦU:
- Viết bằng tiếng Việt
- Tạo tiêu đề hấp dẫn (50-80 ký tự)
- Nội dung 300-500 từ, chia thành đoạn ngắn
- Tóm tắt ngắn gọn (100-150 từ)
- Gợi ý 3-5 tags liên quan
- Phân loại: medical/health/research/news
- Giữ nguyên tính chính xác y khoa
- Viết theo phong cách báo chí chuyên nghiệp

THÔNG TIN GỐC:
{CHUNK_CONTENT}

Trả về JSON format:
{
  "title": "...",
  "content": "...",
  "summary": "...",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "medical"
}`;

const IMAGE_GENERATION_PROMPT = `Create a professional medical illustration for this health news article. 

Requirements:
- Style: clean, modern, informative medical infographic
- Colors: calming blues and whites with ocean theme
- Include relevant medical symbols, diagrams, or icons
- Safe for all audiences, professional healthcare setting
- No text overlays, focus on visual elements
- High quality, suitable for article thumbnails

Article title: {TITLE}
Key medical topic: {TOPIC}
Content focus: {SUMMARY}`;

/**
 * Generate news article from random chunk
 */
export async function generateNewsArticle(): Promise<GeneratedNews> {
  try {
    console.log('🚀 Starting news generation process...');
    
    // Step 1: Select random chunk
    const chunkResult = await selectRandomChunk();
    
    if (!chunkResult.success || !chunkResult.chunk) {
      return {
        success: false,
        article: null,
        message: chunkResult.message || 'Failed to select chunk'
      };
    }

    const chunk = chunkResult.chunk;
    console.log(`✅ Selected chunk ${chunk.id} for news generation`);

    // Step 2: Generate news content using GPT
    const newsContent = await generateNewsFromChunk(chunk);
    
    if (!newsContent) {
      return {
        success: false,
        article: null,
        message: 'Failed to generate news content from chunk'
      };
    }

    console.log('✅ News content generated successfully');

    // Step 3: Generate and download image
    let imageGenerated = false;
    let imageDownloaded = false;
    let finalImageUrl: string | undefined;

    try {
      console.log('🎨 Generating article image...');
      const imageUrl = await generateArticleImage(newsContent.title, newsContent.category, newsContent.summary);
      
      if (imageUrl) {
        imageGenerated = true;
        console.log('✅ Image generated, downloading to local storage...');
        
        // Download and store image locally
        const downloadResult = await downloadAndStoreImage(imageUrl, `news_${Date.now()}`);
        
        if (downloadResult.success && downloadResult.publicUrl) {
          imageDownloaded = true;
          finalImageUrl = downloadResult.publicUrl;
          console.log(`✅ Image downloaded and stored: ${finalImageUrl}`);
        } else {
          console.warn(`⚠️ Image download failed: ${downloadResult.error}`);
          // Fall back to original URL (will expire but better than nothing)
          finalImageUrl = imageUrl;
        }
      }
    } catch (error) {
      console.warn('⚠️ Image generation/download failed:', error);
      // Continue without image - article can still be created
    }

    // Step 4: Save article to database
    const articleData = {
      title: newsContent.title,
      content: newsContent.content,
      summary: newsContent.summary,
      image_url: finalImageUrl,
      source_chunk_id: chunk.id,
      tags: newsContent.tags,
      category: newsContent.category as 'medical' | 'health' | 'research' | 'news' // Fix: Type assertion to ensure correct type
    };

    const articleId = await addNewsArticle(articleData);
    
    if (!articleId) {
      return {
        success: false,
        article: null,
        message: 'Failed to save article to database'
      };
    }

    // Step 5: Mark chunk as used
    await addUsedChunkId(chunk.id);

    // Step 6: Get saved article for response
    const { getNewsArticleById } = await import('./news-manager');
    const savedArticle = await getNewsArticleById(articleId);

    console.log(`🎉 News article generated successfully: ${articleId}`);

    return {
      success: true,
      article: savedArticle,
      message: 'News article generated and saved successfully',
      generation_details: {
        chunk_id: chunk.id,
        image_generated: imageGenerated,
        image_downloaded: imageDownloaded,
        image_url: finalImageUrl,
        cycle_reset: chunkResult.cycle_reset
      }
    };

  } catch (error) {
    console.error('❌ Error generating news article:', error);
    return {
      success: false,
      article: null,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Generate multiple news articles
 */
export async function generateMultipleNews(count: number = 3): Promise<GeneratedNews[]> {
  console.log(`🚀 Generating ${count} news articles...`);
  
  const results: GeneratedNews[] = [];
  
  for (let i = 1; i <= count; i++) {
    console.log(`📰 Generating article ${i}/${count}...`);
    
    try {
      const result = await generateNewsArticle();
      results.push(result);
      
      // Small delay between generations
      if (i < count) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      results.push({
        success: false,
        article: null,
        message: `Failed to generate article ${i}: ${error}`
      });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Generated ${successCount}/${count} articles successfully`);
  
  return results;
}

/**
 * Test news generation (dry run)
 */
export async function testNewsGeneration(): Promise<GeneratedNews> {
  try {
    console.log('🧪 Testing news generation...');
    
    // Select chunk without marking as used
    const chunkResult = await selectRandomChunk();
    
    if (!chunkResult.success || !chunkResult.chunk) {
      return {
        success: false,
        article: null,
        message: 'Test failed: Could not select chunk'
      };
    }

    // Generate content without saving
    const newsContent = await generateNewsFromChunk(chunkResult.chunk);
    
    if (!newsContent) {
      return {
        success: false,
        article: null,
        message: 'Test failed: Could not generate content'
      };
    }

    // Create test article object (not saved to database)
    const testArticle: NewsArticle = {
      id: 'test_article',
      title: newsContent.title,
      content: newsContent.content,
      summary: newsContent.summary,
      source_chunk_id: chunkResult.chunk.id,
      created_at: new Date().toISOString(),
      tags: newsContent.tags,
      category: newsContent.category as 'medical' | 'health' | 'research' | 'news' // Fix: Type assertion here too
    };

    return {
      success: true,
      article: testArticle,
      message: 'Test completed successfully (not saved)',
      generation_details: {
        chunk_id: chunkResult.chunk.id,
        image_generated: false,
        image_downloaded: false,
        cycle_reset: false
      }
    };

  } catch (error) {
    return {
      success: false,
      article: null,
      message: `Test failed: ${error}`
    };
  }
}

// Internal helper functions

/**
 * Generate news content from chunk using GPT
 */
// FIX 2: Thay any thành proper interface
interface NewsContentResult {
  title: string;
  content: string;
  summary: string;
  tags: string[];
  category: 'medical' | 'health' | 'research' | 'news'; // Fix: Use union type instead of string
}

async function generateNewsFromChunk(chunk: SelectedChunk): Promise<NewsContentResult | null> {
  try {
    console.log('🤖 Generating news from chunk...');
    
    const prompt = NEWS_GENERATION_PROMPT.replace('{CHUNK_CONTENT}', chunk.content);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Bạn là chuyên gia viết tin tức y tế chuyên nghiệp. Luôn trả về JSON hợp lệ.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('Empty response from GPT');
    }

    // Parse JSON response
    const newsData = JSON.parse(response);
    
    // Validate required fields
    if (!newsData.title || !newsData.content || !newsData.summary) {
      throw new Error('GPT response missing required fields');
    }

    // Validate and normalize category
    const validCategories = ['medical', 'health', 'research', 'news'];
    const normalizedCategory = validCategories.includes(newsData.category) 
      ? newsData.category 
      : 'medical'; // Default fallback

    return {
      title: newsData.title,
      content: newsData.content,
      summary: newsData.summary,
      tags: Array.isArray(newsData.tags) ? newsData.tags : [],
      category: normalizedCategory as 'medical' | 'health' | 'research' | 'news' // Fix: Type assertion with validation
    };

  } catch (error) {
    console.error('❌ Error generating news from chunk:', error);
    return null;
  }
}

/**
 * Generate article image using DALL-E
 */
async function generateArticleImage(title: string, category: string, summary: string): Promise<string | null> {
  try {
    // Skip image generation if API key not available
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️ OpenAI API key not found, skipping image generation');
      return null;
    }

    console.log('🎨 Generating article image with DALL-E...');
    
    const prompt = IMAGE_GENERATION_PROMPT
      .replace('{TITLE}', title)
      .replace('{TOPIC}', category)
      .replace('{SUMMARY}', summary.substring(0, 200)); // Limit prompt length

    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      size: '1024x1024',
      quality: 'standard',
      n: 1
    });

    const imageUrl = imageResponse.data?.[0]?.url;
    
    if (!imageUrl) {
      throw new Error('No image URL in DALL-E response');
    }

    console.log('✅ Image generated successfully');
    return imageUrl;

  } catch (error) {
    console.error('❌ Error generating image:', error);
    return null;
  }
}

/**
 * Get generation statistics
 */
export async function getGenerationStats() {
  try {
    const { getNewsStats } = await import('./news-manager');
    return await getNewsStats();
  } catch (error) {
    console.error('Error getting generation stats:', error);
    return null;
  }
}