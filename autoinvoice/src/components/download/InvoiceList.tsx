import type { InvoiceCode } from '../../types';

interface InvoiceListProps {
  invoices: InvoiceCode[];
}

const statusConfig = {
  pending: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  downloading: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    icon: (
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    ),
  },
  success: {
    bg: 'bg-green-100',
    text: 'text-green-600',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  failed: {
    bg: 'bg-red-100',
    text: 'text-red-600',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
};

export function InvoiceList({ invoices }: InvoiceListProps) {
  if (invoices.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 py-12">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No invoices loaded</p>
          <p className="text-sm mt-1">Upload an Excel file first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {invoices.map((invoice) => {
        const config = statusConfig[invoice.status];
        return (
          <div
            key={invoice.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className={`p-1.5 rounded-full ${config.bg} ${config.text}`}>
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm text-gray-800 truncate">{invoice.code}</p>
              {invoice.error && (
                <p className="text-xs text-red-500 truncate" title={invoice.error}>
                  {invoice.error}
                </p>
              )}
            </div>
            <span className="text-xs text-gray-400">Row {invoice.row_number}</span>
          </div>
        );
      })}
    </div>
  );
}
