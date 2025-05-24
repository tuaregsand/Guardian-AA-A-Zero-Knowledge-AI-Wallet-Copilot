import { q as Address, H as HexString, f as UserOperation } from '../index-DPoAjXlF.js';
import { ethers } from 'ethers';
import 'zod';

/**
 * Validate if a string is a valid Ethereum address
 */
declare function isValidAddress(address: string): address is Address;
/**
 * Validate if a string is a valid hex string
 */
declare function isValidHexString(hex: string): hex is HexString;
/**
 * Validate if a hex string has the correct length for a specific type
 */
declare function isValidHexLength(hex: string, expectedLength: number): boolean;
/**
 * Validate if a string is a valid transaction hash
 */
declare function isValidTxHash(hash: string): boolean;
/**
 * Validate if a string is a valid signature
 */
declare function isValidSignature(signature: string): boolean;
/**
 * Validate if a UserOperation has all required fields
 */
declare function isValidUserOperation(userOp: Partial<UserOperation>): userOp is UserOperation;
/**
 * Validate if a chain ID is supported
 */
declare function isSupportedChainId(chainId: number): boolean;
/**
 * Validate if a URL is valid
 */
declare function isValidUrl(url: string): boolean;
/**
 * Validate if a private key is valid
 */
declare function isValidPrivateKey(privateKey: string): boolean;
/**
 * Validate if a mnemonic phrase is valid
 */
declare function isValidMnemonic(mnemonic: string): boolean;
/**
 * Validate if an amount is a valid positive number
 */
declare function isValidAmount(amount: bigint): boolean;
/**
 * Validate if a gas limit is reasonable
 */
declare function isValidGasLimit(gasLimit: bigint): boolean;
/**
 * Validate if a gas price is reasonable
 */
declare function isValidGasPrice(gasPrice: bigint): boolean;
/**
 * Validate if a threshold is valid for multi-sig
 */
declare function isValidThreshold(threshold: number, totalSigners: number): boolean;
/**
 * Validate if an array of addresses contains only unique valid addresses
 */
declare function areValidUniqueAddresses(addresses: string[]): addresses is Address[];
/**
 * Validate if a salt value is valid
 */
declare function isValidSalt(salt: bigint): boolean;
/**
 * Comprehensive validation for account deployment parameters
 */
declare function validateAccountDeployment(params: {
    owner?: string;
    owners?: string[];
    threshold?: number;
    salt?: bigint;
}): {
    isValid: boolean;
    errors: string[];
};

/**
 * Format an address for display (checksum format)
 */
declare function formatAddress(address: string): Address;
/**
 * Truncate an address for display (0x1234...5678)
 */
declare function truncateAddress(address: string, startChars?: number, endChars?: number): string;
/**
 * Format a hex string to ensure proper 0x prefix
 */
declare function formatHexString(hex: string): HexString;
/**
 * Format wei amount to ether string
 */
declare function formatEther(wei: bigint, decimals?: number): string;
/**
 * Format wei amount to gwei string
 */
declare function formatGwei(wei: bigint, decimals?: number): string;
/**
 * Parse ether string to wei
 */
declare function parseEther(ether: string): bigint;
/**
 * Parse gwei string to wei
 */
declare function parseGwei(gwei: string): bigint;
/**
 * Format a large number with appropriate units (K, M, B)
 */
declare function formatLargeNumber(num: number): string;
/**
 * Format a timestamp to a readable date string
 */
declare function formatTimestamp(timestamp: number): string;
/**
 * Format a duration in seconds to human readable format
 */
declare function formatDuration(seconds: number): string;
/**
 * Format gas amount with appropriate units
 */
declare function formatGas(gas: bigint): string;
/**
 * Format a percentage with specified decimal places
 */
declare function formatPercentage(value: number, decimals?: number): string;
/**
 * Format bytes to human readable format
 */
declare function formatBytes(bytes: number): string;
/**
 * Format a transaction hash for display
 */
declare function formatTxHash(hash: string, startChars?: number, endChars?: number): string;
/**
 * Format a chain ID to network name
 */
declare function formatChainId(chainId: number): string;
/**
 * Format a UserOperation for logging/display
 */
declare function formatUserOperation(userOp: any): string;
/**
 * Pad a hex string to a specific length
 */
