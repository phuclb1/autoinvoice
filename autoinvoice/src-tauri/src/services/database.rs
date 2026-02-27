use rusqlite::{Connection, params, OptionalExtension};
use std::path::PathBuf;
use std::sync::Mutex;
use crate::error::AppError;
use crate::commands::history::{DownloadBatch, HistoryInvoice};
use crate::commands::settings::Settings;

/// Database service for persisting download history
pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    /// Initialize database with the given app data directory
    pub fn new(app_data_dir: PathBuf) -> Result<Self, AppError> {
        std::fs::create_dir_all(&app_data_dir)
            .map_err(|e| AppError::IoError(format!("Failed to create app data dir: {}", e)))?;

        let db_path = app_data_dir.join("autoinvoice.db");
        let conn = Connection::open(&db_path)
            .map_err(|e| AppError::DatabaseError(format!("Failed to open database: {}", e)))?;

        let db = Self {
            conn: Mutex::new(conn),
        };

        db.init_schema()?;
        Ok(db)
    }

    /// Initialize database schema
    fn init_schema(&self) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS batches (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                total_count INTEGER NOT NULL,
                success_count INTEGER NOT NULL DEFAULT 0,
                failed_count INTEGER NOT NULL DEFAULT 0,
                download_directory TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS invoices (
                id TEXT PRIMARY KEY,
                batch_id TEXT NOT NULL,
                code TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                error TEXT,
                file_path TEXT,
                downloaded_at TEXT,
                FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_invoices_batch_id ON invoices(batch_id);
            CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            "#,
        )
        .map_err(|e| AppError::DatabaseError(format!("Failed to init schema: {}", e)))?;

        Ok(())
    }

    /// Create a new download batch
    pub fn create_batch(&self, batch: &DownloadBatch) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "INSERT INTO batches (id, created_at, total_count, success_count, failed_count, download_directory)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                batch.id,
                batch.created_at,
                batch.total_count,
                batch.success_count,
                batch.failed_count,
                batch.download_directory,
            ],
        )
        .map_err(|e| AppError::DatabaseError(format!("Failed to create batch: {}", e)))?;

        Ok(())
    }

    /// Update batch counts
    pub fn update_batch_counts(
        &self,
        batch_id: &str,
        success_count: u32,
        failed_count: u32,
    ) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "UPDATE batches SET success_count = ?1, failed_count = ?2 WHERE id = ?3",
            params![success_count, failed_count, batch_id],
        )
        .map_err(|e| AppError::DatabaseError(format!("Failed to update batch: {}", e)))?;

        Ok(())
    }

    /// Get all batches ordered by created_at desc
    pub fn get_batches(&self) -> Result<Vec<DownloadBatch>, AppError> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare(
                "SELECT id, created_at, total_count, success_count, failed_count, download_directory
                 FROM batches ORDER BY created_at DESC",
            )
            .map_err(|e| AppError::DatabaseError(format!("Failed to prepare query: {}", e)))?;

        let batches = stmt
            .query_map([], |row| {
                Ok(DownloadBatch {
                    id: row.get(0)?,
                    created_at: row.get(1)?,
                    total_count: row.get(2)?,
                    success_count: row.get(3)?,
                    failed_count: row.get(4)?,
                    download_directory: row.get(5)?,
                })
            })
            .map_err(|e| AppError::DatabaseError(format!("Failed to query batches: {}", e)))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| AppError::DatabaseError(format!("Failed to collect batches: {}", e)))?;

        Ok(batches)
    }

    /// Get a specific batch by ID
    pub fn get_batch(&self, batch_id: &str) -> Result<Option<DownloadBatch>, AppError> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare(
                "SELECT id, created_at, total_count, success_count, failed_count, download_directory
                 FROM batches WHERE id = ?1",
            )
            .map_err(|e| AppError::DatabaseError(format!("Failed to prepare query: {}", e)))?;

        let batch = stmt
            .query_row([batch_id], |row| {
                Ok(DownloadBatch {
                    id: row.get(0)?,
                    created_at: row.get(1)?,
                    total_count: row.get(2)?,
                    success_count: row.get(3)?,
                    failed_count: row.get(4)?,
                    download_directory: row.get(5)?,
                })
            })
            .optional()
            .map_err(|e| AppError::DatabaseError(format!("Failed to query batch: {}", e)))?;

        Ok(batch)
    }

    /// Delete a batch and all its invoices
    pub fn delete_batch(&self, batch_id: &str) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();

        conn.execute("DELETE FROM invoices WHERE batch_id = ?1", [batch_id])
            .map_err(|e| AppError::DatabaseError(format!("Failed to delete invoices: {}", e)))?;

        conn.execute("DELETE FROM batches WHERE id = ?1", [batch_id])
            .map_err(|e| AppError::DatabaseError(format!("Failed to delete batch: {}", e)))?;

        Ok(())
    }

    /// Create an invoice record
    pub fn create_invoice(&self, invoice: &HistoryInvoice) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "INSERT INTO invoices (id, batch_id, code, status, error, file_path, downloaded_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                invoice.id,
                invoice.batch_id,
                invoice.code,
                invoice.status,
                invoice.error,
                invoice.file_path,
                invoice.downloaded_at,
            ],
        )
        .map_err(|e| AppError::DatabaseError(format!("Failed to create invoice: {}", e)))?;

        Ok(())
    }

    /// Update invoice status
    pub fn update_invoice_status(
        &self,
        invoice_id: &str,
        status: &str,
        error: Option<&str>,
        file_path: Option<&str>,
    ) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();

        let downloaded_at = if status == "success" || status == "failed" {
            Some(chrono::Utc::now().to_rfc3339())
        } else {
            None
        };

        conn.execute(
            "UPDATE invoices SET status = ?1, error = ?2, file_path = ?3, downloaded_at = ?4 WHERE id = ?5",
            params![status, error, file_path, downloaded_at, invoice_id],
        )
        .map_err(|e| AppError::DatabaseError(format!("Failed to update invoice: {}", e)))?;

        Ok(())
    }

    /// Get invoices for a batch
    pub fn get_batch_invoices(&self, batch_id: &str) -> Result<Vec<HistoryInvoice>, AppError> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare(
                "SELECT id, batch_id, code, status, error, file_path, downloaded_at
                 FROM invoices WHERE batch_id = ?1 ORDER BY id",
            )
            .map_err(|e| AppError::DatabaseError(format!("Failed to prepare query: {}", e)))?;

        let invoices = stmt
            .query_map([batch_id], |row| {
                Ok(HistoryInvoice {
                    id: row.get(0)?,
                    batch_id: row.get(1)?,
                    code: row.get(2)?,
                    status: row.get(3)?,
                    error: row.get(4)?,
                    file_path: row.get(5)?,
                    downloaded_at: row.get(6)?,
                })
            })
            .map_err(|e| AppError::DatabaseError(format!("Failed to query invoices: {}", e)))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| AppError::DatabaseError(format!("Failed to collect invoices: {}", e)))?;

        Ok(invoices)
    }

    /// Get failed invoices for a batch (for re-download)
    pub fn get_failed_invoices(&self, batch_id: &str) -> Result<Vec<HistoryInvoice>, AppError> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare(
                "SELECT id, batch_id, code, status, error, file_path, downloaded_at
                 FROM invoices WHERE batch_id = ?1 AND status = 'failed' ORDER BY id",
            )
            .map_err(|e| AppError::DatabaseError(format!("Failed to prepare query: {}", e)))?;

        let invoices = stmt
            .query_map([batch_id], |row| {
                Ok(HistoryInvoice {
                    id: row.get(0)?,
                    batch_id: row.get(1)?,
                    code: row.get(2)?,
                    status: row.get(3)?,
                    error: row.get(4)?,
                    file_path: row.get(5)?,
                    downloaded_at: row.get(6)?,
                })
            })
            .map_err(|e| AppError::DatabaseError(format!("Failed to query invoices: {}", e)))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| AppError::DatabaseError(format!("Failed to collect invoices: {}", e)))?;

        Ok(invoices)
    }

    /// Get application settings
    pub fn get_settings(&self) -> Result<Settings, AppError> {
        let conn = self.conn.lock().unwrap();

        let get_setting = |key: &str| -> Result<String, AppError> {
            let mut stmt = conn
                .prepare("SELECT value FROM settings WHERE key = ?1")
                .map_err(|e| AppError::DatabaseError(format!("Failed to prepare query: {}", e)))?;

            let value: Option<String> = stmt
                .query_row([key], |row| row.get(0))
                .optional()
                .map_err(|e| AppError::DatabaseError(format!("Failed to query setting: {}", e)))?;

            Ok(value.unwrap_or_default())
        };

        let download_directory = get_setting("download_directory")?;
        let download_directory = if download_directory.is_empty() {
            Self::get_default_download_directory()
        } else {
            download_directory
        };

        Ok(Settings {
            openai_api_key: get_setting("openai_api_key")?,
            vnpt_url: get_setting("vnpt_url")?,
            download_directory,
        })
    }

    /// Get platform-specific default download directory
    fn get_default_download_directory() -> String {
        #[cfg(target_os = "windows")]
        {
            // Windows: use D:\ if exists, otherwise Documents
            if std::path::Path::new("D:\\").exists() {
                return "D:\\".to_string();
            }
        }

        // macOS and fallback: use Documents directory
        dirs::document_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default()
    }

    /// Save application settings
    pub fn save_settings(&self, settings: &Settings) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();

        let save_setting = |key: &str, value: &str| -> Result<(), rusqlite::Error> {
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
                params![key, value],
            )?;
            Ok(())
        };

        save_setting("openai_api_key", &settings.openai_api_key)
            .map_err(|e| AppError::DatabaseError(format!("Failed to save setting: {}", e)))?;
        save_setting("vnpt_url", &settings.vnpt_url)
            .map_err(|e| AppError::DatabaseError(format!("Failed to save setting: {}", e)))?;
        save_setting("download_directory", &settings.download_directory)
            .map_err(|e| AppError::DatabaseError(format!("Failed to save setting: {}", e)))?;

        Ok(())
    }
}
