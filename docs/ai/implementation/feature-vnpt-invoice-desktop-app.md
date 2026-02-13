---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
feature: vnpt-invoice-desktop-app
---

# Implementation Guide

## Development Setup
**How do we get started?**

### Prerequisites
- Node.js 18+ (`node --version`)
- pnpm (`pnpm --version`)
- Rust toolchain (`rustc --version`)
- Tauri CLI (`cargo install tauri-cli`)

### Environment Setup

```bash
# 1. Create Tauri project
pnpm create tauri-app autoinvoice --template react-ts

# 2. Install frontend dependencies
cd autoinvoice
pnpm install
pnpm add zustand @tauri-apps/api tailwindcss postcss autoprefixer
pnpm add -D @types/node

# 3. Setup Tailwind
npx tailwindcss init -p

# 4. Install Rust dependencies (edit src-tauri/Cargo.toml)
# See Cargo.toml section below

# 5. Create .env file
echo "OPENAI_API_KEY=your-key-here" > .env
```

### Cargo.toml Dependencies

```toml
[dependencies]
tauri = { version = "2", features = ["shell-open"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
headless_chrome = "1"
calamine = "0.24"
rusqlite = { version = "0.31", features = ["bundled"] }
reqwest = { version = "0.11", features = ["json", "multipart"] }
base64 = "0.21"
thiserror = "1"
chrono = { version = "0.4", features = ["serde"] }
```

### Configuration

```typescript
// src/config.ts
export const config = {
  vnptUrl: import.meta.env.VITE_VNPT_URL ||
    'https://3701642642-010-tt78.vnpt-invoice.com.vn/HomeNoLogin/SearchByFkey',
  maxRetries: 3,
  downloadTimeout: 30000,
  captchaTimeout: 60000,
};
```

## Code Structure
**How is the code organized?**

### Directory Structure

```
autoinvoice/
├── src/                          # Frontend (React)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Layout.tsx
│   │   ├── upload/
│   │   │   ├── ExcelUploader.tsx
│   │   │   └── InvoicePreview.tsx
│   │   ├── download/
│   │   │   ├── DownloadPanel.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── LogViewer.tsx
│   │   │   └── CaptchaModal.tsx
│   │   ├── history/
│   │   │   ├── BatchList.tsx
│   │   │   └── BatchDetail.tsx
│   │   └── settings/
│   │       └── SettingsForm.tsx
│   ├── hooks/
│   │   ├── useSettings.ts
│   │   ├── useDownload.ts
│   │   ├── useHistory.ts
│   │   └── useTauriEvents.ts
│   ├── store/
│   │   ├── index.ts
│   │   ├── settingsSlice.ts
│   │   ├── downloadSlice.ts
│   │   └── historySlice.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── config.ts
├── src-tauri/                    # Backend (Rust)
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── settings.rs
│   │   │   ├── excel.rs
│   │   │   ├── download.rs
│   │   │   └── history.rs
│   │   ├── services/
│   │   │   ├── mod.rs
│   │   │   ├── browser.rs
│   │   │   ├── captcha.rs
│   │   │   ├── excel_parser.rs
│   │   │   └── downloader.rs
│   │   ├── db/
│   │   │   ├── mod.rs
│   │   │   ├── migrations.rs
│   │   │   └── models.rs
│   │   └── error.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

### Naming Conventions
- **Rust**: snake_case for files, functions, variables; PascalCase for structs/enums
- **TypeScript**: camelCase for variables/functions; PascalCase for components/types
- **Files**: kebab-case for multi-word filenames in frontend

## Implementation Notes
**Key technical details to remember:**

### Core Features

#### Feature 1: Excel Parsing

```rust
// src-tauri/src/services/excel_parser.rs
use calamine::{Reader, Xlsx, open_workbook};

pub fn parse_excel(file_path: &str) -> Result<Vec<String>, Error> {
    let mut workbook: Xlsx<_> = open_workbook(file_path)?;

    // Find the sheet with invoice codes
    if let Some(Ok(range)) = workbook.worksheet_range_at(0) {
        let mut codes = Vec::new();
        let mut header_row = None;
        let mut code_col = None;

        // Find header row with "MÃ TRA CỨU"
        for (row_idx, row) in range.rows().enumerate() {
            for (col_idx, cell) in row.iter().enumerate() {
                if let Some(text) = cell.get_string() {
                    if text.to_uppercase().contains("MÃ TRA CỨU") {
                        header_row = Some(row_idx);
                        code_col = Some(col_idx);
                        break;
                    }
                }
            }
            if header_row.is_some() { break; }
        }

        // Extract codes from found column
        if let (Some(header), Some(col)) = (header_row, code_col) {
            for row in range.rows().skip(header + 1) {
                if let Some(cell) = row.get(col) {
                    if let Some(code) = cell.get_string() {
                        let code = code.trim();
                        // Validate code format: contains C and _
                        if code.contains('C') && code.contains('_') {
                            codes.push(code.to_string());
                        }
                    }
                }
            }
        }

        Ok(codes)
    } else {
        Err(Error::NoWorksheet)
    }
}
```

#### Feature 2: Browser Automation

```rust
// src-tauri/src/services/browser.rs
use headless_chrome::{Browser, LaunchOptions};

