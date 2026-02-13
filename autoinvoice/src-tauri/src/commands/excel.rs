use crate::services::excel_parser::{parse_excel_file, ExcelParseResult};
use crate::error::AppError;

/// Parse an Excel file and extract invoice codes
///
/// # Arguments
/// * `file_path` - Path to the Excel file (.xlsx)
///
/// # Returns
/// * `ExcelParseResult` containing invoice codes and optionally detected VNPT URL
#[tauri::command]
pub fn parse_excel(file_path: String) -> Result<ExcelParseResult, AppError> {
    parse_excel_file(&file_path)
}
