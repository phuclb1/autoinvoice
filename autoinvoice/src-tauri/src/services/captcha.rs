use base64::{engine::general_purpose::STANDARD, Engine};
use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::error::AppError;

#[derive(Debug, Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<Message>,
    max_tokens: u32,
}

#[derive(Debug, Serialize)]
struct Message {
    role: String,
    content: Vec<Content>,
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
enum Content {
    Text { r#type: String, text: String },
    Image { r#type: String, image_url: ImageUrl },
}

#[derive(Debug, Serialize)]
struct ImageUrl {
    url: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: ResponseMessage,
}

#[derive(Debug, Deserialize)]
struct ResponseMessage {
    content: String,
}

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

    /// Solve a captcha image using OpenAI Vision API (GPT-4o-mini)
    ///
    /// # Arguments
    /// * `image_bytes` - The captcha image as PNG bytes
    ///
    /// # Returns
    /// The extracted captcha text
    pub async fn solve(&self, image_bytes: &[u8]) -> Result<String, AppError> {
        if self.api_key.is_empty() {
            return Err(AppError::ConfigError("OpenAI API key is not set".to_string()));
        }

        let base64_image = STANDARD.encode(image_bytes);

        let prompt = "Please extract the text from this captcha image. \
Return ONLY the captcha text, nothing else. No explanations, no quotes, just the raw text. \
The captcha usually contains 4 alphanumeric characters.";

        let request = OpenAIRequest {
            model: "gpt-4o-mini".to_string(),
            messages: vec![Message {
                role: "user".to_string(),
                content: vec![
                    Content::Text {
                        r#type: "text".to_string(),
                        text: prompt.to_string(),
                    },
                    Content::Image {
                        r#type: "image_url".to_string(),
                        image_url: ImageUrl {
                            url: format!("data:image/png;base64,{}", base64_image),
                        },
                    },
                ],
            }],
            max_tokens: 100,
        };

        let response = self
            .client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| AppError::NetworkError(format!("Failed to call OpenAI API: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::NetworkError(format!(
                "OpenAI API error ({}): {}",
                status, error_text
            )));
        }

        let result: OpenAIResponse = response
            .json()
            .await
            .map_err(|e| AppError::NetworkError(format!("Failed to parse OpenAI response: {}", e)))?;

        let captcha_text = result
            .choices
            .first()
            .map(|c| c.message.content.trim().to_string())
            .ok_or_else(|| AppError::CaptchaFailed(1))?;

        // Clean up the response (remove quotes, whitespace, etc.)
        let cleaned = captcha_text
            .trim_matches(|c: char| c == '"' || c == '\'' || c.is_whitespace())
            .to_string();

        if cleaned.is_empty() {
            return Err(AppError::CaptchaFailed(1));
        }

        Ok(cleaned)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_captcha_solver_creation() {
        let solver = CaptchaSolver::new("test-api-key".to_string());
        assert!(!solver.api_key.is_empty());
    }
}
