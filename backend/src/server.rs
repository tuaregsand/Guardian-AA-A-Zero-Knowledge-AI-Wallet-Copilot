//! Server initialization and startup

use crate::{
    api::{create_router, AppState},
    blockchain::SolanaClient,
    config::Config,
    db::Database,
    error::Result,
};
use axum::Router;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::signal;
use tower::ServiceBuilder;
use tower_http::{
    compression::CompressionLayer,
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing::info;

/// Run the server with the given configuration
pub async fn run(config: Config, addr: SocketAddr) -> Result<()> {
    // Initialize database connection
    let db = Database::new(&config.database).await?;
    
    // Run migrations - TODO: Re-enable when migrate feature is added
    // db.run_migrations().await?;
    
    // Initialize Redis connection
    let redis_client = redis::Client::open(config.redis.url.clone())
        .map_err(|e| crate::error::Error::Config(format!("Failed to connect to Redis: {}", e)))?;
    
    // Initialize Solana client
    let solana_client = SolanaClient::new(
        &config.blockchain.solana_rpc_url,
        &config.blockchain.commitment,
    )?;
    
    // Test Solana connection
    match solana_client.health_check().await {
        Ok(true) => info!("✅ Solana RPC connection established"),
        Ok(false) => info!("⚠️ Solana RPC connection unhealthy"),
        Err(e) => info!("❌ Solana RPC connection failed: {}", e),
    }
    
    // Initialize ZKML service
    let zkml_service = crate::zkml::ZkmlService::new()?;
    
    // Test ZKML system
    match zkml_service.health_check() {
        Ok(true) => info!("✅ ZKML proof system ready"),
        Ok(false) => info!("⚠️ ZKML proof system unhealthy"),
        Err(e) => info!("❌ ZKML proof system failed: {}", e),
    }
    
    // Create application state
    let state = Arc::new(AppState {
        config: config.clone(),
        db,
        redis: redis_client,
        solana_client,
        zkml_service,
    });
    
    // Create the application router
    let app = create_app(state, &config)?;
    
    // Create the server
    let listener = tokio::net::TcpListener::bind(&addr).await
        .map_err(|e| crate::error::Error::Config(format!("Failed to bind to {}: {}", addr, e)))?;
    
    info!("Server listening on {}", addr);
    
    // Run the server with graceful shutdown
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .map_err(|e| crate::error::Error::Other(e.into()))?;
    
    Ok(())
}

/// Create the application with all middleware
fn create_app(state: Arc<AppState>, config: &Config) -> Result<Router> {
    // Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(
            config
                .server
                .cors_origin
                .parse::<axum::http::HeaderValue>()
                .map_err(|e| crate::error::Error::Config(format!("Invalid CORS origin: {}", e)))?,
        )
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PUT,
            axum::http::Method::DELETE,
            axum::http::Method::OPTIONS,
        ])
        .allow_headers([
            axum::http::header::AUTHORIZATION,
            axum::http::header::CONTENT_TYPE,
            axum::http::header::ACCEPT,
            axum::http::header::ORIGIN,
        ])
        .allow_credentials(true);
    
    // Create the main router
    let app = create_router(state)
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(cors)
                .layer(CompressionLayer::new()),
        );
    
    Ok(app)
}

/// Graceful shutdown signal handler
async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    info!("Shutdown signal received");
} 