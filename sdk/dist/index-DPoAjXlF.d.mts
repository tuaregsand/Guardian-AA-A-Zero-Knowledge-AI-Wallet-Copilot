import { z } from 'zod';

/**
 * Schema for ZK proof output from the Halo2 circuit
 */
declare const ZkProofOutputSchema: z.ZodObject<{
    /** Length of the original input data */
    len: z.ZodNumber;
    /** SHA256 hash of the input as 32-byte array */
    hash: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    len: number;
    hash: number[];
}, {
    len: number;
    hash: number[];
}>;
type ZkProofOutput = z.infer<typeof ZkProofOutputSchema>;
/**
 * Schema for ZK proof generation result with proof bytes
 */
declare const ZkProofResultSchema: z.ZodObject<{
    /** SHA256 hash of the input */
    hash: z.ZodArray<z.ZodNumber, "many">;
    /** Serialized proof bytes */
    proof: z.ZodType<Uint8Array<ArrayBuffer>, z.ZodTypeDef, Uint8Array<ArrayBuffer>>;
    /** Proof generation time in milliseconds */
    generationTime: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    hash: number[];
    proof: Uint8Array<ArrayBuffer>;
    generationTime: number;
}, {
    hash: number[];
    proof: Uint8Array<ArrayBuffer>;
    generationTime: number;
}>;
type ZkProofResult = z.infer<typeof ZkProofResultSchema>;
/**
 * Configuration for ZK proof generation
 */
declare const ZkProofConfigSchema: z.ZodObject<{
    /** Circuit size parameter (k value) */
    circuitK: z.ZodDefault<z.ZodNumber>;
    /** Whether to use cached proving keys */
    useCachedKeys: z.ZodDefault<z.ZodBoolean>;
    /** Timeout for proof generation in milliseconds */
    timeout: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    circuitK: number;
    useCachedKeys: boolean;
    timeout: number;
}, {
    circuitK?: number | undefined;
    useCachedKeys?: boolean | undefined;
    timeout?: number | undefined;
}>;
type ZkProofConfig = z.infer<typeof ZkProofConfigSchema>;
/**
 * Schema for UserOperation as defined in ERC-4337
 */
declare const UserOperationSchema: z.ZodObject<{
    sender: z.ZodString;
    nonce: z.ZodBigInt;
    initCode: z.ZodString;
    callData: z.ZodString;
    callGasLimit: z.ZodBigInt;
    verificationGasLimit: z.ZodBigInt;
    preVerificationGas: z.ZodBigInt;
    maxFeePerGas: z.ZodBigInt;
    maxPriorityFeePerGas: z.ZodBigInt;
    paymasterAndData: z.ZodString;
    signature: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sender: string;
    nonce: bigint;
    initCode: string;
    callData: string;
    callGasLimit: bigint;
    verificationGasLimit: bigint;
    preVerificationGas: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
    paymasterAndData: string;
    signature: string;
}, {
    sender: string;
    nonce: bigint;
    initCode: string;
    callData: string;
    callGasLimit: bigint;
    verificationGasLimit: bigint;
    preVerificationGas: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
    paymasterAndData: string;
    signature: string;
}>;
type UserOperation = z.infer<typeof UserOperationSchema>;
/**
 * Schema for account configuration
 */
declare const AccountConfigSchema: z.ZodObject<{
    /** Account implementation address */
    implementation: z.ZodString;
    /** Account factory address */
    factory: z.ZodString;
    /** Entry point address */
    entryPoint: z.ZodString;
    /** Initial account owner */
    owner: z.ZodString;
    /** Salt for deterministic address generation */
    salt: z.ZodDefault<z.ZodBigInt>;
}, "strip", z.ZodTypeAny, {
    implementation: string;
    factory: string;
    entryPoint: string;
    owner: string;
    salt: bigint;
}, {
    implementation: string;
    factory: string;
    entryPoint: string;
    owner: string;
    salt?: bigint | undefined;
}>;
type AccountConfig = z.infer<typeof AccountConfigSchema>;
/**
 * Schema for multi-signature account configuration
 */
