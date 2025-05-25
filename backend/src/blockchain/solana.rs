//! Solana blockchain client implementation

use crate::error::{Error, Result};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    pubkey::Pubkey,
    signature::Signature,
    transaction::Transaction,
    native_token::LAMPORTS_PER_SOL,
};
use std::str::FromStr;
use std::sync::Arc;
use serde::{Deserialize, Serialize};
use base64::{Engine as _, engine::general_purpose};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Balance {
    pub sol_balance: u64,        // Balance in lamports
    pub sol_balance_formatted: f64, // Balance in SOL
    pub token_balances: Vec<TokenBalance>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenBalance {
    pub mint: String,
    pub amount: u64,
    pub decimals: u8,
    pub amount_formatted: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionFeeEstimate {
    pub fee_lamports: u64,
    pub fee_sol: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionResult {
    pub signature: String,
    pub slot: u64,
    pub confirmation_status: String,
}

/// Solana blockchain client
#[derive(Clone)]
pub struct SolanaClient {
    rpc_client: Arc<RpcClient>,
    commitment: CommitmentConfig,
}

impl SolanaClient {
    /// Create a new Solana client
    pub fn new(rpc_url: &str, commitment: &str) -> Result<Self> {
        let commitment_config = match commitment {
            "processed" => CommitmentConfig::processed(),
            "confirmed" => CommitmentConfig::confirmed(),
            "finalized" => CommitmentConfig::finalized(),
            _ => CommitmentConfig::confirmed(),
        };

        let rpc_client = RpcClient::new_with_commitment(rpc_url.to_string(), commitment_config);

        Ok(Self {
            rpc_client: Arc::new(rpc_client),
            commitment: commitment_config,
        })
    }

    /// Get SOL balance for a wallet (simplified version)
    pub async fn get_balance(&self, wallet_address: &str) -> Result<Balance> {
        let pubkey = Pubkey::from_str(wallet_address)
            .map_err(|e| Error::Blockchain(format!("Invalid wallet address: {}", e)))?;

        // Get SOL balance
        let sol_balance = self.rpc_client
            .get_balance_with_commitment(&pubkey, self.commitment)
            .map_err(|e| Error::Blockchain(format!("Failed to get SOL balance: {}", e)))?
            .value;

        let sol_balance_formatted = sol_balance as f64 / LAMPORTS_PER_SOL as f64;

        // For now, return empty token balances - we'll implement SPL token parsing later
        let token_balances = Vec::new();

        Ok(Balance {
            sol_balance,
            sol_balance_formatted,
            token_balances,
        })
    }

    /// Submit a transaction to the Solana network
    pub async fn submit_transaction(&self, transaction_data: &str) -> Result<TransactionResult> {
        // Deserialize the transaction from base64 or hex
        let transaction = self.deserialize_transaction(transaction_data)?;

        // Submit the transaction
        let signature = self.rpc_client
            .send_and_confirm_transaction_with_spinner_and_commitment(
                &transaction,
                self.commitment,
            )
            .map_err(|e| Error::TransactionFailed(format!("Failed to submit transaction: {}", e)))?;

        // Get current slot as we can't get transaction details immediately
        let slot = self.get_current_slot().await.unwrap_or(0);

        Ok(TransactionResult {
            signature: signature.to_string(),
            slot,
            confirmation_status: format!("{:?}", self.commitment.commitment),
        })
    }

    /// Estimate transaction fee
    pub async fn estimate_fee(&self, transaction_data: &str) -> Result<TransactionFeeEstimate> {
        // For Solana, we can estimate based on the transaction size and current fee rates
        let transaction = self.deserialize_transaction(transaction_data)?;

        // Calculate fee based on transaction signatures - simplified approach
        let fee_lamports = self.rpc_client
            .get_fee_for_message(&transaction.message)
            .map_err(|e| Error::Blockchain(format!("Failed to calculate fee: {}", e)))?;

        let fee_sol = fee_lamports as f64 / LAMPORTS_PER_SOL as f64;

        Ok(TransactionFeeEstimate {
            fee_lamports,
            fee_sol,
        })
    }

    /// Get transaction status
    pub async fn get_transaction_status(&self, signature: &str) -> Result<Option<TransactionResult>> {
        let signature = Signature::from_str(signature)
            .map_err(|e| Error::Blockchain(format!("Invalid signature: {}", e)))?;

        // Use get_signature_status to check if transaction exists
        let status = self.rpc_client
            .get_signature_status(&signature)
            .map_err(|e| Error::Blockchain(format!("Failed to get transaction status: {}", e)))?;

        if let Some(_) = status {
            // Transaction exists, get current slot
            let slot = self.get_current_slot().await.unwrap_or(0);
            
            Ok(Some(TransactionResult {
                signature: signature.to_string(),
                slot,
                confirmation_status: format!("{:?}", self.commitment.commitment),
            }))
        } else {
            Ok(None)
        }
    }

    /// Validate a Solana address
    pub fn validate_address(&self, address: &str) -> Result<bool> {
        match Pubkey::from_str(address) {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    /// Get current slot
    pub async fn get_current_slot(&self) -> Result<u64> {
        let slot = self.rpc_client
            .get_slot_with_commitment(self.commitment)
            .map_err(|e| Error::Blockchain(format!("Failed to get current slot: {}", e)))?;

        Ok(slot)
    }

    /// Helper function to deserialize transaction data
    fn deserialize_transaction(&self, transaction_data: &str) -> Result<Transaction> {
        // Try to deserialize from base64 first
        if let Ok(bytes) = general_purpose::STANDARD.decode(transaction_data) {
            if let Ok(transaction) = bincode::deserialize::<Transaction>(&bytes) {
                return Ok(transaction);
            }
        }

        // Try to deserialize from hex
        if let Ok(bytes) = hex::decode(transaction_data) {
            if let Ok(transaction) = bincode::deserialize::<Transaction>(&bytes) {
                return Ok(transaction);
            }
        }

        Err(Error::Blockchain("Invalid transaction data format".to_string()))
    }

    /// Health check - verify connection to Solana network
    pub async fn health_check(&self) -> Result<bool> {
        match self.rpc_client.get_health() {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    /// Get network version info
    pub async fn get_version(&self) -> Result<String> {
        let version = self.rpc_client
            .get_version()
            .map_err(|e| Error::Blockchain(format!("Failed to get version: {}", e)))?;

        Ok(format!("{}", version.solana_core))
    }
} 