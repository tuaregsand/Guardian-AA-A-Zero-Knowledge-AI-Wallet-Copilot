//! Authentication service

use crate::{
    api::{
        handlers::auth::{
            AuthResponse, ForgotPasswordRequest, LoginRequest, RefreshTokenRequest,
            RegisterRequest, ResetPasswordRequest, VerifyEmailRequest,
        },
        AppState,
    },
    error::{Error, Result},
};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;
use sha2::{Sha256, Digest};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub email: String,
    pub exp: i64,
    pub iat: i64,
}

pub struct AuthService {
    state: Arc<AppState>,
}

impl AuthService {
    pub fn new(state: Arc<AppState>) -> Self {
        Self { state }
    }

    /// Register a new user
    pub async fn register(&self, req: RegisterRequest) -> Result<AuthResponse> {
        // Validate input
        self.validate_email(&req.email)?;
        self.validate_password(&req.password)?;

        // Check if user already exists
        if self.user_exists(&req.email).await? {
            return Err(Error::BadRequest("User already exists".to_string()));
        }

        // Hash password
        let password_hash = self.hash_password(&req.password)?;

        // Create user in database
        let create_user = crate::db::models::CreateUser {
            email: req.email.clone(),
            password: req.password,
        };
        let user = crate::db::queries::UserQueries::create(self.state.db.pool(), &create_user, &password_hash).await?;

        // Generate tokens
        self.generate_auth_response(&user.id.to_string(), &req.email)
    }

    /// User login
    pub async fn login(&self, req: LoginRequest) -> Result<AuthResponse> {
        // Fetch user from database
        let user = crate::db::queries::UserQueries::find_by_email(self.state.db.pool(), &req.email).await?
            .ok_or(Error::AuthenticationFailed)?;

        // Check if user is active
        if !user.is_active {
            return Err(Error::AuthenticationFailed);
        }

        // Verify password
        let parsed_hash = PasswordHash::new(&user.password_hash)
            .map_err(|_| Error::Internal)?;
        
        Argon2::default()
            .verify_password(req.password.as_bytes(), &parsed_hash)
            .map_err(|_| Error::AuthenticationFailed)?;

        // Update last login
        crate::db::queries::UserQueries::update_last_login(self.state.db.pool(), user.id).await?;

        // Generate tokens
        self.generate_auth_response(&user.id.to_string(), &req.email)
    }

    /// Refresh access token
    pub async fn refresh_token(&self, req: RefreshTokenRequest) -> Result<AuthResponse> {
        // Find session by refresh token hash
        let token_hash = self.hash_token(&req.refresh_token);
        let session = crate::db::queries::UserSessionQueries::find_by_token_hash(self.state.db.pool(), &token_hash).await?
            .ok_or(Error::AuthenticationFailed)?;

        // Get user
        let user = crate::db::queries::UserQueries::find_by_id(self.state.db.pool(), session.user_id).await?
            .ok_or(Error::AuthenticationFailed)?;

        // Update session last used
        crate::db::queries::UserSessionQueries::update_last_used(self.state.db.pool(), session.id).await?;

        self.generate_auth_response(&user.id.to_string(), &user.email)
    }

    /// Verify email
    pub async fn verify_email(&self, _req: VerifyEmailRequest) -> Result<()> {
        // TODO: Implement email verification
        Ok(())
    }

    /// Forgot password
    pub async fn forgot_password(&self, _req: ForgotPasswordRequest) -> Result<()> {
        // TODO: Send password reset email
        Ok(())
    }

    /// Reset password
    pub async fn reset_password(&self, req: ResetPasswordRequest) -> Result<()> {
        // Validate new password
        self.validate_password(&req.new_password)?;

        // Hash new password
        let _password_hash = self.hash_password(&req.new_password)?;

        // TODO: Update password in database
        
        Ok(())
    }

    /// Generate auth response with tokens
    fn generate_auth_response(&self, user_id: &str, email: &str) -> Result<AuthResponse> {
        let now = Utc::now();
        let access_token_exp = now + Duration::seconds(self.state.config.auth.jwt_expiration);
        let refresh_token_exp = now + Duration::seconds(self.state.config.auth.refresh_token_expiration);

        // Create access token claims
        let access_claims = Claims {
            sub: user_id.to_string(),
            email: email.to_string(),
            exp: access_token_exp.timestamp(),
            iat: now.timestamp(),
        };

        // Create refresh token claims
        let refresh_claims = Claims {
            sub: user_id.to_string(),
            email: email.to_string(),
            exp: refresh_token_exp.timestamp(),
            iat: now.timestamp(),
        };

        // Encode tokens
        let access_token = encode(
            &Header::default(),
            &access_claims,
            &EncodingKey::from_secret(self.state.config.auth.jwt_secret.as_bytes()),
        )
        .map_err(|_| Error::Internal)?;

        let refresh_token = encode(
            &Header::default(),
            &refresh_claims,
            &EncodingKey::from_secret(self.state.config.auth.jwt_secret.as_bytes()),
        )
        .map_err(|_| Error::Internal)?;

        Ok(AuthResponse {
            access_token,
            refresh_token,
            expires_in: self.state.config.auth.jwt_expiration,
            token_type: "Bearer".to_string(),
        })
    }

    /// Validate email format
    fn validate_email(&self, email: &str) -> Result<()> {
        if !email.contains('@') || email.len() < 3 {
            return Err(Error::Validation("Invalid email format".to_string()));
        }
        Ok(())
    }

    /// Validate password strength
    fn validate_password(&self, password: &str) -> Result<()> {
        if password.len() < 8 {
            return Err(Error::Validation(
                "Password must be at least 8 characters long".to_string(),
            ));
        }
        Ok(())
    }

    /// Hash password using Argon2
    fn hash_password(&self, password: &str) -> Result<String> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|_| Error::Internal)?;
        
        Ok(password_hash.to_string())
    }

    /// Check if user exists
    async fn user_exists(&self, email: &str) -> Result<bool> {
        let user = crate::db::queries::UserQueries::find_by_email(self.state.db.pool(), email).await?;
        Ok(user.is_some())
    }

    /// Hash token for storage
    fn hash_token(&self, token: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(token.as_bytes());
        format!("{:x}", hasher.finalize())
    }
} 