use guardian_aa_backend::{config::Config, server::run};
use std::net::SocketAddr;
use tracing::{info, error};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize environment variables
    dotenvy::dotenv().ok();

    // Initialize tracing
    init_tracing();

    // Load configuration
    let config = Config::load()?;
    info!("Loaded configuration for environment: {}", config.environment);

    // Parse server address
    let addr: SocketAddr = format!("{}:{}", config.server.host, config.server.port)
        .parse()
        .expect("Failed to parse server address");

    info!("Starting Guardian-AA Backend on {}", addr);

    // Run the server
    match run(config, addr).await {
        Ok(_) => {
            info!("Server stopped gracefully");
            Ok(())
        }
        Err(e) => {
            error!("Server error: {}", e);
            Err(anyhow::anyhow!("Server error: {}", e))
        }
    }
}

fn init_tracing() {
    let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "guardian_aa_backend=debug,tower_http=debug,axum=debug".into());

    let formatting_layer = tracing_subscriber::fmt::layer()
        .with_target(false)
        .with_thread_ids(true)
        .with_thread_names(true);

    tracing_subscriber::registry()
        .with(env_filter)
        .with(formatting_layer)
        .init();
} 