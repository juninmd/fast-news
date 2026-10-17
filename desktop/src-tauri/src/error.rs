use serde::{Serialize, Serializer};

/// Errors surfaced to the UI. Messages are pt-BR strings, as the UI shows them verbatim.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("endereço da API inválido: {0}")]
    BadBase(String),
    #[error("falha de rede: {0}")]
    Http(String),
    #[error("a API respondeu com erro: {0}")]
    Api(String),
    #[error("erro de arquivo: {0}")]
    Io(String),
    #[error("formato inválido: {0}")]
    Format(String),
    #[error("link inválido: {0}")]
    BadLink(String),
}

pub type Result<T> = std::result::Result<T, AppError>;

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(e.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::Format(e.to_string())
    }
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, s: S) -> std::result::Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn user_facing_messages_are_pt_br() {
        assert_eq!(AppError::BadBase("x".into()).to_string(), "endereço da API inválido: x");
        assert_eq!(
            AppError::Api("HTTP 500".into()).to_string(),
            "a API respondeu com erro: HTTP 500"
        );
    }
}
