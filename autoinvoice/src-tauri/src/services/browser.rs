use headless_chrome::{Browser, LaunchOptions, Tab};
use headless_chrome::protocol::cdp::Page::CaptureScreenshotFormatOption;
use std::sync::Arc;
use std::time::Duration;

use crate::error::AppError;

/// Selectors for VNPT Invoice portal elements
pub mod selectors {
    /// Input field for invoice code
    pub const INVOICE_INPUT: &[&str] = &[
        "#strFkey",
        "input[name='strFkey']",
        "input[placeholder*='Nhập mã tra cứu']",
        "#Fkey",
        "input[name='Fkey']",
    ];

    /// Captcha image
    pub const CAPTCHA_IMAGE: &[&str] = &[
        "img.captcha_img",
        "form img[src=\"/Captcha/Show\"]",
        "img[src*='Captcha']",
        "img[src='/Captcha/Show']",
        "img[src*='captcha']",
    ];

    /// Captcha input field
    pub const CAPTCHA_INPUT: &[&str] = &[
        "#captch",
        "input[name='captch']",
        ".captcha_input.form-control",
    ];

    /// Submit button
    pub const SUBMIT_BUTTON: &str = "button[type='submit']";

    /// Download PDF link
    pub const DOWNLOAD_LINK: &[&str] = &[
        "a[title='Tải file pdf'][href*='/HomeNoLogin/downloadPDF']",
        "a[title='Tải file pdf']",
        "a[href*='/HomeNoLogin/downloadPDF']",
    ];

    /// Error message elements
    pub const ERROR_MESSAGE: &str = ".validation-summary-errors, .alert-danger, label.error";
}

pub struct VnptBrowser {
    browser: Browser,
    tab: Arc<Tab>,
}

impl VnptBrowser {
    /// Create a new browser instance
    pub fn new(headless: bool) -> Result<Self, AppError> {
        let browser = Browser::new(LaunchOptions {
            headless,
            sandbox: false,
            window_size: Some((1920, 1080)),
            ..Default::default()
        })
        .map_err(|e| AppError::BrowserError(format!("Failed to launch browser: {}", e)))?;

        let tab = browser
            .new_tab()
            .map_err(|e| AppError::BrowserError(format!("Failed to create tab: {}", e)))?;

        Ok(Self { browser, tab })
    }

    /// Navigate to the VNPT search page
    pub fn navigate_to_search(&self, url: &str) -> Result<(), AppError> {
        self.tab
            .navigate_to(url)
            .map_err(|e| AppError::BrowserError(format!("Failed to navigate: {}", e)))?;

        self.tab
            .wait_until_navigated()
            .map_err(|e| AppError::BrowserError(format!("Navigation timeout: {}", e)))?;

        // Wait a bit for page to fully load
        std::thread::sleep(Duration::from_secs(2));

        Ok(())
    }

    /// Fill in the invoice code
    pub fn fill_invoice_code(&self, code: &str) -> Result<(), AppError> {
        // Try each selector until one works
        for selector in selectors::INVOICE_INPUT {
            if let Ok(element) = self.tab.find_element(selector) {
                element
                    .click()
                    .map_err(|e| AppError::BrowserError(format!("Failed to click input: {}", e)))?;

                // Clear field via JS before typing
                self.tab
                    .evaluate(&format!("document.querySelector('{}').value = '';", selector), false)
                    .map_err(|_| AppError::BrowserError("Failed to clear invoice input".to_string()))?;

                element
                    .type_into(code)
                    .map_err(|e| AppError::BrowserError(format!("Failed to type code: {}", e)))?;

                return Ok(());
            }
        }

        Err(AppError::ElementNotFound("Invoice code input field".to_string()))
    }

    /// Get a screenshot of the captcha image
    pub fn get_captcha_screenshot(&self) -> Result<Vec<u8>, AppError> {
        // Wait for captcha to load
        std::thread::sleep(Duration::from_millis(500));

        // Try each selector
        for selector in selectors::CAPTCHA_IMAGE {
            if let Ok(element) = self.tab.find_element(selector) {
                let screenshot = element
                    .capture_screenshot(CaptureScreenshotFormatOption::Png)
                    .map_err(|e| AppError::BrowserError(format!("Failed to screenshot captcha: {}", e)))?;

                return Ok(screenshot);
            }
        }

        Err(AppError::ElementNotFound("Captcha image".to_string()))
    }

