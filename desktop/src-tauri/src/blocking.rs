//! Synchronous network (`reqwest::blocking`) off Tauri's async runtime threads.
use crate::error::{AppError, Result};

/// `reqwest::blocking` panics when dropped on a tokio thread, and an `async` command runs on exactly that thread.
pub async fn run<T: Send + 'static>(f: impl FnOnce() -> Result<T> + Send + 'static) -> Result<T> {
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| AppError::Io(format!("tarefa interrompida: {e}")))?
}

#[cfg(test)]
mod tests {
    #[test]
    fn blocking_http_client_does_not_crash_the_async_command() {
        let task = tauri::async_runtime::spawn(async {
            super::run(|| {
                drop(crate::net::client_builder().build().unwrap());
                Ok(7)
            })
            .await
        });
        let result = tauri::async_runtime::block_on(task).expect("a thread do runtime entrou em pânico");
        assert_eq!(result.unwrap(), 7);
    }
}
