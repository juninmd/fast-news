use crate::error::Result;
use crate::model::{Story, StoryGraph};
use crate::{api, blocking, config};

#[tauri::command]
pub async fn stories_list(app: tauri::AppHandle, limit: u32, category: Option<String>) -> Result<Vec<Story>> {
    let base = config::base_url(&app);
    let limit = limit.clamp(1, 50);
    blocking::run(move || {
        let query = api::pairs(&[("limit", Some(limit.to_string())), ("category", category)]);
        api::get_list(&base, "/api/stories", query)
    })
    .await
}

#[tauri::command]
pub async fn story_detail(app: tauri::AppHandle, id: String) -> Result<StoryGraph> {
    let base = config::base_url(&app);
    blocking::run(move || api::get(&base, &format!("/api/stories/{id}"), api::pairs(&[]))).await
}
