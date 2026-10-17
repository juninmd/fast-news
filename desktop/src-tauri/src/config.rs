//! Persisted settings. The API base URL lives here so the webview never holds it in a URL bar.
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

use crate::error::{AppError, Result};

pub const DEFAULT_BASE_URL: &str = "https://fast-news.antonio-code.duckdns.org";
const FILE: &str = "config.json";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Config {
    #[serde(default = "default_base")]
    pub api_base_url: String,
}

fn default_base() -> String {
    DEFAULT_BASE_URL.to_string()
}

impl Default for Config {
    fn default() -> Self {
        Self {
            api_base_url: default_base(),
        }
    }
}

/// Reads and writes `config.json`; the lock is only held long enough to clone or swap the whole struct.
pub struct ConfigState {
    path: PathBuf,
    cfg: Mutex<Config>,
}

impl ConfigState {
    pub fn load(dir: &Path) -> Self {
        let path = dir.join(FILE);
        let cfg = std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str::<Config>(&s).ok())
            .unwrap_or_default();
        Self {
            path,
            cfg: Mutex::new(cfg),
        }
    }

    pub fn get(&self) -> Config {
        self.cfg.lock().map(|c| c.clone()).unwrap_or_default()
    }

    /// The base URL to call: the stored one when valid, the published default otherwise.
    pub fn base_url(&self) -> String {
        normalize_base(&self.get().api_base_url).unwrap_or_else(|_| DEFAULT_BASE_URL.to_string())
    }

    pub fn set_base_url(&self, raw: &str) -> Result<Config> {
        let normalized = normalize_base(raw)?;
        let next = Config {
            api_base_url: normalized,
        };
        std::fs::write(&self.path, serde_json::to_string_pretty(&next)?)?;
        if let Ok(mut guard) = self.cfg.lock() {
            *guard = next.clone();
        }
        Ok(next)
    }

    pub fn reset_base_url(&self) -> Result<Config> {
        self.set_base_url(DEFAULT_BASE_URL)
    }
}

/// Accepts only an absolute http(s) origin without a trailing slash; anything else is a config mistake.
pub fn normalize_base(raw: &str) -> Result<String> {
    let trimmed = raw.trim().trim_end_matches('/');
    let ok = (trimmed.starts_with("http://") || trimmed.starts_with("https://"))
        && !trimmed.contains(char::is_whitespace)
        && trimmed.len() > "https://".len() + 1;
    if !ok {
        return Err(AppError::BadBase(format!(
            "«{raw}» deve começar com http:// ou https:// e não ter caminho"
        )));
    }
    Ok(trimmed.to_string())
}

/// Convenience for commands: the managed state handle.
pub fn state(app: &tauri::AppHandle) -> tauri::State<'_, ConfigState> {
    use tauri::Manager;
    app.state::<ConfigState>()
}

/// Convenience for commands: the validated base URL from the managed state.
pub fn base_url(app: &tauri::AppHandle) -> String {
    state(app).base_url()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_bare_https_origin_is_kept_without_the_trailing_slash() {
        assert_eq!(
            normalize_base("https://fast-news.example.com/").unwrap(),
            "https://fast-news.example.com"
        );
        assert_eq!(
            normalize_base("  http://localhost:3001  ").unwrap(),
            "http://localhost:3001"
        );
    }

    #[test]
    fn schemes_other_than_http_are_rejected() {
        assert!(normalize_base("ftp://x.com").is_err());
        assert!(normalize_base("fast-news.example.com").is_err());
        assert!(normalize_base("https://").is_err());
        assert!(normalize_base("https://a b.com").is_err());
    }

    #[test]
    fn a_missing_file_falls_back_to_the_published_default() {
        let dir = std::env::temp_dir().join("fast-news-config-test");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let state = ConfigState::load(&dir);
        assert_eq!(state.base_url(), DEFAULT_BASE_URL);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn a_saved_base_survives_a_reload() {
        let dir = std::env::temp_dir().join("fast-news-config-reload-test");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        ConfigState::load(&dir).set_base_url("http://127.0.0.1:3001/").unwrap();
        assert_eq!(ConfigState::load(&dir).base_url(), "http://127.0.0.1:3001");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn an_invalid_saved_base_is_ignored_at_read_time() {
        assert_eq!(
            normalize_base("nope").unwrap_or_else(|_| DEFAULT_BASE_URL.to_string()),
            DEFAULT_BASE_URL
        );
    }
}
