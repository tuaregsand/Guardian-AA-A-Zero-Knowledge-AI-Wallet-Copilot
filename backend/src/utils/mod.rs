//! Utility functions and helpers

use crate::error::{Error, Result};
use chrono::{DateTime, Utc};
use uuid::Uuid;

/// Validate email format
pub fn validate_email(email: &str) -> bool {
    let email_regex = regex::Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();
    email_regex.is_match(email)
}

/// Validate password strength
pub fn validate_password(password: &str) -> Result<()> {
    if password.len() < 8 {
        return Err(Error::Validation("Password must be at least 8 characters long".to_string()));
    }
    
    if password.len() > 128 {
        return Err(Error::Validation("Password must be less than 128 characters".to_string()));
    }
    
    let has_uppercase = password.chars().any(|c| c.is_uppercase());
    let has_lowercase = password.chars().any(|c| c.is_lowercase());
    let has_digit = password.chars().any(|c| c.is_numeric());
    
    if !has_uppercase || !has_lowercase || !has_digit {
        return Err(Error::Validation(
            "Password must contain at least one uppercase letter, one lowercase letter, and one digit".to_string()
        ));
    }
    
    Ok(())
}

/// Format timestamp to RFC3339 string
pub fn format_timestamp(timestamp: DateTime<Utc>) -> String {
    timestamp.to_rfc3339()
}

/// Parse UUID from string with validation
pub fn parse_uuid(uuid_str: &str) -> Result<Uuid> {
    Uuid::parse_str(uuid_str)
        .map_err(|_| Error::BadRequest("Invalid UUID format".to_string()))
}

/// Sanitize string input (remove dangerous characters)
pub fn sanitize_string(input: &str) -> String {
    input
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || ".-_@".contains(*c))
        .collect()
}

/// Generate a random UUID
pub fn generate_uuid() -> Uuid {
    Uuid::new_v4()
}

/// Validate Solana address format
pub fn validate_solana_address(address: &str) -> bool {
    // Solana addresses are base58 encoded and typically 44 characters
    address.len() == 44 && address.chars().all(|c| {
        "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz".contains(c)
    })
}

/// Validate Ethereum address format
pub fn validate_ethereum_address(address: &str) -> bool {
    address.starts_with("0x") && address.len() == 42 && 
    address[2..].chars().all(|c| c.is_ascii_hexdigit())
}

/// Convert bytes to hex string
pub fn bytes_to_hex(bytes: &[u8]) -> String {
    hex::encode(bytes)
}

/// Convert hex string to bytes
pub fn hex_to_bytes(hex: &str) -> Result<Vec<u8>> {
    hex::decode(hex)
        .map_err(|_| Error::BadRequest("Invalid hex string".to_string()))
}

/// Truncate string to max length with ellipsis
pub fn truncate_string(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        s.to_string()
    } else {
        format!("{}...", &s[..max_len.saturating_sub(3)])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_validation() {
        assert!(validate_email("test@example.com"));
        assert!(validate_email("user.name+tag@domain.co.uk"));
        assert!(!validate_email("invalid-email"));
        assert!(!validate_email("@domain.com"));
        assert!(!validate_email("user@"));
    }

    #[test]
    fn test_password_validation() {
        assert!(validate_password("Password123").is_ok());
        assert!(validate_password("MySecure1").is_ok());
        
        assert!(validate_password("short").is_err()); // Too short
        assert!(validate_password("nouppercase123").is_err()); // No uppercase
        assert!(validate_password("NOLOWERCASE123").is_err()); // No lowercase
        assert!(validate_password("NoDigits").is_err()); // No digits
    }

    #[test]
    fn test_solana_address_validation() {
        // Use a valid Solana address (44 chars, base58 - no 0, O, I, l)
        assert!(validate_solana_address("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"));
        assert!(!validate_solana_address("invalid_address"));
        assert!(!validate_solana_address("too_short"));
    }

    #[test]
    fn test_ethereum_address_validation() {
        // Use a valid Ethereum address (42 chars with 0x prefix)
        assert!(validate_ethereum_address("0x742d35Cc6634C0532925a3b8D4C9db96C4b4Df8a"));
        assert!(!validate_ethereum_address("invalid_address"));
        assert!(!validate_ethereum_address("0xinvalid"));
    }

    #[test]
    fn test_hex_conversion() {
        let bytes = vec![0x01, 0x23, 0x45, 0x67];
        let hex = bytes_to_hex(&bytes);
        assert_eq!(hex, "01234567");
        
        let converted_back = hex_to_bytes(&hex).unwrap();
        assert_eq!(bytes, converted_back);
    }

    #[test]
    fn test_string_truncation() {
        assert_eq!(truncate_string("short", 10), "short");
        assert_eq!(truncate_string("this is a very long string", 10), "this is...");
    }
}
