import type { Address } from '../types';

// ============================================================================
// Network Constants
// ============================================================================

/**
 * Supported blockchain networks
 */
export const SUPPORTED_NETWORKS = {
  ETHEREUM_MAINNET: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    explorerUrl: 'https://etherscan.io',
    currency: 'ETH',
    isTestnet: false,
  },
  ETHEREUM_SEPOLIA: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    explorerUrl: 'https://sepolia.etherscan.io',
    currency: 'ETH',
    isTestnet: true,
  },
  POLYGON_MAINNET: {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    currency: 'MATIC',
    isTestnet: false,
  },
  POLYGON_MUMBAI: {
    chainId: 80001,
    name: 'Polygon Mumbai',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    explorerUrl: 'https://mumbai.polygonscan.com',
    currency: 'MATIC',
    isTestnet: true,
  },
  ARBITRUM_ONE: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    currency: 'ETH',
    isTestnet: false,
  },
  ARBITRUM_SEPOLIA: {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io',
    currency: 'ETH',
    isTestnet: true,
  },
  OPTIMISM_MAINNET: {
    chainId: 10,
    name: 'Optimism Mainnet',
    rpcUrl: 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
    currency: 'ETH',
    isTestnet: false,
  },
  OPTIMISM_SEPOLIA: {
    chainId: 11155420,
    name: 'Optimism Sepolia',
    rpcUrl: 'https://sepolia.optimism.io',
    explorerUrl: 'https://sepolia-optimistic.etherscan.io',
    currency: 'ETH',
    isTestnet: true,
  },
} as const;

// ============================================================================
// Contract Constants
// ============================================================================

/**
 * Standard ERC-4337 EntryPoint address (v0.6)
 */
export const ENTRYPOINT_ADDRESS_V06: Address = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

/**
 * Default gas limits for various operations
 */
export const GAS_LIMITS = {
  ACCOUNT_DEPLOYMENT: 1000000n,
  SIMPLE_EXECUTION: 35000n,
  MULTI_SIG_EXECUTION: 100000n,
  VERIFICATION_GAS: 70000n,
  PRE_VERIFICATION_GAS: 21000n,
  PAYMASTER_VERIFICATION: 50000n,
} as const;

/**
 * Gas price constants (in wei)
 */
export const GAS_PRICES = {
  MIN_GAS_PRICE: 1000000000n, // 1 gwei
  MAX_GAS_PRICE: 1000000000000n, // 1000 gwei
  DEFAULT_GAS_PRICE: 20000000000n, // 20 gwei
} as const;

/**
 * Contract addresses for supported networks
 */
export const UTILS_CONTRACT_ADDRESSES: Record<number, {
  entryPoint: Address;
  accountFactory: Address;
  multiSigFactory: Address;
  verifyingPaymaster: Address;
}> = {
  // Ethereum Sepolia
  [SUPPORTED_NETWORKS.ETHEREUM_SEPOLIA.chainId]: {
    entryPoint: ENTRYPOINT_ADDRESS_V06,
    accountFactory: '0x9406Cc6185a346906296840746125a0E44976454' as Address,
    multiSigFactory: '0x000000000000000000000000000000000000dEaD' as Address,
    verifyingPaymaster: '0x000000000000000000000000000000000000dEaD' as Address,
  },
  // Polygon Mumbai
  [SUPPORTED_NETWORKS.POLYGON_MUMBAI.chainId]: {
    entryPoint: ENTRYPOINT_ADDRESS_V06,
    accountFactory: '0x000000000000000000000000000000000000dEaD' as Address,
    multiSigFactory: '0x000000000000000000000000000000000000dEaD' as Address,
    verifyingPaymaster: '0x000000000000000000000000000000000000dEaD' as Address,
  },
};

// ============================================================================
// ZK Proof Constants
// ============================================================================

/**
 * Zero-knowledge proof system parameters
 */
