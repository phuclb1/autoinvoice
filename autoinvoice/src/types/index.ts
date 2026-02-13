// Navigation types
export type NavItem = 'upload' | 'download' | 'history' | 'settings';

// Invoice types from Excel parsing
export interface InvoiceCode {
  id: string;
  code: string;
  row_number: number;
  status: 'pending' | 'downloading' | 'success' | 'failed';
  error?: string;
  filePath?: string;
}

// Excel parse result from Tauri backend
export interface ExcelParseResult {
  invoices: InvoiceCode[];
  detected_url: string | null;
  total_rows: number;
  sheet_name: string;
}

// Download state
export interface DownloadProgress {
  batchId: string;
  current: number;
  total: number;
  percentage: number;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

// Settings
export interface Settings {
  openaiApiKey: string;
  vnptUrl: string;
  downloadDirectory: string;
}

// History - snake_case to match Rust backend
export interface DownloadBatch {
  id: string;
  created_at: string;
  total_count: number;
  success_count: number;
  failed_count: number;
  download_directory: string;
}

export interface HistoryInvoice {
  id: string;
  batch_id: string;
  code: string;
  status: string;
  error: string | null;
  file_path: string | null;
  downloaded_at: string | null;
}

// Captcha
export interface CaptchaRequest {
  invoiceId: string;
  invoiceCode: string;
  imageBase64: string;
}
