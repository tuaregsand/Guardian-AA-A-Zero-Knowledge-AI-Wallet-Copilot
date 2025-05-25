//! Health check handlers

use crate::api::AppState;
use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde_json::json;
use std::sync::Arc;

/// Basic health check endpoint
pub async fn health_check() -> impl IntoResponse {
    Json(json!({
        "status": "healthy",
        "service": "guardian-aa-backend",
        "version": env!("CARGO_PKG_VERSION"),
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

/// Readiness check endpoint - verifies all dependencies are available
pub async fn readiness_check(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let mut checks = vec![];
    let mut all_ready = true;

    // Check database connection
    match state.db.health_check().await {
        Ok(_) => {
            checks.push(json!({
                "name": "database",
                "status": "ready"
            }));
        }
        Err(e) => {
            all_ready = false;
            checks.push(json!({
                "name": "database",
                "status": "not_ready",
                "error": e.to_string()
            }));
        }
    }

    // Check Redis connection
    match state.redis.get_connection() {
        Ok(_) => {
            checks.push(json!({
                "name": "redis",
                "status": "ready"
            }));
        }
        Err(e) => {
            all_ready = false;
            checks.push(json!({
                "name": "redis",
                "status": "not_ready",
                "error": e.to_string()
            }));
        }
    }

    // Check Solana RPC connection
    match state.solana_client.health_check().await {
        Ok(true) => {
            checks.push(json!({
                "name": "solana_rpc",
                "status": "ready",
                "rpc_url": state.config.blockchain.solana_rpc_url
            }));
        }
        Ok(false) => {
            all_ready = false;
            checks.push(json!({
                "name": "solana_rpc",
                "status": "not_ready",
                "error": "RPC health check failed",
                "rpc_url": state.config.blockchain.solana_rpc_url
            }));
        }
        Err(e) => {
            all_ready = false;
            checks.push(json!({
                "name": "solana_rpc",
                "status": "not_ready",
                "error": e.to_string(),
                "rpc_url": state.config.blockchain.solana_rpc_url
            }));
        }
    }

    // Check ZKML system
    match state.zkml_service.health_check() {
        Ok(true) => {
            let status = state.zkml_service.get_status();
            checks.push(json!({
                "name": "zkml_system",
                "status": "ready",
                "circuit_size": status.circuit_size,
                "estimated_setup_time_ms": status.estimated_setup_time_ms
            }));
        }
        Ok(false) => {
            all_ready = false;
            checks.push(json!({
                "name": "zkml_system",
                "status": "not_ready",
                "error": "ZKML health check failed"
            }));
        }
        Err(e) => {
            all_ready = false;
            checks.push(json!({
                "name": "zkml_system",
                "status": "not_ready",
                "error": e.to_string()
            }));
        }
    }

    let status_code = if all_ready {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };

    (
        status_code,
        Json(json!({
            "ready": all_ready,
            "checks": checks,
            "service": "guardian-aa-backend",
            "version": env!("CARGO_PKG_VERSION"),
            "timestamp": chrono::Utc::now().to_rfc3339()
        })),
    )
} 