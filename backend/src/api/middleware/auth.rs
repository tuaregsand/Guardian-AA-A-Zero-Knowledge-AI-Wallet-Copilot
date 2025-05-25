//! Authentication middleware for Guardian-AA Backend

use crate::{
    config::Config,
    error::{Error, Result},
    services::auth::Claims,
};
use axum::{
    extract::{Request, State},
    http::header::AUTHORIZATION,
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use std::sync::Arc;
use uuid::Uuid;

/// User context extracted from JWT token
#[derive(Debug, Clone)]
pub struct UserContext {
    pub user_id: Uuid,
    pub email: String,
}

/// Authentication middleware that validates JWT tokens
pub async fn auth_middleware(
    State(config): State<Arc<Config>>,
    mut request: Request,
    next: Next,
) -> Result<Response> {
    // Extract the Authorization header
    let auth_header = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|header| header.to_str().ok())
        .ok_or(Error::Unauthorized)?;

    // Check if it's a Bearer token
    if !auth_header.starts_with("Bearer ") {
        return Err(Error::Unauthorized);
    }

    // Extract the token
    let token = auth_header.trim_start_matches("Bearer ");

    // Validate token is not empty
    if token.is_empty() {
        return Err(Error::Unauthorized);
    }

    // Validate the JWT token
    let user_context = validate_jwt_token(token, &config.auth.jwt_secret)?;

    // Add user context to request extensions for downstream handlers
    request.extensions_mut().insert(user_context);

    // Continue to the next middleware/handler
    Ok(next.run(request).await)
}

/// Optional authentication middleware that doesn't fail if no token is provided
pub async fn optional_auth_middleware(
    State(config): State<Arc<Config>>,
    mut request: Request,
    next: Next,
) -> Response {
    // Try to extract and validate token, but don't fail if it's missing
    if let Some(auth_header) = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|header| header.to_str().ok())
    {
        if auth_header.starts_with("Bearer ") {
            let token = auth_header.trim_start_matches("Bearer ");
            if !token.is_empty() {
                // Try to validate token and add user info to request extensions
                if let Ok(user_context) = validate_jwt_token(token, &config.auth.jwt_secret) {
                    request.extensions_mut().insert(user_context);
                }
            }
        }
    }

    next.run(request).await
}

/// Validate JWT token and extract user claims
fn validate_jwt_token(token: &str, secret: &str) -> Result<UserContext> {
    let decoding_key = DecodingKey::from_secret(secret.as_bytes());
    let validation = Validation::default();

    let token_data = decode::<Claims>(token, &decoding_key, &validation)
        .map_err(|_| Error::Unauthorized)?;

    let claims = token_data.claims;

    // Parse user ID from claims
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| Error::Unauthorized)?;

    Ok(UserContext {
        user_id,
        email: claims.email,
    })
}

/// Extension trait to extract user context from request
pub trait RequestUserExt {
    fn user_context(&self) -> Result<&UserContext>;
    fn user_id(&self) -> Result<Uuid>;
}

impl RequestUserExt for Request {
    fn user_context(&self) -> Result<&UserContext> {
        self.extensions()
            .get::<UserContext>()
            .ok_or(Error::Unauthorized)
    }

    fn user_id(&self) -> Result<Uuid> {
        Ok(self.user_context()?.user_id)
    }
} 