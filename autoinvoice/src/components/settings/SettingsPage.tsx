import { useState, useEffect, useCallback } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useSettings } from '../../store';

export function SettingsPage() {
  const { settings, settingsLoading, setSettings, loadSettings, saveSettings } = useSettings();
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await saveSettings();
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [saveSettings]);

  const handleBrowseDirectory = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Default Download Directory',
      });
      if (selected && typeof selected === 'string') {
        setSettings({ downloadDirectory: selected });
      }
    } catch (err) {
      console.error('Failed to select directory:', err);
    }
  }, [setSettings]);

  if (settingsLoading) {
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
          <p className="mt-4 text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Settings</h2>
        <p className="text-gray-500 mt-1">Configure application settings</p>
      </div>

      <div className="flex-1 max-w-2xl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-200">
          {/* OpenAI API Key */}
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenAI API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={settings.openaiApiKey}
                onChange={(e) => setSettings({ openaiApiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-20"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Used for automatic captcha solving with GPT-4o-mini Vision
            </p>
          </div>

          {/* VNPT Invoice URL */}
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              VNPT Invoice URL
            </label>
            <input
              type="url"
              value={settings.vnptUrl}
              onChange={(e) => setSettings({ vnptUrl: e.target.value })}
              placeholder="https://xxxxx.vnpt-invoice.com.vn/HomeNoLogin/SearchByFkey"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-400 mt-2">
              The VNPT invoice portal URL for your company. Can also be auto-detected from Excel.
            </p>
          </div>

          {/* Default Download Directory */}
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Download Directory
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.downloadDirectory}
                placeholder="/Users/you/Downloads/Invoices"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                readOnly
              />
              <button
                onClick={handleBrowseDirectory}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Browse
              </button>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Where downloaded invoice PDFs will be saved
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm">Settings saved successfully</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-sm">Failed to save settings</span>
            </div>
          )}
          {saveStatus === 'idle' && <div />}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
