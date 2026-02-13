import type { InvoiceCode } from '../../types';

interface InvoicePreviewProps {
  invoices: InvoiceCode[];
  detected_url: string | null;
  sheet_name: string;
  total_rows: number;
  onProceed: () => void;
  onReset: () => void;
}

export function InvoicePreview({
  invoices,
  detected_url,
  sheet_name,
  total_rows,
  onProceed,
  onReset,
}: InvoicePreviewProps) {
  return (
    <div className="w-full max-w-3xl">
      {/* Summary Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Parse Results</h3>
          <button
            onClick={onReset}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Upload different file
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Sheet Name</p>
            <p className="text-lg font-medium text-gray-800">{sheet_name}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Rows</p>
            <p className="text-lg font-medium text-gray-800">{total_rows}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600">Valid Invoices</p>
            <p className="text-lg font-medium text-green-700">{invoices.length}</p>
          </div>
        </div>

        {detected_url && (
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 mb-1">Detected VNPT URL</p>
            <p className="text-sm font-mono text-blue-800 truncate">{detected_url}</p>
          </div>
        )}
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-medium text-gray-800">Invoice Codes ({invoices.length})</h3>
        </div>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  #
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Invoice Code
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Row
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((invoice, idx) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-2 text-sm font-mono text-gray-800">{invoice.code}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{invoice.row_number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-center">
        <button
          onClick={onProceed}
          className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Proceed to Download ({invoices.length} invoices)
        </button>
      </div>
    </div>
  );
}
