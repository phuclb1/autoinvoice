use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::services::browser::VnptBrowser;
use crate::services::captcha::CaptchaSolver;

const MAX_RETRIES: u32 = 3;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadConfig {
    pub vnpt_url: String,
    pub openai_api_key: String,
    pub download_directory: String,
    pub headless: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceDownloadRequest {
    pub id: String,
    pub code: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProgressEvent {
    pub batch_id: String,
    pub current: u32,
    pub total: u32,
    pub percentage: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct LogEvent {
    pub batch_id: String,
    pub timestamp: String,
    pub level: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct InvoiceStatusEvent {
    pub batch_id: String,
    pub invoice_id: String,
    pub status: String,
    pub error: Option<String>,
    pub file_path: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CaptchaRequiredEvent {
    pub batch_id: String,
    pub invoice_id: String,
    pub invoice_code: String,
    pub image_base64: String,
}

pub struct DownloadOrchestrator {
    config: DownloadConfig,
    batch_id: String,
    captcha_solver: CaptchaSolver,
    cancelled: Arc<AtomicBool>,
}

impl DownloadOrchestrator {
    pub fn new(config: DownloadConfig, batch_id: String) -> Self {
        let captcha_solver = CaptchaSolver::new(config.openai_api_key.clone());

        Self {
            config,
            batch_id,
            captcha_solver,
            cancelled: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Cancel the current download batch
    pub fn cancel(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
    }

    /// Check if download has been cancelled
    fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::SeqCst)
    }

    /// Download a single invoice - runs all browser operations in a blocking context
    pub async fn download_invoice(
        &self,
        app: &AppHandle,
        invoice: &InvoiceDownloadRequest,
    ) -> Result<String, AppError> {
        let config = self.config.clone();
        let invoice_id = invoice.id.clone();
        let invoice_code = invoice.code.clone();
        let batch_id = self.batch_id.clone();
        let captcha_solver = self.captcha_solver.clone();
        let cancelled = self.cancelled.clone();
        let app_handle = app.clone();

        // Run all browser operations in a blocking thread
        tokio::task::spawn_blocking(move || {
            download_invoice_sync(
                &config,
                &batch_id,
                &invoice_id,
                &invoice_code,
                &captcha_solver,
                &cancelled,
                &app_handle,
            )
        })
        .await
        .map_err(|e| AppError::BrowserError(format!("Task panicked: {}", e)))?
    }

    /// Download multiple invoices
    pub async fn download_batch(
        &self,
        app: &AppHandle,
        invoices: Vec<InvoiceDownloadRequest>,
    ) -> Result<BatchResult, AppError> {
        let total = invoices.len() as u32;
        let mut success_count = 0u32;
        let mut failed_count = 0u32;
        let mut results: Vec<InvoiceResult> = Vec::new();

        for (idx, invoice) in invoices.iter().enumerate() {
            if self.is_cancelled() {
                self.emit_log(app, "warn", "Download batch cancelled by user");
                break;
            }

            let current = idx as u32 + 1;

            // Emit progress
            self.emit_progress(app, current, total);

            // Update invoice status to downloading
            self.emit_invoice_status(app, &invoice.id, "downloading", None, None);

            self.emit_log(
                app,
                "info",
                &format!("[{}/{}] Downloading: {}", current, total, invoice.code),
            );

            match self.download_invoice(app, invoice).await {
                Ok(file_path) => {
                    success_count += 1;
                    self.emit_invoice_status(
                        app,
                        &invoice.id,
                        "success",
                        None,
                        Some(file_path.clone()),
                    );
                    results.push(InvoiceResult {
                        invoice_id: invoice.id.clone(),
                        code: invoice.code.clone(),
                        status: "success".to_string(),
                        error: None,
                        file_path: Some(file_path),
                    });
                }
                Err(e) => {
                    failed_count += 1;
                    let error_msg = e.to_string();
                    self.emit_invoice_status(
                        app,
                        &invoice.id,
                        "failed",
                        Some(error_msg.clone()),
                        None,
                    );
                    results.push(InvoiceResult {
                        invoice_id: invoice.id.clone(),
                        code: invoice.code.clone(),
                        status: "failed".to_string(),
                        error: Some(error_msg),
                        file_path: None,
                    });
                }
            }

            // Small delay between downloads to avoid rate limiting
            if !self.is_cancelled() && idx < invoices.len() - 1 {
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            }
        }

        // Emit final progress
        self.emit_progress(app, total, total);

        self.emit_log(
            app,
            "info",
            &format!(
                "Batch complete: {}/{} successful, {}/{} failed",
                success_count, total, failed_count, total
            ),
        );

        Ok(BatchResult {
            batch_id: self.batch_id.clone(),
            total,
            success_count,
            failed_count,
            results,
        })
    }

    // Event emission helpers
    fn emit_progress(&self, app: &AppHandle, current: u32, total: u32) {
        let percentage = if total > 0 {
            (current as f32 / total as f32 * 100.0) as u32
        } else {
            0
        };

        let _ = app.emit(
            "download:progress",
            ProgressEvent {
                batch_id: self.batch_id.clone(),
                current,
                total,
                percentage,
            },
        );
    }

    fn emit_log(&self, app: &AppHandle, level: &str, message: &str) {
        let _ = app.emit(
            "download:log",
            LogEvent {
                batch_id: self.batch_id.clone(),
                timestamp: chrono::Utc::now().to_rfc3339(),
                level: level.to_string(),
                message: message.to_string(),
            },
        );
    }

    fn emit_invoice_status(
        &self,
        app: &AppHandle,
        invoice_id: &str,
        status: &str,
        error: Option<String>,
        file_path: Option<String>,
    ) {
        let _ = app.emit(
            "invoice:status",
            InvoiceStatusEvent {
                batch_id: self.batch_id.clone(),
                invoice_id: invoice_id.to_string(),
                status: status.to_string(),
                error,
                file_path,
            },
        );
    }
}

/// Sync function to download a single invoice - runs in blocking thread
fn download_invoice_sync(
    config: &DownloadConfig,
    batch_id: &str,
    invoice_id: &str,
    invoice_code: &str,
    captcha_solver: &CaptchaSolver,
    cancelled: &Arc<AtomicBool>,
    app: &AppHandle,
) -> Result<String, AppError> {
    // Create browser instance
    let browser = VnptBrowser::new(config.headless)?;

    let result = download_invoice_with_retry_sync(
        config,
        batch_id,
        invoice_id,
        invoice_code,
        captcha_solver,
        cancelled,
        app,
        &browser,
    );

    // Browser will be dropped here in the blocking context - no panic
    drop(browser);

    result
}

fn download_invoice_with_retry_sync(
    config: &DownloadConfig,
    batch_id: &str,
    invoice_id: &str,
    invoice_code: &str,
    captcha_solver: &CaptchaSolver,
    cancelled: &Arc<AtomicBool>,
    app: &AppHandle,
    browser: &VnptBrowser,
) -> Result<String, AppError> {
    for attempt in 1..=MAX_RETRIES {
        if cancelled.load(Ordering::SeqCst) {
            return Err(AppError::DownloadFailed("Download cancelled".to_string()));
        }

        emit_log_sync(
            app,
            batch_id,
            "info",
            &format!(
                "Attempt {}/{} for invoice {}",
                attempt, MAX_RETRIES, invoice_code
            ),
        );

        // Navigate to search page
        browser.navigate_to_search(&config.vnpt_url)?;

        // Fill invoice code
        browser.fill_invoice_code(invoice_code)?;

        // Get captcha screenshot
        let captcha_image = browser.get_captcha_screenshot()?;

        // Solve captcha with AI (blocking)
        match captcha_solver.solve_blocking(&captcha_image) {
            Ok(captcha_text) => {
                emit_log_sync(
                    app,
                    batch_id,
                    "info",
                    &format!("Captcha solved: {}", captcha_text),
                );

                // Fill captcha
                browser.fill_captcha(&captcha_text)?;

                // Submit
                browser.submit()?;

                // Check for errors
                if let Some(error) = browser.check_for_error() {
                    emit_log_sync(app, batch_id, "warn", &format!("Page error: {}", error));

                    // If captcha error, retry
                    if error.to_lowercase().contains("captcha")
                        || error.to_lowercase().contains("sai")
                        || error.to_lowercase().contains("không đúng")
                    {
                        continue;
                    }
                }

                // Try to download
                match download_pdf_sync(config, browser, invoice_code) {
                    Ok(file_path) => {
                        emit_log_sync(
                            app,
                            batch_id,
                            "info",
                            &format!("Downloaded: {}", file_path),
                        );
                        return Ok(file_path);
                    }
                    Err(e) => {
                        emit_log_sync(
                            app,
                            batch_id,
                            "warn",
                            &format!("Download failed: {}", e),
                        );
                    }
                }
            }
            Err(e) => {
                emit_log_sync(
                    app,
                    batch_id,
                    "warn",
                    &format!("Captcha solving failed: {}", e),
                );

                // Emit captcha required event for manual input
                if attempt == MAX_RETRIES {
                    let base64_image = base64::Engine::encode(
                        &base64::engine::general_purpose::STANDARD,
                        &captcha_image,
                    );

                    let _ = app.emit(
                        "captcha:required",
                        CaptchaRequiredEvent {
                            batch_id: batch_id.to_string(),
                            invoice_id: invoice_id.to_string(),
                            invoice_code: invoice_code.to_string(),
                            image_base64: base64_image,
                        },
                    );
                }
            }
        }
    }

    Err(AppError::CaptchaFailed(MAX_RETRIES))
}

fn download_pdf_sync(
    config: &DownloadConfig,
    browser: &VnptBrowser,
    invoice_code: &str,
) -> Result<String, AppError> {
    // Get PDF bytes
    let pdf_bytes = browser.download_pdf(&config.vnpt_url)?;

    if pdf_bytes.is_empty() {
        return Err(AppError::DownloadFailed("Empty PDF received".to_string()));
    }

    // Create filename from invoice code
    let safe_code = invoice_code.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
    let filename = format!("{}.pdf", safe_code);

    // Ensure download directory exists
    let download_path = PathBuf::from(&config.download_directory);
    std::fs::create_dir_all(&download_path)?;

    // Save file
    let file_path = download_path.join(&filename);
    std::fs::write(&file_path, &pdf_bytes)?;

    Ok(file_path.to_string_lossy().to_string())
}

fn emit_log_sync(app: &AppHandle, batch_id: &str, level: &str, message: &str) {
    let _ = app.emit(
        "download:log",
        LogEvent {
            batch_id: batch_id.to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            level: level.to_string(),
            message: message.to_string(),
        },
    );
}

#[derive(Debug, Clone, Serialize)]
pub struct InvoiceResult {
    pub invoice_id: String,
    pub code: String,
    pub status: String,
    pub error: Option<String>,
    pub file_path: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BatchResult {
    pub batch_id: String,
    pub total: u32,
    pub success_count: u32,
    pub failed_count: u32,
    pub results: Vec<InvoiceResult>,
}
