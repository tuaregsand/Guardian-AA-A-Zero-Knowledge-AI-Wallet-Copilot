//! API request handlers

pub mod agent;
pub mod auth;
pub mod health;
pub mod transaction;
pub mod wallet;
pub mod zkml;

use axum::{http::StatusCode, response::IntoResponse, Json};
use serde_json::json;

/// Fallback handler for unmatched routes
pub async fn fallback() -> impl IntoResponse {
    (
        StatusCode::NOT_FOUND,
        Json(json!({
            "error": "Not Found",
            "message": "The requested resource was not found"
        })),
    )
} 