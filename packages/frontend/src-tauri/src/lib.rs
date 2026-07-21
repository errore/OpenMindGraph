use futures::StreamExt;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{Emitter, Manager};
use tokio::sync::Mutex;

struct AppState {
    config: Arc<Mutex<LlmConfigData>>,
    config_path: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LlmConfigData {
    llm_endpoint: String,
    api_key: String,
}

impl Default for LlmConfigData {
    fn default() -> Self {
        Self {
            llm_endpoint: String::new(),
            api_key: String::new(),
        }
    }
}

fn load_config(path: &PathBuf) -> LlmConfigData {
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_config(path: &PathBuf, config: &LlmConfigData) {
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(config) {
        let _ = std::fs::write(path, json);
    }
}

#[derive(Debug, Serialize, Clone)]
struct ChatChunk {
    text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    thought: Option<String>,
}

#[derive(Debug, Serialize)]
struct LlmConfigResponse {
    llm_endpoint: String,
    api_key_configured: bool,
}

#[derive(Debug, Deserialize)]
struct PutLlmConfigPayload {
    llm_endpoint: String,
    api_key: String,
}

#[derive(Debug, Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChatRequestPayload {
    messages: Vec<ChatMessage>,
    model: Option<String>,
    temperature: Option<f64>,
    max_tokens: Option<i32>,
    system_prompt: Option<String>,
}

#[tauri::command]
async fn get_llm_config(state: tauri::State<'_, AppState>) -> Result<LlmConfigResponse, String> {
    let config = state.config.lock().await;
    Ok(LlmConfigResponse {
        llm_endpoint: config.llm_endpoint.clone(),
        api_key_configured: !config.api_key.is_empty() || std::env::var("LITELLM_API_KEY").is_ok(),
    })
}

#[tauri::command]
async fn put_llm_config(
    state: tauri::State<'_, AppState>,
    payload: PutLlmConfigPayload,
) -> Result<(), String> {
    let mut config = state.config.lock().await;
    config.llm_endpoint = payload.llm_endpoint;
    config.api_key = payload.api_key;
    save_config(&state.config_path, &config);
    Ok(())
}

#[tauri::command]
async fn list_models(
    state: tauri::State<'_, AppState>,
    endpoint: Option<String>,
) -> Result<serde_json::Value, String> {
    let config = state.config.lock().await;
    let effective_endpoint = endpoint
        .filter(|e| !e.is_empty())
        .or_else(|| {
            if config.llm_endpoint.is_empty() {
                None
            } else {
                Some(config.llm_endpoint.clone())
            }
        })
        .map(|e| e.trim_end_matches('/').to_string());

    let effective_endpoint = match effective_endpoint {
        Some(e) => e,
        None => {
            return Ok(serde_json::json!({
                "models": [],
                "error": "No endpoint configured. Set an endpoint URL in Settings first.",
                "usable": false,
            }));
        }
    };

    let api_key = if config.api_key.is_empty() {
        std::env::var("LITELLM_API_KEY").unwrap_or_default()
    } else {
        config.api_key.clone()
    };

    let client = reqwest::Client::new();
    let urls = vec![
        format!("{}/models", effective_endpoint),
        format!("{}/v1/models", effective_endpoint),
        format!("{}/api/tags", effective_endpoint),
    ];

    for url in &urls {
        let mut req = client.get(url).header("Content-Type", "application/json");
        if !api_key.is_empty() {
            req = req.header("Authorization", format!("Bearer {}", api_key));
        }
        match req.send().await {
            Ok(resp) => {
                if let Ok(data) = resp.json::<serde_json::Value>().await {
                    let models = parse_model_list(&data, url);
                    if !models.is_empty() {
                        return Ok(serde_json::json!({
                            "models": models,
                            "usable": true,
                        }));
                    }
                }
            }
            Err(_) => continue,
        }
    }

    Ok(serde_json::json!({
        "models": [],
        "error": format!("Could not reach {}/models. Check the URL and API key.", effective_endpoint),
        "usable": false,
    }))
}

fn parse_model_list(data: &serde_json::Value, url: &str) -> Vec<String> {
    let mut models: Vec<String> = Vec::new();
    if url.contains("/api/tags") {
        if let Some(arr) = data.get("models").and_then(|v| v.as_array()) {
            for m in arr {
                if let Some(name) = m.get("name").and_then(|v| v.as_str()) {
                    models.push(name.to_string());
                }
            }
        }
    } else {
        if let Some(arr) = data.get("data").and_then(|v| v.as_array()) {
            for m in arr {
                if let Some(id) = m.get("id").and_then(|v| v.as_str()) {
                    models.push(id.to_string());
                }
            }
        }
    }
    models.sort();
    models
}

#[tauri::command]
async fn chat_stream(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    request: ChatRequestPayload,
) -> Result<(), String> {
    let config = state.config.lock().await;

    let api_key = if config.api_key.is_empty() {
        std::env::var("LITELLM_API_KEY").unwrap_or_default()
    } else {
        config.api_key.clone()
    };

    if api_key.is_empty() {
        let mock = mock_response(&request);
        for ch in mock.chars() {
            let _ = app.emit("chat-chunk", ChatChunk { text: ch.to_string(), thought: None });
            tokio::time::sleep(std::time::Duration::from_millis(12)).await;
        }
        let _ = app.emit("chat-chunk", ChatChunk { text: "[DONE]".to_string(), thought: None });
        return Ok(());
    }

    let endpoint = if config.llm_endpoint.is_empty() {
        std::env::var("LITELLM_ENDPOINT").unwrap_or_else(|_| "https://api.openai.com/v1".to_string())
    } else {
        config.llm_endpoint.trim_end_matches('/').to_string()
    };

    let model = request.model.as_deref().unwrap_or("gpt-4o-mini").to_string();

    let mut messages: Vec<serde_json::Value> = Vec::new();
    if let Some(sp) = &request.system_prompt {
        if !sp.is_empty() {
            messages.push(serde_json::json!({"role": "system", "content": sp}));
        }
    }
    for m in &request.messages {
        messages.push(serde_json::json!({"role": m.role, "content": m.content}));
    }

    let body = serde_json::json!({
        "model": model,
        "messages": messages,
        "temperature": request.temperature.unwrap_or(0.7),
        "max_tokens": request.max_tokens.unwrap_or(2048),
        "stream": true,
    });

    let client = reqwest::Client::new();
    let url = format!("{}/chat/completions", endpoint);

    let req = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&body);

