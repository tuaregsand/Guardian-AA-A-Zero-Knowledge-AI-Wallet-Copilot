//! WebSocket handlers for Guardian-AA Backend

use axum::{
    extract::{
        ws::{Message, WebSocket},
        WebSocketUpgrade,
    },
    response::Response,
};
use serde_json::json;
use tokio::time::{interval, Duration};
use tracing::{error, info};

/// WebSocket upgrade handler
pub async fn websocket_handler(ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(handle_socket)
}

/// Handle individual WebSocket connections
async fn handle_socket(mut socket: WebSocket) {
    info!("New WebSocket connection established");

    // Send welcome message
    if let Err(e) = socket.send(Message::Text(
        serde_json::json!({
            "type": "welcome",
            "message": "Connected to Guardian-AA WebSocket"
        }).to_string().into()
    )).await {
        error!("Failed to send welcome message: {}", e);
        return;
    }

    // Set up periodic heartbeat
    let mut heartbeat = interval(Duration::from_secs(30));

    loop {
        tokio::select! {
            // Handle incoming messages
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        info!("Received message: {}", text);
                        handle_message(&mut socket, text.to_string()).await;
                    }
                    Some(Ok(Message::Close(_))) => {
                        info!("WebSocket connection closed");
                        break;
                    }
                    Some(Err(e)) => {
                        error!("WebSocket error: {}", e);
                        break;
                    }
                    None => break,
                    _ => {}
                }
            }
            // Send heartbeat
            _ = heartbeat.tick() => {
                if let Err(e) = socket.send(Message::Text(
                    json!({"type": "heartbeat", "timestamp": chrono::Utc::now()}).to_string().into()
                )).await {
                    error!("Failed to send heartbeat: {}", e);
                    break;
                }
            }
        }
    }

    info!("WebSocket connection terminated");
}

/// Handle incoming WebSocket messages
async fn handle_message(socket: &mut WebSocket, message: String) {
    // Parse the incoming message
    match serde_json::from_str::<serde_json::Value>(&message) {
        Ok(json_msg) => {
            let msg_type = json_msg.get("type").and_then(|v| v.as_str()).unwrap_or("unknown");
            
            match msg_type {
                "ping" => {
                    let response = json!({"type": "pong", "timestamp": chrono::Utc::now()});
                    let _ = socket.send(Message::Text(response.to_string().into())).await;
                }
                "subscribe" => {
                    // Handle subscription requests (e.g., to transaction updates, market data)
                    let response = json!({"type": "subscribed", "message": "Subscription successful"});
                    let _ = socket.send(Message::Text(response.to_string().into())).await;
                }
                "unsubscribe" => {
                    // Handle unsubscription requests
                    let response = json!({"type": "unsubscribed", "message": "Unsubscription successful"});
                    let _ = socket.send(Message::Text(response.to_string().into())).await;
                }
                _ => {
                    let response = json!({"type": "error", "message": "Unknown message type"});
                    let _ = socket.send(Message::Text(response.to_string().into())).await;
                }
            }
        }
        Err(e) => {
            error!("Failed to parse WebSocket message: {}", e);
            let response = json!({"type": "error", "message": "Invalid JSON"});
            let _ = socket.send(Message::Text(response.to_string().into())).await;
        }
    }
} 