//! Error types and handling for Guardian-AA Backend

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Error, Debug)]
pub enum Error {
    // Configuration errors
    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Configuration error")]
    ConfigError(#[from] config::ConfigError),

    // Database errors
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Database migration error: {0}")]
    Migration(#[from] sqlx::migrate::MigrateError),

    // Serialization errors
    #[error("JSON serialization error: {0}")]
    JsonSerialization(#[from] serde_json::Error),

    // Authentication errors
    #[error("Authentication failed")]
    AuthenticationFailed,

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Invalid token")]
    InvalidToken,

    // Blockchain errors
    #[error("Blockchain error: {0}")]
    Blockchain(String),

    #[error("Transaction failed: {0}")]
    TransactionFailed(String),

    // ZK proof errors
    #[error("Proof generation failed: {0}")]
    ProofGenerationFailed(String),

    #[error("Proof verification failed")]
    ProofVerificationFailed,

    // Validation errors
    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    // External service errors
    #[error("External service error: {0}")]
    ExternalService(String),

    // Generic errors
    #[error("Internal server error")]
    Internal,

    #[error("Not found")]
    NotFound,

    #[error("Forbidden")]
    Forbidden,

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Service unavailable")]
    ServiceUnavailable,

    #[error("Rate limit exceeded")]
    RateLimitExceeded,

    // Other errors
    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            Error::Config(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Configuration error"),
            Error::ConfigError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Configuration error"),
            Error::Database(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
            Error::Migration(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Database migration error"),
            Error::JsonSerialization(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Serialization error"),
            Error::AuthenticationFailed => (StatusCode::UNAUTHORIZED, "Authentication failed"),
            Error::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized"),
            Error::InvalidToken => (StatusCode::UNAUTHORIZED, "Invalid token"),
            Error::Blockchain(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Blockchain error"),
            Error::TransactionFailed(_) => (StatusCode::BAD_REQUEST, "Transaction failed"),
            Error::ProofGenerationFailed(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Proof generation failed"),
            Error::ProofVerificationFailed => (StatusCode::BAD_REQUEST, "Proof verification failed"),
            Error::Validation(ref msg) => return validation_error_response(msg),
            Error::InvalidRequest(ref msg) => return bad_request_response(msg),
            Error::ExternalService(_) => (StatusCode::BAD_GATEWAY, "External service error"),
            Error::Internal => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error"),
            Error::NotFound => (StatusCode::NOT_FOUND, "Resource not found"),
            Error::Forbidden => (StatusCode::FORBIDDEN, "Forbidden"),
            Error::BadRequest(ref msg) => return bad_request_response(msg),
            Error::ServiceUnavailable => (StatusCode::SERVICE_UNAVAILABLE, "Service unavailable"),
            Error::RateLimitExceeded => (StatusCode::TOO_MANY_REQUESTS, "Rate limit exceeded"),
            Error::Other(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error"),
        };

        let body = Json(json!({
            "error": error_message,
            "message": self.to_string(),
        }));

        (status, body).into_response()
    }
}

fn validation_error_response(message: &str) -> Response {
    let body = Json(json!({
        "error": "Validation failed",
        "message": message,
        "type": "validation_error"
    }));

    (StatusCode::UNPROCESSABLE_ENTITY, body).into_response()
}

fn bad_request_response(message: &str) -> Response {
    let body = Json(json!({
        "error": "Bad request",
        "message": message,
        "type": "bad_request"
    }));

    (StatusCode::BAD_REQUEST, body).into_response()
} 