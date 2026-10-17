use crate::error::Result;
use crate::model::{ArticleDetail, ArticleSearch, Category, NewsPage, TopArticle};
use crate::{api, blocking, config};

#[tauri::command]
pub async fn news_list(app: tauri::AppHandle, page: u32, limit: u32, category: Option<String>) -> Result<NewsPage> {
    let base = config::base_url(&app);
    let page = page.max(1);
    let limit = limit.clamp(1, 50);
    blocking::run(move || {
        let query = api::pairs(&[
            ("page", Some(page.to_string())),
            ("limit", Some(limit.to_string())),
            ("category", category),
        ]);
        api::get(&base, "/api/news", query)
    })
    .await
}

#[tauri::command]
pub async fn news_top(app: tauri::AppHandle) -> Result<Vec<TopArticle>> {
    let base = config::base_url(&app);
    blocking::run(move || api::get_list(&base, "/api/news/top", api::pairs(&[]))).await
}

#[tauri::command]
pub async fn news_categories(app: tauri::AppHandle) -> Result<Vec<Category>> {
    let base = config::base_url(&app);
    blocking::run(move || api::get_list(&base, "/api/news/categories", api::pairs(&[]))).await
}

#[tauri::command]
pub async fn news_search(app: tauri::AppHandle, q: String) -> Result<ArticleSearch> {
    let base = config::base_url(&app);
    blocking::run(move || {
        let query = api::pairs(&[("q", Some(q))]);
        api::get(&base, "/api/news/search", query)
    })
    .await
}

#[tauri::command]
pub async fn news_detail(app: tauri::AppHandle, id: String) -> Result<ArticleDetail> {
    let base = config::base_url(&app);
    blocking::run(move || api::get(&base, &format!("/api/news/{id}"), api::pairs(&[]))).await
}

#[tauri::command]
pub async fn news_related(app: tauri::AppHandle, id: String) -> Result<ArticleSearch> {
    let base = config::base_url(&app);
    blocking::run(move || api::get(&base, &format!("/api/news/{id}/related"), api::pairs(&[]))).await
}