declare function padHex(hex: string, length: number): HexString;
/**
 * Convert a number to hex string
 */
declare function numberToHex(num: number | bigint): HexString;
/**
 * Convert hex string to number
 */
declare function hexToNumber(hex: string): number;
/**
 * Format an error message for display
 */
declare function formatError(error: unknown): string;

/**
 * Generate a random private key
 */
declare function generatePrivateKey(): string;
/**
 * Generate a random mnemonic phrase
 */
declare function generateMnemonic(): string;
/**
 * Derive an address from a private key
 */
declare function privateKeyToAddress(privateKey: string): Address;
/**
 * Derive an address from a public key
 */
declare function publicKeyToAddress(publicKey: string): Address;
/**
 * Sign a message with a private key
 */
declare function signMessage(message: string | Uint8Array, privateKey: string): Promise<HexString>;
/**
 * Verify a signature against a message and address
 */
declare function verifySignature(message: string | Uint8Array, signature: string, address: string): boolean;
/**
 * Recover the address from a signature
 */
declare function recoverAddress(message: string | Uint8Array, signature: string): Address;
/**
 * Hash data using SHA256
 */
declare function hashSHA256(data: Uint8Array): Uint8Array;
/**
 * Hash data using Keccak256 (Ethereum's hash function)
 */
declare function hashKeccak256(data: string | Uint8Array): HexString;
/**
 * Hash a string using Keccak256
 */
declare function hashString(str: string): HexString;
/**
 * Generate a deterministic salt from input data
 */
declare function generateSalt(data: string): bigint;
/**
 * Create a message hash for EIP-712 structured data
 */
declare function hashTypedData(domain: ethers.TypedDataDomain, types: Record<string, ethers.TypedDataField[]>, value: Record<string, unknown>): HexString;
/**
 * Sign EIP-712 structured data
 */
declare function signTypedData(privateKey: string, domain: ethers.TypedDataDomain, types: Record<string, ethers.TypedDataField[]>, value: Record<string, unknown>): Promise<HexString>;
/**
 * Verify EIP-712 structured data signature
 */
declare function verifyTypedData(domain: ethers.TypedDataDomain, types: Record<string, ethers.TypedDataField[]>, value: Record<string, unknown>, signature: string, address: string): boolean;
/**
 * Generate a random nonce
 */
declare function generateNonce(): bigint;
/**
 * Generate a secure random salt
 */
declare function generateSecureSalt(): bigint;
/**
 * Derive a child private key from a master private key and path (simplified HD wallet)
 */
declare function derivePrivateKey(masterKey: string, index: number): string;
/**
 * Create a wallet from mnemonic and derivation path
 */
declare function createWalletFromMnemonic(mnemonic: string, path?: string): ethers.Wallet;
/**
 * Encrypt a private key with a password
 */
declare function encryptPrivateKey(privateKey: string, password: string): Promise<string>;
/**
 * Decrypt an encrypted private key with a password
 */
declare function decryptPrivateKey(encryptedKey: string, password: string): Promise<string>;
/**
 * Generate a deterministic address from multiple inputs
 */
declare function generateDeterministicAddress(factory: Address, salt: bigint, initCodeHash: HexString): Address;
/**
 * Split a signature into r, s, v components
 */
declare function splitSignature(signature: string): {
    r: string;
    s: string;
    v: number;
};
/**
 * Join signature components into a signature string
 */
declare function joinSignature(r: string, s: string, v: number): HexString;
/**
 * Generate a UserOperation hash for signing
 */
declare function getUserOpHash(userOp: any, entryPoint: Address, chainId: number): HexString;

/**
 * Supported blockchain networks
 */
