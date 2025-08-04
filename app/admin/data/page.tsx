// app/admin/data/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

interface ChunkData {
  id: string | number;
  payload: {
    content: string;
    source: string;
    topic: string;
    risk_level: string;
  };
}

interface EditFormData {
  content: string;
  source: string;
  topic: string;
  risk_level: string;
}

export default function DataManagementPage() {
  const [chunks, setChunks] = useState<ChunkData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [hasMore, setHasMore] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  
  // Modal states
  const [selectedChunk, setSelectedChunk] = useState<ChunkData | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    content: '',
    source: '',
    topic: '',
    risk_level: ''
  });
  
  // UI states
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageInput, setPageInput] = useState('1');
  
  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load chunks
  const loadChunks = async (offset = 0, limit = 10) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/chunks?offset=${offset}&limit=${limit}`);
      const data = await response.json();
      
      if (data.success) {
        setChunks(data.data || []);
        setHasMore(data.has_more || false);
        
        // Estimate total pages (this is approximate since we don't have exact total count)
        const estimatedTotal = offset + data.data.length + (data.has_more ? limit : 0);
        setTotalPages(Math.ceil(estimatedTotal / limit));
      } else {
        setError(data.error || 'Failed to load chunks');
      }
    } catch (err) {
      setError('Network error. Please check if Qdrant is running.');
      console.error('Failed to load chunks:', err);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    loadChunks(currentPage * pageSize, pageSize);
    setPageInput(String(currentPage + 1));
  }, [currentPage, pageSize]);

  // Track changes in edit form
  useEffect(() => {
    if (showEditModal && selectedChunk) {
      const hasChanges = 
        editFormData.content !== selectedChunk.payload.content ||
        editFormData.source !== selectedChunk.payload.source ||
        editFormData.topic !== selectedChunk.payload.topic ||
        editFormData.risk_level !== selectedChunk.payload.risk_level;
      
      setHasUnsavedChanges(hasChanges);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [editFormData, selectedChunk, showEditModal]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (hasUnsavedChanges) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [hasUnsavedChanges]); // Only hasUnsavedChanges in dependency

  // Pagination handlers
  const goToNextPage = () => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const goToFirstPage = () => {
    setCurrentPage(0);
  };

  const goToLastPage = () => {
    // Estimate last page based on current info
    if (totalPages > 0) {
      setCurrentPage(totalPages - 1);
    }
  };

  const goToSpecificPage = () => {
    const pageNum = parseInt(pageInput);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum - 1);
    } else {
      alert(`Please enter a page number between 1 and ${totalPages}`);
      setPageInput(String(currentPage + 1));
    }
  };

  const changePageSize = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
  };

  // Modal handlers
  const viewChunk = (chunk: ChunkData) => {
    setSelectedChunk(chunk);
    setShowViewModal(true);
  };

  const editChunk = (chunk: ChunkData) => {
    setSelectedChunk(chunk);
    setEditFormData({
      content: chunk.payload.content,
      source: chunk.payload.source,
      topic: chunk.payload.topic,
      risk_level: chunk.payload.risk_level
    });
    setShowEditModal(true);
  };

  const closeModals = () => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }
    
    setShowViewModal(false);
    setShowEditModal(false);
    setSelectedChunk(null);
    setEditFormData({
      content: '',
      source: '',
      topic: '',
      risk_level: ''
    });
    setHasUnsavedChanges(false);
  };

  // Edit chunk function - use useCallback to prevent recreation
  const saveChunkChanges = useCallback(async () => {
    if (!selectedChunk || isSubmitting) return;

    // Validation
    if (!editFormData.content.trim()) {
      alert('Content cannot be empty!');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/chunks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedChunk.id,
          content: editFormData.content.trim(),
          source: editFormData.source.trim(),
          topic: editFormData.topic.trim(),
          risk_level: editFormData.risk_level
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Chunk updated successfully!');
        setHasUnsavedChanges(false);
        closeModals();
        // Reload current page
        loadChunks(currentPage * pageSize, pageSize);
      } else {
        alert('❌ Update failed: ' + result.error);
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('❌ Update error: ' + error);
    }

    setIsSubmitting(false);
  }, [selectedChunk, editFormData, isSubmitting, currentPage, pageSize]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter to save in edit modal
      if (e.ctrlKey && e.key === 'Enter' && showEditModal) {
        e.preventDefault();
        saveChunkChanges();
      }
      // Escape to close modals
      if (e.key === 'Escape' && (showEditModal || showViewModal)) {
        e.preventDefault();
        closeModals();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showEditModal, showViewModal, saveChunkChanges]);

  // Delete chunk function
  const deleteChunk = async (chunk: ChunkData) => {
    if (!confirm(`⚠️ Are you sure you want to delete chunk ${chunk.id}?\n\nThis action cannot be undone!`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/chunks?id=${chunk.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Chunk deleted successfully!');
        // Reload current page
        loadChunks(currentPage * pageSize, pageSize);
      } else {
        alert('❌ Delete failed: ' + result.error);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('❌ Delete error: ' + error);
    }
  };

  const copyContent = () => {
    if (selectedChunk) {
      navigator.clipboard.writeText(selectedChunk.payload.content).then(() => {
        alert('Content copied to clipboard!');
      });
    }
  };

  // Utils
  const getRiskClass = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const truncate = (text: string, max = 100) => {
    return text.length > max ? text.substring(0, max) + '...' : text;
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-4 text-gray-600">Loading chunks from Qdrant...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#f8fafc', color: '#334155', lineHeight: '1.6' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem' }}>
          Data Management
        </h1>
        <p style={{ color: '#64748b' }}>
          Browse and manage {chunks.length} medical chunks from vector database
          {hasUnsavedChanges && <span style={{ color: '#ef4444', marginLeft: '1rem' }}>• Unsaved changes</span>}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem' }}>
          <p style={{ color: '#dc2626', fontWeight: '600' }}>⚠️ {error}</p>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={pageSize}
            onChange={(e) => changePageSize(Number(e.target.value))}
            style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: 'white', color: '#374151', cursor: 'pointer' }}
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
          
          <button 
            onClick={() => loadChunks(currentPage * pageSize, pageSize)}
            style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: '1px solid #3b82f6', borderRadius: '0.5rem', cursor: 'pointer' }}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Enhanced Pagination Controls */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* First Page */}
          <button 
            onClick={goToFirstPage}
            disabled={currentPage === 0}
            style={{ 
              padding: '0.5rem 0.75rem', 
              border: '1px solid #d1d5db', 
              borderRadius: '0.5rem', 
              background: 'white', 
              color: '#374151', 
              cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 0 ? 0.5 : 1,
              fontSize: '0.875rem'
            }}
          >
            ⏮️ First
          </button>

          {/* Previous Page */}
          <button 
            onClick={goToPrevPage}
            disabled={currentPage === 0}
            style={{ 
              padding: '0.5rem 0.75rem', 
              border: '1px solid #d1d5db', 
              borderRadius: '0.5rem', 
              background: 'white', 
              color: '#374151', 
              cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 0 ? 0.5 : 1,
              fontSize: '0.875rem'
            }}
          >
            ← Prev
          </button>

          {/* Page Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Page:</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  goToSpecificPage();
                }
              }}
              style={{
                width: '60px',
                padding: '0.375rem 0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem',
                textAlign: 'center',
                fontSize: '0.875rem'
              }}
            />
            <button
              onClick={goToSpecificPage}
              style={{
                padding: '0.375rem 0.75rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Go
            </button>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>of ~{totalPages}</span>
          </div>

          {/* Next Page */}
          <button 
            onClick={goToNextPage}
            disabled={!hasMore}
            style={{ 
              padding: '0.5rem 0.75rem', 
              border: '1px solid #d1d5db', 
              borderRadius: '0.5rem', 
              background: 'white', 
              color: '#374151', 
              cursor: !hasMore ? 'not-allowed' : 'pointer',
              opacity: !hasMore ? 0.5 : 1,
              fontSize: '0.875rem'
            }}
          >
            Next →
          </button>

          {/* Last Page */}
          <button 
            onClick={goToLastPage}
            disabled={!hasMore}
            style={{ 
              padding: '0.5rem 0.75rem', 
              border: '1px solid #d1d5db', 
              borderRadius: '0.5rem', 
              background: 'white', 
              color: '#374151', 
              cursor: !hasMore ? 'not-allowed' : 'pointer',
              opacity: !hasMore ? 0.5 : 1,
              fontSize: '0.875rem'
            }}
          >
            Last ⏭️
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div style={{ background: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>ID</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151', minWidth: '400px' }}>Content</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Source</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Topic</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Risk</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {chunks.map((chunk, index) => (
                <tr key={chunk.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontFamily: 'monospace', fontWeight: '500' }}>
                    {String(chunk.id).substring(0, 8)}...
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', lineHeight: '1.5' }}>
                    <div 
                      style={{ cursor: 'pointer', color: '#3b82f6' }}
                      onClick={() => viewChunk(chunk)}
                      title="Click to view full content"
                    >
                      {truncate(chunk.payload.content, 150)}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                    {truncate(chunk.payload.source, 30)}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                    {chunk.payload.topic}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }} className={getRiskClass(chunk.payload.risk_level)}>
                      {chunk.payload.risk_level}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => viewChunk(chunk)}
                        style={{ padding: '0.25rem 0.5rem', border: 'none', borderRadius: '0.25rem', background: '#dbeafe', color: '#1e40af', cursor: 'pointer', fontSize: '0.875rem' }}
                        title="View full content"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => editChunk(chunk)}
                        style={{ padding: '0.25rem 0.5rem', border: 'none', borderRadius: '0.25rem', background: '#fef3c7', color: '#d97706', cursor: 'pointer', fontSize: '0.875rem' }}
                        title="Edit chunk"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteChunk(chunk)}
                        style={{ padding: '0.25rem 0.5rem', border: 'none', borderRadius: '0.25rem', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontSize: '0.875rem' }}
                        title="Delete chunk"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{ padding: '1rem', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Showing {currentPage * pageSize + 1}-{currentPage * pageSize + chunks.length} chunks (Page {currentPage + 1})
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {hasMore ? 'More available' : 'End of results'}
            </span>
          </div>
        </div>
      </div>

      {/* View Modal */}
      {showViewModal && selectedChunk && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '0.5rem', maxWidth: '800px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            
            {/* Header with Close Button */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
              <div style={{ flexGrow: 1 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem' }}>
                  Chunk Details (ID: {selectedChunk.id})
                </h2>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280', flexWrap: 'wrap' }}>
                  <span>📁 {selectedChunk.payload.source}</span>
                  <span>🏷️ {selectedChunk.payload.topic}</span>
                  <span className={getRiskClass(selectedChunk.payload.risk_level)} style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }}>
                    {selectedChunk.payload.risk_level}
                  </span>
                </div>
              </div>
              
              {/* Close X Button */}
              <button
                onClick={closeModals}
                style={{
                  width: '32px',
                  height: '32px',
                  border: 'none',
                  borderRadius: '50%',
                  background: '#f3f4f6',
                  color: '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  marginLeft: '1rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e7eb';
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.color = '#6b7280';
                }}
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>
            
            {/* Content - Scrollable */}
            <div style={{ padding: '1.5rem', flexGrow: 1, overflowY: 'auto' }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', lineHeight: '1.6', color: '#374151', background: '#f8fafc', padding: '1rem', borderRadius: '0.25rem', border: '1px solid #e5e7eb', margin: 0 }}>
                {selectedChunk.payload.content}
              </pre>
            </div>
            
            {/* Footer - Fixed */}
            <div style={{ 
              padding: '1.5rem', 
              borderTop: '1px solid #e5e7eb', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexShrink: 0,
              background: '#f9fafb'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Press Escape to close
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={copyContent}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    background: '#10b981', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '0.25rem', 
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                >
                  📋 Copy Content
                </button>
                
                <button
                  onClick={() => {
                    closeModals();
                    editChunk(selectedChunk);
                  }}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    background: '#f59e0b', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '0.25rem', 
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#d97706'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f59e0b'}
                >
                  ✏️ Edit
                </button>
                
                <button
                  onClick={closeModals}
                  style={{ 
                    padding: '0.5rem 1.5rem', 
                    background: '#6b7280', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '0.25rem', 
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#4b5563'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#6b7280'}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedChunk && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '0.5rem', maxWidth: '900px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            
            {/* Header - Fixed */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem' }}>
                Edit Chunk (ID: {selectedChunk.id})
                {hasUnsavedChanges && <span style={{ color: '#ef4444', fontSize: '0.875rem', fontWeight: 'normal' }}> • Unsaved changes</span>}
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Modify the content and metadata of this medical chunk
              </p>
            </div>
            
            {/* Content - Scrollable */}
            <div style={{ padding: '1.5rem', flexGrow: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Content Field */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    Content *
                  </label>
                  <textarea
                    value={editFormData.content}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter chunk content..."
                    rows={12}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                      resize: 'vertical',
                      fontFamily: 'monospace',
                      minHeight: '300px'
                    }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {editFormData.content.length} characters
                  </div>
                </div>

                {/* Metadata Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                      Source
                    </label>
                    <input
                      type="text"
                      value={editFormData.source}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, source: e.target.value }))}
                      placeholder="e.g., medical_data.pdf"
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                      Topic
                    </label>
                    <input
                      type="text"
                      value={editFormData.topic}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, topic: e.target.value }))}
                      placeholder="e.g., Cardiology"
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    Risk Level
                  </label>
                  <select
                    value={editFormData.risk_level}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, risk_level: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      background: 'white'
                    }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Footer - Fixed with prominent buttons */}
            <div style={{ 
              padding: '1.5rem', 
              borderTop: '1px solid #e5e7eb', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexShrink: 0,
              background: '#f9fafb'
            }}>
              <button
                onClick={closeModals}
                disabled={isSubmitting}
                style={{ 
                  padding: '0.75rem 1.5rem', 
                  background: '#6b7280', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.5rem', 
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.5 : 1,
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = '#4b5563';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = '#6b7280';
                  }
                }}
              >
                ❌ Cancel
              </button>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', alignSelf: 'center' }}>
                  Press Ctrl+Enter to save
                </div>
                <button
                  onClick={saveChunkChanges}
                  disabled={isSubmitting || !editFormData.content.trim()}
                  style={{ 
                    padding: '0.75rem 2rem', 
                    background: hasUnsavedChanges ? '#10b981' : '#9ca3af', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '0.5rem', 
                    cursor: (isSubmitting || !editFormData.content.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (isSubmitting || !editFormData.content.trim()) ? 0.5 : 1,
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    boxShadow: hasUnsavedChanges ? '0 2px 4px rgba(16, 185, 129, 0.2)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting && editFormData.content.trim() && hasUnsavedChanges) {
                      e.currentTarget.style.background = '#059669';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting && editFormData.content.trim() && hasUnsavedChanges) {
                      e.currentTarget.style.background = '#10b981';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {isSubmitting ? '⏳ Saving...' : hasUnsavedChanges ? '💾 Save Changes' : '✅ No Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!isLoading && chunks.length === 0 && (
        <div style={{ background: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
            No chunks found
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            {error ? 'There was an error loading data.' : 'The database appears to be empty.'}
          </p>
          <button
            onClick={() => loadChunks(0, pageSize)}
            style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
          >
            🔄 Try Again
          </button>
        </div>
      )}
    </div>
  );
}