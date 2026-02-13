import { invoke } from '@tauri-apps/api/core';
import type { StateCreator } from 'zustand';
import type { Settings } from '../types';

// Backend uses snake_case
interface BackendSettings {
  openai_api_key: string;
  vnpt_url: string;
  download_directory: string;
}

export interface SettingsSlice {
  settings: Settings;
  settingsLoading: boolean;
  setSettings: (settings: Partial<Settings>) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

export const createSettingsSlice: StateCreator<SettingsSlice> = (set, get) => ({
  settings: {
    openaiApiKey: '',
    vnptUrl: '',
    downloadDirectory: '',
  },
  settingsLoading: false,

  setSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },

  loadSettings: async () => {
    set({ settingsLoading: true });
    try {
      const backendSettings = await invoke<BackendSettings>('get_settings');
      set({
        settings: {
          openaiApiKey: backendSettings.openai_api_key,
          vnptUrl: backendSettings.vnpt_url,
          downloadDirectory: backendSettings.download_directory,
        },
        settingsLoading: false,
      });
    } catch (err) {
      console.error('Failed to load settings:', err);
      set({ settingsLoading: false });
    }
  },

  saveSettings: async () => {
    const { settings } = get();
    try {
      await invoke('save_settings', {
        settings: {
          openai_api_key: settings.openaiApiKey,
          vnpt_url: settings.vnptUrl,
          download_directory: settings.downloadDirectory,
        },
      });
    } catch (err) {
      console.error('Failed to save settings:', err);
      throw err;
    }
  },
});