declare const SUPPORTED_NETWORKS: {
    readonly ETHEREUM_MAINNET: {
        readonly chainId: 1;
        readonly name: "Ethereum Mainnet";
        readonly rpcUrl: "https://mainnet.infura.io/v3/";
        readonly explorerUrl: "https://etherscan.io";
        readonly currency: "ETH";
        readonly isTestnet: false;
    };
    readonly ETHEREUM_SEPOLIA: {
        readonly chainId: 11155111;
        readonly name: "Ethereum Sepolia";
        readonly rpcUrl: "https://sepolia.infura.io/v3/";
        readonly explorerUrl: "https://sepolia.etherscan.io";
        readonly currency: "ETH";
        readonly isTestnet: true;
    };
    readonly POLYGON_MAINNET: {
        readonly chainId: 137;
        readonly name: "Polygon Mainnet";
        readonly rpcUrl: "https://polygon-rpc.com";
        readonly explorerUrl: "https://polygonscan.com";
        readonly currency: "MATIC";
        readonly isTestnet: false;
    };
    readonly POLYGON_MUMBAI: {
        readonly chainId: 80001;
        readonly name: "Polygon Mumbai";
        readonly rpcUrl: "https://rpc-mumbai.maticvigil.com";
        readonly explorerUrl: "https://mumbai.polygonscan.com";
        readonly currency: "MATIC";
        readonly isTestnet: true;
    };
    readonly ARBITRUM_ONE: {
        readonly chainId: 42161;
        readonly name: "Arbitrum One";
        readonly rpcUrl: "https://arb1.arbitrum.io/rpc";
        readonly explorerUrl: "https://arbiscan.io";
        readonly currency: "ETH";
        readonly isTestnet: false;
    };
    readonly ARBITRUM_SEPOLIA: {
        readonly chainId: 421614;
        readonly name: "Arbitrum Sepolia";
        readonly rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc";
        readonly explorerUrl: "https://sepolia.arbiscan.io";
        readonly currency: "ETH";
        readonly isTestnet: true;
    };
    readonly OPTIMISM_MAINNET: {
        readonly chainId: 10;
        readonly name: "Optimism Mainnet";
        readonly rpcUrl: "https://mainnet.optimism.io";
        readonly explorerUrl: "https://optimistic.etherscan.io";
        readonly currency: "ETH";
        readonly isTestnet: false;
    };
    readonly OPTIMISM_SEPOLIA: {
        readonly chainId: 11155420;
        readonly name: "Optimism Sepolia";
        readonly rpcUrl: "https://sepolia.optimism.io";
        readonly explorerUrl: "https://sepolia-optimistic.etherscan.io";
        readonly currency: "ETH";
        readonly isTestnet: true;
    };
};
/**
 * Standard ERC-4337 EntryPoint address (v0.6)
 */
declare const ENTRYPOINT_ADDRESS_V06: Address;
/**
 * Default gas limits for various operations
 */
declare const GAS_LIMITS: {
    readonly ACCOUNT_DEPLOYMENT: 1000000n;
    readonly SIMPLE_EXECUTION: 35000n;
    readonly MULTI_SIG_EXECUTION: 100000n;
    readonly VERIFICATION_GAS: 70000n;
    readonly PRE_VERIFICATION_GAS: 21000n;
    readonly PAYMASTER_VERIFICATION: 50000n;
};
/**
 * Gas price constants (in wei)
 */
declare const GAS_PRICES: {
    readonly MIN_GAS_PRICE: 1000000000n;
    readonly MAX_GAS_PRICE: 1000000000000n;
    readonly DEFAULT_GAS_PRICE: 20000000000n;
};
/**
 * Contract addresses for supported networks
 */
declare const UTILS_CONTRACT_ADDRESSES: Record<number, {
    entryPoint: Address;
    accountFactory: Address;
    multiSigFactory: Address;
    verifyingPaymaster: Address;
}>;
/**
 * Zero-knowledge proof system parameters
 */
declare const UTILS_ZK_CONSTANTS: {
    readonly DEFAULT_CIRCUIT_K: 14;
    readonly MIN_CIRCUIT_K: 10;
    readonly MAX_CIRCUIT_K: 20;
    readonly MAX_INPUT_SIZE: number;
    readonly SHA256_HASH_SIZE: 32;
    readonly TARGET_PROOF_TIME_MS: 500;
    readonly MAX_PROOF_TIME_MS: 30000;
    readonly PROOF_CACHE_TTL_MS: number;
};
/**
 * Address validation patterns
 */
declare const VALIDATION_PATTERNS: {
    readonly ETH_ADDRESS: RegExp;
    readonly HEX_STRING: RegExp;
    readonly TX_HASH: RegExp;
    readonly PRIVATE_KEY: RegExp;
};
/**
 * Limits for various operations
 */
