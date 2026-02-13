import type { StateCreator } from 'zustand';
import type { InvoiceCode, DownloadProgress, LogEntry, CaptchaRequest } from '../types';

export type DownloadStatus = 'idle' | 'parsing' | 'ready' | 'downloading' | 'paused' | 'completed' | 'cancelled';

export interface DownloadSlice {
  // State
  status: DownloadStatus;
  invoices: InvoiceCode[];
  detectedVnptUrl: string | null;
  progress: DownloadProgress | null;
  logs: LogEntry[];
  captchaRequest: CaptchaRequest | null;
  downloadDirectory: string;
  batchId: string | null;

  // Actions
  setInvoices: (invoices: InvoiceCode[], detectedUrl: string | null) => void;
  updateInvoiceStatus: (id: string, status: InvoiceCode['status'], error?: string) => void;
  setProgress: (progress: DownloadProgress) => void;
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
  setCaptchaRequest: (request: CaptchaRequest | null) => void;
  setDownloadDirectory: (dir: string) => void;
  setStatus: (status: DownloadStatus) => void;
  setBatchId: (id: string) => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as DownloadStatus,
  invoices: [] as InvoiceCode[],
  detectedVnptUrl: null as string | null,
  progress: null as DownloadProgress | null,
  logs: [] as LogEntry[],
  captchaRequest: null as CaptchaRequest | null,
  downloadDirectory: '',
  batchId: null as string | null,
};

export const createDownloadSlice: StateCreator<DownloadSlice> = (set) => ({
  ...initialState,

  setInvoices: (invoices, detectedUrl) => {
    set({
      invoices,
      detectedVnptUrl: detectedUrl,
      status: 'ready',
    });
  },

  updateInvoiceStatus: (id, status, error) => {
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.id === id ? { ...inv, status, error } : inv
      ),
    }));
  },

  setProgress: (progress) => {
    set({ progress });
  },

  addLog: (log) => {
    set((state) => ({
      logs: [...state.logs.slice(-999), log], // Keep last 1000 logs
    }));
  },

  clearLogs: () => {
    set({ logs: [] });
  },

  setCaptchaRequest: (request) => {
    set({ captchaRequest: request });
  },

  setDownloadDirectory: (dir) => {
    set({ downloadDirectory: dir });
  },

  setStatus: (status) => {
    set({ status });
  },

  setBatchId: (id) => {
    set({ batchId: id });
  },

  reset: () => {
    set(initialState);
  },
});
