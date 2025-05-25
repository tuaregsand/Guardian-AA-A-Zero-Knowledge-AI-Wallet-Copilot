//! Tests for Solana blockchain integration

use guardian_aa_backend::blockchain::SolanaClient;

#[tokio::test(flavor = "multi_thread")]
async fn test_solana_client_creation() {
    let client = SolanaClient::new("https://api.devnet.solana.com", "confirmed");
    assert!(client.is_ok());
}

#[tokio::test(flavor = "multi_thread")]
async fn test_address_validation() {
    let client = SolanaClient::new("https://api.devnet.solana.com", "confirmed").unwrap();
    
    // Valid Solana address
    let valid_address = "11111111111111111111111111111111";
    assert!(client.validate_address(valid_address).unwrap());
    
    // Invalid address
    let invalid_address = "invalid_address";
    assert!(!client.validate_address(invalid_address).unwrap());
}

#[tokio::test(flavor = "multi_thread")]
async fn test_health_check() {
    let client = SolanaClient::new("https://api.devnet.solana.com", "confirmed").unwrap();
    
    // This might fail if devnet is down, but that's expected
    let health = client.health_check().await;
    // Don't assert success as it depends on network connectivity
    println!("Health check result: {:?}", health);
}

#[tokio::test(flavor = "multi_thread")]
async fn test_get_version() {
    let client = SolanaClient::new("https://api.devnet.solana.com", "confirmed").unwrap();
    
    // This might fail if devnet is down, but that's expected
    let version = client.get_version().await;
    // We don't assert success here as it depends on network connectivity
    println!("Solana version result: {:?}", version);
}

#[tokio::test(flavor = "multi_thread")]
async fn test_get_balance_with_invalid_address() {
    let client = SolanaClient::new("https://api.devnet.solana.com", "confirmed").unwrap();
    
    let result = client.get_balance("invalid_address").await;
    assert!(result.is_err());
}

#[tokio::test(flavor = "multi_thread")]
async fn test_transaction_deserialization_invalid_data() {
    let client = SolanaClient::new("https://api.devnet.solana.com", "confirmed").unwrap();
    
    // Test with invalid transaction data
    let result = client.estimate_fee("invalid_transaction_data").await;
    assert!(result.is_err());
}

#[tokio::test(flavor = "multi_thread")]
async fn test_get_current_slot() {
    let client = SolanaClient::new("https://api.devnet.solana.com", "confirmed").unwrap();
    
    // This might fail if devnet is down, but that's expected
    let slot = client.get_current_slot().await;
    // Don't assert success as it depends on network connectivity
    println!("Current slot result: {:?}", slot);
} 