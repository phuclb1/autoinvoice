import { useEffect } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useDownload } from '../store';
import type { DownloadProgress, LogEntry, CaptchaRequest } from '../types';

interface InvoiceStatusPayload {
  invoice_id: string;
  status: 'pending' | 'downloading' | 'success' | 'failed';
  error?: string;
}

interface DownloadCompletePayload {
  batch_id: string;
  success_count: number;
  failed_count: number;
}

export function useTauriEvents() {
  const {
    setProgress,
    addLog,
    updateInvoiceStatus,
    setCaptchaRequest,
    setStatus,
  } = useDownload();

  useEffect(() => {
    const listeners: UnlistenFn[] = [];

    // Listen for download progress updates
    listen<DownloadProgress>('download:progress', (event) => {
      setProgress(event.payload);
    }).then((unlisten) => listeners.push(unlisten));

    // Listen for log messages
    listen<LogEntry>('download:log', (event) => {
      addLog(event.payload);
    }).then((unlisten) => listeners.push(unlisten));

    // Listen for invoice status updates
    listen<InvoiceStatusPayload>('invoice:status', (event) => {
      const { invoice_id, status, error } = event.payload;
      updateInvoiceStatus(invoice_id, status, error);
    }).then((unlisten) => listeners.push(unlisten));

    // Listen for captcha requests (auto-solve failed)
    listen<CaptchaRequest>('captcha:required', (event) => {
      setCaptchaRequest(event.payload);
    }).then((unlisten) => listeners.push(unlisten));

    // Listen for download completion
    listen<DownloadCompletePayload>('download:complete', (event) => {
      const { success_count, failed_count } = event.payload;
      setStatus('completed');
      addLog({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Download complete: ${success_count} succeeded, ${failed_count} failed`,
      });
    }).then((unlisten) => listeners.push(unlisten));

    // Listen for download errors
    listen<string>('download:error', (event) => {
      setStatus('cancelled');
      addLog({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Download error: ${event.payload}`,
      });
    }).then((unlisten) => listeners.push(unlisten));

    // Cleanup listeners on unmount
    return () => {
      listeners.forEach((unlisten) => unlisten());
    };
  }, [setProgress, addLog, updateInvoiceStatus, setCaptchaRequest, setStatus]);
}
