import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useDownload, useSettings } from '../../store';
import { InvoiceList } from './InvoiceList';
import { LogViewer } from './LogViewer';
import { CaptchaModal } from './CaptchaModal';

export function DownloadPage() {
  const {
    status,
    invoices,
    detectedVnptUrl,
    progress,
    logs,
    captchaRequest,
    downloadDirectory,
    setDownloadDirectory,
    setStatus,
    setBatchId,
    addLog,
    clearLogs,
  } = useDownload();

  const { settings } = useSettings();

  const canStart = status === 'ready' && invoices.length > 0 && downloadDirectory;
  const isDownloading = status === 'downloading';
  const isPaused = status === 'paused';

  const handleSelectDirectory = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Download Folder',
      });
      if (selected && typeof selected === 'string') {
        setDownloadDirectory(selected);
      }
    } catch (err) {
      console.error('Failed to select directory:', err);
    }
  }, [setDownloadDirectory]);

  const handleStartDownload = useCallback(async () => {
    if (!canStart) return;

    try {
      clearLogs();
      addLog({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Starting download process...',
      });

      setStatus('downloading');

      const vnptUrl = detectedVnptUrl || settings.vnptUrl;
      const codes = invoices.map((inv) => inv.code);

      const batchId = await invoke<string>('start_download', {
        codes,
        vnptUrl,
        downloadDir: downloadDirectory,
        openaiApiKey: settings.openaiApiKey,
      });

      setBatchId(batchId);
    } catch (err) {
      console.error('Failed to start download:', err);
      setStatus('ready');
      addLog({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Failed to start: ${err}`,
      });
    }
  }, [
    canStart,
    invoices,
    detectedVnptUrl,
    settings,
    downloadDirectory,
    clearLogs,
    addLog,
    setStatus,
    setBatchId,
  ]);

  const handleCancelDownload = useCallback(async () => {
    try {
      await invoke('cancel_download');
      setStatus('cancelled');
      addLog({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'Download cancelled by user',
      });
    } catch (err) {
      console.error('Failed to cancel download:', err);
    }
  }, [setStatus, addLog]);

  const completedCount = invoices.filter((i) => i.status === 'success').length;
  const failedCount = invoices.filter((i) => i.status === 'failed').length;
  const totalCount = invoices.length;
  const progressPercent = progress?.percentage ?? (totalCount > 0 ? Math.round(((completedCount + failedCount) / totalCount) * 100) : 0);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Download Invoices</h2>
        <p className="text-gray-500 mt-1">Monitor and control the download process</p>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
        {/* Left: Invoice List & Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-medium text-gray-800">Invoice Codes</h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                {completedCount} done
              </span>
              {failedCount > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                  {failedCount} failed
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto min-h-0">
            <InvoiceList invoices={invoices} />
          </div>
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">
                Progress: {completedCount + failedCount} / {totalCount}
              </span>
              <span className="text-sm font-medium text-gray-800">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Log Viewer */}
        <LogViewer logs={logs} />
      </div>

      {/* Control Buttons */}
      <div className="mt-6 flex items-center gap-4">
        {!isDownloading && !isPaused ? (
          <button
            onClick={handleStartDownload}
            disabled={!canStart}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Start Download
          </button>
        ) : (
          <button
            onClick={handleCancelDownload}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Cancel
          </button>
        )}

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {status === 'downloading' && (
            <>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-sm text-blue-600">Downloading...</span>
            </>
          )}
          {status === 'completed' && (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm text-green-600">Completed</span>
            </>
          )}
          {status === 'cancelled' && (
            <>
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              <span className="text-sm text-orange-600">Cancelled</span>
            </>
          )}
        </div>

        {/* Directory selector */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-500">Save to:</span>
          <button
            onClick={handleSelectDirectory}
            disabled={isDownloading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 max-w-[200px] truncate"
            title={downloadDirectory || 'Select folder'}
          >
            {downloadDirectory ? downloadDirectory.split('/').pop() : 'Select Folder'}
          </button>
        </div>
      </div>

      {/* Captcha Modal */}
      {captchaRequest && <CaptchaModal />}
    </div>
  );
}