declare const MultiSigConfigSchema: z.ZodObject<{
    /** List of signer addresses */
    signers: z.ZodArray<z.ZodString, "many">;
    /** Required number of signatures (threshold) */
    threshold: z.ZodNumber;
    /** Delay for signer management operations in seconds */
    delay: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    signers: string[];
    threshold: number;
    delay: number;
}, {
    signers: string[];
    threshold: number;
    delay?: number | undefined;
}>;
type MultiSigConfig = z.infer<typeof MultiSigConfigSchema>;
/**
 * Schema for paymaster configuration
 */
declare const PaymasterConfigSchema: z.ZodObject<{
    /** Paymaster contract address */
    address: z.ZodString;
    /** Verifying signer for paymaster */
    signer: z.ZodString;
    /** Valid until timestamp */
    validUntil: z.ZodNumber;
    /** Valid after timestamp */
    validAfter: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    address: string;
    signer: string;
    validUntil: number;
    validAfter: number;
}, {
    address: string;
    signer: string;
    validUntil: number;
    validAfter: number;
}>;
type PaymasterConfig = z.infer<typeof PaymasterConfigSchema>;
/**
 * Schema for transaction data
 */
declare const TransactionDataSchema: z.ZodObject<{
    /** Target contract address */
    to: z.ZodString;
    /** Value in wei */
    value: z.ZodDefault<z.ZodBigInt>;
    /** Call data */
    data: z.ZodString;
    /** Operation type (0 = call, 1 = delegatecall) */
    operation: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    value: bigint;
    to: string;
    data: string;
    operation: number;
}, {
    to: string;
    data: string;
    value?: bigint | undefined;
    operation?: number | undefined;
}>;
type TransactionData = z.infer<typeof TransactionDataSchema>;
/**
 * Schema for batch transaction
 */
declare const BatchTransactionSchema: z.ZodObject<{
    /** Array of transaction data */
    transactions: z.ZodArray<z.ZodObject<{
        /** Target contract address */
        to: z.ZodString;
        /** Value in wei */
        value: z.ZodDefault<z.ZodBigInt>;
        /** Call data */
        data: z.ZodString;
        /** Operation type (0 = call, 1 = delegatecall) */
        operation: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        value: bigint;
        to: string;
        data: string;
        operation: number;
    }, {
        to: string;
        data: string;
        value?: bigint | undefined;
        operation?: number | undefined;
    }>, "many">;
    /** Whether to fail on first error */
    failOnError: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    transactions: {
        value: bigint;
        to: string;
        data: string;
        operation: number;
    }[];
    failOnError: boolean;
}, {
    transactions: {
        to: string;
        data: string;
        value?: bigint | undefined;
        operation?: number | undefined;
    }[];
    failOnError?: boolean | undefined;
}>;
type BatchTransaction = z.infer<typeof BatchTransactionSchema>;
/**
 * Schema for network configuration
 */
declare const NetworkConfigSchema: z.ZodObject<{
    /** Chain ID */
    chainId: z.ZodNumber;
    /** Network name */
    name: z.ZodString;
    /** RPC URL */
    rpcUrl: z.ZodString;
    /** Block explorer URL */
    explorerUrl: z.ZodOptional<z.ZodString>;
    /** Native currency symbol */
    currency: z.ZodDefault<z.ZodString>;
    /** Whether this is a testnet */
    isTestnet: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    chainId: number;
    name: string;
    rpcUrl: string;
    currency: string;
    isTestnet: boolean;
    explorerUrl?: string | undefined;
}, {
    chainId: number;
    name: string;
    rpcUrl: string;
    explorerUrl?: string | undefined;
    currency?: string | undefined;
    isTestnet?: boolean | undefined;
}>;
type NetworkConfig = z.infer<typeof NetworkConfigSchema>;
/**
 * Schema for SDK configuration
 */
