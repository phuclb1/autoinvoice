use serde::{Deserialize, Serialize};
use tauri::State;
use crate::error::AppError;
use crate::DatabaseState;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Settings {
    pub openai_api_key: String,
    pub vnpt_url: String,
    pub download_directory: String,
}

/// Get application settings
#[tauri::command]
pub fn get_settings(db: State<DatabaseState>) -> Result<Settings, AppError> {
    db.0.get_settings()
}

/// Save application settings
#[tauri::command]
pub fn save_settings(settings: Settings, db: State<DatabaseState>) -> Result<(), AppError> {
    db.0.save_settings(&settings)
}
