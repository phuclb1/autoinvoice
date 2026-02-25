import { useEffect, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useHistory, useDownload } from '../../store';
import type { HistoryInvoice } from '../../types';

interface BatchDetailProps {
  batchId: string;
  onBack: () => void;
}

const statusConfig = {
  pending: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    label: 'Chờ xử lý',
  },
  downloading: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    label: 'Đang tải',
  },
  success: {
    bg: 'bg-green-100',
    text: 'text-green-600',
    label: 'Thành công',
  },
  failed: {
    bg: 'bg-red-100',
    text: 'text-red-600',
    label: 'Thất bại',
  },
};

export function BatchDetail({ batchId, onBack: _onBack }: BatchDetailProps) {
  const { batches, batchInvoices, isLoading, loadBatchInvoices } = useHistory();
  const { setInvoices, setStatus } = useDownload();

  const batch = useMemo(
    () => batches.find((b) => b.id === batchId),
    [batches, batchId]
  );

  useEffect(() => {
    loadBatchInvoices(batchId);
  }, [batchId, loadBatchInvoices]);

  const failedInvoices = useMemo(
    () => batchInvoices.filter((inv) => inv.status === 'failed'),
    [batchInvoices]
  );

  const handleRedownloadFailed = useCallback(async () => {
    if (failedInvoices.length === 0) return;

    try {
      // Get failed invoices from backend
      const failed = await invoke<HistoryInvoice[]>('get_failed_invoices', { batchId });

      // Convert to invoice codes for download
      const invoiceCodes = failed.map((inv) => ({
        id: inv.id,
        code: inv.code,
        row_number: 0,
        status: 'pending' as const,
      }));

      // Set invoices in download store and navigate
      setInvoices(invoiceCodes, null);
      setStatus('ready');

      // Navigate to download page would be handled by parent
      alert('Đã tải các hóa đơn thất bại để tải lại. Vào trang Tải xuống để bắt đầu.');
    } catch (err) {
      console.error('Failed to load failed invoices:', err);
      alert('Lỗi khi tải danh sách hóa đơn thất bại: ' + err);
    }
  }, [batchId, failedInvoices.length, setInvoices, setStatus]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('vi-VN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (!batch) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">Không tìm thấy phiên tải</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Batch Summary Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Ngày</p>
            <p className="font-medium text-gray-800">{formatDate(batch.created_at)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Tổng hóa đơn</p>
            <p className="font-medium text-gray-800">{batch.total_count}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Thành công / Thất bại</p>
            <p className="font-medium">
              <span className="text-green-600">{batch.success_count}</span>
              {' / '}
              <span className="text-red-600">{batch.failed_count}</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Thư mục</p>
            <p
              className="font-medium text-gray-800 truncate"
              title={batch.download_directory}
            >
              {batch.download_directory}
            </p>
          </div>
        </div>
        {failedInvoices.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleRedownloadFailed}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Tải lại {failedInvoices.length} hóa đơn thất bại
            </button>
          </div>
        )}
      </div>

      {/* Invoice List */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-0">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-medium text-gray-800">Hóa đơn</h3>
          {isLoading && (
            <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
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
          )}
        </div>
        <div className="flex-1 overflow-auto">
          {batchInvoices.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              {isLoading ? 'Đang tải hóa đơn...' : 'Không tìm thấy hóa đơn'}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Mã
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Đã tải
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    File
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Lỗi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batchInvoices.map((invoice) => {
                  const config = statusConfig[invoice.status as keyof typeof statusConfig] || statusConfig.pending;
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm text-gray-800">
                        {invoice.code}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${config.bg} ${config.text}`}
                        >
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(invoice.downloaded_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-[150px] truncate">
                        {invoice.file_path ? (
                          <span title={invoice.file_path}>
                            {invoice.file_path.split('/').pop()}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-500 max-w-[200px] truncate">
                        {invoice.error ? (
                          <span title={invoice.error}>{invoice.error}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
