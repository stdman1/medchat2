// app/admin/upload/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';

interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface UploadHistory {
  id: string;
  fileName: string;
  size: string;
  type: string;
  status: 'Processed' | 'Processing' | 'Error';
  uploaded: string;
}

export default function UploadCenterPage() {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([
    {
      id: '1',
      fileName: 'medical_data_2025.csv',
      size: '2.5 MB',
      type: 'CSV',
      status: 'Processed',
      uploaded: '2025-07-28 09:15'
    },
    {
      id: '2',
      fileName: 'patient_records.xlsx',
      size: '5.1 MB',
      type: 'Excel',
      status: 'Processed',
      uploaded: '2025-07-27 14:30'
    },
    {
      id: '3',
      fileName: 'research_papers.pdf',
      size: '12.8 MB',
      type: 'PDF',
      status: 'Processing',
      uploaded: '2025-07-28 11:45'
    }
  ]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  // Process selected files
  const handleFiles = (files: File[]) => {
    const newFiles: UploadFile[] = files.map(file => ({
      id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
      progress: 0,
      status: 'pending'
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);
    
    // Start uploading files
    newFiles.forEach(uploadFile => {
      startUpload(uploadFile);
    });
  };

  // Start upload process
  const startUpload = async (uploadFile: UploadFile) => {
    // Update status to uploading
    setUploadFiles(prev => 
      prev.map(f => f.id === uploadFile.id ? { ...f, status: 'uploading' } : f)
    );

    try {
      const formData = new FormData();
      formData.append('file', uploadFile.file);
      formData.append('fileName', uploadFile.name);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadFiles(prev => 
          prev.map(f => {
            if (f.id === uploadFile.id && f.progress < 90) {
              return { ...f, progress: f.progress + Math.random() * 15 };
            }
            return f;
          })
        );
      }, 200);

      // Make actual upload request
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      const result = await response.json();

      if (result.success) {
        // Upload completed successfully
        setUploadFiles(prev => 
          prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, progress: 100, status: 'completed' }
              : f
          )
        );

        // Add to upload history
        const newHistoryItem: UploadHistory = {
          id: result.upload_id || uploadFile.id,
          fileName: uploadFile.name,
          size: formatFileSize(uploadFile.size),
          type: getFileType(uploadFile.name),
          status: 'Processing',
          uploaded: new Date().toLocaleString()
        };

        setUploadHistory(prev => [newHistoryItem, ...prev]);
        
        showToast(`${uploadFile.name} uploaded successfully!`, 'success');
      } else {
        // Upload failed
        setUploadFiles(prev => 
          prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'error', error: result.error }
              : f
          )
        );
        showToast(`Upload failed: ${result.error}`, 'error');
      }
    } catch (_) {
      // Network error
      setUploadFiles(prev => 
        prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'error', error: 'Network error' }
            : f
        )
      );
      showToast('Upload failed: Network error', 'error');
    }
  };

  // Helper functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toUpperCase();
    return extension || 'Unknown';
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Processed': return 'status-online';
      case 'Processing': return 'status-warning';
      case 'Error': return 'status-offline';
      default: return 'status-warning';
    }
  };

  // Toast notification
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    // Simple alert for now - can be enhanced with proper toast component
    alert(`${type.toUpperCase()}: ${message}`);
  };

  // Remove completed uploads from list
  const clearCompleted = () => {
    setUploadFiles(prev => prev.filter(f => f.status !== 'completed'));
  };

  // Apply styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .content {
        padding: 2rem;
        background: var(--bg);
        min-height: calc(100vh - 80px);
      }

      .page-title {
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 2rem;
        background: linear-gradient(45deg, var(--primary), var(--primary-darker));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .upload-zone {
        border: 2px dashed var(--primary);
        border-radius: 16px;
        padding: 3rem;
        text-align: center;
        background: rgba(14, 165, 233, 0.05);
        cursor: pointer;
        transition: all 0.3s ease;
        margin-bottom: 2rem;
      }

      .upload-zone:hover, .upload-zone.drag-active {
        border-color: var(--primary-dark);
        background: rgba(14, 165, 233, 0.1);
        transform: scale(1.02);
      }

      .upload-icon {
        width: 64px;
        height: 64px;
        margin: 0 auto 1rem;
        background: linear-gradient(45deg, var(--primary), var(--primary-dark));
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 1.5rem;
      }

      .btn {
        padding: 0.5rem 1rem;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s ease;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .btn-primary {
        background: linear-gradient(45deg, var(--primary), var(--primary-dark));
        color: white;
      }

      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(14, 165, 233, 0.3);
      }

      .btn-secondary {
        background: var(--card);
        color: var(--text);
        border: 1px solid var(--border);
      }

      .btn-secondary:hover {
        background: var(--primary);
        color: white;
      }

      .table-container {
        background: var(--card);
        border-radius: 16px;
        border: 1px solid var(--border);
        overflow: hidden;
        margin-bottom: 2rem;
        backdrop-filter: blur(10px);
      }

      .table-header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .table-title {
        font-size: 1.2rem;
        font-weight: 600;
        color: var(--text);
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th, td {
        padding: 1rem;
        text-align: left;
        border-bottom: 1px solid var(--border);
      }

      th {
        background: rgba(14, 165, 233, 0.1);
        font-weight: 600;
        color: var(--text);
      }

      tr:hover {
        background: rgba(14, 165, 233, 0.05);
      }

      .progress-container {
        background: rgba(148, 163, 184, 0.2);
        border-radius: 10px;
        height: 8px;
        overflow: hidden;
        margin: 1rem 0;
      }

      .progress-bar {
        height: 100%;
        background: linear-gradient(45deg, var(--primary), var(--primary-dark));
        transition: width 0.3s ease;
        border-radius: 10px;
      }

      .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 500;
      }

      .status-online {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
      }

      .status-offline {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }

      .status-warning {
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
      }

      .upload-item {
        padding: 1rem;
        border-bottom: 1px solid var(--border);
        background: var(--card);
      }

      .upload-item:last-child {
        border-bottom: none;
      }

      .upload-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }

      .upload-filename {
        font-weight: 500;
        color: var(--text);
      }

      .upload-size {
        font-size: 0.875rem;
        color: var(--text);
        opacity: 0.7;
      }

      .upload-status {
        font-size: 0.875rem;
        font-weight: 500;
      }

      .upload-status.completed {
        color: #10b981;
      }

      .upload-status.error {
        color: #ef4444;
      }

      .upload-status.uploading {
        color: var(--primary);
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  return (
    <div className="content">
      {/* Page Title */}
      <h1 className="page-title">Upload Center</h1>
      
      {/* Upload Zone */}
      <div 
        className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="upload-icon">☁️</div>
        <h3 style={{ marginBottom: '1rem', color: 'var(--text)' }}>
          Drag & Drop Files Here
        </h3>
        <p style={{ opacity: 0.7, marginBottom: '1rem', color: 'var(--text)' }}>
          Or click to browse files
        </p>
        <input 
          ref={fileInputRef}
          type="file" 
          multiple 
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
        />
        <button className="btn btn-primary">Choose Files</button>
      </div>

      {/* Upload Progress */}
      {uploadFiles.length > 0 && (
        <div className="table-container">
          <div className="table-header">
            <div className="table-title">Upload Progress</div>
            <button className="btn btn-secondary" onClick={clearCompleted}>
              🗑️ Clear Completed
            </button>
          </div>
          <div>
            {uploadFiles.map((file) => (
              <div key={file.id} className="upload-item">
                <div className="upload-header">
                  <div>
                    <div className="upload-filename">{file.name}</div>
                    <div className="upload-size">({formatFileSize(file.size)})</div>
                  </div>
                  <div className={`upload-status ${file.status}`}>
                    {file.status === 'completed' && 'Completed ✅'}
                    {file.status === 'uploading' && `${Math.round(file.progress)}%`}
                    {file.status === 'error' && `Error: ${file.error}`}
                    {file.status === 'pending' && 'Pending...'}
                  </div>
                </div>
                {file.status === 'uploading' && (
                  <div className="progress-container">
                    <div 
                      className="progress-bar" 
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload History */}
      <div className="table-container">
        <div className="table-header">
          <div className="table-title">Upload History</div>
          <button className="btn btn-secondary">
            <span>🗂️</span>
            <span>View All</span>
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>File Name</th>
              <th>Size</th>
              <th>Type</th>
              <th>Status</th>
              <th>Uploaded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {uploadHistory.map((item) => (
              <tr key={item.id}>
                <td>{item.fileName}</td>
                <td>{item.size}</td>
                <td>{item.type}</td>
                <td>
                  <span className={`status-badge ${getStatusClass(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td>{item.uploaded}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                      📥 Download
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                      🗑️ Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty State */}
        {uploadHistory.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📁</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '500', color: 'var(--text)', marginBottom: '0.5rem' }}>
              No upload history
            </h3>
            <p style={{ color: 'var(--text)', opacity: 0.7 }}>
              Upload your first medical document to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}