declare const SdkConfigSchema: z.ZodObject<{
    /** Network configuration */
    network: z.ZodObject<{
        /** Chain ID */
        chainId: z.ZodNumber;
        /** Network name */
        name: z.ZodString;
        /** RPC URL */
        rpcUrl: z.ZodString;
        /** Block explorer URL */
        explorerUrl: z.ZodOptional<z.ZodString>;
        /** Native currency symbol */
        currency: z.ZodDefault<z.ZodString>;
        /** Whether this is a testnet */
        isTestnet: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        chainId: number;
        name: string;
        rpcUrl: string;
        currency: string;
        isTestnet: boolean;
        explorerUrl?: string | undefined;
    }, {
        chainId: number;
        name: string;
        rpcUrl: string;
        explorerUrl?: string | undefined;
        currency?: string | undefined;
        isTestnet?: boolean | undefined;
    }>;
    /** ZK proof configuration */
    zkConfig: z.ZodOptional<z.ZodObject<{
        /** Circuit size parameter (k value) */
        circuitK: z.ZodDefault<z.ZodNumber>;
        /** Whether to use cached proving keys */
        useCachedKeys: z.ZodDefault<z.ZodBoolean>;
        /** Timeout for proof generation in milliseconds */
        timeout: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        circuitK: number;
        useCachedKeys: boolean;
        timeout: number;
    }, {
        circuitK?: number | undefined;
        useCachedKeys?: boolean | undefined;
        timeout?: number | undefined;
    }>>;
    /** Account configuration */
    accountConfig: z.ZodOptional<z.ZodObject<{
        /** Account implementation address */
        implementation: z.ZodString;
        /** Account factory address */
        factory: z.ZodString;
        /** Entry point address */
        entryPoint: z.ZodString;
        /** Initial account owner */
        owner: z.ZodString;
        /** Salt for deterministic address generation */
        salt: z.ZodDefault<z.ZodBigInt>;
    }, "strip", z.ZodTypeAny, {
        implementation: string;
        factory: string;
        entryPoint: string;
        owner: string;
        salt: bigint;
    }, {
        implementation: string;
        factory: string;
        entryPoint: string;
        owner: string;
        salt?: bigint | undefined;
    }>>;
    /** Paymaster configuration */
    paymasterConfig: z.ZodOptional<z.ZodObject<{
        /** Paymaster contract address */
        address: z.ZodString;
        /** Verifying signer for paymaster */
        signer: z.ZodString;
        /** Valid until timestamp */
        validUntil: z.ZodNumber;
        /** Valid after timestamp */
        validAfter: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        address: string;
        signer: string;
        validUntil: number;
        validAfter: number;
    }, {
        address: string;
        signer: string;
        validUntil: number;
        validAfter: number;
    }>>;
    /** Enable debug logging */
    debug: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    network: {
        chainId: number;
        name: string;
        rpcUrl: string;
        currency: string;
        isTestnet: boolean;
        explorerUrl?: string | undefined;
    };
    debug: boolean;
    zkConfig?: {
        circuitK: number;
        useCachedKeys: boolean;
        timeout: number;
    } | undefined;
    accountConfig?: {
        implementation: string;
        factory: string;
        entryPoint: string;
        owner: string;
        salt: bigint;
    } | undefined;
    paymasterConfig?: {
        address: string;
        signer: string;
        validUntil: number;
        validAfter: number;
    } | undefined;
}, {
    network: {
        chainId: number;
        name: string;
        rpcUrl: string;
        explorerUrl?: string | undefined;
        currency?: string | undefined;
        isTestnet?: boolean | undefined;
    };
    zkConfig?: {
        circuitK?: number | undefined;
        useCachedKeys?: boolean | undefined;
        timeout?: number | undefined;
    } | undefined;
    accountConfig?: {
        implementation: string;
        factory: string;
        entryPoint: string;
        owner: string;
        salt?: bigint | undefined;
    } | undefined;
    paymasterConfig?: {
        address: string;
        signer: string;
        validUntil: number;
        validAfter: number;
    } | undefined;
    debug?: boolean | undefined;
}>;
type SdkConfig = z.infer<typeof SdkConfigSchema>;
/**
 * Base error class for Guardian-AA SDK
 */
