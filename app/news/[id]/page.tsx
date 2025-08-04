import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, ArrowLeft } from 'lucide-react';
import { Metadata } from 'next';

interface NewsArticle {
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

// Fetch single article
async function getNewsArticle(id: string): Promise<NewsArticle | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/news?id=${id}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.success ? data.article : null;
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const article = await getNewsArticle(resolvedParams.id);
  
  if (!article) {
    return {
      title: 'Tin tức không tìm thấy - MedChat AI',
      description: 'Tin tức bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.'
    };
  }

  return {
    title: `${article.title} - MedChat AI`,
    description: article.summary,
    keywords: article.tags.join(', '),
    openGraph: {
      title: article.title,
      description: article.summary,
      images: article.image_url ? [article.image_url] : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.summary,
      images: article.image_url ? [article.image_url] : [],
    }
  };
}

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const article = await getNewsArticle(resolvedParams.id);

  if (!article) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white">
      {/* Header */}
      <header className="bg-white bg-opacity-95 backdrop-blur-lg border-b border-blue-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <ArrowLeft size={18} />
                <span className="font-medium">Về trang chủ</span>
              </Link>
              <div className="h-6 w-px bg-blue-200"></div>
              <div className="flex items-center gap-2 text-blue-600">
                <i className="fas fa-user-md"></i>
                <span className="font-bold text-xl">MedChat AI</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-8 px-4">
        <article className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Article Header */}
          <div className="px-8 py-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
              {article.title}
            </h1>
            <div className="flex justify-center gap-8 text-sm opacity-90 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{new Date(article.created_at).toLocaleDateString('vi-VN')}</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="fas fa-robot"></i>
                <span>MedChat AI</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="fas fa-clock"></i>
                <span>5 phút đọc</span>
              </div>
            </div>
          </div>

          {/* Article Content */}
          <div className="px-8 py-12">
            {/* Introduction */}
            <div className="mb-12 p-8 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
              <p className="text-xl text-gray-700 leading-relaxed font-medium">
                {article.summary}
              </p>
            </div>

            {/* Main Content */}
            <div className="prose prose-lg max-w-none">
              <div 
                className="text-gray-700 leading-relaxed space-y-8 text-lg"
                dangerouslySetInnerHTML={{ 
                  __html: article.content
                    .replace(/\n/g, '<br>')
                    .replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">$1</span>')
                    .replace(/(\d+\.)/g, '<div class="flex items-start gap-4 mt-8 mb-4"><span class="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-2">$1</span><div class="flex-1">')
                    .replace(/<br><br>/g, '</div></div><br>')
                }}
              />
            </div>

            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="mt-12">
                <div className="flex flex-wrap gap-3">
                  {article.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Medical Disclaimer */}
            <div className="mt-12 p-6 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-4">
                <i className="fas fa-exclamation-triangle text-amber-600 text-2xl mt-1"></i>
                <div>
                  <h3 className="font-bold text-amber-900 mb-3 text-lg">Lưu ý quan trọng</h3>
                  <p className="text-amber-800 leading-relaxed">
                    Thông tin trong bài viết này chỉ mang tính chất tham khảo và được tạo bởi AI. 
                    Không sử dụng để thay thế lời khuyên y tế chuyên nghiệp. Hãy tham khảo ý kiến 
                    bác sĩ hoặc chuyên gia y tế để được tư vấn phù hợp với tình trạng cụ thể của bạn.
                  </p>
                </div>
              </div>
            </div>

            {/* Reference Section */}
            <div className="mt-12 p-6 bg-blue-50 rounded-lg border-t-4 border-blue-400">
              <h4 className="flex items-center gap-2 text-blue-600 font-bold mb-3">
                <i className="fas fa-book"></i>
                Tài liệu tham khảo
              </h4>
              <p className="text-blue-800">
                Thông tin được tổng hợp từ các nguồn y học uy tín và được xử lý bởi AI MedChat.
              </p>
            </div>
          </div>
        </article>

        {/* Back to Home Button */}
        <div className="text-center mt-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl"
          >
            <ArrowLeft size={18} />
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}