export const UTILS_ZK_CONSTANTS = {
  DEFAULT_CIRCUIT_K: 14,
  MIN_CIRCUIT_K: 10,
  MAX_CIRCUIT_K: 20,
  MAX_INPUT_SIZE: 1024 * 1024, // 1MB
  SHA256_HASH_SIZE: 32,
  TARGET_PROOF_TIME_MS: 500,
  MAX_PROOF_TIME_MS: 30000,
  PROOF_CACHE_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// ============================================================================
// Validation Constants
// ============================================================================

/**
 * Address validation patterns
 */
export const VALIDATION_PATTERNS = {
  ETH_ADDRESS: /^0x[a-fA-F0-9]{40}$/,
  HEX_STRING: /^0x[a-fA-F0-9]*$/,
  TX_HASH: /^0x[a-fA-F0-9]{64}$/,
  PRIVATE_KEY: /^0x[a-fA-F0-9]{64}$/,
} as const;

/**
 * Limits for various operations
 */
export const LIMITS = {
  MAX_TRANSACTION_SIZE: 128 * 1024, // 128KB
  MAX_BATCH_SIZE: 100,
  MAX_SIGNERS: 20,
  MIN_THRESHOLD: 1,
  MAX_NONCE: 2n ** 256n - 1n,
} as const;

// ============================================================================
// Error Messages
// ============================================================================

/**
 * Standard error messages
 */
export const ERROR_MESSAGES = {
  INVALID_ADDRESS: 'Invalid Ethereum address',
  INVALID_SIGNATURE: 'Invalid signature format',
  INVALID_AMOUNT: 'Amount must be positive',
  INSUFFICIENT_BALANCE: 'Insufficient balance for operation',
  NETWORK_NOT_SUPPORTED: 'Network not supported',
  TRANSACTION_FAILED: 'Transaction execution failed',
  TIMEOUT_EXCEEDED: 'Operation timeout exceeded',
  INVALID_CONFIGURATION: 'Invalid configuration provided',
} as const;

// ============================================================================
// Time Constants
// ============================================================================

/**
 * Time-related constants (in seconds)
 */
export const TIME = {
  SECOND: 1,
  MINUTE: 60,
  HOUR: 3600,
  DAY: 86400,
  WEEK: 604800,
  MONTH: 2592000, // 30 days
  YEAR: 31536000, // 365 days
} as const;

/**
 * Default timeouts (in milliseconds)
 */
export const TIMEOUTS = {
  NETWORK_REQUEST: 10000, // 10 seconds
  TRANSACTION_CONFIRMATION: 60000, // 1 minute
  PROOF_GENERATION: 30000, // 30 seconds
  CONTRACT_DEPLOYMENT: 120000, // 2 minutes
} as const;

// ============================================================================
// Feature Flags
// ============================================================================

/**
 * Feature flags for optional functionality
 */
export const FEATURE_FLAGS = {
  ENABLE_ZK_PROOFS: true,
  ENABLE_GASLESS_TRANSACTIONS: true,
  ENABLE_MULTI_SIG: true,
  ENABLE_SOCIAL_RECOVERY: false, // Future feature
  ENABLE_BATCH_TRANSACTIONS: true,
  ENABLE_CROSS_CHAIN: false, // Future feature
} as const;

// ============================================================================
// Version Information
// ============================================================================

/**
 * SDK version and compatibility information
 */
export const VERSION_INFO = {
  SDK_VERSION: '0.1.0',
  ERC_4337_VERSION: '0.6.0',
  SUPPORTED_SOLIDITY_VERSION: '^0.8.25',
  MIN_NODE_VERSION: '18.0.0',
} as const;

// ============================================================================
// Development Constants
// ============================================================================

/**
 * Constants for development and testing
 */
export const DEV_CONSTANTS = {
  LOCAL_CHAIN_ID: 31337,
  LOCAL_RPC_URL: 'http://127.0.0.1:8545',
  TEST_PRIVATE_KEY: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  TEST_MNEMONIC: 'test test test test test test test test test test test junk',
} as const; 