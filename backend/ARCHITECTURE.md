# Guardian-AA Backend Architecture

## Overview

The Guardian-AA backend is a high-performance, secure service built in Rust that provides:
- RESTful API endpoints for wallet operations
- WebSocket support for real-time updates
- ZK proof generation and verification
- Blockchain interaction (Solana)
- Multi-agent AI coordination
- Authentication and authorization

## Directory Structure

```
backend/
├── src/
│   ├── main.rs              # Application entry point
│   ├── lib.rs               # Library root
│   ├── config.rs            # Configuration management
│   ├── error.rs             # Error types and handling
│   │
│   ├── api/                 # API layer
│   │   ├── mod.rs
│   │   ├── routes.rs        # Route definitions
│   │   ├── handlers/        # Request handlers
│   │   ├── middleware/      # Custom middleware
│   │   └── websocket.rs     # WebSocket handlers
│   │
│   ├── services/            # Business logic layer
│   │   ├── mod.rs
│   │   ├── wallet.rs        # Wallet operations
│   │   ├── transaction.rs   # Transaction processing
│   │   ├── agent.rs         # AI agent coordination
│   │   └── analytics.rs     # Analytics and insights
│   │
│   ├── zkml/                # ZK-ML integration
│   │   ├── mod.rs
│   │   ├── prover.rs        # Proof generation
│   │   ├── verifier.rs      # Proof verification
│   │   └── circuits.rs      # Circuit definitions
│   │
│   ├── blockchain/          # Blockchain integration
│   │   ├── mod.rs
│   │   ├── solana.rs        # Solana-specific operations
│   │   ├── guardian.rs      # Guardian contract interaction
│   │   └── types.rs         # Blockchain types
│   │
│   ├── auth/                # Authentication & Authorization
│   │   ├── mod.rs
│   │   ├── jwt.rs           # JWT handling
│   │   ├── session.rs       # Session management
│   │   └── permissions.rs   # Permission system
│   │
│   ├── db/                  # Database layer
│   │   ├── mod.rs
│   │   ├── models.rs        # Database models
│   │   ├── queries.rs       # SQL queries
│   │   └── migrations/      # Database migrations
│   │
│   └── utils/               # Utilities
│       ├── mod.rs
│       ├── crypto.rs        # Cryptographic utilities
│       └── telemetry.rs     # Logging and metrics
│
├── tests/                   # Integration tests
├── docker/                  # Docker configuration
└── .env.example            # Environment variables example
```

## Core Components

### 1. API Layer
- **Framework**: Axum (high-performance async web framework)
- **Features**:
  - RESTful endpoints for wallet operations
  - WebSocket support for real-time updates
  - Request validation and error handling
  - CORS and security headers
  - Rate limiting and DDoS protection

### 2. Service Layer
- **Wallet Service**: Account creation, key management, transaction signing
- **Transaction Service**: Transaction building, simulation, and submission
- **Agent Service**: Coordination with AI agents for decision making
- **Analytics Service**: Portfolio analytics and performance tracking

### 3. ZK-ML Integration
- **Proof Generation**: Generate ZK proofs for AI model decisions
- **Proof Verification**: Verify proofs on-chain
- **Circuit Management**: Handle different circuit types for various agents

### 4. Blockchain Integration
- **Solana RPC**: Direct integration with Solana nodes
- **Smart Contract**: Interaction with Guardian AA contracts
- **Transaction Management**: Building and submitting transactions

### 5. Database Layer
- **PostgreSQL**: Primary database for user data, transactions, analytics
- **Redis**: Caching layer for performance and session management
- **SQLx**: Type-safe SQL queries with compile-time verification

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `POST /api/v1/auth/logout` - User logout

### Wallet Operations
- `POST /api/v1/wallet/create` - Create new wallet
- `GET /api/v1/wallet/{address}` - Get wallet details
- `POST /api/v1/wallet/import` - Import existing wallet
- `DELETE /api/v1/wallet/{address}` - Remove wallet

### Transactions
- `POST /api/v1/transaction/build` - Build transaction
- `POST /api/v1/transaction/simulate` - Simulate transaction
- `POST /api/v1/transaction/submit` - Submit transaction
- `GET /api/v1/transaction/{signature}` - Get transaction status

### AI Agents
- `POST /api/v1/agent/analyze` - Request AI analysis
- `GET /api/v1/agent/recommendations` - Get trading recommendations
- `POST /api/v1/agent/execute` - Execute AI-suggested action

### ZK Proofs
- `POST /api/v1/zkml/generate` - Generate ZK proof
- `POST /api/v1/zkml/verify` - Verify ZK proof
- `GET /api/v1/zkml/status/{id}` - Get proof generation status

### WebSocket Events
- `ws://api/v1/ws` - WebSocket connection
  - `transaction.update` - Transaction status updates
  - `agent.recommendation` - Real-time AI recommendations
  - `portfolio.update` - Portfolio value changes

## Security Considerations

1. **Authentication**: JWT-based with refresh tokens
2. **Authorization**: Role-based access control (RBAC)
3. **Encryption**: All sensitive data encrypted at rest
4. **Rate Limiting**: Per-IP and per-user rate limits
5. **Input Validation**: Strict validation on all inputs
6. **Audit Logging**: Comprehensive audit trails

## Performance Optimizations

1. **Caching**: Redis for frequently accessed data
2. **Connection Pooling**: Database and RPC connection pools
3. **Async Processing**: Non-blocking I/O throughout
4. **Batch Operations**: Batch transaction processing
5. **Circuit Optimization**: Optimized ZK circuits for mobile

## Deployment

1. **Docker**: Containerized deployment
2. **Environment**: Supports dev, staging, production
3. **Monitoring**: Prometheus metrics and Grafana dashboards
4. **Logging**: Structured JSON logging with tracing
5. **Health Checks**: Liveness and readiness probes

## Testing Strategy

1. **Unit Tests**: Per-module unit tests
2. **Integration Tests**: API endpoint testing
3. **Load Testing**: Performance benchmarking
4. **Security Testing**: Penetration testing
5. **ZK Circuit Testing**: Proof generation/verification tests 