// app/api/chat/stream/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { retrieveContext } from '../../../../lib/qdrant-service';
import { prisma } from '../../../../lib/prisma';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// FIX 1: Define interface cho context item
interface ContextItem {
  id: string;
  content: string;
  score: number;
  source: string;
  topic: string;
  risk_level: string;
}

// Interface cho user medical data
interface UserMedicalData {
  displayName: string;
  gender?: string;
  age?: number;
  height?: number;
  weight?: number;
  allergies?: string;
  hasHypertension: boolean;
  hasDiabetes: boolean;
  isSmoker: boolean;
  currentMedications?: string;
}

// Function để lấy thông tin y tế của user - OPTIMIZED
async function getUserMedicalContext(userId: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        displayName: true,
        gender: true,
        age: true,
        height: true,
        weight: true,
        allergies: true,
        hasHypertension: true,
        hasDiabetes: true,
        isSmoker: true,
        currentMedications: true,
      }
    });

    if (!user) {
      console.log('❌ No user found for ID:', userId);
      return '';
    }

    // ✅ DEBUG: Log user data
    console.log('👤 User data from DB:', {
      displayName: user.displayName,
      gender: user.gender,
      age: user.age,
      height: user.height,
      weight: user.weight,
      hasConditions: {
        hypertension: user.hasHypertension,
        diabetes: user.hasDiabetes,
        smoker: user.isSmoker
      },
      hasAllergies: !!user.allergies,
      hasMedications: !!user.currentMedications
    });

    // ✅ COMPACT FORMAT - tiết kiệm tokens
    let context = `\n[BỆNH NHÂN: ${user.displayName}`;
    
    // Basic info - một dòng
    const basics = [
      user.gender,
      user.age ? `${user.age}t` : null,
      user.height && user.weight ? `BMI${((user.weight / ((user.height/100) ** 2))).toFixed(1)}` : null
    ].filter(Boolean).join(', ');
    
    if (basics) context += ` | ${basics}`;
    
    // Medical conditions - compact
    const conditions = [];
    if (user.hasHypertension) conditions.push('THA');
    if (user.hasDiabetes) conditions.push('ĐTĐ');
    if (user.isSmoker) conditions.push('HT');
    if (conditions.length) context += ` | Tiền sử: ${conditions.join(',')}`;
    
    // Critical info only
    if (user.allergies) context += ` | Dị ứng: ${user.allergies.substring(0, 50)}`;
    if (user.currentMedications) context += ` | Thuốc: ${user.currentMedications.substring(0, 50)}`;
    
    context += `]\n`;
    
    // ✅ DEBUG: Log final context
    console.log('🏥 Generated medical context:', context);
    
    return context;
    
  } catch (error) {
    console.error('Error fetching user medical data:', error);
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body - THÊM userId
    const { message, userId } = await request.json();

    // Validate input
    if (!message || typeof message !== 'string') {
      return new Response('Message is required', { status: 400 });
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return new Response('Empty message', { status: 400 });
    }

    // Validate message length
    if (trimmedMessage.length > 1000) {
      return new Response('Tin nhắn quá dài (tối đa 1000 ký tự)!', { status: 400 });
    }

    // Tạo ReadableStream để gửi text từng phần
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Biến để đếm token
          let totalInputTokens = 0;
          let totalOutputTokens = 0;
          let streamedContent = '';

          // ✅ LẤY THÔNG TIN Y TẾ CÁ NHÂN (nếu có userId)
          let userMedicalContext = '';
          if (userId && userId !== 'anonymous') {
            console.log('🏥 Fetching user medical context for:', userId);
            userMedicalContext = await getUserMedicalContext(userId);
            console.log('📋 Medical context loaded:', userMedicalContext ? 'Yes' : 'No');
          }

          // ✅ DIRECT CALL: Không qua HTTP fetch
          console.log('🔍 Direct Qdrant search...');
          const ragResult = await retrieveContext(trimmedMessage);

          console.log('📊 Qdrant search result:', {
            success: ragResult.success,
            context_count: ragResult.context.length,
            fallback_needed: ragResult.fallback_needed
          });

          // ✅ Extract và filter results như retriever
          const searchResults: ContextItem[] = ragResult.context.map(item => ({
            id: item.id.toString(),
            content: item.content,
            score: item.score,
            source: 'qdrant-medical-database',
            topic: 'medical',
            risk_level: 'medium'
          }));

          // ✅ Filter by threshold
          const threshold = parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.5');
          const validResults = searchResults.filter(result => result.score >= threshold);

          console.log('📈 Results after threshold filter:', {
            total_results: searchResults.length,
            valid_results: validResults.length,
            threshold_used: threshold,
            highest_score: searchResults.length > 0 ? searchResults[0].score : 0
          });

          // ✅ Determine fallback properly
          const fallbackNeeded = ragResult.fallback_needed || validResults.length === 0;
          
          // ✅ Use filtered results (top 2)
          const ragContext = validResults.slice(0, 2).map(result => ({
            id: result.id,
            content: result.content,
            score: result.score,
            source: result.source,
            topic: result.topic,
            risk_level: result.risk_level
          }));
console.log('🔧 RAG_SYSTEM_PROMPT exists:', !!process.env.RAG_SYSTEM_PROMPT);
console.log('🔧 FALLBACK_SYSTEM_PROMPT exists:', !!process.env.FALLBACK_SYSTEM_PROMPT);
        // Step 2: Build prompt based on RAG results + USER MEDICAL CONTEXT
let systemPrompt = '';

if (!fallbackNeeded && ragContext.length > 0) {
  // Normal chat with RAG context
  const contextText = ragContext
    .map((context: ContextItem) => `- ${context.content}`)
    .join('\n');

  // ✅ SỬ DỤNG RAG_SYSTEM_PROMPT TỪ BIẾN MÔI TRƯỜNG
  const ragTemplate = process.env.RAG_SYSTEM_PROMPT || 
    `Bạn là MedChat AI chuyên nghiệp.

{userMedicalContext}

Chỉ trả lời dựa trên thông tin sau từ cơ sở dữ liệu chính thức: 

{contextText}

Không thêm thông tin không có trong cơ sở dữ liệu. Nếu thông tin không đủ, hãy nói rõ. Luôn nhắc nhở tham khảo ý kiến bác sĩ khi cần thiết.

{userAdvice}`;

  // Thay thế placeholders
  systemPrompt = ragTemplate
    .replace('{userMedicalContext}', userMedicalContext)
    .replace('{contextText}', contextText)
    .replace('{userAdvice}', userMedicalContext ? 'HÃY THAM KHẢO THÔNG TIN Y TẾ CÁ NHÂN TRÊN ĐỂ TƯ VẤN CHÍNH XÁC HƠN.' : '');
              
} else {
  // Fallback chat without RAG context
  // ✅ SỬ DỤNG FALLBACK_SYSTEM_PROMPT TỪ BIẾN MÔI TRƯỜNG
  const fallbackTemplate = process.env.FALLBACK_SYSTEM_PROMPT || 
    `Bạn là MedChat AI. Hiện cơ sở dữ liệu chưa có thông tin cho chủ đề này.

{userMedicalContext}

Hãy cung cấp thông tin tổng quan dựa trên kiến thức y tế phổ biến. Nếu không chắc, hãy khuyến nghị người dùng gặp bác sĩ. 

{userAdvice}

**Ghi chú rõ: đây chỉ là thông tin tham khảo.**`;

  // Thay thế placeholders
  systemPrompt = fallbackTemplate
    .replace('{userMedicalContext}', userMedicalContext)
    .replace('{userAdvice}', userMedicalContext ? 'HÃY THAM KHẢO THÔNG TIN Y TẾ CÁ NHÂN TRÊN ĐỂ TƯ VẤN CHÍNH XÁC HƠN.' : '');
}

          // ✅ THÊM DEBUG LOG để kiểm tra
          console.log('🔍 Final system prompt preview:');
          console.log('📋 User medical context:', userMedicalContext);
          console.log('📝 System prompt length:', systemPrompt.length);
          console.log('💡 Prompt contains user info:', systemPrompt.includes('BỆNH NHÂN:'));
          console.log('🎯 First 200 chars of prompt:', systemPrompt.substring(0, 200));

          // Step 3: Call OpenAI Chat API với streaming
          // ✅ THÊM BIẾN MÔI TRƯỜNG CHO MODEL
          const chatResponse = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL_CHAT || 'gpt-4o-mini', // ✅ Sửa model name
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: trimmedMessage
              }
            ],
            max_completion_tokens: parseInt(process.env.MAX_TOKENS || '600'), // ✅ Tăng lên 600
            stream: true,
            stream_options: {
              include_usage: true // Quan trọng: bật usage tracking
            }
          });
            console.log('🤖 Using OpenAI model:', process.env.OPENAI_MODEL_CHAT || 'gpt-4o-mini');
          // Đọc từng chunk từ OpenAI
          for await (const chunk of chatResponse) {
            // Nếu có content, gửi cho client
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              streamedContent += content;
              
              // Gửi content như JSON để client dễ parse
              const data = JSON.stringify({
                type: 'content',
                data: content
              }) + '\n';
              
              const encoder = new TextEncoder();
              controller.enqueue(encoder.encode(data));
            }
            
            // Nếu có usage info (cuối stream)
            if (chunk.usage) {
              totalInputTokens = chunk.usage.prompt_tokens || 0;
              totalOutputTokens = chunk.usage.completion_tokens || 0;
            }
            
            // Kiểm tra nếu stream kết thúc
            if (chunk.choices[0]?.finish_reason === 'stop') {
              break;
            }
          }

          // Tính token dự đoán nếu API không trả về
          if (totalInputTokens === 0) {
            // Ước tính: 1 token ≈ 4 ký tự cho tiếng Việt
            totalInputTokens = Math.ceil((systemPrompt.length + trimmedMessage.length) / 4);
            totalOutputTokens = Math.ceil(streamedContent.length / 4);
          }

          // Gửi thông tin token cuối cùng
          const tokenInfo = JSON.stringify({
            type: 'token_info',
            data: {
              input_tokens: totalInputTokens,
              output_tokens: totalOutputTokens,
              total_tokens: totalInputTokens + totalOutputTokens,
              estimated: true
            }
          }) + '\n';
          
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(tokenInfo));
          
          // Đóng stream
          controller.close();

        } catch (error) {
          console.error('Stream API error:', error);
          
          // Gửi thông báo lỗi
          const encoder = new TextEncoder();
          let errorMessage = 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.';

          // Handle specific errors
          if (error instanceof Error) {
            if (error.message.includes('API key')) {
              errorMessage = 'API key chưa được cấu hình!';
            } else if (error.message.includes('rate limit')) {
              errorMessage = 'Quá nhiều yêu cầu, vui lòng thử lại sau!';
            } else if (error.message.includes('Retriever')) {
              errorMessage = 'Lỗi tìm kiếm dữ liệu, sử dụng chế độ dự phòng!';
            }
          }

          const errorData = JSON.stringify({
            type: 'error',
            data: errorMessage
          }) + '\n';
          
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },

      cancel() {
        // Xử lý khi client hủy (nút pause)
        console.log('Stream was cancelled by client');
      }
    });

    // Trả về response dạng stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    console.error('Stream API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
  return new Response('Method not allowed', { status: 405 });
}