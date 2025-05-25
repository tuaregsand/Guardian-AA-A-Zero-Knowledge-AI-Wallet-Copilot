//! Guardian-AA Backend Library
//! 
//! This crate provides the backend services for the Guardian-AA Zero-Knowledge AI Wallet.

pub mod api;
pub mod auth;
pub mod blockchain;
pub mod config;
pub mod db;
pub mod error;
pub mod server;
pub mod services;
pub mod utils;
pub mod zkml;

pub use error::{Error, Result};

/// Re-export commonly used types
pub mod prelude {
    pub use crate::error::{Error, Result};
    pub use crate::config::Config;
} 