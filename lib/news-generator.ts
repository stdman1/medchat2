// lib/news-generator.ts - CHỈ SỬA PHẦN IMAGE STORAGE
import OpenAI from 'openai';
import { selectRandomChunk, SelectedChunk } from './chunk-selector';
import { addNewsArticle, addUsedChunkId, NewsArticle } from './news-manager';
import { uploadImageToBlob } from './blob-storage'; // ✅ THAY THẾ import

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
    image_uploaded: boolean;
    image_url?: string;
    cycle_reset?: boolean;
  };
}

// Template prompts cho GPT (giữ nguyên)
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

    // Step 3: Generate and upload image ✅ SỬA PHẦN NÀY
    let imageGenerated = false;
    let imageUploaded = false;
    let finalImageUrl: string | undefined;

    try {
      console.log('🎨 Generating article image...');
      const imageUrl = await generateArticleImage(newsContent.title, newsContent.category, newsContent.summary);
      
      if (imageUrl) {
        imageGenerated = true;
        console.log('✅ Image generated, uploading to Vercel Blob...');
        
        // ✅ THAY THẾ: Upload to Vercel Blob instead of local storage
        const uploadResult = await uploadImageToBlob(imageUrl, `news_${Date.now()}`);
        
        if (uploadResult.success && uploadResult.url) {
          imageUploaded = true;
          finalImageUrl = uploadResult.url;
          console.log(`✅ Image uploaded to Blob: ${finalImageUrl}`);
        } else {
          console.warn(`⚠️ Image upload failed: ${uploadResult.error}`);
          // Fall back to original URL (will expire but better than nothing)
          finalImageUrl = imageUrl;
        }
      }
    } catch (error) {
      console.warn('⚠️ Image generation/upload failed:', error);
      // Continue without image - article can still be created
    }

    // Step 4: Save article to database (giữ nguyên)
    const articleData = {
      title: newsContent.title,
      content: newsContent.content,
      summary: newsContent.summary,
      image_url: finalImageUrl,
      source_chunk_id: chunk.id,
      tags: newsContent.tags,
      category: newsContent.category as 'medical' | 'health' | 'research' | 'news'
    };

    const articleId = await addNewsArticle(articleData);
    
    if (!articleId) {
      return {
        success: false,
        article: null,
        message: 'Failed to save article to database'
      };
    }

    // Step 5: Mark chunk as used (giữ nguyên)
    await addUsedChunkId(chunk.id);

    // Step 6: Get saved article for response (giữ nguyên)
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
        image_uploaded: imageUploaded, // ✅ ĐỔI TÊN từ image_downloaded
        image_url: finalImageUrl,
        cycle_reset: chunkResult.cycle_reset
      }
    };

  } catch (error) {
    console.error('❌ Error generating news article:', error);
    return {
      success: false,
      article: null,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// CÁC FUNCTIONS KHÁC GIỮ NGUYÊN (generateNewsFromChunk, generateArticleImage, etc...)
async function generateNewsFromChunk(chunk: SelectedChunk): Promise<any> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️ OpenAI API key not found, skipping news generation');
      return null;
    }

    console.log('🤖 Generating news content with GPT...');
    
    const prompt = NEWS_GENERATION_PROMPT.replace('{CHUNK_CONTENT}', chunk.content);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a medical news writer. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    const newsData = JSON.parse(responseText);
    
    const normalizedCategory = ['medical', 'health', 'research', 'news'].includes(newsData.category?.toLowerCase()) 
      ? newsData.category.toLowerCase() 
      : 'medical';

    return {
      title: newsData.title,
      content: newsData.content,
      summary: newsData.summary,
      tags: Array.isArray(newsData.tags) ? newsData.tags : [],
      category: normalizedCategory as 'medical' | 'health' | 'research' | 'news'
    };

  } catch (error) {
    console.error('❌ Error generating news from chunk:', error);
    return null;
  }
}

async function generateArticleImage(title: string, category: string, summary: string): Promise<string | null> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️ OpenAI API key not found, skipping image generation');
      return null;
    }

    console.log('🎨 Generating article image with DALL-E...');
    
    const prompt = IMAGE_GENERATION_PROMPT
      .replace('{TITLE}', title)
      .replace('{TOPIC}', category)
      .replace('{SUMMARY}', summary.substring(0, 200));

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

export async function getGenerationStats() {
  try {
    const { getNewsStats } = await import('./news-manager');
    return await getNewsStats();
  } catch (error) {
    console.error('Error getting generation stats:', error);
    return null;
  }
}

// Generate multiple news articles
export async function generateMultipleNews(count: number): Promise<GeneratedNews[]> {
  const results: GeneratedNews[] = [];
  
  for (let i = 0; i < count; i++) {
    console.log(`🔄 Generating article ${i + 1}/${count}...`);
    const result = await generateNewsArticle();
    results.push(result);
    
    // Small delay between generations
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return results;
}

// Test news generation
export async function testNewsGeneration(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await generateNewsArticle();
    
    return {
      success: result.success,
      message: result.success ? 'Test generation completed successfully' : result.message
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Test generation failed'
    };
  }
}