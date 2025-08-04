import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';

export default function NewsNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        {/* Icon */}
        <div className="mb-6">
          <i className="fas fa-newspaper text-6xl text-gray-300"></i>
        </div>
        
        {/* Heading */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
          Không tìm thấy tin tức
        </h1>
        
        {/* Description */}
        <p className="text-gray-600 mb-8 leading-relaxed">
          Tin tức bạn đang tìm kiếm không tồn tại hoặc đã bị xóa. 
          Có thể URL không chính xác hoặc bài viết đã được cập nhật.
        </p>
        
        {/* Actions */}
        <div className="space-y-4">
          <Link 
            href="/news"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft size={18} />
            Quay lại danh sách tin tức
          </Link>
          
          <div className="text-center">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <i className="fas fa-home"></i>
              Về trang chủ
            </Link>
          </div>
        </div>
        
        {/* Suggestions */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Search size={16} />
            Gợi ý
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Kiểm tra lại URL</li>
            <li>• Xem danh sách tin tức mới nhất</li>
            <li>• Thử tìm kiếm bài viết khác</li>
          </ul>
        </div>
      </div>
    </div>
  );
}