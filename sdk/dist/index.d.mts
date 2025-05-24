import { S as SdkConfig, N as NetworkConfig, Z as ZkProofConfig, A as AccountConfig } from './index-DPoAjXlF.mjs';
export { g as AccountConfigSchema, q as Address, p as AsyncResult, k as BatchTransaction, B as BatchTransactionSchema, r as Bytes32, u as CONTRACT_ADDRESSES, o as ConfigError, t as ContractAddresses, C as ContractError, D as DEFAULT_GAS_LIMITS, G as GuardianAAError, H as HexString, h as MultiSigConfig, M as MultiSigConfigSchema, l as NetworkConfigSchema, i as PaymasterConfig, P as PaymasterConfigSchema, R as Result, s as SUPPORTED_CHAINS, m as SdkConfigSchema, j as TransactionData, T as TransactionDataSchema, f as UserOperation, U as UserOperationSchema, V as ValidationError, e as ZkProofConfigSchema, n as ZkProofError, b as ZkProofOutput, a as ZkProofOutputSchema, d as ZkProofResult, c as ZkProofResultSchema } from './index-DPoAjXlF.mjs';
import { ZkClient } from './zk/index.mjs';
export { BatchProofResult, BatchProofResultSchema, CircuitStats, CircuitStatsSchema, FFIInput, FFIOutput, ProofBatch, ProofBatchSchema, ProverConfig, ProverConfigSchema, ProverMetrics, ProverMetricsSchema, ProvingKeyCache, ProvingKeyCacheSchema, VerificationResult, VerificationResultSchema, VerificationStatus, VerificationStatusSchema, ZK_CONSTANTS, ZK_ERROR_CODES, ZkErrorCode, ZkProver, ZkVerifier } from './zk/index.mjs';
import { ContractsClient } from './contracts/index.mjs';
export { AccountDeploymentResult, AccountFactoryConfig, AccountFactoryManager, AccountOperationResult, AccountOperationResultSchema, BaseAccount, CONTRACT_GAS_LIMITS, ContractCallConfig, ContractCallConfigSchema, ContractDeployConfig, ContractDeployConfigSchema, ContractEvent, ContractEventSchema, ContractPaymasterConfig, ContractsClientConfig, DEFAULT_CONTRACT_ADDRESSES, ENTRY_POINT_ABI, EntryPointClient, EventFilter, EventFilterSchema, FUNCTION_SELECTORS, GasEstimation, GasEstimationSchema, MULTI_SIG_ACCOUNT_ABI, MultiSigAccount, MultiSigAccountFactory, PaymasterFactory, PaymasterSignature, SIMPLE_ACCOUNT_ABI, SignatureData, SignatureDataSchema, SimpleAccount, SimpleAccountFactory, VERIFYING_PAYMASTER_ABI, VerifyingPaymaster } from './contracts/index.mjs';
export { DEV_CONSTANTS, ENTRYPOINT_ADDRESS_V06, ERROR_MESSAGES, FEATURE_FLAGS, GAS_LIMITS, GAS_PRICES, LIMITS, SUPPORTED_NETWORKS, TIME, TIMEOUTS, UTILS_CONTRACT_ADDRESSES, UTILS_ZK_CONSTANTS, VALIDATION_PATTERNS, VERSION_INFO, areValidUniqueAddresses, createWalletFromMnemonic, decryptPrivateKey, derivePrivateKey, encryptPrivateKey, formatAddress, formatBytes, formatChainId, formatDuration, formatError, formatEther, formatGas, formatGwei, formatHexString, formatLargeNumber, formatPercentage, formatTimestamp, formatTxHash, formatUserOperation, generateDeterministicAddress, generateMnemonic, generateNonce, generatePrivateKey, generateSalt, generateSecureSalt, getUserOpHash, hashKeccak256, hashSHA256, hashString, hashTypedData, hexToNumber, isSupportedChainId, isValidAddress, isValidAmount, isValidGasLimit, isValidGasPrice, isValidHexLength, isValidHexString, isValidMnemonic, isValidPrivateKey, isValidSalt, isValidSignature, isValidThreshold, isValidTxHash, isValidUrl, isValidUserOperation, joinSignature, numberToHex, padHex, parseEther, parseGwei, privateKeyToAddress, publicKeyToAddress, recoverAddress, signMessage, signTypedData, splitSignature, truncateAddress, validateAccountDeployment, verifySignature, verifyTypedData } from './utils/index.mjs';
import { ethers } from 'ethers';
import 'zod';

/**
 * Guardian-AA SDK
 * Zero-Knowledge AI Wallet Copilot
 *
 * A comprehensive TypeScript SDK for building applications with Guardian-AA,
 * featuring zero-knowledge proofs, account abstraction, and gasless transactions.
 *
 * @version 0.1.0
 * @author Guardian-AA Team
 * @license MIT
 */

/**
 * Main Guardian-AA SDK client
 * Provides a unified interface for all Guardian-AA functionality
 */
declare class GuardianAA {
    private config;
    private zkClient;
    private contractsClient;
    private provider;
    private signer;
    constructor(config: SdkConfig);
    /**
     * Initialize the SDK
     */
    initialize(signer?: ethers.Wallet): Promise<void>;
    /**
     * Get the ZK client for zero-knowledge proof operations
     */
    getZkClient(): ZkClient;
    /**
     * Get the contracts client for blockchain operations
     */
    getContractsClient(): ContractsClient;
    /**
     * Get the current provider
     */
    getProvider(): ethers.Provider;
    /**
     * Get the current signer
     */
    getSigner(): ethers.Wallet;
    /**
     * Update the signer
     */
    updateSigner(signer: ethers.Wallet): void;
    /**
     * Get the current configuration
     */
    getConfig(): SdkConfig;
    /**
     * Update the configuration
     */
    updateConfig(newConfig: Partial<SdkConfig>): void;
    /**
     * Check if the SDK is ready for operations
     */
    isReady(): boolean;
    /**
     * Cleanup SDK resources
     */
    cleanup(): Promise<void>;
    /**
     * Validate the SDK configuration
     */
    private validateConfig;
}
/**
 * Create a Guardian-AA SDK instance with minimal configuration
 */
declare function createGuardianAA(network: NetworkConfig, options?: {
    zkConfig?: ZkProofConfig;
    accountConfig?: AccountConfig;
    debug?: boolean;
}): GuardianAA;
/**
 * Create a Guardian-AA SDK instance for Ethereum Sepolia testnet
 */
declare function createSepoliaGuardianAA(rpcUrl?: string, options?: {
    zkConfig?: ZkProofConfig;
    debug?: boolean;
}): GuardianAA;
/**
 * Create a Guardian-AA SDK instance for local development
 */
declare function createLocalGuardianAA(rpcUrl?: string, options?: {
    zkConfig?: ZkProofConfig;
    debug?: boolean;
}): GuardianAA;
/**
 * Get SDK version information
 */
declare function getVersion(): {
    sdk: string;
    erc4337: string;
    solidity: string;
};

export { AccountConfig, ContractsClient, GuardianAA, NetworkConfig, SdkConfig, ZkClient, ZkProofConfig, createGuardianAA, createLocalGuardianAA, createSepoliaGuardianAA, getVersion };
