import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { createSettingsSlice, type SettingsSlice } from './settingsSlice';
import { createDownloadSlice, type DownloadSlice } from './downloadSlice';
import { createHistorySlice, type HistorySlice } from './historySlice';

export type AppStore = SettingsSlice & DownloadSlice & HistorySlice;

export const useAppStore = create<AppStore>()((...args) => ({
  ...createSettingsSlice(...args),
  ...createDownloadSlice(...args),
  ...createHistorySlice(...args),
}));

// Convenience hooks for accessing specific slices
// Using useShallow to prevent infinite re-renders when returning objects
export const useSettings = () =>
  useAppStore(
    useShallow((state) => ({
      settings: state.settings,
      settingsLoading: state.settingsLoading,
      setSettings: state.setSettings,
      loadSettings: state.loadSettings,
      saveSettings: state.saveSettings,
    }))
  );

export const useDownload = () =>
  useAppStore(
    useShallow((state) => ({
      status: state.status,
      invoices: state.invoices,
      detectedVnptUrl: state.detectedVnptUrl,
      progress: state.progress,
      logs: state.logs,
      captchaRequest: state.captchaRequest,
      downloadDirectory: state.downloadDirectory,
      batchId: state.batchId,
      setInvoices: state.setInvoices,
      updateInvoiceStatus: state.updateInvoiceStatus,
      setProgress: state.setProgress,
      addLog: state.addLog,
      clearLogs: state.clearLogs,
      setCaptchaRequest: state.setCaptchaRequest,
      setDownloadDirectory: state.setDownloadDirectory,
      setStatus: state.setStatus,
      setBatchId: state.setBatchId,
      reset: state.reset,
    }))
  );

export const useHistory = () =>
  useAppStore(
    useShallow((state) => ({
      batches: state.batches,
      selectedBatchId: state.selectedBatchId,
      batchInvoices: state.batchInvoices,
      isLoading: state.isLoading,
      setBatches: state.setBatches,
      selectBatch: state.selectBatch,
      setBatchInvoices: state.setBatchInvoices,
      setLoading: state.setLoading,
      loadBatches: state.loadBatches,
      loadBatchInvoices: state.loadBatchInvoices,
      deleteBatch: state.deleteBatch,
    }))
  );
