'use client';

import { useState, useEffect } from 'react';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  // FIX 1: Dùng Record cho object có thể stringify
  details?: Record<string, unknown>;
}

interface TestSummary {
  overall_status: 'READY' | 'NOT_READY';
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
}

interface MigrationStats {
  total_chunks: number;
  migrated_chunks: number;
  failed_chunks: number;
  success_rate: number;
  duration_ms: number;
}

interface MigrationResult {
  success: boolean;
  message: string;
  stats?: MigrationStats;
  error?: string;
  // FIX 3: Dùng Record cho object có thể stringify
  qdrant_stats?: Record<string, unknown>;
}

export default function MigrationAdminPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testSummary, setTestSummary] = useState<TestSummary | null>(null);
  const [isTestingConnections, setIsTestingConnections] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  // FIX 2: Sử dụng interface MigrationResult thay vì any
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  const testConnections = async () => {
    setIsTestingConnections(true);
    try {
      const response = await fetch('/api/test-connections');
      const data = await response.json();
      
      if (data.success) {
        setTestResults(data.tests);
        setTestSummary(data.summary);
      } else {
        alert('Test failed: ' + data.error);
      }
    } catch (error) {
      alert('Test failed: ' + error);
    } finally {
      setIsTestingConnections(false);
    }
  };

  const startMigration = async (force = false) => {
    if (!force && testSummary?.overall_status !== 'READY') {
      if (!confirm('Tests are not all passing. Are you sure you want to proceed?')) {
        return;
      }
    }

    setIsMigrating(true);
    setMigrationResult(null);
    
    try {
      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force })
      });
      
      const data = await response.json();
      setMigrationResult(data);
      
      if (data.success) {
        alert('Migration completed successfully!');
      } else {
        alert('Migration failed: ' + data.message);
      }
    } catch (error) {
      alert('Migration failed: ' + error);
      setMigrationResult({
        success: false,
        message: 'Network error',
        error: String(error)
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const checkMigrationStatus = async () => {
    try {
      const response = await fetch('/api/migrate');
      const data = await response.json();
      setMigrationResult(data);
    } catch (error) {
      alert('Status check failed: ' + error);
    }
  };

  useEffect(() => {
    // Auto-run tests on page load
    testConnections();
    checkMigrationStatus();
  }, []);

  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🚀 Migration Admin Panel
          </h1>

          {/* Connection Tests Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                🧪 Connection Tests
              </h2>
              <button
                onClick={testConnections}
                disabled={isTestingConnections}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isTestingConnections ? 'Testing...' : 'Run Tests'}
              </button>
            </div>

            {testSummary && (
              <div className={`p-4 rounded-lg mb-4 ${
                testSummary.overall_status === 'READY' 
                  ? 'bg-green-100 border-green-400' 
                  : 'bg-red-100 border-red-400'
              } border`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {testSummary.overall_status === 'READY' ? '✅' : '❌'}
                  </span>
                  <span className="font-semibold">
                    Status: {testSummary.overall_status}
                  </span>
                  <span className="text-gray-600">
                    ({testSummary.passed_tests}/{testSummary.total_tests} tests passed)
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {testResults.map((test, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    test.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">
                      {test.success ? '✅' : '❌'}
                    </span>
                    <span className="font-medium">{test.name}</span>
                  </div>
                  <p className="text-gray-700 mb-2">{test.message}</p>
                  {test.details && (
                    <details className="text-sm text-gray-600">
                      <summary className="cursor-pointer hover:text-gray-800">
                        View Details
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Migration Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📦 Data Migration
            </h2>

            <div className="flex gap-4 mb-4">
              <button
                onClick={() => startMigration(false)}
                disabled={isMigrating}
                className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-6 py-2 rounded-lg transition-colors"
              >
                {isMigrating ? 'Migrating...' : 'Start Migration'}
              </button>
              
              <button
                onClick={() => startMigration(true)}
                disabled={isMigrating}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Force Re-migration
              </button>
              
              <button
                onClick={checkMigrationStatus}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Check Status
              </button>
            </div>

            {migrationResult && (
              <div className={`p-4 rounded-lg border ${
                migrationResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">
                    {migrationResult.success ? '✅' : '❌'}
                  </span>
                  <span className="font-medium">
                    {migrationResult.message}
                  </span>
                </div>

                {migrationResult.stats && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {migrationResult.stats.total_chunks}
                      </div>
                      <div className="text-sm text-gray-600">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {migrationResult.stats.migrated_chunks}
                      </div>
                      <div className="text-sm text-gray-600">Success</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {migrationResult.stats.failed_chunks}
                      </div>
                      <div className="text-sm text-gray-600">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {migrationResult.stats.success_rate}%
                      </div>
                      <div className="text-sm text-gray-600">Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {formatDuration(migrationResult.stats.duration_ms)}
                      </div>
                      <div className="text-sm text-gray-600">Duration</div>
                    </div>
                  </div>
                )}

                {migrationResult.error && (
                  <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
                    <p className="text-red-700 font-medium">Error Details:</p>
                    <p className="text-red-600 text-sm">{migrationResult.error}</p>
                  </div>
                )}

                {migrationResult.qdrant_stats && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                      View Qdrant Stats
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-sm overflow-x-auto">
                      {JSON.stringify(migrationResult.qdrant_stats, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📋 Instructions</h3>
            <ol className="text-blue-800 text-sm space-y-1">
              <li>1. First run <strong>Connection Tests</strong> to verify all systems</li>
              <li>2. If all tests pass, click <strong>Start Migration</strong></li>
              <li>3. Monitor the progress and results</li>
              <li>4. Use <strong>Force Re-migration</strong> only if you need to overwrite existing data</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}