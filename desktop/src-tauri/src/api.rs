//! The single door to the Fast News API. Every command builds a path and query here, never in the webview.
use std::time::Duration;

use serde::de::DeserializeOwned;

use crate::error::{AppError, Result};

const TIMEOUT_S: u64 = 25;

pub type Query = Vec<(String, String)>;

/// GETs `base + path` and deserializes the JSON body; a non-2xx answer carries the API's own message when it has one.
pub fn get<T: DeserializeOwned>(base: &str, path: &str, query: Query) -> Result<T> {
    let client = crate::net::client_builder()
        .user_agent("fast-news-desktop")
        .timeout(Duration::from_secs(TIMEOUT_S))
        .build()
        .map_err(|e| AppError::Http(e.to_string()))?;

    let mut request = client.get(format!("{base}{path}"));
    if !query.is_empty() {
        request = request.query(&query);
    }
    let response = request.send().map_err(|e| AppError::Http(e.to_string()))?;
    let status = response.status();
    let body = response.text().map_err(|e| AppError::Http(e.to_string()))?;

    if !status.is_success() {
        return Err(AppError::Api(format!(
            "HTTP {} em {path}{}",
            status.as_u16(),
            server_message(&body)
        )));
    }
    serde_json::from_str(&body).map_err(|e| AppError::Format(format!("{path}: {e}")))
}

/// The API answers `{"error": "..."}` on failures; surfacing it beats a bare status code.
fn server_message(body: &str) -> String {
    serde_json::from_str::<serde_json::Value>(body)
        .ok()
        .and_then(|v| v.get("error").and_then(|e| e.as_str()).map(str::to_string))
        .map(|m| format!(" — {m}"))
        .unwrap_or_default()
}

/// List endpoints are inconsistent: `/api/topics` caches the bare array but wraps it on a miss, so both shapes are read.
pub fn get_list<T: DeserializeOwned>(base: &str, path: &str, query: Query) -> Result<Vec<T>> {
    let value: serde_json::Value = get(base, path, query)?;
    serde_json::from_value(unwrap_list(value)).map_err(|e| AppError::Format(format!("{path}: {e}")))
}

/// Accepts `[...]` and `{"data": [...]}`; anything else is handed on so the parser reports the real shape.
fn unwrap_list(value: serde_json::Value) -> serde_json::Value {
    match value.get("data") {
        Some(inner @ serde_json::Value::Array(_)) => inner.clone(),
        _ => value,
    }
}

/// Query pairs drop `None` and blank values, so an absent filter never turns into `category=null`.
pub fn pairs(items: &[(&str, Option<String>)]) -> Query {
    items
        .iter()
        .filter_map(|(key, value)| {
            value
                .as_ref()
                .filter(|s| !s.trim().is_empty())
                .map(|s| ((*key).to_string(), s.clone()))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn server_errors_are_appended_to_the_status() {
        assert_eq!(server_message(r#"{"error":"Query too short"}"#), " — Query too short");
        assert_eq!(server_message("not json"), "");
    }

    #[test]
    fn empty_and_missing_filters_drop_out_of_the_query() {
        let q = pairs(&[
            ("category", Some("Brasil".into())),
            ("limit", None),
            ("q", Some("  ".into())),
        ]);
        assert_eq!(q, vec![("category".to_string(), "Brasil".to_string())]);
    }

    #[test]
    fn a_wrapped_and_a_bare_list_both_unwrap() {
        assert_eq!(
            unwrap_list(serde_json::json!({ "data": [1, 2] })),
            serde_json::json!([1, 2])
        );
        assert_eq!(unwrap_list(serde_json::json!([1, 2])), serde_json::json!([1, 2]));
    }

    #[test]
    fn a_page_envelope_unwraps_to_its_rows() {
        let page = serde_json::json!({ "data": [3], "page": 1, "hasMore": true });
        assert_eq!(unwrap_list(page), serde_json::json!([3]));
    }
}
