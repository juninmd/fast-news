use crate::error::Result;
use crate::model::{FinancialSummaryRow, Opportunity};
use crate::{api, blocking, config};

#[tauri::command]
pub async fn financial_list(app: tauri::AppHandle) -> Result<Vec<Opportunity>> {
    let base = config::base_url(&app);
    blocking::run(move || api::get_list(&base, "/api/financial", api::pairs(&[]))).await
}

#[tauri::command]
pub async fn financial_summary(app: tauri::AppHandle) -> Result<Vec<FinancialSummaryRow>> {
    let base = config::base_url(&app);
    blocking::run(move || api::get_list(&base, "/api/financial/summary", api::pairs(&[]))).await
}
