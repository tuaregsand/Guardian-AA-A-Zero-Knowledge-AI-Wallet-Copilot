//! Wallet service

use crate::{
    api::AppState,
    db::{models::*, queries::*},
    error::{Error, Result},
};
use std::sync::Arc;
use uuid::Uuid;

pub struct WalletService {
    state: Arc<AppState>,
}

impl WalletService {
    pub fn new(state: Arc<AppState>) -> Self {
        Self { state }
    }

    /// Create a new wallet for a user
    pub async fn create_wallet(
        &self,
        user_id: Uuid,
        wallet_data: CreateWallet,
    ) -> Result<Wallet> {
        // Validate wallet data
        self.validate_wallet_data(&wallet_data)?;

        // Check if wallet with this public key already exists
        if let Some(_existing) = WalletQueries::find_by_public_key(self.state.db.pool(), &wallet_data.public_key).await? {
            return Err(Error::BadRequest("Wallet with this public key already exists".to_string()));
        }

        // Create the wallet
        let wallet = WalletQueries::create(self.state.db.pool(), user_id, &wallet_data).await?;

        Ok(wallet)
    }

    /// Get all wallets for a user
    pub async fn get_user_wallets(&self, user_id: Uuid) -> Result<Vec<Wallet>> {
        let wallets = WalletQueries::find_by_user_id(self.state.db.pool(), user_id).await?;
        Ok(wallets)
    }

    /// Get a specific wallet by ID
    pub async fn get_wallet(&self, wallet_id: Uuid, user_id: Uuid) -> Result<Wallet> {
        let wallet = WalletQueries::find_by_id(self.state.db.pool(), wallet_id).await?
            .ok_or(Error::NotFound)?;

        // Ensure the wallet belongs to the user
        if wallet.user_id != user_id {
            return Err(Error::Forbidden);
        }

        Ok(wallet)
    }

    /// Get wallet by public key
    pub async fn get_wallet_by_public_key(&self, public_key: &str) -> Result<Option<Wallet>> {
        let wallet = WalletQueries::find_by_public_key(self.state.db.pool(), public_key).await?;
        Ok(wallet)
    }

    /// Deactivate a wallet
    pub async fn deactivate_wallet(&self, wallet_id: Uuid, user_id: Uuid) -> Result<()> {
        // First verify the wallet exists and belongs to the user
        let _wallet = self.get_wallet(wallet_id, user_id).await?;

        // Deactivate the wallet
        WalletQueries::deactivate(self.state.db.pool(), wallet_id, user_id).await?;

        Ok(())
    }

    /// Get wallet balance using real Solana blockchain data
    pub async fn get_wallet_balance(&self, wallet_id: Uuid, user_id: Uuid) -> Result<WalletBalance> {
        let wallet = self.get_wallet(wallet_id, user_id).await?;

        // Only fetch balance for Solana wallets for now
        match wallet.wallet_type {
            WalletType::Solana => {
                // Validate the Solana address first
                if !self.state.solana_client.validate_address(&wallet.public_key)? {
                    return Err(Error::Validation("Invalid Solana address".to_string()));
                }

                // Get balance from Solana blockchain
                let balance = self.state.solana_client.get_balance(&wallet.public_key).await?;

                // Convert to our response format
                let token_balances: Vec<TokenBalance> = balance.token_balances
                    .into_iter()
                    .map(|tb| TokenBalance {
                        mint: tb.mint,
                        balance: tb.amount_formatted.to_string(),
                        decimals: tb.decimals,
                        symbol: None, // TODO: Add token metadata lookup
                        name: None,   // TODO: Add token metadata lookup
                    })
                    .collect();

                Ok(WalletBalance {
                    wallet_id,
                    sol_balance: balance.sol_balance_formatted.to_string(),
                    token_balances,
                    last_updated: chrono::Utc::now(),
                })
            }
            _ => {
                // For non-Solana wallets, return empty balance for now
                Ok(WalletBalance {
                    wallet_id,
                    sol_balance: "0.0".to_string(),
                    token_balances: vec![],
                    last_updated: chrono::Utc::now(),
                })
            }
        }
    }

    /// Validate wallet creation data
    fn validate_wallet_data(&self, wallet_data: &CreateWallet) -> Result<()> {
        // Validate wallet name
        if wallet_data.name.trim().is_empty() {
            return Err(Error::Validation("Wallet name cannot be empty".to_string()));
        }

        if wallet_data.name.len() > 255 {
            return Err(Error::Validation("Wallet name too long".to_string()));
        }

        // Validate public key format based on wallet type
        match wallet_data.wallet_type {
            WalletType::Solana => {
                if wallet_data.public_key.len() != 44 {
                    return Err(Error::Validation("Invalid Solana public key format".to_string()));
                }
            }
            WalletType::Ethereum => {
                if !wallet_data.public_key.starts_with("0x") || wallet_data.public_key.len() != 42 {
                    return Err(Error::Validation("Invalid Ethereum address format".to_string()));
                }
            }
            WalletType::Bitcoin => {
                // Basic Bitcoin address validation
                if wallet_data.public_key.len() < 26 || wallet_data.public_key.len() > 62 {
                    return Err(Error::Validation("Invalid Bitcoin address format".to_string()));
                }
            }
            WalletType::WatchOnly => {
                // Watch-only wallets should not have private keys
                if wallet_data.encrypted_private_key.is_some() {
                    return Err(Error::Validation("Watch-only wallets cannot have private keys".to_string()));
                }
            }
        }

        Ok(())
    }
}

/// Wallet balance response
#[derive(Debug, serde::Serialize)]
pub struct WalletBalance {
    pub wallet_id: Uuid,
    pub sol_balance: String,
    pub token_balances: Vec<TokenBalance>,
    pub last_updated: chrono::DateTime<chrono::Utc>,
}

/// Token balance information
#[derive(Debug, serde::Serialize)]
pub struct TokenBalance {
    pub mint: String,
    pub balance: String,
    pub decimals: u8,
    pub symbol: Option<String>,
    pub name: Option<String>,
}
