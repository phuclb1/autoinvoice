import { useState, useEffect } from 'react';
import { ExcelUploader } from './ExcelUploader';
import { InvoicePreview } from './InvoicePreview';
import { useDownload, useSettings } from '../../store';
import type { ExcelParseResult } from '../../types';

interface UploadPageProps {
  onNavigateToDownload: () => void;
}

export function UploadPage({ onNavigateToDownload }: UploadPageProps) {
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setInvoices } = useDownload();
  const { settings, loadSettings } = useSettings();

  // Load settings on mount to get default download directory
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleParseComplete = (result: ExcelParseResult) => {
    setParseResult(result);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setParseResult(null);
  };

  const handleProceed = () => {
    if (parseResult) {
      // Set invoices in store with pending status and default download directory
      const invoicesWithStatus = parseResult.invoices.map((inv) => ({
        ...inv,
        status: 'pending' as const,
      }));
      setInvoices(invoicesWithStatus, parseResult.detected_url, settings.downloadDirectory);
      onNavigateToDownload();
    }
  };

  const handleReset = () => {
    setParseResult(null);
    setError(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Tải lên file Excel</h2>
        <p className="text-gray-500 mt-1">
          Tải lên file Excel chứa mã hóa đơn VNPT để trích xuất mã tra cứu
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800">Lỗi đọc file Excel</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center">
        {parseResult ? (
          <InvoicePreview
            invoices={parseResult.invoices}
            detected_url={parseResult.detected_url}
            sheet_name={parseResult.sheet_name}
            total_rows={parseResult.total_rows}
            onProceed={handleProceed}
            onReset={handleReset}
          />
        ) : (
          <ExcelUploader onParseComplete={handleParseComplete} onError={handleError} />
        )}
      </div>
    </div>
  );
}
