'use client';

import { useState, useEffect } from 'react';

interface QdrantPoint {
  id: number;
  payload: {
    content: string;
    source: string;
    topic: string;
    risk_level: string;
  };
}

export default function QdrantAdminPage() {
  const [points, setPoints] = useState<QdrantPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState<QdrantPoint | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Load data
  const loadData = async (offset = 0) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/qdrant-admin?limit=10&offset=${offset}`);
      const data = await response.json();
      
      if (data.success) {
        setPoints(data.data);
        setHasMore(data.has_more);
        console.log(`✅ Loaded ${data.data.length} points`);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Load failed: ' + error);
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update point - with better debugging
  const updatePoint = async (point: QdrantPoint) => {
    console.log('🔄 updatePoint called with:', point);
    
    if (!point.payload.content.trim()) {
      alert('Content cannot be empty!');
      return;
    }

    try {
      console.log('📤 Sending PUT request to /api/qdrant-admin');
      
      const requestBody = {
        id: point.id,
        content: point.payload.content,
        metadata: {
          source: point.payload.source,
          topic: point.payload.topic,
          risk_level: point.payload.risk_level
        }
      };
      
      console.log('📦 Request body:', requestBody);

      const response = await fetch('/api/qdrant-admin', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📥 Response data:', result);
      
      if (result.success) {
        alert('✅ Updated successfully!');
        setEditMode(false);
        setSelectedPoint(null);
        loadData(currentPage * 10);
      } else {
        alert('❌ Update failed: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Update error details:', error);
      alert('❌ Update error: ' + error);
    }
  };

  // Delete point
  const deletePoint = async (id: number) => {
    if (!confirm(`⚠️ Delete point ${id}? This cannot be undone!`)) return;

    try {
      const response = await fetch(`/api/qdrant-admin?id=${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        alert('✅ Deleted successfully!');
        loadData(currentPage * 10);
      } else {
        alert('❌ Delete failed: ' + result.error);
      }
    } catch (error) {
      alert('❌ Delete error: ' + error);
    }
  };

  // Navigation functions
  const nextPage = () => {
    if (hasMore) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      loadData(newPage * 10);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      loadData(newPage * 10);
    }
  };

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Debug effect to monitor state changes and modal rendering
  useEffect(() => {
    console.log('🔍 State changed - editMode:', editMode, 'selectedPoint:', selectedPoint?.id);
    console.log('🔍 Should render modal:', editMode && selectedPoint);
    
    if (editMode && selectedPoint) {
      console.log('✅ Modal should be visible now!');
      // Force a re-render check
      setTimeout(() => {
        const modal = document.querySelector('[style*="z-index: 9999"]') as HTMLElement;
        console.log('🔍 Modal element found in DOM:', !!modal);
        if (modal) {
          console.log('🔍 Modal styles:', modal.style.cssText);
        }
      }, 100);
    }
  }, [editMode, selectedPoint]);
  const openEditModal = (point: QdrantPoint) => {
    console.log('🔧 openEditModal called with point:', point.id);
    console.log('📄 Point data:', point);
    
    // Create a deep copy to avoid state mutation
    const pointCopy = {
      id: point.id,
      payload: {
        content: point.payload.content,
        source: point.payload.source || '',
        topic: point.payload.topic || '',
        risk_level: point.payload.risk_level || 'LOW'
      }
    };
    
    console.log('📋 Setting selectedPoint to:', pointCopy);
    setSelectedPoint(pointCopy);
    
    console.log('🔓 Setting editMode to true');
    setEditMode(true);
    
    // Debug current state
    setTimeout(() => {
      console.log('🔍 Current state check - editMode:', editMode);
      console.log('🔍 Current state check - selectedPoint:', selectedPoint);
    }, 100);
  };

  const closeEditModal = () => {
    console.log('❌ Closing edit modal');
    setEditMode(false);
    setSelectedPoint(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🔧 Qdrant Data Management
          </h1>

          {/* Stats & Controls */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">📊 Current Status</h3>
                <p className="text-blue-800">
                  Page {currentPage + 1} • Showing {points.length} points • 
                  {hasMore ? ' More pages available' : ' Last page'}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // Debug button to test modal
                    console.log('🧪 Test modal button clicked');
                    const testPoint = {
                      id: 999,
                      payload: {
                        content: 'Test content for modal',
                        source: 'Test Source',
                        topic: 'Test Topic',
                        risk_level: 'LOW'
                      }
                    };
                    openEditModal(testPoint);
                  }}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  🧪 Test Modal
                </button>
                <button
                  onClick={() => loadData(currentPage * 10)}
                  disabled={loading}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {loading ? '🔄 Loading...' : '🔄 Refresh'}
                </button>
                <button
                  onClick={prevPage}
                  disabled={currentPage === 0}
                  className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg"
                >
                  ← Previous
                </button>
                <button
                  onClick={nextPage}
                  disabled={!hasMore}
                  className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="border border-gray-300 rounded-lg">
            <div className="overflow-auto max-h-[70vh]" style={{ scrollBehavior: 'smooth' }}>
              <table className="w-full border-collapse bg-white">
                <thead className="sticky top-0 bg-gray-100 z-10 shadow-sm">
                  <tr>
                    <th className="border-b-2 border-gray-300 px-3 py-3 text-left w-16 text-sm font-semibold">ID</th>
                    <th className="border-b-2 border-gray-300 px-4 py-3 text-left min-w-[500px] text-sm font-semibold">Content Preview</th>
                    <th className="border-b-2 border-gray-300 px-3 py-3 text-left w-36 text-sm font-semibold">Source</th>
                    <th className="border-b-2 border-gray-300 px-3 py-3 text-left w-36 text-sm font-semibold">Topic</th>
                    <th className="border-b-2 border-gray-300 px-3 py-3 text-left w-24 text-sm font-semibold">Risk</th>
                    <th className="border-b-2 border-gray-300 px-3 py-3 text-left w-32 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((point) => (
                    <tr key={point.id} className="hover:bg-blue-50 transition-colors border-b border-gray-200">
                      <td className="px-3 py-4 font-mono text-sm font-medium text-gray-900">
                        {point.id}
                      </td>
                      <td className="px-4 py-4">
                        <div 
                          className="text-sm text-gray-800 leading-relaxed cursor-pointer hover:text-blue-600 transition-colors" 
                          title="Click to edit this content"
                          onClick={() => openEditModal(point)}
                        >
                          {point.payload.content.length > 300 
                            ? point.payload.content.substring(0, 300) + '...' 
                            : point.payload.content
                          }
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {point.payload.content.length} characters • Click to edit
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          {point.payload.source || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                          {point.payload.topic || 'General'}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          point.payload.risk_level === 'HIGH' ? 'bg-red-100 text-red-800' :
                          point.payload.risk_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {point.payload.risk_level || 'LOW'}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Edit button clicked for point:', point.id);
                              openEditModal(point);
                            }}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors shadow-sm"
                            title="Edit this point"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Delete button clicked for point:', point.id);
                              deletePoint(point.id);
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors shadow-sm"
                            title="Delete this point"
                          >
                            🗑️ Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="text-gray-600">🔄 Loading data...</div>
            </div>
          )}

          {/* Empty State */}
          {points.length === 0 && !loading && (
            <div className="text-center py-8">
              <div className="text-gray-600">📭 No data found</div>
            </div>
          )}

          {/* Edit Modal - Fixed with important styles */}
          {editMode && selectedPoint && (
            <div 
              className="fixed inset-0 flex items-center justify-center p-4"
              style={{ 
                zIndex: 9999,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex'
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  closeEditModal();
                }
              }}
            >
              <div 
                className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                style={{ 
                  zIndex: 10000,
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  maxWidth: '80rem',
                  maxHeight: '90vh',
                  width: '100%',
                  position: 'relative'
                }}
              >
                {/* Modal Header */}
                <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold">
                    ✏️ Edit Point #{selectedPoint.id}
                  </h2>
                  <button
                    onClick={closeEditModal}
                    className="text-white hover:text-gray-200 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                  <div className="space-y-6">
                    {/* Content Editor */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        📝 Content:
                      </label>
                      <textarea
                        value={selectedPoint.payload.content}
                        onChange={(e) => {
                          const newContent = e.target.value;
                          setSelectedPoint({
                            ...selectedPoint,
                            payload: { 
                              ...selectedPoint.payload, 
                              content: newContent 
                            }
                          });
                        }}
                        rows={12}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                        placeholder="Enter medical content here..."
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>Characters: {selectedPoint.payload.content.length}</span>
                        <span>Words: {selectedPoint.payload.content.split(/\s+/).filter((w: string) => w.length > 0).length}</span>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          📚 Source:
                        </label>
                        <input
                          type="text"
                          value={selectedPoint.payload.source}
                          onChange={(e) => setSelectedPoint({
                            ...selectedPoint,
                            payload: { ...selectedPoint.payload, source: e.target.value }
                          })}
                          className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                          placeholder="e.g., CDC, WHO, Medical Journal"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          🏷️ Topic:
                        </label>
                        <input
                          type="text"
                          value={selectedPoint.payload.topic}
                          onChange={(e) => setSelectedPoint({
                            ...selectedPoint,
                            payload: { ...selectedPoint.payload, topic: e.target.value }
                          })}
                          className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                          placeholder="e.g., HIV Prevention, Epidemiology"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          ⚠️ Risk Level:
                        </label>
                        <select
                          value={selectedPoint.payload.risk_level}
                          onChange={(e) => setSelectedPoint({
                            ...selectedPoint,
                            payload: { ...selectedPoint.payload, risk_level: e.target.value }
                          })}
                          className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                        >
                          <option value="LOW">🟢 Low Risk</option>
                          <option value="MEDIUM">🟡 Medium Risk</option>
                          <option value="HIGH">🔴 High Risk</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t">
                  <button
                    onClick={closeEditModal}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    ✖️ Cancel
                  </button>
                  <button
                    onClick={() => {
                      console.log('Save button clicked, updating point:', selectedPoint.id);
                      updatePoint(selectedPoint);
                    }}
                    disabled={!selectedPoint.payload.content.trim()}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    💾 Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Debug overlay - Shows when editMode is true */}
          {editMode && (
            <div 
              style={{
                position: 'fixed',
                top: 10,
                right: 10,
                backgroundColor: 'red',
                color: 'white',
                padding: '10px',
                zIndex: 99999,
                borderRadius: '4px'
              }}
            >
              🔴 EDIT MODE ACTIVE - Point: {selectedPoint?.id}
            </div>
          )}
          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">✅ Migration Completed Successfully!</h3>
            <div className="text-green-800 text-sm space-y-1">
              <p>• Your 350 medical chunks are now stored in Qdrant vector database</p>
              <p>• Click on content to edit • Use pagination to browse all data</p>
              <p>• Changes are saved immediately to Qdrant cloud</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}