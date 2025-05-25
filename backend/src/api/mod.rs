//! API layer for Guardian-AA Backend

use crate::{config::Config, db::Database, blockchain::SolanaClient, zkml::ZkmlService};

pub mod handlers;
pub mod middleware;
pub mod routes;
pub mod websocket;

/// Shared application state
#[derive(Clone)]
pub struct AppState {
    pub config: Config,
    pub db: Database,
    pub redis: redis::Client,
    pub solana_client: SolanaClient,
    pub zkml_service: ZkmlService,
}

pub use routes::create_router; 