    /// Fill in the captcha text
    pub fn fill_captcha(&self, text: &str) -> Result<(), AppError> {
        for selector in selectors::CAPTCHA_INPUT {
            if let Ok(input) = self.tab.find_element(selector) {
                // Click to focus
                input
                    .click()
                    .map_err(|e| AppError::BrowserError(format!("Failed to click captcha input: {}", e)))?;

                // Clear field via JS to avoid stale text
                self.tab
                    .evaluate(&format!("document.querySelector('{}').value = '';", selector), false)
                    .map_err(|_| AppError::BrowserError("Failed to clear captcha field".to_string()))?;

                // Type the captcha text
                input
                    .type_into(text)
                    .map_err(|e| AppError::BrowserError(format!("Failed to type captcha: {}", e)))?;

                return Ok(());
            }
        }

        Err(AppError::ElementNotFound("Captcha input field".to_string()))
    }

    /// Click the submit button
    pub fn submit(&self) -> Result<(), AppError> {
        let button = self
            .tab
            .find_element(selectors::SUBMIT_BUTTON)
            .map_err(|_| AppError::ElementNotFound("Submit button".to_string()))?;

        button
            .click()
            .map_err(|e| AppError::BrowserError(format!("Failed to click submit: {}", e)))?;

        // Wait for page to load
        std::thread::sleep(Duration::from_secs(3));

        Ok(())
    }

    /// Check if there's an error message on the page
    pub fn check_for_error(&self) -> Option<String> {
        if let Ok(element) = self.tab.find_element(selectors::ERROR_MESSAGE) {
            if let Ok(text) = element.get_inner_text() {
                if !text.trim().is_empty() {
                    return Some(text);
                }
            }
        }
        None
    }

    /// Get the download link URL
    pub fn get_download_link(&self) -> Result<String, AppError> {
        for selector in selectors::DOWNLOAD_LINK {
            if let Ok(element) = self.tab.find_element(selector) {
                if let Some(href) = element
                    .get_attribute_value("href")
                    .map_err(|_| AppError::ElementNotFound("Download link href".to_string()))?
                {
                    return Ok(href);
                }
            }
        }

        Err(AppError::ElementNotFound("Download PDF link".to_string()))
    }

    /// Download PDF from the current page
    /// Returns the PDF bytes
    pub fn download_pdf(&self, base_url: &str) -> Result<Vec<u8>, AppError> {
        let href = self.get_download_link()?;

        // Construct full URL if needed
        let full_url = if href.starts_with("http") {
            href
        } else {
            // Extract base URL without path
            let base = url::Url::parse(base_url)
                .map_err(|e| AppError::BrowserError(format!("Invalid base URL: {}", e)))?;

            format!("{}://{}{}", base.scheme(), base.host_str().unwrap_or(""), href)
        };

        // Navigate to download URL
        self.tab
            .navigate_to(&full_url)
            .map_err(|e| AppError::BrowserError(format!("Failed to navigate to download: {}", e)))?;

        // Wait for download
        std::thread::sleep(Duration::from_secs(2));

        // Get page content (PDF bytes)
        // Note: This is a simplified approach. In production, you'd use browser download handling
        let response = reqwest::blocking::get(&full_url)
            .map_err(|e| AppError::DownloadFailed(format!("HTTP request failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(AppError::DownloadFailed(format!(
                "Download failed with status: {}",
                response.status()
            )));
        }

        let bytes = response
            .bytes()
            .map_err(|e| AppError::DownloadFailed(format!("Failed to read response: {}", e)))?;

        Ok(bytes.to_vec())
    }

    /// Take a full page screenshot (for debugging)
    pub fn take_screenshot(&self) -> Result<Vec<u8>, AppError> {
        self.tab
            .capture_screenshot(CaptureScreenshotFormatOption::Png, None, None, true)
            .map_err(|e| AppError::BrowserError(format!("Failed to take screenshot: {}", e)))
    }

    /// Get the current page URL
    pub fn current_url(&self) -> Result<String, AppError> {
        self.tab
            .get_url()
            .parse()
            .map_err(|e| AppError::BrowserError(format!("Failed to get URL: {:?}", e)))
    }

    /// Reload the current page
    pub fn reload(&self) -> Result<(), AppError> {
        self.tab
            .reload(true, None)
            .map_err(|e| AppError::BrowserError(format!("Failed to reload: {}", e)))?;

        self.tab
            .wait_until_navigated()
            .map_err(|e| AppError::BrowserError(format!("Navigation timeout: {}", e)))?;

        std::thread::sleep(Duration::from_secs(2));

        Ok(())
    }

    /// Close the browser (consumes self)
    pub fn close(self) -> Result<(), AppError> {
        // Browser will be closed when self is dropped
        Ok(())
    }
}
