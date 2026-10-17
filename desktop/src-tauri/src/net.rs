//! HTTP clients share tauri's TLS setup: rustls with no built-in provider, ring installed here.

/// Idempotent: the first call installs ring for the process, later ones are no-ops.
pub fn client_builder() -> reqwest::blocking::ClientBuilder {
    let _ = rustls::crypto::ring::default_provider().install_default();
    reqwest::blocking::Client::builder()
}

#[cfg(test)]
mod tests {
    #[test]
    fn a_client_builds_without_another_stack_having_run_first() {
        assert!(super::client_builder().build().is_ok());
        assert!(super::client_builder().build().is_ok());
    }
}
