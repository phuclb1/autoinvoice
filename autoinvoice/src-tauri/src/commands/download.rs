use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{AppHandle, State};

use crate::services::downloader::{
    BatchResult, DownloadConfig, DownloadOrchestrator, InvoiceDownloadRequest,
};
use crate::error::AppError;

/// State to track active download orchestrators
pub struct DownloadState {
    pub orchestrators: Arc<Mutex<HashMap<String, Arc<DownloadOrchestrator>>>>,
}

impl Default for DownloadState {
    fn default() -> Self {
        Self {
            orchestrators: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[derive(serde::Deserialize)]
pub struct StartDownloadRequest {
    pub batch_id: String,
    pub invoices: Vec<InvoiceDownloadRequest>,
    pub config: DownloadConfig,
}

/// Start downloading a batch of invoices
#[tauri::command]
pub async fn start_download(
    app: AppHandle,
    state: State<'_, DownloadState>,
    request: StartDownloadRequest,
) -> Result<BatchResult, AppError> {
    let orchestrator = Arc::new(DownloadOrchestrator::new(
        request.config,
        request.batch_id.clone(),
    ));

    // Store orchestrator for potential cancellation
    {
        let mut orchestrators = state.orchestrators.lock().await;
        orchestrators.insert(request.batch_id.clone(), orchestrator.clone());
    }

    // Run download
    let result = orchestrator.download_batch(&app, request.invoices).await;

    // Remove orchestrator after completion
    {
        let mut orchestrators = state.orchestrators.lock().await;
        orchestrators.remove(&request.batch_id);
    }

    result
}

/// Cancel an active download batch
#[tauri::command]
pub async fn cancel_download(
    state: State<'_, DownloadState>,
    batch_id: String,
) -> Result<(), AppError> {
    let orchestrators = state.orchestrators.lock().await;

    if let Some(orchestrator) = orchestrators.get(&batch_id) {
        orchestrator.cancel().await;
        Ok(())
    } else {
        Err(AppError::ConfigError(format!(
            "No active download with batch_id: {}",
            batch_id
        )))
    }
}

/// Submit a manually solved captcha
#[tauri::command]
pub async fn submit_manual_captcha(
    _state: State<'_, DownloadState>,
    _batch_id: String,
    _invoice_id: String,
    _captcha_text: String,
) -> Result<(), AppError> {
    // TODO: Implement manual captcha submission
    // This would require a more complex state management to pause/resume downloads
    Ok(())
}
