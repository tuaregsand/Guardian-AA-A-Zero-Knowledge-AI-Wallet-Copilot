import { z } from 'zod';

// ============================================================================
// ZK Proof Types
// ============================================================================

/**
 * Schema for ZK proof output from the Halo2 circuit
 */
export const ZkProofOutputSchema = z.object({
  /** Length of the original input data */
  len: z.number().int().nonnegative(),
  /** SHA256 hash of the input as 32-byte array */
  hash: z.array(z.number().int().min(0).max(255)).length(32),
});

export type ZkProofOutput = z.infer<typeof ZkProofOutputSchema>;

/**
 * Schema for ZK proof generation result with proof bytes
 */
export const ZkProofResultSchema = z.object({
  /** SHA256 hash of the input */
  hash: z.array(z.number().int().min(0).max(255)).length(32),
  /** Serialized proof bytes */
  proof: z.instanceof(Uint8Array),
  /** Proof generation time in milliseconds */
  generationTime: z.number().int().nonnegative(),
});

export type ZkProofResult = z.infer<typeof ZkProofResultSchema>;

/**
 * Configuration for ZK proof generation
 */
export const ZkProofConfigSchema = z.object({
  /** Circuit size parameter (k value) */
  circuitK: z.number().int().min(10).max(20).default(14),
  /** Whether to use cached proving keys */
  useCachedKeys: z.boolean().default(true),
  /** Timeout for proof generation in milliseconds */
  timeout: z.number().int().positive().default(30000),
});

export type ZkProofConfig = z.infer<typeof ZkProofConfigSchema>;

// ============================================================================
// Account Abstraction Types (ERC-4337)
// ============================================================================

/**
 * Schema for UserOperation as defined in ERC-4337
 */
export const UserOperationSchema = z.object({
  sender: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  nonce: z.bigint(),
  initCode: z.string().regex(/^0x[a-fA-F0-9]*$/),
  callData: z.string().regex(/^0x[a-fA-F0-9]*$/),
  callGasLimit: z.bigint(),
  verificationGasLimit: z.bigint(),
  preVerificationGas: z.bigint(),
  maxFeePerGas: z.bigint(),
  maxPriorityFeePerGas: z.bigint(),
  paymasterAndData: z.string().regex(/^0x[a-fA-F0-9]*$/),
  signature: z.string().regex(/^0x[a-fA-F0-9]*$/),
});

export type UserOperation = z.infer<typeof UserOperationSchema>;

/**
 * Schema for account configuration
 */
export const AccountConfigSchema = z.object({
  /** Account implementation address */
  implementation: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Account factory address */
  factory: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Entry point address */
  entryPoint: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Initial account owner */
  owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Salt for deterministic address generation */
  salt: z.bigint().default(0n),
});

export type AccountConfig = z.infer<typeof AccountConfigSchema>;

/**
 * Schema for multi-signature account configuration
 */
export const MultiSigConfigSchema = z.object({
  /** List of signer addresses */
  signers: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/)).min(1),
  /** Required number of signatures (threshold) */
  threshold: z.number().int().positive(),
  /** Delay for signer management operations in seconds */
  delay: z.number().int().nonnegative().default(0),
});

export type MultiSigConfig = z.infer<typeof MultiSigConfigSchema>;

/**
 * Schema for paymaster configuration
 */
export const PaymasterConfigSchema = z.object({
  /** Paymaster contract address */
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Verifying signer for paymaster */
  signer: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Valid until timestamp */
  validUntil: z.number().int().nonnegative(),
  /** Valid after timestamp */
  validAfter: z.number().int().nonnegative(),
});

export type PaymasterConfig = z.infer<typeof PaymasterConfigSchema>;

// ============================================================================
// Transaction Types
// ============================================================================

/**
 * Schema for transaction data
 */
export const TransactionDataSchema = z.object({
  /** Target contract address */
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Value in wei */
  value: z.bigint().default(0n),
  /** Call data */
  data: z.string().regex(/^0x[a-fA-F0-9]*$/),
  /** Operation type (0 = call, 1 = delegatecall) */
  operation: z.number().int().min(0).max(1).default(0),
});

