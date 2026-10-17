use crate::config::{self, Config};
use crate::error::{AppError, Result};
use crate::model::Health;
use crate::{api, blocking};

#[tauri::command]
pub fn settings_get(app: tauri::AppHandle) -> Config {
    config::state(&app).get()
}

#[tauri::command]
pub fn settings_set_base_url(app: tauri::AppHandle, api_base_url: String) -> Result<Config> {
    config::state(&app).set_base_url(&api_base_url)
}

#[tauri::command]
pub fn settings_reset_base_url(app: tauri::AppHandle) -> Result<Config> {
    config::state(&app).reset_base_url()
}

/// Health probe against the configured base (or an explicit one, so the Settings screen can test before saving).
#[tauri::command]
pub async fn api_health(app: tauri::AppHandle, api_base_url: Option<String>) -> Result<Health> {
    let base = match api_base_url {
        Some(raw) => config::normalize_base(&raw)?,
        None => config::base_url(&app),
    };
    blocking::run(move || api::get(&base, "/health", api::pairs(&[]))).await
}

/// Opens an article in the system browser; only http(s) leaves the app.
#[tauri::command]
pub fn open_link(app: tauri::AppHandle, url: String) -> Result<()> {
    use tauri_plugin_opener::OpenerExt;
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err(AppError::BadLink(url));
    }
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| AppError::Http(e.to_string()))
}
