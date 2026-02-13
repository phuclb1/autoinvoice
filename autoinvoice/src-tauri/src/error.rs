use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Excel parsing error: {0}")]
    ExcelError(String),

    #[error("Browser error: {0}")]
    BrowserError(String),

    #[error("Network error: {0}")]
    NetworkError(String),

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Element not found: {0}")]
    ElementNotFound(String),

    #[error("Captcha solving failed after {0} attempts")]
    CaptchaFailed(u32),

    #[error("Download failed: {0}")]
    DownloadFailed(String),

    #[error("Invalid configuration: {0}")]
    ConfigError(String),

    #[error("IO error: {0}")]
    IoError(String),
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::IoError(err.to_string())
    }
}

impl From<calamine::Error> for AppError {
    fn from(err: calamine::Error) -> Self {
        AppError::ExcelError(err.to_string())
    }
}

impl From<calamine::XlsxError> for AppError {
    fn from(err: calamine::XlsxError) -> Self {
        AppError::ExcelError(err.to_string())
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        AppError::DatabaseError(err.to_string())
    }
}

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        AppError::NetworkError(err.to_string())
    }
}

// Convert to Tauri-friendly error
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
