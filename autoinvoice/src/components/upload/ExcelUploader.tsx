import { useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { ExcelParseResult } from '../../types';

interface ExcelUploaderProps {
  onParseComplete: (result: ExcelParseResult) => void;
  onError: (error: string) => void;
}

export function ExcelUploader({ onParseComplete, onError }: ExcelUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (filePath: string) => {
      if (!filePath.toLowerCase().endsWith('.xlsx')) {
        onError('Vui lòng chọn file Excel (.xlsx)');
        return;
      }

      setIsLoading(true);
      setFileName(filePath.split('/').pop() || filePath);

      try {
        const result = await invoke<ExcelParseResult>('parse_excel', {
          filePath,
        });

        if (result.invoices.length === 0) {
          onError('Không tìm thấy mã hóa đơn trong file Excel');
        } else {
          onParseComplete(result);
        }
      } catch (err) {
        onError(String(err));
      } finally {
        setIsLoading(false);
      }
    },
    [onParseComplete, onError]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        // In Tauri, we need to use the dialog to get the actual file path
        // Drag and drop gives us File objects but we need filesystem paths
        onError('Vui lòng sử dụng nút "Chọn file" để chọn file');
      }
    },
    [onError]
  );

  const handleClick = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Excel Files',
            extensions: ['xlsx'],
          },
        ],
      });

      if (selected && typeof selected === 'string') {
        await handleFile(selected);
      }
    } catch (err) {
      onError(String(err));
    }
  }, [handleFile, onError]);

  return (
    <div className="w-full max-w-xl">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : isLoading
              ? 'border-gray-300 bg-gray-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
        }`}
      >
        {isLoading ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4">
              <svg
                className="animate-spin w-full h-full text-blue-600"
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
            </div>
            <p className="text-lg text-gray-600 mb-2">Đang đọc file Excel...</p>
            <p className="text-sm text-gray-400">{fileName}</p>
          </>
        ) : (
          <>
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-lg text-gray-600 mb-2">Nhấp để chọn file Excel</p>
            <p className="text-sm text-gray-400 mb-4">hoặc kéo thả file vào đây</p>
            <button
              type="button"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Chọn file
            </button>
          </>
        )}
      </div>
      <p className="text-center text-sm text-gray-400 mt-4">Định dạng hỗ trợ: .xlsx</p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={() => {}}
      />
    </div>
  );
}