export type TransactionData = z.infer<typeof TransactionDataSchema>;

/**
 * Schema for batch transaction
 */
export const BatchTransactionSchema = z.object({
  /** Array of transaction data */
  transactions: z.array(TransactionDataSchema).min(1),
  /** Whether to fail on first error */
  failOnError: z.boolean().default(true),
});

export type BatchTransaction = z.infer<typeof BatchTransactionSchema>;

// ============================================================================
// Network Types
// ============================================================================

/**
 * Schema for network configuration
 */
export const NetworkConfigSchema = z.object({
  /** Chain ID */
  chainId: z.number().int().positive(),
  /** Network name */
  name: z.string().min(1),
  /** RPC URL */
  rpcUrl: z.string().url(),
  /** Block explorer URL */
  explorerUrl: z.string().url().optional(),
  /** Native currency symbol */
  currency: z.string().min(1).default('ETH'),
  /** Whether this is a testnet */
  isTestnet: z.boolean().default(false),
});

export type NetworkConfig = z.infer<typeof NetworkConfigSchema>;

// ============================================================================
// SDK Configuration Types
// ============================================================================

/**
 * Schema for SDK configuration
 */
export const SdkConfigSchema = z.object({
  /** Network configuration */
  network: NetworkConfigSchema,
  /** ZK proof configuration */
  zkConfig: ZkProofConfigSchema.optional(),
  /** Account configuration */
  accountConfig: AccountConfigSchema.optional(),
  /** Paymaster configuration */
  paymasterConfig: PaymasterConfigSchema.optional(),
  /** Enable debug logging */
  debug: z.boolean().default(false),
});

export type SdkConfig = z.infer<typeof SdkConfigSchema>;

// ============================================================================
// Error Types
// ============================================================================

/**
 * Base error class for Guardian-AA SDK
 */
export class GuardianAAError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'GuardianAAError';
  }
}

/**
 * ZK proof related errors
 */
export class ZkProofError extends GuardianAAError {
  constructor(message: string, details?: unknown) {
    super(message, 'ZK_PROOF_ERROR', details);
    this.name = 'ZkProofError';
  }
}

/**
 * Contract interaction errors
 */
export class ContractError extends GuardianAAError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONTRACT_ERROR', details);
    this.name = 'ContractError';
  }
}

/**
 * Configuration errors
 */
export class ConfigError extends GuardianAAError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}

/**
 * Validation errors
 */
export class ValidationError extends GuardianAAError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Hex string type
 */
export type HexString = `0x${string}`;

/**
 * Address type (20-byte hex string)
 */
export type Address = `0x${string}`;

/**
 * Bytes32 type (32-byte hex string)
 */
export type Bytes32 = `0x${string}`;

// ============================================================================
// Constants
// ============================================================================

/**
 * Default gas limits for various operations
 */
export const DEFAULT_GAS_LIMITS = {
  VERIFICATION: 70000n,
  CALL: 35000n,
  CREATION: 1000000n,
  PRE_VERIFICATION: 21000n,
} as const;

/**
 * Supported chain IDs
 */
export const SUPPORTED_CHAINS = {
  ETHEREUM_MAINNET: 1,
  ETHEREUM_SEPOLIA: 11155111,
  POLYGON_MAINNET: 137,
  POLYGON_MUMBAI: 80001,
  ARBITRUM_ONE: 42161,
  ARBITRUM_SEPOLIA: 421614,
  OPTIMISM_MAINNET: 10,
  OPTIMISM_SEPOLIA: 11155420,
} as const;

/**
 * Contract addresses for different chains
 */
export type ContractAddresses = {
  entryPoint: Address;
  accountFactory: Address;
  multiSigFactory: Address;
  verifyingPaymaster: Address;
};

export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  // Ethereum Sepolia
  [SUPPORTED_CHAINS.ETHEREUM_SEPOLIA]: {
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    accountFactory: '0x9406Cc6185a346906296840746125a0E44976454',
    multiSigFactory: '0x000000000000000000000000000000000000dEaD',
    verifyingPaymaster: '0x000000000000000000000000000000000000dEaD',
  },
  // Add more chains as needed
}; 