    match req.send().await {
        Ok(resp) => {
            if !resp.status().is_success() {
                let status = resp.status();
                let err_body = resp.text().await.unwrap_or_default();
                let _ = app.emit("chat-chunk", ChatChunk { text: format!("LLM API error {}: {}", status, err_body), thought: None });
                let _ = app.emit("chat-chunk", ChatChunk { text: "[DONE]".to_string(), thought: None });
                return Ok(());
            }

            let mut stream = resp.bytes_stream();
            let mut buffer = String::new();

            while let Some(result) = stream.next().await {
                match result {
                    Ok(chunk_bytes) => {
                        buffer.push_str(&String::from_utf8_lossy(&chunk_bytes));
                        while let Some(pos) = buffer.find('\n') {
                            let line = buffer[..pos].trim().to_string();
                            buffer = buffer[pos + 1..].to_string();

                            if line.is_empty() {
                                continue;
                            }
                            if line.starts_with("data: ") {
                                let data = &line[6..];
                                if data == "[DONE]" {
                                    let _ = app.emit("chat-chunk", ChatChunk { text: "[DONE]".to_string(), thought: None });
                                    return Ok(());
                                }
                                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                                    let delta = &parsed["choices"][0]["delta"];
                                    let thought = delta["reasoning_content"].as_str()
                                        .or_else(|| delta["thinking"].as_str());
                                    if let Some(t) = thought {
                                        let _ = app.emit("chat-chunk", ChatChunk { text: String::new(), thought: Some(t.to_string()) });
                                    }
                                    if let Some(text) = delta["content"].as_str() {
                                        let _ = app.emit("chat-chunk", ChatChunk { text: text.to_string(), thought: None });
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        let _ = app.emit("chat-chunk", ChatChunk { text: format!("Stream error: {}", e), thought: None });
                        break;
                    }
                }
            }

            let _ = app.emit("chat-chunk", ChatChunk { text: "[DONE]".to_string(), thought: None });
            Ok(())
        }
        Err(e) => {
            let _ = app.emit("chat-chunk", ChatChunk { text: format!("Connection error: {}", e), thought: None });
            let _ = app.emit("chat-chunk", ChatChunk { text: "[DONE]".to_string(), thought: None });
            Ok(())
        }
    }
}

fn mock_response(req: &ChatRequestPayload) -> String {
    let model = req.model.as_deref().unwrap_or("gpt-4o-mini");
    let temp = req.temperature.unwrap_or(0.7);
    let max_tokens = req.max_tokens.unwrap_or(2048);
    let msg_count = req.messages.len();
    let last_user = req
        .messages
        .iter()
        .filter(|m| m.role == "user")
        .last()
        .map(|m| m.content.as_str())
        .unwrap_or("(empty)");

    format!(
        "[MOCK MODE — set API key in Settings or LITELLM_API_KEY env var for real LLM]\n\n\
         Model:     {}\n\
         Temp:      {}\n\
         MaxTokens: {}\n\n\
         Messages:  {} total\n\n\
         You said: \"{}\"\n\n\
         ---\n\
         This is a mock response. Configure an API key in\n\
         Settings or set LITELLM_API_KEY to connect to a real LLM provider.\n",
        model, temp, max_tokens, msg_count, &last_user[..last_user.len().min(200)],
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let config_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            let config_path = config_dir.join("llm_config.json");
            let config = load_config(&config_path);

            app.manage(AppState {
                config: Arc::new(Mutex::new(config)),
                config_path,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_llm_config,
            put_llm_config,
            list_models,
            chat_stream,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
