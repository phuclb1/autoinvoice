import { invoke } from '@tauri-apps/api/core';
import type { StateCreator } from 'zustand';
import type { DownloadBatch, HistoryInvoice } from '../types';

export interface HistorySlice {
  // State
  batches: DownloadBatch[];
  selectedBatchId: string | null;
  batchInvoices: HistoryInvoice[];
  isLoading: boolean;

  // Actions
  setBatches: (batches: DownloadBatch[]) => void;
  selectBatch: (id: string | null) => void;
  setBatchInvoices: (invoices: HistoryInvoice[]) => void;
  setLoading: (loading: boolean) => void;
  loadBatches: () => Promise<void>;
  loadBatchInvoices: (batchId: string) => Promise<void>;
  deleteBatch: (batchId: string) => Promise<void>;
}

export const createHistorySlice: StateCreator<HistorySlice> = (set, get) => ({
  batches: [],
  selectedBatchId: null,
  batchInvoices: [],
  isLoading: false,

  setBatches: (batches) => {
    set({ batches });
  },

  selectBatch: (id) => {
    set({ selectedBatchId: id, batchInvoices: [] });
  },

  setBatchInvoices: (invoices) => {
    set({ batchInvoices: invoices });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  loadBatches: async () => {
    set({ isLoading: true });
    try {
      const batches = await invoke<DownloadBatch[]>('get_batches');
      set({ batches, isLoading: false });
    } catch (err) {
      console.error('Failed to load batches:', err);
      set({ isLoading: false });
    }
  },

  loadBatchInvoices: async (batchId) => {
    set({ isLoading: true });
    try {
      const invoices = await invoke<HistoryInvoice[]>('get_batch_invoices', { batchId });
      set({ batchInvoices: invoices, isLoading: false });
    } catch (err) {
      console.error('Failed to load batch invoices:', err);
      set({ isLoading: false });
    }
  },

  deleteBatch: async (batchId) => {
    try {
      await invoke('delete_batch', { batchId });
      // Refresh batches after deletion
      const batches = get().batches.filter((b) => b.id !== batchId);
      set({ batches });
      // Clear selection if deleted batch was selected
      if (get().selectedBatchId === batchId) {
        set({ selectedBatchId: null, batchInvoices: [] });
      }
    } catch (err) {
      console.error('Failed to delete batch:', err);
    }
  },
});