pub struct VnptBrowser {
    browser: Browser,
    tab: Arc<Tab>,
}

impl VnptBrowser {
    pub fn new() -> Result<Self, Error> {
        let browser = Browser::new(LaunchOptions {
            headless: true,
            sandbox: false,
            ..Default::default()
        })?;

        let tab = browser.new_tab()?;
        Ok(Self { browser, tab })
    }

    pub fn navigate_to_search(&self, url: &str) -> Result<(), Error> {
        self.tab.navigate_to(url)?;
        self.tab.wait_until_navigated()?;
        Ok(())
    }

    pub fn fill_invoice_code(&self, code: &str) -> Result<(), Error> {
        // Try primary selector first
        let selectors = [
            "input[placeholder*='Nhập mã tra cứu']",
            "#Fkey",
            "input[name='Fkey']",
        ];

        for selector in selectors {
            if let Ok(element) = self.tab.find_element(selector) {
                element.click()?;
                element.type_into(code)?;
                return Ok(());
            }
        }

        Err(Error::ElementNotFound("Invoice code input"))
    }

    pub fn get_captcha_screenshot(&self) -> Result<Vec<u8>, Error> {
        let captcha = self.tab.find_element("img[src*='captcha'], img[src='/Captcha/Show']")?;
        let screenshot = captcha.capture_screenshot(ScreenshotFormat::PNG)?;
        Ok(screenshot)
    }

    pub fn fill_captcha(&self, text: &str) -> Result<(), Error> {
        let input = self.tab.find_element(".captcha_input.form-control")?;
        input.click()?;
        input.type_into(text)?;
        Ok(())
    }

    pub fn submit_and_download(&self, download_dir: &str) -> Result<String, Error> {
        // Click submit
        self.tab.find_element("button[type='submit']")?.click()?;

        // Wait for result page
        std::thread::sleep(Duration::from_secs(3));

        // Find download link
        let download_link = self.tab.find_element(
            "a[title='Tải file pdf'][href*='/HomeNoLogin/downloadPDF']"
        )?;

        // Get href and download
        let href = download_link.get_attribute_value("href")?
            .ok_or(Error::NoDownloadLink)?;

        // Trigger download...
        // Return filename
        Ok(filename)
    }
}
```

#### Feature 3: Captcha Solver (OpenAI)

```rust
// src-tauri/src/services/captcha.rs
use reqwest::Client;
use base64::{Engine, engine::general_purpose::STANDARD};

pub struct CaptchaSolver {
    client: Client,
    api_key: String,
}

impl CaptchaSolver {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
        }
    }

    pub async fn solve(&self, image_bytes: &[u8]) -> Result<String, Error> {
        let base64_image = STANDARD.encode(image_bytes);

        let response = self.client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&serde_json::json!({
                "model": "gpt-4o-mini",
                "messages": [{
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Please extract the text from this captcha image. Return ONLY the captcha text, nothing else. No explanations, no quotes, just the raw text. The captcha usually contains 4 alphanumeric characters."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": format!("data:image/png;base64,{}", base64_image)
                            }
                        }
                    ]
                }],
                "max_tokens": 100
            }))
            .send()
            .await?;

        let result: serde_json::Value = response.json().await?;
        let captcha_text = result["choices"][0]["message"]["content"]
            .as_str()
            .ok_or(Error::InvalidResponse)?
            .trim()
            .to_string();

        Ok(captcha_text)
    }
}
```

### Patterns & Best Practices

#### Error Handling Pattern

```rust
// src-tauri/src/error.rs
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Excel parsing error: {0}")]
    ExcelError(#[from] calamine::Error),

    #[error("Browser error: {0}")]
    BrowserError(String),

    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),

    #[error("Database error: {0}")]
    DatabaseError(#[from] rusqlite::Error),

    #[error("Element not found: {0}")]
    ElementNotFound(String),

    #[error("Captcha solving failed after {0} attempts")]
    CaptchaFailed(u32),

    #[error("Download failed: {0}")]
    DownloadFailed(String),
}

