use crate::error::Result;
use crate::model::{Topic, TopicAnalysis, TopicHistoryItem};
use crate::{api, blocking, config};

#[tauri::command]
pub async fn topics_list(app: tauri::AppHandle) -> Result<Vec<Topic>> {
    let base = config::base_url(&app);
    blocking::run(move || api::get_list(&base, "/api/topics", api::pairs(&[]))).await
}

/// The analysis is generated lazily on the server; `refresh` forces a new one instead of the cached text.
#[tauri::command]
pub async fn topic_analysis(app: tauri::AppHandle, id: String, refresh: bool) -> Result<TopicAnalysis> {
    let base = config::base_url(&app);
    blocking::run(move || {
        let query = api::pairs(&[("refresh", refresh.then(|| "true".to_string()))]);
        api::get(&base, &format!("/api/topics/{id}/analysis"), query)
    })
    .await
}

#[tauri::command]
pub async fn topic_history(app: tauri::AppHandle, id: String, limit: u32) -> Result<Vec<TopicHistoryItem>> {
    let base = config::base_url(&app);
    let limit = limit.clamp(1, 30);
    blocking::run(move || {
        let query = api::pairs(&[("limit", Some(limit.to_string()))]);
        api::get_list(&base, &format!("/api/topics/{id}/history"), query)
    })
    .await
}