declare const LIMITS: {
    readonly MAX_TRANSACTION_SIZE: number;
    readonly MAX_BATCH_SIZE: 100;
    readonly MAX_SIGNERS: 20;
    readonly MIN_THRESHOLD: 1;
    readonly MAX_NONCE: bigint;
};
/**
 * Standard error messages
 */
declare const ERROR_MESSAGES: {
    readonly INVALID_ADDRESS: "Invalid Ethereum address";
    readonly INVALID_SIGNATURE: "Invalid signature format";
    readonly INVALID_AMOUNT: "Amount must be positive";
    readonly INSUFFICIENT_BALANCE: "Insufficient balance for operation";
    readonly NETWORK_NOT_SUPPORTED: "Network not supported";
    readonly TRANSACTION_FAILED: "Transaction execution failed";
    readonly TIMEOUT_EXCEEDED: "Operation timeout exceeded";
    readonly INVALID_CONFIGURATION: "Invalid configuration provided";
};
/**
 * Time-related constants (in seconds)
 */
declare const TIME: {
    readonly SECOND: 1;
    readonly MINUTE: 60;
    readonly HOUR: 3600;
    readonly DAY: 86400;
    readonly WEEK: 604800;
    readonly MONTH: 2592000;
    readonly YEAR: 31536000;
};
/**
 * Default timeouts (in milliseconds)
 */
declare const TIMEOUTS: {
    readonly NETWORK_REQUEST: 10000;
    readonly TRANSACTION_CONFIRMATION: 60000;
    readonly PROOF_GENERATION: 30000;
    readonly CONTRACT_DEPLOYMENT: 120000;
};
/**
 * Feature flags for optional functionality
 */
declare const FEATURE_FLAGS: {
    readonly ENABLE_ZK_PROOFS: true;
    readonly ENABLE_GASLESS_TRANSACTIONS: true;
    readonly ENABLE_MULTI_SIG: true;
    readonly ENABLE_SOCIAL_RECOVERY: false;
    readonly ENABLE_BATCH_TRANSACTIONS: true;
    readonly ENABLE_CROSS_CHAIN: false;
};
/**
 * SDK version and compatibility information
 */
declare const VERSION_INFO: {
    readonly SDK_VERSION: "0.1.0";
    readonly ERC_4337_VERSION: "0.6.0";
    readonly SUPPORTED_SOLIDITY_VERSION: "^0.8.25";
    readonly MIN_NODE_VERSION: "18.0.0";
};
/**
 * Constants for development and testing
 */
declare const DEV_CONSTANTS: {
    readonly LOCAL_CHAIN_ID: 31337;
    readonly LOCAL_RPC_URL: "http://127.0.0.1:8545";
    readonly TEST_PRIVATE_KEY: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    readonly TEST_MNEMONIC: "test test test test test test test test test test test junk";
};

export { DEV_CONSTANTS, ENTRYPOINT_ADDRESS_V06, ERROR_MESSAGES, FEATURE_FLAGS, GAS_LIMITS, GAS_PRICES, LIMITS, SUPPORTED_NETWORKS, TIME, TIMEOUTS, UTILS_CONTRACT_ADDRESSES, UTILS_ZK_CONSTANTS, VALIDATION_PATTERNS, VERSION_INFO, areValidUniqueAddresses, createWalletFromMnemonic, decryptPrivateKey, derivePrivateKey, encryptPrivateKey, formatAddress, formatBytes, formatChainId, formatDuration, formatError, formatEther, formatGas, formatGwei, formatHexString, formatLargeNumber, formatPercentage, formatTimestamp, formatTxHash, formatUserOperation, generateDeterministicAddress, generateMnemonic, generateNonce, generatePrivateKey, generateSalt, generateSecureSalt, getUserOpHash, hashKeccak256, hashSHA256, hashString, hashTypedData, hexToNumber, isSupportedChainId, isValidAddress, isValidAmount, isValidGasLimit, isValidGasPrice, isValidHexLength, isValidHexString, isValidMnemonic, isValidPrivateKey, isValidSalt, isValidSignature, isValidThreshold, isValidTxHash, isValidUrl, isValidUserOperation, joinSignature, numberToHex, padHex, parseEther, parseGwei, privateKeyToAddress, publicKeyToAddress, recoverAddress, signMessage, signTypedData, splitSignature, truncateAddress, validateAccountDeployment, verifySignature, verifyTypedData };
