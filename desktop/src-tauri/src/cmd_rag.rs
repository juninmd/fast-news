use crate::error::Result;
use crate::model::RagSearch;
use crate::{api, blocking, config};

/// Semantic search over embedded articles; `/api/rag` answers with a correlation graph too, which the UI ignores.
#[tauri::command]
pub async fn rag_search(app: tauri::AppHandle, q: String, limit: u32) -> Result<RagSearch> {
    let base = config::base_url(&app);
    let limit = limit.clamp(1, 50);
    blocking::run(move || {
        let query = api::pairs(&[("q", Some(q)), ("limit", Some(limit.to_string()))]);
        api::get(&base, "/api/rag/search", query)
    })
    .await
}
