use crate::error::Result;
use crate::model::Edition;
use crate::{api, blocking, config};

/// Editions of "O Fio": the published journal, newest first, each with its GitHub Pages link.
#[tauri::command]
pub async fn editions_list(app: tauri::AppHandle) -> Result<Vec<Edition>> {
    let base = config::base_url(&app);
    blocking::run(move || api::get_list(&base, "/api/editions", api::pairs(&[]))).await
}
