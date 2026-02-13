use serde::{Deserialize, Serialize};
use tauri::State;
use crate::error::AppError;
use crate::DatabaseState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadBatch {
    pub id: String,
    pub created_at: String,
    pub total_count: u32,
    pub success_count: u32,
    pub failed_count: u32,
    pub download_directory: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryInvoice {
    pub id: String,
    pub batch_id: String,
    pub code: String,
    pub status: String,
    pub error: Option<String>,
    pub file_path: Option<String>,
    pub downloaded_at: Option<String>,
}

/// Get list of download batches
#[tauri::command]
pub fn get_batches(db: State<DatabaseState>) -> Result<Vec<DownloadBatch>, AppError> {
    db.0.get_batches()
}

/// Get invoices for a specific batch
#[tauri::command]
pub fn get_batch_invoices(
    batch_id: String,
    db: State<DatabaseState>,
) -> Result<Vec<HistoryInvoice>, AppError> {
    db.0.get_batch_invoices(&batch_id)
}

/// Delete a batch and all its invoices
#[tauri::command]
pub fn delete_batch(batch_id: String, db: State<DatabaseState>) -> Result<(), AppError> {
    db.0.delete_batch(&batch_id)
}

/// Get failed invoices for a batch (for re-download)
#[tauri::command]
pub fn get_failed_invoices(
    batch_id: String,
    db: State<DatabaseState>,
) -> Result<Vec<HistoryInvoice>, AppError> {
    db.0.get_failed_invoices(&batch_id)
}