declare class GuardianAAError extends Error {
    readonly code: string;
    readonly details?: unknown | undefined;
    constructor(message: string, code: string, details?: unknown | undefined);
}
/**
 * ZK proof related errors
 */
declare class ZkProofError extends GuardianAAError {
    constructor(message: string, details?: unknown);
}
/**
 * Contract interaction errors
 */
declare class ContractError extends GuardianAAError {
    constructor(message: string, details?: unknown);
}
/**
 * Configuration errors
 */
declare class ConfigError extends GuardianAAError {
    constructor(message: string, details?: unknown);
}
/**
 * Validation errors
 */
declare class ValidationError extends GuardianAAError {
    constructor(message: string, details?: unknown);
}
/**
 * Result type for operations that can fail
 */
type Result<T, E = Error> = {
    success: true;
    data: T;
} | {
    success: false;
    error: E;
};
/**
 * Async result type
 */
type AsyncResult<T, E = Error> = Promise<Result<T, E>>;
/**
 * Hex string type
 */
type HexString = `0x${string}`;
/**
 * Address type (20-byte hex string)
 */
type Address = `0x${string}`;
/**
 * Bytes32 type (32-byte hex string)
 */
type Bytes32 = `0x${string}`;
/**
 * Default gas limits for various operations
 */
declare const DEFAULT_GAS_LIMITS: {
    readonly VERIFICATION: 70000n;
    readonly CALL: 35000n;
    readonly CREATION: 1000000n;
    readonly PRE_VERIFICATION: 21000n;
};
/**
 * Supported chain IDs
 */
declare const SUPPORTED_CHAINS: {
    readonly ETHEREUM_MAINNET: 1;
    readonly ETHEREUM_SEPOLIA: 11155111;
    readonly POLYGON_MAINNET: 137;
    readonly POLYGON_MUMBAI: 80001;
    readonly ARBITRUM_ONE: 42161;
    readonly ARBITRUM_SEPOLIA: 421614;
    readonly OPTIMISM_MAINNET: 10;
    readonly OPTIMISM_SEPOLIA: 11155420;
};
/**
 * Contract addresses for different chains
 */
type ContractAddresses = {
    entryPoint: Address;
    accountFactory: Address;
    multiSigFactory: Address;
    verifyingPaymaster: Address;
};
declare const CONTRACT_ADDRESSES: Record<number, ContractAddresses>;

export { type AccountConfig as A, BatchTransactionSchema as B, ContractError as C, DEFAULT_GAS_LIMITS as D, GuardianAAError as G, type HexString as H, MultiSigConfigSchema as M, type NetworkConfig as N, PaymasterConfigSchema as P, type Result as R, type SdkConfig as S, TransactionDataSchema as T, UserOperationSchema as U, ValidationError as V, type ZkProofConfig as Z, ZkProofOutputSchema as a, type ZkProofOutput as b, ZkProofResultSchema as c, type ZkProofResult as d, ZkProofConfigSchema as e, type UserOperation as f, AccountConfigSchema as g, type MultiSigConfig as h, type PaymasterConfig as i, type TransactionData as j, type BatchTransaction as k, NetworkConfigSchema as l, SdkConfigSchema as m, ZkProofError as n, ConfigError as o, type AsyncResult as p, type Address as q, type Bytes32 as r, SUPPORTED_CHAINS as s, type ContractAddresses as t, CONTRACT_ADDRESSES as u };
