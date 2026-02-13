export function Header() {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <svg
          className="w-8 h-8 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h1 className="text-xl font-semibold text-gray-800">AutoInvoice</h1>
      </div>
      <div className="ml-auto text-sm text-gray-500">VNPT Invoice Downloader</div>
    </header>
  );
}
