import { useEffect, useRef } from 'react';
import type { LogEntry } from '../../types';

interface LogViewerProps {
  logs: LogEntry[];
}

const levelColors = {
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

const levelLabels = {
  info: 'INFO',
  warn: 'WARN',
  error: 'ERR!',
};

export function LogViewer({ logs }: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '--:--:--';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-0">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-medium text-gray-800">Activity Log</h3>
        <span className="text-xs text-gray-400">{logs.length} entries</span>
      </div>
      <div
        ref={containerRef}
        className="flex-1 p-4 overflow-auto bg-gray-900 rounded-b-xl font-mono text-sm min-h-0"
      >
        {logs.length === 0 ? (
          <div className="text-gray-500">Waiting for download to start...</div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div key={index} className="flex gap-2">
                <span className="text-gray-500 shrink-0">
                  [{formatTimestamp(log.timestamp)}]
                </span>
                <span className={`shrink-0 ${levelColors[log.level]}`}>
                  {levelLabels[log.level]}
                </span>
                <span className="text-gray-300 break-all">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
