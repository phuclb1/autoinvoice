use calamine::{open_workbook, Reader, Xlsx, Data};
use serde::{Deserialize, Serialize};
use std::path::Path;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceCode {
    pub id: String,
    pub code: String,
    pub row_number: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExcelParseResult {
    pub invoices: Vec<InvoiceCode>,
    pub detected_url: Option<String>,
    pub total_rows: usize,
    pub sheet_name: String,
}

/// Parse an Excel file to extract invoice codes
///
/// Looks for a column containing "MÃ TRA CỨU" in the header
/// and extracts all valid invoice codes (containing 'C' and '_')
pub fn parse_excel_file(file_path: &str) -> Result<ExcelParseResult, AppError> {
    let path = Path::new(file_path);

    if !path.exists() {
        return Err(AppError::ExcelError(format!("File not found: {}", file_path)));
    }

    let mut workbook: Xlsx<_> = open_workbook(path)?;

    // Get the first sheet
    let sheet_names = workbook.sheet_names().to_vec();
    if sheet_names.is_empty() {
        return Err(AppError::ExcelError("No worksheets found in Excel file".to_string()));
    }

    let sheet_name = sheet_names[0].clone();

    let range = workbook
        .worksheet_range(&sheet_name)
        .map_err(|e| AppError::ExcelError(e.to_string()))?;

    let mut invoices = Vec::new();
    let mut detected_url: Option<String> = None;
    let mut header_row: Option<usize> = None;
    let mut code_col: Option<usize> = None;
    let total_rows = range.height();

    // Find header row with "MÃ TRA CỨU"
    for (row_idx, row) in range.rows().enumerate() {
        for (col_idx, cell) in row.iter().enumerate() {
            if let Data::String(text) = cell {
                let upper = text.to_uppercase();

                // Check for invoice code column header
                if upper.contains("MÃ TRA CỨU") {
                    header_row = Some(row_idx);
                    code_col = Some(col_idx);
                }

                // Try to detect VNPT URL from any cell
                if detected_url.is_none() && text.contains("vnpt-invoice.com.vn") {
                    // Extract URL from text
                    if let Some(url) = extract_vnpt_url(text) {
                        detected_url = Some(url);
                    }
                }
            }
        }

        if header_row.is_some() {
            break;
        }
    }

    let (header, col) = match (header_row, code_col) {
        (Some(h), Some(c)) => (h, c),
        _ => return Err(AppError::ExcelError(
            "Could not find column 'MÃ TRA CỨU' in Excel file".to_string()
        )),
    };

    // Extract invoice codes from found column
    for (row_idx, row) in range.rows().enumerate().skip(header + 1) {
        if let Some(cell) = row.get(col) {
            let code_text = match cell {
                Data::String(s) => s.trim().to_string(),
                Data::Int(i) => i.to_string(),
                Data::Float(f) => f.to_string(),
                _ => continue,
            };

            // Validate code format: contains C and _
            // Example valid codes: C25TLK0019654_Ln, C25TLK0019655_Ln
            if is_valid_invoice_code(&code_text) {
                invoices.push(InvoiceCode {
                    id: uuid::Uuid::new_v4().to_string(),
                    code: code_text,
                    row_number: row_idx + 1, // 1-indexed for display
                });
            }
        }
    }

    // Also scan all cells for URLs if not found yet
    if detected_url.is_none() {
        for row in range.rows() {
            for cell in row.iter() {
                if let Data::String(text) = cell {
                    if text.contains("vnpt-invoice.com.vn") {
                        if let Some(url) = extract_vnpt_url(text) {
                            detected_url = Some(url);
                            break;
                        }
                    }
                }
            }
            if detected_url.is_some() {
                break;
            }
        }
    }

    Ok(ExcelParseResult {
        invoices,
        detected_url,
        total_rows,
        sheet_name,
    })
}

/// Check if a string is a valid invoice code
/// Valid codes contain 'C' and '_' (e.g., C25TLK0019654_Ln)
fn is_valid_invoice_code(code: &str) -> bool {
    !code.is_empty()
        && code.contains('C')
        && code.contains('_')
        && code.len() > 5
}

/// Extract VNPT URL from text
/// Looks for patterns like https://xxxx.vnpt-invoice.com.vn/...
fn extract_vnpt_url(text: &str) -> Option<String> {
    // Simple pattern matching for VNPT URLs
    let patterns = [
        "https://",
        "http://",
    ];

    for pattern in patterns {
        if let Some(start_idx) = text.find(pattern) {
            let url_part = &text[start_idx..];

            // Find end of URL (space, newline, or end of string)
            let end_idx = url_part
                .find(|c: char| c.is_whitespace() || c == '"' || c == '\'')
                .unwrap_or(url_part.len());

            let url = &url_part[..end_idx];

            if url.contains("vnpt-invoice.com.vn") {
                return Some(url.to_string());
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_valid_invoice_code() {
        assert!(is_valid_invoice_code("C25TLK0019654_Ln"));
        assert!(is_valid_invoice_code("C25TLK0019655_Ln"));
        assert!(!is_valid_invoice_code(""));
        assert!(!is_valid_invoice_code("ABC123"));
        assert!(!is_valid_invoice_code("C123")); // too short
    }

    #[test]
    fn test_extract_vnpt_url() {
        let text = "Please visit https://3701642642-010-tt78.vnpt-invoice.com.vn/HomeNoLogin for more info";
        let url = extract_vnpt_url(text);
        assert!(url.is_some());
        assert!(url.unwrap().contains("vnpt-invoice.com.vn"));
    }
}
