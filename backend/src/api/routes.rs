//! API routes configuration

use crate::api::{handlers, middleware, websocket, AppState};
use axum::{
    routing::{get, post, delete},
    Router,
};
use std::sync::Arc;
use tower_http::limit::RequestBodyLimitLayer;

/// Create the main application router
pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        .merge(health_routes(state.clone()))
        .nest("/api/v1", api_v1_routes(state.clone()))
        .nest("/ws", websocket_routes(state))
        .fallback(handlers::fallback)
}

/// Health check routes
fn health_routes(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(handlers::health::health_check))
        .route("/ready", get(handlers::health::readiness_check))
        .with_state(state)
}

/// API v1 routes
fn api_v1_routes(state: Arc<AppState>) -> Router {
    Router::new()
        // Public routes (no auth required)
        .nest("/auth", auth_routes())
        // Protected routes (auth required)
        .nest("/wallet", protected_wallet_routes(state.clone()))
        .nest("/transaction", protected_transaction_routes(state.clone()))
        .nest("/agent", protected_agent_routes(state.clone()))
        .nest("/zkml", protected_zkml_routes(state.clone()))
        .with_state(state)
}

/// Authentication routes (public)
fn auth_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/register", post(handlers::auth::register))
        .route("/login", post(handlers::auth::login))
        .route("/refresh", post(handlers::auth::refresh_token))
        .route("/logout", post(handlers::auth::logout))
        .route("/verify-email", post(handlers::auth::verify_email))
        .route("/forgot-password", post(handlers::auth::forgot_password))
        .route("/reset-password", post(handlers::auth::reset_password))
        // Apply request body limit to auth routes
        .layer(RequestBodyLimitLayer::new(5 * 1024 * 1024)) // 5MB limit
}

/// Protected wallet management routes
fn protected_wallet_routes(state: Arc<AppState>) -> Router<Arc<AppState>> {
    wallet_routes()
        .route_layer(axum::middleware::from_fn_with_state(
            Arc::new(state.config.clone()),
            middleware::auth::auth_middleware
        ))
        .layer(RequestBodyLimitLayer::new(5 * 1024 * 1024)) // 5MB limit
}

/// Wallet management routes
fn wallet_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", post(handlers::wallet::create_wallet))
        .route("/", get(handlers::wallet::get_wallets))
        .route("/:wallet_id", get(handlers::wallet::get_wallet))
        .route("/:wallet_id", delete(handlers::wallet::deactivate_wallet))
        .route("/:wallet_id/balance", get(handlers::wallet::get_wallet_balance))
}

/// Protected transaction routes
fn protected_transaction_routes(state: Arc<AppState>) -> Router<Arc<AppState>> {
    transaction_routes()
        .route_layer(axum::middleware::from_fn_with_state(
            Arc::new(state.config.clone()),
            middleware::auth::auth_middleware
        ))
        .layer(RequestBodyLimitLayer::new(5 * 1024 * 1024)) // 5MB limit
}

/// Transaction routes
fn transaction_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", post(handlers::transaction::create_transaction))
        .route("/", get(handlers::transaction::get_transactions))
        .route("/estimate-fee", post(handlers::transaction::estimate_fee))
        .route("/:transaction_id", get(handlers::transaction::get_transaction))
        .route("/:transaction_id/submit", post(handlers::transaction::submit_transaction))
}

/// Protected AI agent routes
fn protected_agent_routes(state: Arc<AppState>) -> Router<Arc<AppState>> {
    agent_routes()
        .route_layer(axum::middleware::from_fn_with_state(
            Arc::new(state.config.clone()),
            middleware::auth::auth_middleware
        ))
        .layer(RequestBodyLimitLayer::new(5 * 1024 * 1024)) // 5MB limit
}

/// AI agent routes
fn agent_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(handlers::agent::get_agents))
        .route("/:agent_id", get(handlers::agent::get_agent))
        .route("/predictions", post(handlers::agent::create_prediction))
        .route("/predictions", get(handlers::agent::get_predictions))
        .route("/predictions/:prediction_id", get(handlers::agent::get_prediction))
        .route("/analyze", post(handlers::agent::generate_market_analysis))
        .route("/cleanup", post(handlers::agent::cleanup_expired_predictions))
}

/// Protected ZK-ML routes
fn protected_zkml_routes(state: Arc<AppState>) -> Router<Arc<AppState>> {
    zkml_routes()
        .route_layer(axum::middleware::from_fn_with_state(
            Arc::new(state.config.clone()),
            middleware::auth::auth_middleware
        ))
        .layer(RequestBodyLimitLayer::new(5 * 1024 * 1024)) // 5MB limit
}

/// ZK-ML routes
fn zkml_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/generate", post(handlers::zkml::generate_proof))
        .route("/verify", post(handlers::zkml::verify_proof))
        .route("/status/:id", get(handlers::zkml::get_proof_status))
        .route("/circuit/:name", get(handlers::zkml::get_circuit_info))
        .route("/system/status", get(handlers::zkml::get_system_status))
        .route("/health", get(handlers::zkml::health_check))
}

/// WebSocket routes
fn websocket_routes(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/", get(websocket::websocket_handler))
        .with_state(state)
} 