//! Configuration management for Guardian-AA Backend

use crate::error::Result;
use config::{Config as ConfigLoader, Environment, File};
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Config {
    pub environment: String,
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub redis: RedisConfig,
    pub auth: AuthConfig,
    pub blockchain: BlockchainConfig,
    pub zkml: ZkmlConfig,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub cors_origin: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
    pub min_connections: u32,
    pub connect_timeout: u64,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct RedisConfig {
    pub url: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct AuthConfig {
    pub jwt_secret: String,
    pub jwt_expiration: i64,
    pub refresh_token_expiration: i64,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct BlockchainConfig {
    pub solana_rpc_url: String,
    pub guardian_program_id: String,
    pub commitment: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ZkmlConfig {
    pub prover_timeout: u64,
    pub max_circuit_size: usize,
    pub srs_path: String,
}

impl Config {
    pub fn load() -> Result<Self> {
        let environment = env::var("ENVIRONMENT").unwrap_or_else(|_| "development".into());

        let config = ConfigLoader::builder()
            // Start with default configuration
            .add_source(File::with_name("backend/config/default").required(false))
            // Layer on environment-specific configuration
            .add_source(
                File::with_name(&format!("backend/config/{}", environment))
                    .required(false),
            )
            // Layer on environment variables (with a prefix of GUARDIAN_)
            .add_source(
                Environment::with_prefix("GUARDIAN")
                    .prefix_separator("_")
                    .separator("__"),
            )
            .set_override("environment", environment.as_str())?
            .build()?;

        config.try_deserialize().map_err(|e| e.into())
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            environment: "development".to_string(),
            server: ServerConfig {
                host: "127.0.0.1".to_string(),
                port: 8080,
                cors_origin: "http://localhost:3000".to_string(),
            },
            database: DatabaseConfig {
                url: "postgres://guardian:guardian@localhost/guardian_aa".to_string(),
                max_connections: 10,
                min_connections: 2,
                connect_timeout: 30,
            },
            redis: RedisConfig {
                url: "redis://localhost:6379".to_string(),
            },
            auth: AuthConfig {
                jwt_secret: "development-secret-change-in-production".to_string(),
                jwt_expiration: 3600, // 1 hour
                refresh_token_expiration: 86400 * 7, // 7 days
            },
            blockchain: BlockchainConfig {
                solana_rpc_url: "https://api.devnet.solana.com".to_string(),
                guardian_program_id: "11111111111111111111111111111111".to_string(),
                commitment: "confirmed".to_string(),
            },
            zkml: ZkmlConfig {
                prover_timeout: 300, // 5 minutes
                max_circuit_size: 1 << 20, // 2^20
                srs_path: "./srs".to_string(),
            },
        }
    }
} 