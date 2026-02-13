mod error;
mod services;
mod commands;

use std::sync::Arc;
use tauri::Manager;
use commands::download::DownloadState;
use services::database::Database;

/// Database state wrapper for Tauri
pub struct DatabaseState(pub Arc<Database>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Initialize database in app data directory
            let app_data_dir = app.path().app_data_dir()
                .expect("Failed to get app data directory");
            let db = Database::new(app_data_dir)
                .expect("Failed to initialize database");
            app.manage(DatabaseState(Arc::new(db)));
            Ok(())
        })
        .manage(DownloadState::default())
        .invoke_handler(tauri::generate_handler![
            // Excel commands
            commands::parse_excel,
            // Download commands
            commands::start_download,
            commands::cancel_download,
            commands::submit_manual_captcha,
            // Settings commands
            commands::get_settings,
            commands::save_settings,
            // History commands
            commands::get_batches,
            commands::get_batch_invoices,
            commands::delete_batch,
            commands::get_failed_invoices,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
