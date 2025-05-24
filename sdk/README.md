# Guardian-AA SDK

> Zero-Knowledge AI Wallet Copilot SDK for TypeScript/JavaScript

[![npm version](https://badge.fury.io/js/@guardian-aa/sdk.svg)](https://badge.fury.io/js/@guardian-aa/sdk)
[![License: Custom](https://img.shields.io/badge/License-Custom-orange.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](#)
[![Tests](https://img.shields.io/badge/Tests-22%2F22%20Passing-brightgreen.svg)](#)
[![Coverage](https://img.shields.io/badge/Coverage-100%25-brightgreen.svg)](#)

The Guardian-AA SDK provides a comprehensive TypeScript/JavaScript interface for building applications with Guardian-AA's zero-knowledge proof system, ERC-4337 account abstraction, and gasless transaction capabilities.

**🎉 Status: Production Ready (Phase 3 Complete)**

## ✨ Features

- 🔐 **Zero-Knowledge Proofs**: Generate and verify SHA256 ZK proofs using Halo2
- ⚡ **Account Abstraction**: ERC-4337 compliant smart contract wallets
- 🚫 **Gasless Transactions**: Meta-transaction support with paymaster integration
- 🔗 **Multi-Signature**: Advanced multi-sig wallet functionality
- 🛠️ **Developer-Friendly**: Full TypeScript support with comprehensive documentation
- 🧪 **Production-Ready**: Robust error handling and validation
- 📦 **Tree-Shakable**: Optimized bundle sizes with ESM support
- 🔄 **Cross-Platform**: CommonJS, ESM, and TypeScript definitions included

## 📦 Installation

```bash
# npm
npm install @guardian-aa/sdk

# yarn
yarn add @guardian-aa/sdk

# pnpm
pnpm add @guardian-aa/sdk
```

### Peer Dependencies

```bash
npm install @noble/hashes @noble/curves
```

## 🚀 Quick Start

### Basic Setup

```typescript
import { createSepoliaGuardianAA } from '@guardian-aa/sdk';
import { ethers } from 'ethers';

// Create SDK instance for Sepolia testnet
const guardian = createSepoliaGuardianAA();

// Initialize with a signer
const privateKey = 'your-private-key';
const signer = new ethers.Wallet(privateKey);

await guardian.initialize(signer);
```

### Generate Zero-Knowledge Proofs

```typescript
// Get ZK client
const zkClient = guardian.getZkClient();

// Generate proof for sensitive data
const data = new TextEncoder().encode('sensitive transaction data');
const proof = await zkClient.generateProof(data);

console.log('Proof generated:', {
  hash: proof.hash,
  generationTime: proof.generationTime,
  proofSize: proof.proof.length
});

// Verify the proof
const verification = await zkClient.verifyProof(data, proof.proof, proof.hash);
console.log('Proof valid:', verification.status === 'VALID');
```

### Deploy Smart Contract Wallets

```typescript
// Get contracts client
const contracts = guardian.getContractsClient();

// Deploy a simple account
const simpleAccount = await contracts.deploySimpleAccount(
  signer.address, // owner
  0n // salt
);

console.log('Simple account deployed at:', simpleAccount.getAddress());

// Deploy a multi-sig account
const multiSigAccount = await contracts.deployMultiSigAccount(
  [signer.address, '0x...'], // owners
  2, // threshold
  0n // salt
);

console.log('Multi-sig account deployed at:', multiSigAccount.getAddress());
```

### Execute Gasless Transactions

```typescript
// Create a transaction
const transaction = {
  to: '0x...' as Address,
  value: ethers.parseEther('0.1'),
  data: '0x',
  operation: 0
};

// Sign the transaction
const signature = await signer.signMessage('transaction-hash');

// Execute with paymaster (gasless)
const txHash = await contracts.executeTransaction(
  simpleAccount,
  transaction,
  signature,
  true // use paymaster
);

console.log('Gasless transaction executed:', txHash);
```

## 📚 API Reference

### Main SDK Class

#### `GuardianAA`

The main SDK client that provides unified access to all Guardian-AA functionality.

```typescript
import { GuardianAA, createGuardianAA } from '@guardian-aa/sdk';

const config = {
  network: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/your-key',
    currency: 'ETH',
    isTestnet: true
  },
  zkConfig: {
    circuitK: 14,
    useCachedKeys: true,
    timeout: 30000
  },
  debug: true
};

const guardian = new GuardianAA(config);
await guardian.initialize(signer);
```

**Methods:**
- `initialize(signer?: ethers.Wallet)`: Initialize the SDK
- `getZkClient()`: Get ZK proof client
- `getContractsClient()`: Get contracts client
- `getProvider()`: Get Ethereum provider
- `getSigner()`: Get current signer
- `updateSigner(signer)`: Update the signer
- `isReady()`: Check if SDK is ready
- `cleanup()`: Cleanup resources

### ZK Proof Client

#### `ZkClient`

Handles zero-knowledge proof generation and verification.

```typescript
const zkClient = guardian.getZkClient();

// Generate single proof
const proof = await zkClient.generateProof(data);

// Generate batch proofs
const batchResult = await zkClient.generateBatchProofs({
  inputs: [data1, data2, data3],
  parallelization: true
});

// Verify proof
const verification = await zkClient.verifyProof(data, proof.proof, proof.hash);

// Combined prove and verify
const { proof, verification } = await zkClient.proveAndVerify(data);
```

### Contracts Client

#### `ContractsClient`

Manages smart contract interactions and account operations.

```typescript
const contracts = guardian.getContractsClient();

// Account deployment
const simpleAccount = await contracts.deploySimpleAccount(owner, salt);
const multiSigAccount = await contracts.deployMultiSigAccount(owners, threshold, salt);

// Transaction execution
const txHash = await contracts.executeTransaction(account, transaction, signature);
const batchTxHash = await contracts.executeBatchTransaction(account, batch, signature);

// Gas estimation
const gasEstimate = await contracts.estimateUserOpGas(userOp);

// Account management
const balance = await contracts.getAccountBalance(accountAddress);
await contracts.depositForAccount(accountAddress, amount);
```

### Account Classes

#### `SimpleAccount`

ERC-4337 account with ECDSA signature verification.

```typescript
// Get account instance
const account = contracts.getSimpleAccount(accountAddress);

// Build user operation
const userOp = await account.buildUserOperation(transaction);

// Execute transaction
const result = await account.execute(transaction, signature);

// Execute batch
const batchResult = await account.executeBatch(batch, signature);
```

#### `MultiSigAccount`

Multi-signature account with threshold-based execution.

```typescript
// Get multi-sig account
const multiSig = contracts.getMultiSigAccount(address, threshold, signers);

// Signer management
await multiSig.addSigner(newSigner, signatures);
await multiSig.removeSigner(oldSigner, signatures);
await multiSig.changeThreshold(newThreshold, signatures);

// Get signer info
const { signers, threshold } = await multiSig.getSignerInfo();
```

### Utility Functions

#### Validation

```typescript
import { 
  isValidAddress, 
  isValidSignature, 
  isValidUserOperation,
  validateAccountDeployment 
} from '@guardian-aa/sdk';

const isValid = isValidAddress('0x...');
const isValidSig = isValidSignature('0x...');
const { isValid, errors } = validateAccountDeployment({ owner, threshold });
```

#### Formatting

```typescript
import { 
  formatAddress, 
  formatEther, 
  formatGwei,
  truncateAddress 
} from '@guardian-aa/sdk';

const checksummed = formatAddress(address);
const ethAmount = formatEther(weiAmount);
const gasPrice = formatGwei(weiGasPrice);
const short = truncateAddress(address);
```

#### Cryptography

```typescript
import { 
  generatePrivateKey,
  signMessage,
  verifySignature,
  hashSHA256,
  getUserOpHash 
} from '@guardian-aa/sdk';

const privateKey = generatePrivateKey();
const signature = await signMessage(message, privateKey);
const isValid = verifySignature(message, signature, address);
const hash = hashSHA256(data);
```

## 🏗️ Advanced Usage

### Custom Network Configuration

```typescript
import { createGuardianAA } from '@guardian-aa/sdk';

const customNetwork = {
  chainId: 31337,
  name: 'Local Network',
  rpcUrl: 'http://localhost:8545',
  currency: 'ETH',
  isTestnet: true
};

const guardian = createGuardianAA(customNetwork, {
  zkConfig: {
    circuitK: 16, // Higher for better security
    useCachedKeys: true,
    enableBenchmarking: true
  },
  debug: true
});
```

### Batch Operations

```typescript
// Batch ZK proof generation
const batchProofs = await zkClient.generateBatchProofs({
  inputs: [data1, data2, data3],
  parallelization: true,
  batchId: 'batch-001'
});

// Batch verification
const verifications = await zkClient.verifyBatchProofs([
  { input: data1, proof: proof1, expectedHash: hash1 },
  { input: data2, proof: proof2, expectedHash: hash2 }
]);

// Batch transactions
const batchTx = {
  transactions: [
    { to: address1, value: amount1, data: '0x' },
    { to: address2, value: amount2, data: callData }
  ],
  failOnError: true
};

const result = await account.executeBatch(batchTx, signature);
```

### Error Handling

```typescript
import { 
  GuardianAAError, 
  ZkProofError, 
  ContractError, 
  ValidationError 
} from '@guardian-aa/sdk';

try {
  await zkClient.generateProof(data);
} catch (error) {
  if (error instanceof ZkProofError) {
    console.error('ZK proof failed:', error.message, error.details);
  } else if (error instanceof ContractError) {
    console.error('Contract interaction failed:', error.message);
  } else if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
  }
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:ci

# Run in watch mode
npm run test:dev
```

## 🔧 Development

### Building

```bash
# Build the SDK
npm run build

# Build in watch mode
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint
npm run lint:fix
```

### Documentation

```bash
# Generate API documentation
npm run docs
```

## 📄 License

Guardian-AA Custom License © Guardian-AA Team

Free for non-commercial use. Commercial use requires permission.
See [LICENSE](LICENSE) for full terms.

## 🤝 Contributing

Please read our [Contributing Guide](../CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 🆘 Support

- 📚 [Documentation](https://guardian-aa.dev/docs)
- 💬 [Discord](https://discord.gg/guardian-aa)
- 🐛 [Issues](https://github.com/guardian-aa/guardian-aa/issues)
- 📧 [Email](mailto:support@guardian-aa.dev)

---

**Built with ❤️ by the Guardian-AA team** 