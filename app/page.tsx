'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Calendar, Tag, ArrowLeft } from 'lucide-react';
import AuthModal from '../components/AuthModal';

interface Message {
  id: string;
  sender: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  isMarkdown?: boolean;
  isStreaming?: boolean;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  gender?: string;
  height?: number;
  weight?: number;
  age?: number;
  allergies?: string;
  hasHypertension?: boolean;
  hasDiabetes?: boolean;
  isSmoker?: boolean;
  currentMedications?: string;
}

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  summary: string;
  image_url?: string;
  source_chunk_id: string;
  created_at: string;
  tags: string[];
  category: 'medical' | 'health' | 'research' | 'news';
}

// Fetch news từ API
async function getNewsArticles(): Promise<NewsArticle[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/news?limit=20`, {
      cache: 'no-store'
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.success ? data.articles : [];
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}

// Fetch single news article
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
    console.error('Error fetching news article:', error);
    return null;
  }
}

// News Section Component
function NewsSection() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNews = async () => {
      setLoading(true);
      const newsData = await getNewsArticles();
      setArticles(newsData.slice(0, 9)); // Chỉ lấy 9 bài đầu tiên cho grid 3x3
      setLoading(false);
    };
    
    loadNews();
  }, []);

  // Helper functions
  const getCategoryName = (category: string) => {
    switch (category) {
      case 'medical': return 'Y học';
      case 'health': return 'Sức khỏe';
      case 'research': return 'Nghiên cứu';
      default: return 'Tin tức';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="news-content-area">
        <div className="simple-news-grid">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="news-card loading">
              <div className="news-image-placeholder"></div>
              <div className="news-body">
                <div className="loading-line short"></div>
                <div className="loading-line"></div>
                <div className="loading-line"></div>
                <div className="loading-line medium"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="news-content-area">
        <div className="text-center py-12">
          <i className="fas fa-newspaper text-6xl text-gray-300 mb-4"></i>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Chưa có tin tức nào</h3>
          <p className="text-gray-500">Hệ thống đang cập nhật tin tức mới...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="news-content-area">
      <div className="simple-news-grid">
        {articles.map((article) => (
          <div key={article.id} 
               className="news-card"
               onClick={() => {
                 // Trigger news detail view từ parent component
                 window.dispatchEvent(new CustomEvent('viewNewsDetail', { 
                   detail: { articleId: article.id } 
                 }));
               }}>
            {/* Ảnh đại diện cố định */}
            <div className="news-image">
              {article.image_url ? (
                <Image 
                  src={article.image_url} 
                  alt={article.title}
                  width={300}
                  height={200}
                  className="news-img"
                />
              ) : (
                <div className="news-image-placeholder">
                  <i className="fas fa-newspaper"></i>
                </div>
              )}
              <div className="news-category-badge">
                {getCategoryName(article.category)}
              </div>
            </div>
            
            {/* Nội dung cố định */}
            <div className="news-body">
              <div className="news-meta">
                <span className="news-date">
                  <Calendar size={12} />
                  {formatDate(article.created_at)}
                </span>
                <span className="news-id">ID: {article.source_chunk_id}</span>
              </div>
              
              <h3 className="news-title">{article.title}</h3>
              
              <p className="news-excerpt">{article.summary}</p>
              
              {article.tags.length > 0 && (
                <div className="news-tags">
                  <Tag size={12} />
                  <span>{article.tags.length} tags</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button className="pagination-btn disabled">
          <i className="fas fa-chevron-left"></i>
          Trang trước
        </button>
        
        <div className="pagination-info">
          Trang 1
        </div>
        
        <button className="pagination-btn">
          Trang sau
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  );
}

// News Detail Component
function NewsDetailSection({ articleId, onBack }: { articleId: string; onBack: () => void }) {
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadArticle = async () => {
      setLoading(true);
      const articleData = await getNewsArticle(articleId);
      setArticle(articleData);
      setLoading(false);
    };
    
    loadArticle();
  }, [articleId]);

  // Helper functions
  const getCategoryName = (category: string) => {
    switch (category) {
      case 'medical': return 'Y học';
      case 'health': return 'Sức khỏe';
      case 'research': return 'Nghiên cứu';
      default: return 'Tin tức';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="news-content-area">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
            <p className="text-gray-600">Đang tải bài báo...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="news-content-area">
        <div className="text-center py-12">
          <i className="fas fa-exclamation-triangle text-6xl text-gray-300 mb-4"></i>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Không tìm thấy bài báo</h3>
          <p className="text-gray-500 mb-6">Bài báo bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.</p>
          <button
            onClick={onBack}
            className="ocean-button-primary"
          >
            <ArrowLeft size={16} />
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="news-content-area">
      {/* CSS Styles cho news detail - nhúng inline */}

      <article className="news-detail-card">
        <div className="news-detail-content">
          {/* Meta thông tin */}
          <div className="news-detail-meta">
            <span className="category-tag">{getCategoryName(article.category)}</span>
            <span className="date-time">{formatDate(article.created_at)}</span>
          </div>

          {/* Tiêu đề */}
          <h1 className="news-detail-title">
            {article.title}
          </h1>

          {/* Tóm tắt */}
          <div className="news-detail-summary">
            {article.summary}
          </div>

          {/* Nội dung chi tiết */}
          <div className="news-detail-content-text">
            {article.content.split('\n\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="news-detail-tags">
              {article.tags.map((tag, index) => (
                <span key={index} className="tag">#{tag}</span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="news-detail-footer">
            <div className="article-id">ID: {article.id}</div>
            <button onClick={onBack} className="back-btn">
              <ArrowLeft size={16} />
              Quay lại danh sách
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}

// Profile Form Component
function ProfileSection({ user, onUpdateUser }: { user: User | null; onUpdateUser: (userData: User) => void }) {
  const [formData, setFormData] = useState({
    displayName: '',
    gender: '',
    height: '',
    weight: '',
    age: '',
    allergies: '',
    hasHypertension: false,
    hasDiabetes: false,
    isSmoker: false,
    currentMedications: ''
  });

  // Load user data khi component mount hoặc user thay đổi
  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        gender: user.gender || '',
        height: user.height?.toString() || '',
        weight: user.weight?.toString() || '',
        age: user.age?.toString() || '',
        allergies: user.allergies || '',
        hasHypertension: user.hasHypertension || false,
        hasDiabetes: user.hasDiabetes || false,
        isSmoker: user.isSmoker || false,
        currentMedications: user.currentMedications || ''
      });
    }
  }, [user]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          ...formData
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
        onUpdateUser(data.user);
        
        // Tự động ẩn thông báo sau 3 giây
        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Có lỗi xảy ra' });
      }
    } catch (error) {
      console.error('Update profile error:', error);
      setMessage({ type: 'error', text: 'Không thể kết nối đến server' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="profile-no-user">
        <div className="profile-no-user-content">
          <i className="fas fa-user-circle profile-icon"></i>
          <h3 className="profile-title">Đăng nhập để quản lý hồ sơ</h3>
          <p className="profile-description">Đăng nhập để lưu và quản lý thông tin y tế cá nhân của bạn một cách an toàn và tiện lợi</p>
          <button 
            className="login-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('openAuth'))}
          >
            <i className="fas fa-sign-in-alt"></i>
            Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* CSS Styles cho profile form */}
  

      <div className="profile-card">
        <div className="profile-header">
          <h1>
            <i className="fas fa-user-md"></i>
            Hồ Sơ Y Khoa
          </h1>
          <p>Cập nhật thông tin cá nhân và y tế của bạn</p>
        </div>

        <div className="profile-form">
          <div className="info-box">
            <h3>
              <i className="fas fa-shield-alt"></i>
              Thông tin quan trọng
            </h3>
            <p>
              Thông tin y tế của bạn được bảo mật tuyệt đối và chỉ được sử dụng để cung cấp tư vấn y tế chính xác hơn. 
              Tất cả dữ liệu được mã hóa và tuân thủ các tiêu chuẩn bảo mật y tế.
            </p>
          </div>

          {message.text && (
            <div className={`message ${message.type}`}>
              <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Thông tin cá nhân */}
            <div className="form-section">
              <h2 className="section-title">
                <i className="fas fa-user"></i>
                Thông tin cá nhân
              </h2>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="displayName">
                    <i className="fas fa-signature"></i>
                    Tên hiển thị
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    placeholder="Nhập tên hiển thị"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="gender">
                    <i className="fas fa-venus-mars"></i>
                    Giới tính
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                  >
                    <option value="">-- Chọn giới tính --</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="age">
                    <i className="fas fa-birthday-cake"></i>
                    Tuổi <span className="units">(năm)</span>
                  </label>
                  <input
                    type="number"
                    id="age"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    min="0"
                    max="150"
                    placeholder="Nhập tuổi"
                  />
                </div>
              </div>
            </div>

            {/* Thông số cơ thể */}
            <div className="form-section">
              <h2 className="section-title">
                <i className="fas fa-weight"></i>
                Thông số cơ thể
              </h2>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="height">
                    <i className="fas fa-ruler-vertical"></i>
                    Chiều cao <span className="units">(cm)</span>
                  </label>
                  <input
                    type="number"
                    id="height"
                    name="height"
                    value={formData.height}
                    onChange={handleInputChange}
                    min="50"
                    max="300"
                    step="0.1"
                    placeholder="VD: 170"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="weight">
                    <i className="fas fa-weight-hanging"></i>
                    Cân nặng <span className="units">(kg)</span>
                  </label>
                  <input
                    type="number"
                    id="weight"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    min="10"
                    max="500"
                    step="0.1"
                    placeholder="VD: 65"
                  />
                </div>
              </div>
            </div>

            {/* Tiền sử bệnh án */}
            <div className="form-section">
              <h2 className="section-title">
                <i className="fas fa-heartbeat"></i>
                Tiền sử bệnh án
              </h2>
              <div className="checkbox-group">
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="hasHypertension"
                    name="hasHypertension"
                    checked={formData.hasHypertension}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="hasHypertension" className="checkbox-label">
                    <i className="fas fa-heart"></i>
                    Từng bị cao huyết áp
                  </label>
                </div>

                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="hasDiabetes"
                    name="hasDiabetes"
                    checked={formData.hasDiabetes}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="hasDiabetes" className="checkbox-label">
                    <i className="fas fa-tint"></i>
                    Từng bị tiểu đường
                  </label>
                </div>

                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="isSmoker"
                    name="isSmoker"
                    checked={formData.isSmoker}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="isSmoker" className="checkbox-label">
                    <i className="fas fa-smoking"></i>
                    Có hút thuốc lá
                  </label>
                </div>
              </div>
            </div>

            {/* Thông tin y tế bổ sung */}
            <div className="form-section">
              <h2 className="section-title">
                <i className="fas fa-pills"></i>
                Thông tin y tế bổ sung
              </h2>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="allergies">
                    <i className="fas fa-exclamation-triangle"></i>
                    Dị ứng
                  </label>
                  <textarea
                    id="allergies"
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleInputChange}
                    placeholder="Mô tả các loại dị ứng (thức ăn, thuốc, môi trường...)"
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="currentMedications">
                    <i className="fas fa-prescription-bottle-alt"></i>
                    Thuốc đang sử dụng
                  </label>
                  <textarea
                    id="currentMedications"
                    name="currentMedications"
                    value={formData.currentMedications}
                    onChange={handleInputChange}
                    placeholder="Liệt kê các loại thuốc đang sử dụng, liều lượng và tần suất..."
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    Lưu thông tin
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function OceanChatPage() {
  // States chính - thêm news vào currentContent
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentContent, setCurrentContent] = useState<'chat' | 'profile' | 'news'>('chat');
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null); // Thêm state cho news detail

  // States cho đăng nhập (optional - chỉ để personalize, không lưu data)
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // States cho streaming
  const [isStreaming, setIsStreaming] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen for news detail events và auth modal events
  useEffect(() => {
    const handleViewNewsDetail = (event: CustomEvent) => {
      setSelectedNewsId(event.detail.articleId);
    };

    const handleOpenAuth = () => {
      setShowAuthModal(true);
    };

    window.addEventListener('viewNewsDetail', handleViewNewsDetail as EventListener);
    window.addEventListener('openAuth', handleOpenAuth as EventListener);
    
    return () => {
      window.removeEventListener('viewNewsDetail', handleViewNewsDetail as EventListener);
      window.removeEventListener('openAuth', handleOpenAuth as EventListener);
    };
  }, []);

  // Tự động cuộn xuống khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input khi mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Kiểm tra đăng nhập khi load trang - CHỈ để personalize
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (error) {
        console.error('Error loading user data:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Parse markdown
  const parseMarkdown = (text: string): string => {
    text = text.replace(/[&<>"']/g, (match) => {
      const map: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return map[match];
    });

    text = text.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-2 text-ocean-blue">$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3 text-ocean-blue">$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-3 text-ocean-blue border-b-2 border-ocean-teal pb-2">$1</h1>');

    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-ocean-blue">$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

    text = text.replace(/`([^`]+)`/g, '<code class="bg-ocean-blue bg-opacity-10 text-ocean-blue px-2 py-1 rounded text-sm font-mono border border-ocean-blue border-opacity-20">$1</code>');

    text = text.replace(/^\* (.+$)/gim, '<li class="ml-4 mb-1">• $1</li>');
    text = text.replace(/^\- (.+$)/gim, '<li class="ml-4 mb-1">• $1</li>');
    text = text.replace(/(<li>.*<\/li>)/s, '<ul class="space-y-1 mb-4">$1</ul>');

    text = text.replace(/\n/g, '<br>');

    return text;
  };

  // Thêm tin nhắn - KHÔNG lưu vào database
  const addMessage = (sender: Message['sender'], content: string, isMarkdown = false, isStreaming = false) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sender,
      content,
      timestamp: new Date(),
      isMarkdown,
      isStreaming
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  // Function cập nhật tin nhắn
  const updateMessage = (messageId: string, newContent: string) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: msg.content + newContent }
          : msg
      )
    );
  };

  // Function dừng streaming
  const stopStreaming = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsStreaming(false);
    setIsLoading(false);
  };

  // Gửi tin nhắn với streaming
  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    if (trimmedInput.length > 1000) {
      addMessage('system', 'Tin nhắn quá dài! Tối đa 1000 ký tự.');
      return;
    }

    addMessage('user', trimmedInput);
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);

    // Tạo AbortController để có thể dừng
    const controller = new AbortController();
    setAbortController(controller);

    // Tạo tin nhắn bot rỗng để stream vào
    const botMessageId = `bot-${Date.now()}-${Math.random()}`;
    const botMessage: Message = {
      id: botMessageId,
      sender: 'bot',
      content: '',
      timestamp: new Date(),
      isMarkdown: true,
      isStreaming: true
    };
    setMessages(prev => [...prev, botMessage]);

    // Biến lưu token info
    let currentTokenInfo = {
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0
    };

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: trimmedInput }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      // Đọc stream từng chunk
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        // Parse từng dòng JSON
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            
            if (parsed.type === 'content') {
              // Cập nhật nội dung tin nhắn
              updateMessage(botMessageId, parsed.data);
              
              // Cuộn xuống mỗi khi có text mới
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              
            } else if (parsed.type === 'token_info') {
              // Lưu thông tin token
              currentTokenInfo = parsed.data;
              
            } else if (parsed.type === 'error') {
              // Hiển thị lỗi
              updateMessage(botMessageId, parsed.data);
              break;
            }
          } catch (parseError) {
            console.log('Parse error (normal):', parseError);
            // Có thể là chunk chưa hoàn chỉnh, bỏ qua
          }
        }
      }

      // Hoàn thành streaming - KHÔNG lưu vào database
      setMessages(prev => 
        prev.map(msg => {
          if (msg.id === botMessageId) {
            return { ...msg, isStreaming: false };
          }
          return msg;
        })
      );

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Stream was aborted');
        // Đánh dấu tin nhắn bị dừng
        setMessages(prev => 
          prev.map(msg => 
            msg.id === botMessageId 
              ? { ...msg, content: msg.content + ' [Đã dừng]', isStreaming: false }
              : msg
          )
        );
      } else {
        console.error('Error:', error);
        addMessage('system', 'Không thể kết nối đến server. Vui lòng thử lại!');
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setAbortController(null);
    }
  };

  // Xử lý Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isStreaming) {
        stopStreaming();
      } else {
        sendMessage();
      }
    }
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Chuyển đổi nội dung
  const switchContent = (content: typeof currentContent) => {
    setCurrentContent(content);
    setSelectedNewsId(null); // Reset news detail khi chuyển tab
    setSidebarOpen(false);
  };

  // Back to news list
  const backToNewsList = () => {
    setSelectedNewsId(null);
  };

  // Lấy tiêu đề trang
  const getPageTitle = () => {
    switch (currentContent) {
      case 'chat': return 'Tư vấn sức khỏe với AI';
      case 'profile': return 'Hồ sơ cá nhân';
      case 'news': 
        return selectedNewsId ? 'Chi tiết tin tức' : 'Tin Tức Y Tế';
      default: return 'MedChat AI';
    }
  };

  // Xử lý đăng nhập - CHỈ để personalize
  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Xử lý đăng xuất
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setMessages([]); // Xóa chat hiện tại
  };

  // Bắt đầu tư vấn mới (xóa chat hiện tại)
  const startNewConsultation = () => {
    setMessages([]);
    // Chuyển về tab chat nếu đang ở tab khác
    if (currentContent !== 'chat') {
      setCurrentContent('chat');
    }
  };

  // Handle update user profile
  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <div className="ocean-app-container">
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
      />

      {/* Sidebar */}
      <aside className={`ocean-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="ocean-sidebar-header">
          <div className="ocean-logo">
            <i className="fas fa-user-md"></i>
            <span>MedChat AI</span>
          </div>
        </div>

        <nav className="ocean-nav-menu">
          {/* Nút Tư vấn mới */}
          <button
            onClick={startNewConsultation}
            className="ocean-nav-item ocean-new-consultation-btn"
            title="Bắt đầu tư vấn mới"
          >
            <div className="ocean-nav-icon">
              <i className="fas fa-plus"></i>
            </div>
            Tư vấn mới
          </button>

          <div 
            className={`ocean-nav-item ${currentContent === 'chat' ? 'active' : ''}`}
            onClick={() => switchContent('chat')}
          >
            <div className="ocean-nav-icon">
              <i className="fas fa-stethoscope"></i>
            </div>
            Tư vấn sức khỏe
          </div>
          <div 
            className={`ocean-nav-item ${currentContent === 'profile' ? 'active' : ''}`}
            onClick={() => switchContent('profile')}
          >
            <div className="ocean-nav-icon">
              <i className="fas fa-user-md"></i>
            </div>
            Hồ sơ
          </div>
          <div 
            className={`ocean-nav-item ${currentContent === 'news' ? 'active' : ''}`}
            onClick={() => switchContent('news')}
          >
            <div className="ocean-nav-icon">
              <i className="fas fa-newspaper"></i>
            </div>
            Tin Tức Y Tế
          </div>
        </nav>

        {/* Quick Actions */}
        <div className="ocean-quick-actions">
          <div className="ocean-quick-action">
            <i className="fas fa-info-circle"></i>
            <div>
              <div className="ocean-quick-title">Lưu ý quan trọng</div>
              <div className="ocean-quick-desc">AI chỉ hỗ trợ tư vấn, không thay thế bác sĩ</div>
            </div>
          </div>
          <div className="ocean-quick-action">
            <i className="fas fa-shield-alt"></i>
            <div>
              <div className="ocean-quick-title">Bảo mật</div>
              <div className="ocean-quick-desc">Cuộc trò chuyện không được lưu trữ</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ocean-main-content">
        <header className="ocean-top-header">
          <div className="ocean-header-left">
            <button className="ocean-mobile-menu-btn" onClick={toggleSidebar}>
              <i className="fas fa-bars"></i>
            </button>
            <div className="ocean-page-title">{getPageTitle()}</div>
            {/* Nút Back chỉ hiển thị khi đang xem detail tin tức */}
            {currentContent === 'news' && selectedNewsId && (
              <button
                onClick={backToNewsList}
                className="ocean-new-chat-btn"
                title="Quay lại danh sách tin tức"
              >
                <i className="fas fa-arrow-left"></i>
                Quay lại
              </button>
            )}
          </div>
          <div className="ocean-header-right">
            {user ? (
              <div className="ocean-header-user">
                <span className="ocean-header-username">{user.displayName}</span>
                <button
                  onClick={handleLogout}
                  className="ocean-header-logout-btn"
                  title="Đăng xuất"
                >
                  <i className="fas fa-sign-out-alt"></i>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="ocean-header-login-btn"
              >
                <i className="fas fa-user"></i>
                Đăng nhập
              </button>
            )}
          </div>
        </header>

        <div className="ocean-content-area">
          {/* Chat Interface */}
          <div className={`ocean-content-section ${currentContent === 'chat' ? 'active' : ''}`}>
            <div className="ocean-chat-interface">
              <div className="ocean-messages-container">
                <div className="ocean-messages">
                  {messages.length === 0 ? (
                    <div className="ocean-welcome-message">
                      <div className="ocean-welcome-icon">
                        <i className="fas fa-user-md"></i>
                      </div>
                      <h3>Xin chào{user ? ` ${user.displayName}` : ''}! Tôi là MedChat AI</h3>
                      <p>
                        Tôi có thể giúp bạn tư vấn về các vấn đề sức khỏe cơ bản, triệu chứng bệnh, 
                        và hướng dẫn chăm sóc sức khỏe. Hãy mô tả triệu chứng hoặc đặt câu hỏi để bắt đầu!
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div key={message.id} className={`ocean-message ${message.sender} ${message.isStreaming ? 'streaming' : ''}`}>
                        <div className="ocean-avatar">
                          <i className={
                            message.sender === 'user' ? 'fas fa-user' :
                            message.sender === 'bot' ? 'fas fa-robot' :
                            'fas fa-info-circle'
                          }></i>
                        </div>
                        
                        {/* Medical Loading inline khi bot message rỗng */}
                        {message.sender === 'bot' && message.content === '' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="medical-inline-stethoscope">
                              <i className="fas fa-stethoscope"></i>
                            </div>
                            <div className="medical-inline-text">Đang phân tích triệu chứng...</div>
                          </div>
                        ) : (
                          <div className="ocean-bubble">
                            <div 
                              dangerouslySetInnerHTML={{
                                __html: message.isMarkdown ? parseMarkdown(message.content) : message.content
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="ocean-chat-input-section">
                <div className="ocean-input-group">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Mô tả triệu chứng hoặc đặt câu hỏi về sức khỏe..."
                    disabled={isLoading}
                    maxLength={1000}
                  />
                </div>
                {/* Nút gửi/dừng với hiệu ứng medical */}
                <button
                  onClick={isStreaming ? stopStreaming : sendMessage}
                  disabled={isLoading || (!input.trim() && !isStreaming)}
                  className={`ocean-send-btn ${isStreaming ? 'streaming' : ''}`}
                  title={isStreaming ? 'Dừng' : 'Gửi câu hỏi'}
                >
                  {isStreaming ? (
                    <i className="fas fa-stop"></i>
                  ) : isLoading ? (
                    <i className="fas fa-heartbeat"></i>
                  ) : (
                    <i className="fas fa-paper-plane"></i>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Profile Section - Thêm thanh cuộn */}
          <div className={`ocean-content-section ${currentContent === 'profile' ? 'active' : ''}`} style={{ overflowY: 'auto', height: '100%' }}>
            <ProfileSection user={user} onUpdateUser={handleUpdateUser} />
          </div>

          {/* News Section */}
          <div className={`ocean-content-section ${currentContent === 'news' ? 'active' : ''}`}>
            {selectedNewsId ? (
              <NewsDetailSection 
                articleId={selectedNewsId} 
                onBack={backToNewsList}
              />
            ) : (
              <NewsSection />
            )}
          </div>
        </div>
      </main>

      {/* Backdrop cho mobile */}
      {sidebarOpen && <div className="ocean-backdrop" onClick={toggleSidebar}></div>}
    </div>
  );
}