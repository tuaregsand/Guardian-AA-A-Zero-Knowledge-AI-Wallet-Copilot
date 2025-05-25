//! Tests for JWT authentication middleware

use axum::{
    body::Body,
    extract::Request,
    http::{header::AUTHORIZATION, Method, StatusCode},
    middleware::{self, Next},
    response::Response,
    routing::get,
    Router,
};
use guardian_aa_backend::{
    api::middleware::auth::{auth_middleware, optional_auth_middleware},
    config::Config,
    error::Error,
};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tower::ServiceExt;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
struct TestClaims {
    sub: String,
    email: String,
    exp: i64,
    iat: i64,
}

// Helper function to create a valid JWT token
fn create_test_token(user_id: &str, email: &str, secret: &str, exp: i64) -> String {
    let claims = TestClaims {
        sub: user_id.to_string(),
        email: email.to_string(),
        exp,
        iat: chrono::Utc::now().timestamp(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .expect("Failed to create test token")
}

// Helper function to create test config
fn create_test_config() -> Arc<Config> {
    let mut config = Config::default();
    config.auth.jwt_secret = "test-secret-key".to_string();
    Arc::new(config)
}

// Test handler that requires authentication
async fn protected_handler() -> &'static str {
    "Protected content"
}

// Test handler for optional auth
async fn optional_handler() -> &'static str {
    "Optional content"
}

#[tokio::test]
async fn test_auth_middleware_with_valid_token() {
    let config = create_test_config();
    let user_id = Uuid::new_v4().to_string();
    let email = "test@example.com";
    let exp = chrono::Utc::now().timestamp() + 3600; // 1 hour from now
    
    let token = create_test_token(&user_id, email, &config.auth.jwt_secret, exp);

    let app = Router::new()
        .route("/protected", get(protected_handler))
        .layer(middleware::from_fn_with_state(config, auth_middleware));

    let request = Request::builder()
        .method(Method::GET)
        .uri("/protected")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_auth_middleware_with_expired_token() {
    let config = create_test_config();
    let user_id = Uuid::new_v4().to_string();
    let email = "test@example.com";
    let exp = chrono::Utc::now().timestamp() - 3600; // 1 hour ago (expired)
    
    let token = create_test_token(&user_id, email, &config.auth.jwt_secret, exp);

    let app = Router::new()
        .route("/protected", get(protected_handler))
        .layer(middleware::from_fn_with_state(config, auth_middleware));

    let request = Request::builder()
        .method(Method::GET)
        .uri("/protected")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_auth_middleware_with_invalid_token() {
    let config = create_test_config();
    let invalid_token = "invalid.jwt.token";

    let app = Router::new()
        .route("/protected", get(protected_handler))
        .layer(middleware::from_fn_with_state(config, auth_middleware));

    let request = Request::builder()
        .method(Method::GET)
        .uri("/protected")
        .header(AUTHORIZATION, format!("Bearer {}", invalid_token))
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_auth_middleware_with_wrong_secret() {
    let config = create_test_config();
    let user_id = Uuid::new_v4().to_string();
    let email = "test@example.com";
    let exp = chrono::Utc::now().timestamp() + 3600;
    
    // Create token with different secret
    let token = create_test_token(&user_id, email, "wrong-secret", exp);

    let app = Router::new()
        .route("/protected", get(protected_handler))
        .layer(middleware::from_fn_with_state(config, auth_middleware));

    let request = Request::builder()
        .method(Method::GET)
        .uri("/protected")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_auth_middleware_missing_authorization_header() {
    let config = create_test_config();

    let app = Router::new()
        .route("/protected", get(protected_handler))
        .layer(middleware::from_fn_with_state(config, auth_middleware));

    let request = Request::builder()
        .method(Method::GET)
        .uri("/protected")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_auth_middleware_invalid_bearer_format() {
    let config = create_test_config();

    let app = Router::new()
        .route("/protected", get(protected_handler))
        .layer(middleware::from_fn_with_state(config, auth_middleware));

    let request = Request::builder()
        .method(Method::GET)
        .uri("/protected")
        .header(AUTHORIZATION, "InvalidFormat token")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_auth_middleware_empty_token() {
    let config = create_test_config();

    let app = Router::new()
        .route("/protected", get(protected_handler))
        .layer(middleware::from_fn_with_state(config, auth_middleware));

    let request = Request::builder()
        .method(Method::GET)
        .uri("/protected")
        .header(AUTHORIZATION, "Bearer ")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_optional_auth_middleware_with_valid_token() {
    let config = create_test_config();
    let user_id = Uuid::new_v4().to_string();
    let email = "test@example.com";
    let exp = chrono::Utc::now().timestamp() + 3600;
    
    let token = create_test_token(&user_id, email, &config.auth.jwt_secret, exp);

    let app = Router::new()
        .route("/optional", get(optional_handler))
        .layer(middleware::from_fn_with_state(config, optional_auth_middleware));

    let request = Request::builder()
        .method(Method::GET)
        .uri("/optional")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_optional_auth_middleware_without_token() {
    let config = create_test_config();

    let app = Router::new()
        .route("/optional", get(optional_handler))
        .layer(middleware::from_fn_with_state(config, optional_auth_middleware));

    let request = Request::builder()
        .method(Method::GET)
        .uri("/optional")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_optional_auth_middleware_with_invalid_token() {
    let config = create_test_config();

    let app = Router::new()
        .route("/optional", get(optional_handler))
        .layer(middleware::from_fn_with_state(config, optional_auth_middleware));

    let request = Request::builder()
        .method(Method::GET)
        .uri("/optional")
        .header(AUTHORIZATION, "Bearer invalid.token")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    // Should still succeed but without user context
    assert_eq!(response.status(), StatusCode::OK);
} 