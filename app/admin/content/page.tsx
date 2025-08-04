// app/admin/content/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Article {
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

interface ContentStats {
  total_articles: number;
  ai_generated: number;
  published: number;
}

interface NewArticleForm {
  title: string;
  content: string;
  summary: string;
  category: 'medical' | 'health' | 'research' | 'news';
  tags: string[];
  source_chunk_id: number;
  image_file?: File;
  image_preview?: string;
}

export default function ContentManagerPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState<ContentStats>({
    total_articles: 0,
    ai_generated: 0,
    published: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  // FIX 1 & 2: Xóa selectedArticle và setSelectedArticle không được sử dụng
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newArticle, setNewArticle] = useState<NewArticleForm>({
    title: '',
    content: '',
    summary: '',
    category: 'medical',
    tags: [],
    source_chunk_id: 0,
    image_file: undefined,
    image_preview: undefined
  });
  const [tagInput, setTagInput] = useState('');

  // ===== THÊM STATE CHO EDIT IMAGE =====
  const [editImageFile, setEditImageFile] = useState<File | undefined>(undefined);
  const [editImagePreview, setEditImagePreview] = useState<string | undefined>(undefined);
  const [editImageToRemove, setEditImageToRemove] = useState(false);

  // Toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      border-radius: 8px;
      z-index: 10000;
      font-weight: 500;
    `;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3000);
  };

  // Load articles and stats
  const loadContent = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/news');
      const data = await response.json();
      
      if (data.success) {
        setArticles(data.articles || []);
        
        const totalArticles = data.articles?.length || 0;
        // FIX 3: Thay 'a' thành '_' để chỉ rõ parameter không được sử dụng
        const aiGenerated = data.articles?.filter((article: Article) => 
        article.title.includes('AI') || article.summary?.includes('AI')
        ).length || 0;
        const published = data.articles?.filter((_: Article) => true).length || 0;
        
        setStats({
          total_articles: totalArticles,
          ai_generated: aiGenerated,
          published: published
        });
      } else {
        setError(data.error || 'Failed to load content');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error('Failed to load content:', err);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    loadContent();
  }, []);

  // Generate AI Content
  const generateAIContent = async () => {
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/admin/generate-news?action=single', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        showToast('AI article generated successfully!', 'success');
        await loadContent();
      } else {
        showToast(data.error || 'Failed to generate AI article', 'error');
      }
    } catch (err) {
      showToast('Error generating AI article', 'error');
      console.error('AI generation error:', err);
    }
    
    setIsGenerating(false);
  };

  // Open Add Modal
  const openAddModal = () => {
    setNewArticle({
      title: '',
      content: '',
      summary: '',
      category: 'medical',
      tags: [],
      source_chunk_id: 0,
      image_file: undefined,
      image_preview: undefined
    });
    setTagInput('');
    setShowAddModal(true);
  };

  // Close Add Modal
  const closeAddModal = () => {
    if (isSubmitting) return;
    
    if (newArticle.image_preview) {
      URL.revokeObjectURL(newArticle.image_preview);
    }
    
    setShowAddModal(false);
    setNewArticle({
      title: '',
      content: '',
      summary: '',
      category: 'medical',
      tags: [],
      source_chunk_id: 0,
      image_file: undefined,
      image_preview: undefined
    });
    setTagInput('');
  };

  // ===== CẬP NHẬT Open Edit Modal =====
  const openEditModal = (article: Article) => {
    setEditingArticle({ ...article });
    setEditImageFile(undefined);
    setEditImagePreview(undefined);
    setEditImageToRemove(false);
    setShowEditModal(true);
  };

  // ===== CẬP NHẬT Close Edit Modal =====
  const closeEditModal = () => {
    if (isSubmitting) return;
    
    if (editImagePreview) {
      URL.revokeObjectURL(editImagePreview);
    }
    
    setShowEditModal(false);
    setEditingArticle(null);
    setEditImageFile(undefined);
    setEditImagePreview(undefined);
    setEditImageToRemove(false);
  };

  // Add tag for new article
  const addTag = (tag: string) => {
    if (!tag.trim() || newArticle.tags.includes(tag.trim()) || newArticle.tags.length >= 10) return;
    setNewArticle(prev => ({
      ...prev,
      tags: [...prev.tags, tag.trim()]
    }));
  };

  // Remove tag for new article
  const removeTag = (tagToRemove: string) => {
    setNewArticle(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Add tag for editing article
  const addEditTag = (tag: string) => {
    if (!tag.trim() || !editingArticle || editingArticle.tags.includes(tag.trim()) || editingArticle.tags.length >= 10) return;
    setEditingArticle(prev => prev ? ({
      ...prev,
      tags: [...prev.tags, tag.trim()]
    }) : null);
  };

  // Handle image file selection for ADD
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Please select a valid image file (JPG, PNG, WebP)', 'error');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast('Image file size must be less than 5MB', 'error');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setNewArticle(prev => ({
      ...prev,
      image_file: file,
      image_preview: previewUrl
    }));
  };

  // Remove selected image for ADD
  const removeImage = () => {
    if (newArticle.image_preview) {
      URL.revokeObjectURL(newArticle.image_preview);
    }
    setNewArticle(prev => ({
      ...prev,
      image_file: undefined,
      image_preview: undefined
    }));
  };

  // ===== THÊM Functions cho EDIT IMAGE =====
  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Please select a valid image file (JPG, PNG, WebP)', 'error');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast('Image file size must be less than 5MB', 'error');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setEditImageFile(file);
    setEditImagePreview(previewUrl);
    setEditImageToRemove(false);
  };

  const removeEditImage = () => {
    if (editImagePreview) {
      URL.revokeObjectURL(editImagePreview);
    }
    setEditImageFile(undefined);
    setEditImagePreview(undefined);
    setEditImageToRemove(true);
  };

  // Handle tag input keypress
  const handleTagKeyPress = (e: React.KeyboardEvent, isEdit = false) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isEdit) {
        addEditTag(tagInput);
      } else {
        addTag(tagInput);
      }
      setTagInput('');
    }
  };

  // Remove tag for editing article
  const removeEditTag = (tagToRemove: string) => {
    setEditingArticle(prev => prev ? ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }) : null);
  };

  // Save new article
  const saveNewArticle = async () => {
    if (isSubmitting) return;
    
    if (!newArticle.title.trim() || !newArticle.content.trim()) {
      showToast('Please fill in title and content', 'error');
      return;
    }

    if (newArticle.title.length < 10) {
      showToast('Title must be at least 10 characters long', 'error');
      return;
    }

    if (newArticle.content.length < 100) {
      showToast('Content must be at least 100 characters long', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      let imageUrl = '';

      if (newArticle.image_file) {
        const formData = new FormData();
        formData.append('file', newArticle.image_file);
        formData.append('articleId', `temp_${Date.now()}`);

        const imageResponse = await fetch('/api/admin/upload-image', {
          method: 'POST',
          body: formData
        });

        const imageData = await imageResponse.json();
        if (imageData.success) {
          imageUrl = imageData.image_url;
        } else {
          showToast('Image upload failed, continuing without image', 'error');
        }
      }

      const response = await fetch('/api/admin/news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newArticle.title.trim(),
          content: newArticle.content.trim(),
          summary: newArticle.summary.trim() || newArticle.content.substring(0, 200) + '...',
          category: newArticle.category,
          tags: newArticle.tags,
          source_chunk_id: newArticle.source_chunk_id || 0,
          image_url: imageUrl
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showToast('Article created successfully!', 'success');
        closeAddModal();
        await loadContent();
      } else {
        showToast(data.error || 'Failed to create article', 'error');
      }
    } catch (err) {
      showToast('Error creating article', 'error');
      console.error('Create article error:', err);
    }
    
    setIsSubmitting(false);
  };

  // ===== CẬP NHẬT Save edited article =====
  const saveEditedArticle = async () => {
    if (isSubmitting || !editingArticle) return;
    
    if (!editingArticle.title.trim() || !editingArticle.content.trim()) {
      showToast('Please fill in title and content', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      let imageUrl = editingArticle.image_url || '';

      if (editImageFile) {
        const formData = new FormData();
        formData.append('file', editImageFile);
        formData.append('articleId', `edit_${editingArticle.id}_${Date.now()}`);

        const imageResponse = await fetch('/api/admin/upload-image', {
          method: 'POST',
          body: formData
        });

        const imageData = await imageResponse.json();
        if (imageData.success) {
          imageUrl = imageData.image_url;
        } else {
          showToast('Image upload failed, keeping existing image', 'error');
        }
      }

      if (editImageToRemove) {
        imageUrl = '';
      }

      const response = await fetch(`/api/admin/news?id=${editingArticle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editingArticle.title.trim(),
          content: editingArticle.content.trim(),
          summary: editingArticle.summary.trim(),
          category: editingArticle.category,
          tags: editingArticle.tags,
          image_url: imageUrl
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showToast('Article updated successfully!', 'success');
        closeEditModal();
        await loadContent();
      } else {
        showToast(data.error || 'Failed to update article', 'error');
      }
    } catch (err) {
      showToast('Error updating article', 'error');
      console.error('Update article error:', err);
    }
    
    setIsSubmitting(false);
  };

  // Delete article
  const deleteArticle = async (article: Article) => {
    if (!confirm(`Are you sure you want to delete "${article.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/news?id=${article.id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        showToast('Article deleted successfully!', 'success');
        await loadContent();
      } else {
        showToast(data.error || 'Failed to delete article', 'error');
      }
    } catch (err) {
      showToast('Error deleting article', 'error');
      console.error('Delete article error:', err);
    }
  };

  return (
    <div className="admin-page">
      <style jsx>{`
        .admin-page {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          text-align: center;
        }
        .stat-value {
          font-size: 2rem;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 0.5rem;
        }
        .stat-label {
          color: #64748b;
          font-size: 0.875rem;
        }
        .content-table {
          width: 100%;
          background: white;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }
        .content-table th {
          background: #f8fafc;
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e2e8f0;
        }
        .content-table td {
          padding: 1rem;
          border-bottom: 1px solid #f1f5f9;
        }
        .content-table tr:hover {
          background: #f8fafc;
        }
        .btn {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .btn-primary {
          background: #3b82f6;
          color: white;
        }
        .btn-primary:hover {
          background: #2563eb;
        }
        .btn-secondary {
          background: #6b7280;
          color: white;
        }
        .btn-secondary:hover {
          background: #4b5563;
        }
        .btn-danger {
          background: #ef4444;
          color: white;
        }
        .btn-danger:hover {
          background: #dc2626;
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal {
          background: white;
          border-radius: 12px;
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }
        .modal-title {
          font-size: 1.25rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }
        .close-btn:hover {
          background: #f3f4f6;
        }
        .form-group {
          padding: 0 1.5rem;
          margin-bottom: 1.5rem;
        }
        .form-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #374151;
        }
        .form-input, .form-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
        }
        .form-input:focus, .form-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .form-textarea.large {
          min-height: 150px;
          resize: vertical;
        }
        .form-select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
        }
        .char-counter {
          text-align: right;
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }
        .char-counter.warning {
          color: #f59e0b;
        }
        .char-counter.error {
          color: #ef4444;
        }
        .tags-display {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
          min-height: 2rem;
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: #f8fafc;
        }
        .tag-item {
          background: #3b82f6;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .tag-remove {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-weight: bold;
          line-height: 1;
        }
        .modal-actions {
          padding: 1.5rem;
          border-top: 1px solid #e2e8f0;
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }
        .loading {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
            📝 Content Manager
          </h1>
          <p style={{ color: '#6b7280' }}>
            Manage your medical news articles and AI-generated content
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={openAddModal}>
            ✍️ Add Manual
          </button>
          <button 
            className="btn btn-primary" 
            onClick={generateAIContent}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="loading"></span>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <span>🤖</span>
                <span>Generate AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total_articles}</div>
          <div className="stat-label">Total Articles</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.ai_generated}</div>
          <div className="stat-label">AI Generated</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.published}</div>
          <div className="stat-label">Published</div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div style={{ 
          background: '#fef2f2', 
          border: '1px solid #fecaca', 
          color: '#dc2626', 
          padding: '1rem', 
          borderRadius: '8px', 
          marginBottom: '2rem' 
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div className="loading" style={{ margin: '0 auto', marginBottom: '1rem', width: '32px', height: '32px' }}></div>
          <p style={{ color: '#6b7280' }}>Loading content...</p>
        </div>
      )}

      {/* Content Table */}
      {!isLoading && (
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table className="content-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Tags</th>
                <th>Created</th>
                <th>Image</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id}>
                  <td>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                      {article.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {article.summary.substring(0, 100)}...
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      background: article.category === 'medical' ? '#dbeafe' : 
                                  article.category === 'health' ? '#dcfce7' : 
                                  article.category === 'research' ? '#f3e8ff' : '#f1f5f9',
                      color: article.category === 'medical' ? '#1e40af' : 
                             article.category === 'health' ? '#166534' : 
                             article.category === 'research' ? '#7c3aed' : '#475569',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      {article.category === 'medical' ? 'Y học' : 
                       article.category === 'health' ? 'Sức khỏe' : 
                       article.category === 'research' ? 'Nghiên cứu' : 'Tin tức'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {article.tags.slice(0, 2).map(tag => (
                        <span key={tag} style={{ 
                          background: '#f1f5f9', 
                          color: '#475569', 
                          padding: '0.125rem 0.375rem', 
                          borderRadius: '3px', 
                          fontSize: '0.6875rem' 
                        }}>
                          {tag}
                        </span>
                      ))}
                      {article.tags.length > 2 && (
                        <span style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
                          +{article.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {new Date(article.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td>
                    {article.image_url ? (
                      <Image 
                        src={article.image_url} 
                        alt="Article" 
                        width={40}
                        height={40}
                        style={{ 
                          objectFit: 'cover', 
                          borderRadius: '4px' 
                        }} 
                      />
                    ) : (
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        background: '#f1f5f9', 
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        color: '#6b7280'
                      }}>
                        📷
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        onClick={() => openEditModal(article)}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        className="btn btn-danger"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        onClick={() => deleteArticle(article)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty State */}
          {articles.length === 0 && !error && !isLoading && (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📄</div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '500', color: '#1f2937', marginBottom: '0.5rem' }}>
                No articles found
              </h3>
              <p style={{ color: '#6b7280' }}>
                Start by generating your first AI article.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add Article Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>✍️</span>
                Create New Article
              </div>
              <button className="close-btn" onClick={closeAddModal}>×</button>
            </div>
            
            <div className="form-group">
              <label className="form-label">📝 Article Title *</label>
              <input 
                type="text" 
                className="form-input" 
                value={newArticle.title}
                onChange={(e) => setNewArticle(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter an engaging title for your medical article..."
                maxLength={100}
              />
              <div className={`char-counter ${newArticle.title.length > 80 ? 'warning' : ''} ${newArticle.title.length >= 100 ? 'error' : ''}`}>
                {newArticle.title.length}/100
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">📄 Article Summary</label>
              <textarea 
                className="form-textarea"
                value={newArticle.summary}
                onChange={(e) => setNewArticle(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Brief summary of the article (optional - will be auto-generated if left blank)..."
                maxLength={300}
              />
              <div className={`char-counter ${newArticle.summary.length > 250 ? 'warning' : ''} ${newArticle.summary.length >= 300 ? 'error' : ''}`}>
                {newArticle.summary.length}/300
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">📄 Full Article Content *</label>
              <textarea 
                className="form-textarea large"
                value={newArticle.content}
                onChange={(e) => setNewArticle(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your complete article content here. Include all relevant medical information, research findings, and practical advice..."
                maxLength={5000}
              />
              <div className={`char-counter ${newArticle.content.length > 4500 ? 'warning' : ''} ${newArticle.content.length >= 5000 ? 'error' : ''}`}>
                {newArticle.content.length}/5000
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">📂 Category</label>
              <select 
                className="form-select"
                value={newArticle.category}
                // FIX 4: Chỉ định type cụ thể thay vì any
                onChange={(e) => setNewArticle(prev => ({ ...prev, category: e.target.value as 'medical' | 'health' | 'research' | 'news' }))}
              >
                <option value="medical">🏥 Medical</option>
                <option value="health">💚 Health</option>
                <option value="research">🔬 Research</option>
                <option value="news">📰 News</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">🏷️ Tags</label>
              <input 
                type="text" 
                className="form-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => handleTagKeyPress(e, false)}
                placeholder="Type a tag and press Enter..."
              />
              <div className="tags-display">
                {newArticle.tags.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '8px' }}>No tags added yet</div>
                ) : (
                  newArticle.tags.map(tag => (
                    <div key={tag} className="tag-item">
                      <span>{tag}</span>
                      <button type="button" className="tag-remove" onClick={() => removeTag(tag)}>×</button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">🖼️ Article Image</label>
              <div style={{ 
                border: '2px dashed #e2e8f0', 
                borderRadius: '8px', 
                padding: '1.5rem', 
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                transition: 'all 0.2s ease'
              }}>
                {newArticle.image_preview ? (
                  <div style={{ position: 'relative' }}>
                    <Image 
                      src={newArticle.image_preview} 
                      alt="Preview" 
                      width={300}
                      height={200}
                      style={{ 
                        width: '100%', 
                        maxWidth: '300px', 
                        height: '200px', 
                        objectFit: 'cover', 
                        borderRadius: '8px',
                        marginBottom: '1rem'
                      }} 
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById('imageInput')?.click();
                        }}
                      >
                        📷 Change Image
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-danger"
                        style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage();
                        }}
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📷</div>
                    <div style={{ marginBottom: '1rem', color: '#64748b' }}>
                      <strong>Upload Article Image</strong>
                      <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        JPG, PNG, WebP • Max 5MB
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      style={{ fontSize: '0.9rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById('imageInput')?.click();
                      }}
                    >
                      📂 Choose Image
                    </button>
                  </div>
                )}
                <input 
                  id="imageInput"
                  type="file" 
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleImageSelect}
                />
              </div>
              <div style={{ 
                fontSize: '0.8rem', 
                color: '#64748b', 
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                💡 Optional: Add a representative image for your article
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={closeAddModal}>
                ❌ Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={saveNewArticle}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading"></span>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Create Article</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Article Modal */}
      {showEditModal && editingArticle && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>✏️</span>
                Edit Article
              </div>
              <button className="close-btn" onClick={closeEditModal}>×</button>
            </div>
            
            <div className="form-group">
              <label className="form-label">📝 Article Title *</label>
              <input 
                type="text" 
                className="form-input" 
                value={editingArticle.title}
                onChange={(e) => setEditingArticle(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                placeholder="Enter an engaging title for your medical article..."
                maxLength={100}
              />
              <div className={`char-counter ${editingArticle.title.length > 80 ? 'warning' : ''} ${editingArticle.title.length >= 100 ? 'error' : ''}`}>
                {editingArticle.title.length}/100
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">📄 Article Summary</label>
              <textarea 
                className="form-textarea"
                value={editingArticle.summary}
                onChange={(e) => setEditingArticle(prev => prev ? ({ ...prev, summary: e.target.value }) : null)}
                placeholder="Brief summary of the article..."
                maxLength={300}
              />
              <div className={`char-counter ${editingArticle.summary.length > 250 ? 'warning' : ''} ${editingArticle.summary.length >= 300 ? 'error' : ''}`}>
                {editingArticle.summary.length}/300
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">📄 Full Article Content *</label>
              <textarea 
                className="form-textarea large"
                value={editingArticle.content}
                onChange={(e) => setEditingArticle(prev => prev ? ({ ...prev, content: e.target.value }) : null)}
                placeholder="Write your complete article content here. Include all relevant medical information, research findings, and practical advice..."
                maxLength={5000}
              />
              <div className={`char-counter ${editingArticle.content.length > 4500 ? 'warning' : ''} ${editingArticle.content.length >= 5000 ? 'error' : ''}`}>
                {editingArticle.content.length}/5000
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">📂 Category</label>
              <select 
                className="form-select"
                value={editingArticle.category}
                // FIX 5: Chỉ định type cụ thể thay vì any
                onChange={(e) => setEditingArticle(prev => prev ? ({ ...prev, category: e.target.value as 'medical' | 'health' | 'research' | 'news' }) : null)}
              >
                <option value="medical">🏥 Medical</option>
                <option value="health">💚 Health</option>
                <option value="research">🔬 Research</option>
                <option value="news">📰 News</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">🏷️ Tags</label>
              <input 
                type="text" 
                className="form-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => handleTagKeyPress(e, true)}
                placeholder="Type a tag and press Enter..."
              />
              <div className="tags-display">
                {editingArticle.tags.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '8px' }}>No tags added yet</div>
                ) : (
                  editingArticle.tags.map(tag => (
                    <div key={tag} className="tag-item">
                      <span>{tag}</span>
                      <button type="button" className="tag-remove" onClick={() => removeEditTag(tag)}>×</button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ===== THÊM IMAGE SECTION CHO EDIT ===== */}
            <div className="form-group">
              <label className="form-label">🖼️ Article Image</label>
              <div style={{ 
                border: '2px dashed #e2e8f0', 
                borderRadius: '8px', 
                padding: '1.5rem', 
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                transition: 'all 0.2s ease'
              }}>
                {editImagePreview ? (
                  <div style={{ position: 'relative' }}>
                    <Image 
                      src={editImagePreview} 
                      alt="New Preview" 
                      width={300}
                      height={200}
                      style={{ 
                        width: '100%', 
                        maxWidth: '300px', 
                        height: '200px', 
                        objectFit: 'cover', 
                        borderRadius: '8px',
                        marginBottom: '1rem'
                      }} 
                    />
                    <div style={{ 
                      position: 'absolute', 
                      top: '8px', 
                      left: '8px', 
                      backgroundColor: '#10b981', 
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      NEW
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById('editImageInput')?.click();
                        }}
                      >
                        📷 Change Image
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-danger"
                        style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeEditImage();
                        }}
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                ) : editingArticle?.image_url && !editImageToRemove ? (
                  <div style={{ position: 'relative' }}>
                    <Image 
                      src={editingArticle.image_url} 
                      alt="Current Image" 
                      width={300}
                      height={200}
                      style={{ 
                        width: '100%', 
                        maxWidth: '300px', 
                        height: '200px', 
                        objectFit: 'cover', 
                        borderRadius: '8px',
                        marginBottom: '1rem'
                      }} 
                    />
                    <div style={{ 
                      position: 'absolute', 
                      top: '8px', 
                      left: '8px', 
                      backgroundColor: '#3b82f6', 
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      CURRENT
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById('editImageInput')?.click();
                        }}
                      >
                        📷 Change Image
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-danger"
                        style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeEditImage();
                        }}
                      >
                        🗑️ Remove Image
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>
                      {editImageToRemove ? '🚫' : '📷'}
                    </div>
                    <div style={{ marginBottom: '1rem', color: '#64748b' }}>
                      <strong>
                        {editImageToRemove ? 'Image will be removed' : 'No image selected'}
                      </strong>
                      <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        JPG, PNG, WebP • Max 5MB
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button 
                        type="button" 
                        className="btn btn-primary"
                        style={{ fontSize: '0.9rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById('editImageInput')?.click();
                        }}
                      >
                        📂 Choose Image
                      </button>
                      {editImageToRemove && (
                        <button 
                          type="button" 
                          className="btn btn-secondary"
                          style={{ fontSize: '0.9rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditImageToRemove(false);
                          }}
                        >
                          ↩️ Undo Remove
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <input 
                  id="editImageInput"
                  type="file" 
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleEditImageSelect}
                />
              </div>
              <div style={{ 
                fontSize: '0.8rem', 
                color: '#64748b', 
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                💡 Upload a new image to replace the current one, or remove it entirely
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                ❌ Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={saveEditedArticle}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading"></span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}