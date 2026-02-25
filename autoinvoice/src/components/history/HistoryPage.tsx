import { useEffect, useState, useCallback } from 'react';
import { useHistory } from '../../store';
import { BatchList } from './BatchList';
import { BatchDetail } from './BatchDetail';

export function HistoryPage() {
  const { batches, selectedBatchId, isLoading, loadBatches, selectBatch } = useHistory();
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  // Load batches on mount
  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const handleSelectBatch = useCallback(
    (batchId: string) => {
      selectBatch(batchId);
      setViewMode('detail');
    },
    [selectBatch]
  );

  const handleBackToList = useCallback(() => {
    selectBatch(null);
    setViewMode('list');
  }, [selectBatch]);

  if (isLoading && batches.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto text-gray-400 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="mt-4 text-gray-500">Đang tải lịch sử...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          {viewMode === 'detail' && (
            <button
              onClick={handleBackToList}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">
              {viewMode === 'list' ? 'Lịch sử tải xuống' : 'Chi tiết phiên tải'}
            </h2>
            <p className="text-gray-500 mt-1">
              {viewMode === 'list'
                ? 'Xem và quản lý các phiên tải xuống trước đó'
                : 'Xem các hóa đơn trong phiên tải này'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {viewMode === 'list' ? (
          <BatchList batches={batches} onSelectBatch={handleSelectBatch} />
        ) : selectedBatchId ? (
          <BatchDetail batchId={selectedBatchId} onBack={handleBackToList} />
        ) : null}
      </div>
    </div>
  );
}
