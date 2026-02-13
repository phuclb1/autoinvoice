import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useDownload } from '../../store';

export function CaptchaModal() {
  const { captchaRequest, setCaptchaRequest, addLog } = useDownload();
  const [captchaInput, setCaptchaInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!captchaInput.trim() || !captchaRequest) return;

    setIsSubmitting(true);
    try {
      await invoke('submit_manual_captcha', {
        invoiceId: captchaRequest.invoiceId,
        captchaText: captchaInput.trim(),
      });
      addLog({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Manual captcha submitted for ${captchaRequest.invoiceCode}`,
      });
      setCaptchaRequest(null);
      setCaptchaInput('');
    } catch (err) {
      console.error('Failed to submit captcha:', err);
      addLog({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Failed to submit captcha: ${err}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [captchaInput, captchaRequest, setCaptchaRequest, addLog]);

  const handleSkip = useCallback(() => {
    if (captchaRequest) {
      addLog({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: `Skipped captcha for ${captchaRequest.invoiceCode}`,
      });
    }
    setCaptchaRequest(null);
    setCaptchaInput('');
  }, [captchaRequest, setCaptchaRequest, addLog]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isSubmitting) {
        handleSubmit();
      } else if (e.key === 'Escape') {
        handleSkip();
      }
    },
    [handleSubmit, handleSkip, isSubmitting]
  );

  if (!captchaRequest) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">Manual Captcha Required</h3>
          <p className="text-sm text-gray-500 mt-1">
            Auto-solve failed for invoice: <span className="font-mono">{captchaRequest.invoiceCode}</span>
          </p>
        </div>

        {/* Captcha Image */}
        <div className="p-6">
          <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center mb-4">
            <img
              src={`data:image/png;base64,${captchaRequest.imageBase64}`}
              alt="Captcha"
              className="max-w-full h-auto"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

          {/* Input */}
          <div className="mb-4">
            <label htmlFor="captcha-input" className="block text-sm font-medium text-gray-700 mb-2">
              Enter the text shown above:
            </label>
            <input
              id="captcha-input"
              type="text"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              placeholder="Type captcha here..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg text-center uppercase"
              disabled={isSubmitting}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={!captchaInput.trim() || isSubmitting}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </button>
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">Enter</kbd> to submit or{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">Esc</kbd> to skip
          </p>
        </div>
      </div>
    </div>
  );
}
