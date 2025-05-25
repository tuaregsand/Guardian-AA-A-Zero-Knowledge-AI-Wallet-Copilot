# Guardian-AA Backend

High-performance, secure backend service for the Guardian-AA Zero-Knowledge AI Wallet built with Rust.

## Overview

The Guardian-AA backend provides:
- 🚀 RESTful API endpoints for wallet operations
- 🔌 WebSocket support for real-time updates
- 🔐 ZK proof generation and verification
- ⛓️ Solana blockchain integration
- 🤖 Multi-agent AI coordination
- 🔑 JWT-based authentication

## Architecture

```
backend/
├── src/
│   ├── api/         # API handlers and routes
│   ├── auth/        # Authentication & authorization
│   ├── blockchain/  # Solana integration
│   ├── db/          # Database layer
│   ├── services/    # Business logic
│   ├── zkml/        # ZK-ML integration
│   └── utils/       # Utilities
├── tests/           # Integration tests
└── migrations/      # Database migrations
```

## Prerequisites

- Rust 1.75+ (nightly)
- PostgreSQL 14+
- Redis 7+
- Solana CLI tools

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/guardian-aa
   cd guardian-aa/backend
   ```

2. **Install Rust (if not already installed)**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup toolchain install nightly
   rustup default nightly
   ```

3. **Set up PostgreSQL**
   ```bash
   # Create database
   createdb guardian_aa
   
   # Create user
   createuser guardian -P
   # Enter password when prompted
   
   # Grant privileges
   psql -d guardian_aa -c "GRANT ALL PRIVILEGES ON DATABASE guardian_aa TO guardian;"
   ```

4. **Set up Redis**
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Ubuntu/Debian
   sudo apt-get install redis-server
   sudo systemctl start redis
   ```

5. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

6. **Run migrations**
   ```bash
   cargo install sqlx-cli
   sqlx migrate run
   ```

## Development

### Running the server

```bash
# Development mode
cargo run

# Watch mode (auto-reload)
cargo install cargo-watch
cargo watch -x run

# Release mode
cargo run --release
```

### Running tests

```bash
# Run all tests
cargo test

# Run specific test
cargo test test_name

# Run with coverage
cargo install cargo-tarpaulin
cargo tarpaulin
```

### Database migrations

```bash
# Create a new migration
sqlx migrate add <migration_name>

# Run migrations
sqlx migrate run

# Revert last migration
sqlx migrate revert
```

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/refresh` | Refresh JWT token |
| POST | `/api/v1/auth/logout` | User logout |

### Wallet Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/wallet/create` | Create new wallet |
| GET | `/api/v1/wallet/{address}` | Get wallet details |
| POST | `/api/v1/wallet/import` | Import existing wallet |
| DELETE | `/api/v1/wallet/{address}` | Remove wallet |

### Transaction Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/transaction/build` | Build transaction |
| POST | `/api/v1/transaction/simulate` | Simulate transaction |
| POST | `/api/v1/transaction/submit` | Submit transaction |
| GET | `/api/v1/transaction/{signature}` | Get transaction status |

### AI Agent Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/agent/analyze` | Request AI analysis |
| GET | `/api/v1/agent/recommendations` | Get trading recommendations |
| POST | `/api/v1/agent/execute` | Execute AI-suggested action |

### ZK Proof Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/zkml/generate` | Generate ZK proof |
| POST | `/api/v1/zkml/verify` | Verify ZK proof |
| GET | `/api/v1/zkml/status/{id}` | Get proof generation status |

## Configuration

### Environment Variables

```env
# Server
GUARDIAN_SERVER__HOST=127.0.0.1
GUARDIAN_SERVER__PORT=8080
GUARDIAN_SERVER__CORS_ORIGIN=http://localhost:3000

# Database
GUARDIAN_DATABASE__URL=postgres://guardian:password@localhost/guardian_aa
GUARDIAN_DATABASE__MAX_CONNECTIONS=10
GUARDIAN_DATABASE__MIN_CONNECTIONS=2

# Redis
GUARDIAN_REDIS__URL=redis://localhost:6379

# Auth
GUARDIAN_AUTH__JWT_SECRET=your-secret-key
GUARDIAN_AUTH__JWT_EXPIRATION=3600
GUARDIAN_AUTH__REFRESH_TOKEN_EXPIRATION=604800

# Blockchain
GUARDIAN_BLOCKCHAIN__SOLANA_RPC_URL=https://api.devnet.solana.com
GUARDIAN_BLOCKCHAIN__GUARDIAN_PROGRAM_ID=YourProgramId
GUARDIAN_BLOCKCHAIN__COMMITMENT=confirmed

# ZK-ML
GUARDIAN_ZKML__PROVER_TIMEOUT=300
GUARDIAN_ZKML__MAX_CIRCUIT_SIZE=1048576
GUARDIAN_ZKML__SRS_PATH=./srs
```

## Security

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Input validation on all endpoints
- Rate limiting per IP and user
- Encrypted sensitive data at rest
- Comprehensive audit logging

## Performance

- Async/await throughout with Tokio
- Connection pooling for database and RPC
- Redis caching for frequently accessed data
- Optimized ZK circuits for mobile devices
- Batch transaction processing

## Monitoring

- Health check endpoint: `GET /health`
- Metrics endpoint: `GET /metrics` (Prometheus format)
- Structured JSON logging with tracing
- Request ID tracking

## Deployment

### Docker

```bash
# Build image
docker build -t guardian-aa-backend .

# Run container
docker run -p 8080:8080 --env-file .env guardian-aa-backend
```

### Docker Compose

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f backend
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details. 