// Convert to Tauri-friendly error
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer {
        serializer.serialize_str(&self.to_string())
    }
}
```

#### Event Emission Pattern

```rust
// Emit events to frontend
use tauri::Manager;

fn emit_progress(app: &tauri::AppHandle, batch_id: i64, current: u32, total: u32) {
    app.emit_all("download:progress", ProgressEvent {
        batch_id,
        current,
        total,
        percentage: (current as f32 / total as f32 * 100.0) as u32,
    }).ok();
}

fn emit_log(app: &tauri::AppHandle, batch_id: i64, level: &str, message: &str) {
    app.emit_all("download:log", LogEvent {
        batch_id,
        timestamp: chrono::Utc::now().to_rfc3339(),
        level: level.to_string(),
        message: message.to_string(),
    }).ok();
}
```

## Integration Points
**How do pieces connect?**

### Tauri Command Registration

```rust
// src-tauri/src/main.rs
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::excel::parse_excel,
            commands::download::start_download,
            commands::download::pause_download,
            commands::download::cancel_download,
            commands::download::submit_manual_captcha,
            commands::history::get_batches,
            commands::history::get_batch_invoices,
        ])
        .setup(|app| {
            // Initialize database
            db::init_database(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Frontend Event Listeners

```typescript
// src/hooks/useTauriEvents.ts
import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { useDownloadStore } from '../store';

export function useTauriEvents() {
  const { updateProgress, addLog, updateInvoiceStatus, showCaptchaModal } = useDownloadStore();

  useEffect(() => {
    const unlisteners: (() => void)[] = [];

    listen<ProgressEvent>('download:progress', (event) => {
      updateProgress(event.payload);
    }).then(unlisten => unlisteners.push(unlisten));

    listen<LogEvent>('download:log', (event) => {
      addLog(event.payload);
    }).then(unlisten => unlisteners.push(unlisten));

    listen<CaptchaEvent>('captcha:required', (event) => {
      showCaptchaModal(event.payload);
    }).then(unlisten => unlisteners.push(unlisten));

    return () => {
      unlisteners.forEach(fn => fn());
    };
  }, []);
}
```

## Error Handling
**How do we handle failures?**

### Retry Strategy

```rust
async fn download_with_retry(
    browser: &VnptBrowser,
    captcha_solver: &CaptchaSolver,
    invoice_code: &str,
    app: &tauri::AppHandle,
) -> Result<String, AppError> {
    const MAX_RETRIES: u32 = 3;

    for attempt in 1..=MAX_RETRIES {
        emit_log(app, batch_id, "info", &format!("Attempt {}/{} for {}", attempt, MAX_RETRIES, invoice_code));

        // Get captcha
        let captcha_image = browser.get_captcha_screenshot()?;

        // Solve with AI
        match captcha_solver.solve(&captcha_image).await {
            Ok(captcha_text) => {
                browser.fill_captcha(&captcha_text)?;

                // Try to download
                match browser.submit_and_download(download_dir) {
                    Ok(filename) => return Ok(filename),
                    Err(e) => {
                        emit_log(app, batch_id, "warn", &format!("Download failed: {}", e));
                        // Refresh page for retry
                        browser.navigate_to_search(url)?;
                        browser.fill_invoice_code(invoice_code)?;
                    }
                }
            }
            Err(e) => {
                emit_log(app, batch_id, "warn", &format!("Captcha solve failed: {}", e));
            }
        }
    }

    // All retries failed - request manual input
    emit_manual_captcha_required(app, invoice_id, invoice_code, &captcha_image);
    Err(AppError::CaptchaFailed(MAX_RETRIES))
}
```

## Performance Considerations
**How do we keep it fast?**

### Browser Instance Reuse
- Keep single browser instance for entire batch
- Only create new tab if needed
- Close browser after batch completes

### Parallel Processing (Future Enhancement)
- Current: Sequential downloads (safer)
- Future: Consider 2-3 parallel downloads with rate limiting

### Memory Management
- Clear log buffer if exceeds 1000 lines
- Don't store captcha images in memory after solving

## Security Notes
**What security measures are in place?**

### API Key Storage
```rust
// Use Tauri's secure storage when available
// Fallback to SQLite with basic encryption

use tauri::api::path::app_data_dir;

fn get_db_path(app: &tauri::AppHandle) -> PathBuf {
    app_data_dir(&app.config())
        .expect("Failed to get app data dir")
        .join("autoinvoice.db")
}
```

### Input Validation
- Validate Excel file extension before parsing
- Validate invoice code format (C..._... pattern)
- Sanitize file paths to prevent directory traversal

### Network Security
- All requests use HTTPS
- API key sent via Authorization header (not URL)
- No sensitive data logged
