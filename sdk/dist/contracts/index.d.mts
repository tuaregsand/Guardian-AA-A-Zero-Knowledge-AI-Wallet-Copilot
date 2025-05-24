import { ethers } from 'ethers';
import { q as Address, j as TransactionData, H as HexString, f as UserOperation, k as BatchTransaction, N as NetworkConfig } from '../index-DPoAjXlF.mjs';
import { z } from 'zod';

/**
 * Entry Point contract ABI (simplified)
 */
declare const ENTRY_POINT_ABI: readonly [{
    readonly name: "handleOps";
    readonly type: "function";
    readonly inputs: readonly [{
        readonly name: "ops";
        readonly type: "tuple[]";
        readonly components: readonly [];
    }, {
        readonly name: "beneficiary";
        readonly type: "address";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "getUserOpHash";
    readonly type: "function";
    readonly inputs: readonly [{
        readonly name: "userOp";
        readonly type: "tuple";
        readonly components: readonly [];
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "bytes32";
    }];
}];
/**
 * Simple Account contract ABI (simplified)
 */
declare const SIMPLE_ACCOUNT_ABI: readonly [{
    readonly name: "execute";
    readonly type: "function";
    readonly inputs: readonly [{
        readonly name: "dest";
        readonly type: "address";
    }, {
        readonly name: "value";
        readonly type: "uint256";
    }, {
        readonly name: "func";
        readonly type: "bytes";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "executeBatch";
    readonly type: "function";
    readonly inputs: readonly [{
        readonly name: "dest";
        readonly type: "address[]";
    }, {
        readonly name: "value";
        readonly type: "uint256[]";
    }, {
        readonly name: "func";
        readonly type: "bytes[]";
    }];
    readonly outputs: readonly [];
}];
/**
 * Multi-Sig Account contract ABI (simplified)
 */
declare const MULTI_SIG_ACCOUNT_ABI: readonly [{
    readonly name: "addSigner";
    readonly type: "function";
    readonly inputs: readonly [{
        readonly name: "signer";
        readonly type: "address";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "removeSigner";
    readonly type: "function";
    readonly inputs: readonly [{
        readonly name: "signer";
        readonly type: "address";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "changeThreshold";
    readonly type: "function";
    readonly inputs: readonly [{
        readonly name: "threshold";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [];
}];
/**
 * Verifying Paymaster contract ABI (simplified)
 */
declare const VERIFYING_PAYMASTER_ABI: readonly [{
    readonly name: "getHash";
    readonly type: "function";
    readonly inputs: readonly [{
        readonly name: "userOp";
        readonly type: "tuple";
        readonly components: readonly [];
    }, {
        readonly name: "validUntil";
        readonly type: "uint48";
    }, {
        readonly name: "validAfter";
        readonly type: "uint48";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "bytes32";
    }];
}];
/**
 * Contract deployment configuration
 */
declare const ContractDeployConfigSchema: z.ZodObject<{
    /** Contract bytecode */
    bytecode: z.ZodString;
    /** Constructor arguments */
    constructorArgs: z.ZodDefault<z.ZodArray<z.ZodUnknown, "many">>;
    /** Gas limit for deployment */
    gasLimit: z.ZodOptional<z.ZodBigInt>;
    /** Gas price */
    gasPrice: z.ZodOptional<z.ZodBigInt>;
    /** Salt for CREATE2 deployment */
    salt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    bytecode: string;
    constructorArgs: unknown[];
    salt?: string | undefined;
    gasLimit?: bigint | undefined;
    gasPrice?: bigint | undefined;
}, {
    bytecode: string;
    salt?: string | undefined;
    constructorArgs?: unknown[] | undefined;
    gasLimit?: bigint | undefined;
    gasPrice?: bigint | undefined;
}>;
type ContractDeployConfig = z.infer<typeof ContractDeployConfigSchema>;
/**
 * Contract interaction configuration
 */
declare const ContractCallConfigSchema: z.ZodObject<{
    /** Contract address */
    address: z.ZodString;
    /** Function name */
    functionName: z.ZodString;
    /** Function arguments */
    args: z.ZodDefault<z.ZodArray<z.ZodUnknown, "many">>;
    /** Value to send with the call */
    value: z.ZodDefault<z.ZodBigInt>;
    /** Gas limit */
    gasLimit: z.ZodOptional<z.ZodBigInt>;
}, "strip", z.ZodTypeAny, {
    value: bigint;
    address: string;
    functionName: string;
    args: unknown[];
    gasLimit?: bigint | undefined;
}, {
    address: string;
    functionName: string;
    value?: bigint | undefined;
    gasLimit?: bigint | undefined;
    args?: unknown[] | undefined;
}>;
type ContractCallConfig = z.infer<typeof ContractCallConfigSchema>;
/**
 * Account operation result
 */
declare const AccountOperationResultSchema: z.ZodObject<{
    /** Transaction hash */
    txHash: z.ZodString;
    /** Block number */
    blockNumber: z.ZodNumber;
    /** Gas used */
    gasUsed: z.ZodBigInt;
    /** Operation status */
    status: z.ZodEnum<["SUCCESS", "FAILED", "PENDING"]>;
    /** Error message if failed */
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "SUCCESS" | "FAILED" | "PENDING";
    txHash: string;
    blockNumber: number;
    gasUsed: bigint;
    error?: string | undefined;
}, {
    status: "SUCCESS" | "FAILED" | "PENDING";
    txHash: string;
    blockNumber: number;
    gasUsed: bigint;
    error?: string | undefined;
}>;
type AccountOperationResult = z.infer<typeof AccountOperationResultSchema>;
/**
 * Signature data for multi-sig operations
 */
declare const SignatureDataSchema: z.ZodObject<{
    /** Signer address */
    signer: z.ZodString;
    /** Signature bytes */
    signature: z.ZodString;
    /** Signature type (ECDSA, etc.) */
    signatureType: z.ZodDefault<z.ZodEnum<["ECDSA", "EIP1271"]>>;
}, "strip", z.ZodTypeAny, {
    signer: string;
    signature: string;
    signatureType: "ECDSA" | "EIP1271";
}, {
    signer: string;
    signature: string;
    signatureType?: "ECDSA" | "EIP1271" | undefined;
}>;
type SignatureData = z.infer<typeof SignatureDataSchema>;
/**
 * Gas estimation result
 */
declare const GasEstimationSchema: z.ZodObject<{
    /** Estimated gas limit */
    gasLimit: z.ZodBigInt;
    /** Estimated gas price */
    gasPrice: z.ZodBigInt;
    /** Maximum fee per gas (EIP-1559) */
    maxFeePerGas: z.ZodOptional<z.ZodBigInt>;
    /** Maximum priority fee per gas (EIP-1559) */
    maxPriorityFeePerGas: z.ZodOptional<z.ZodBigInt>;
    /** Estimated total cost in wei */
    totalCost: z.ZodBigInt;
}, "strip", z.ZodTypeAny, {
    gasLimit: bigint;
    gasPrice: bigint;
    totalCost: bigint;
    maxFeePerGas?: bigint | undefined;
    maxPriorityFeePerGas?: bigint | undefined;
}, {
    gasLimit: bigint;
    gasPrice: bigint;
    totalCost: bigint;
    maxFeePerGas?: bigint | undefined;
    maxPriorityFeePerGas?: bigint | undefined;
}>;
type GasEstimation = z.infer<typeof GasEstimationSchema>;
/**
 * Contract event filter
 */
declare const EventFilterSchema: z.ZodObject<{
    /** Contract address */
    address: z.ZodString;
    /** Event topics */
    topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** From block */
    fromBlock: z.ZodDefault<z.ZodUnion<[z.ZodNumber, z.ZodLiteral<"latest">]>>;
    /** To block */
    toBlock: z.ZodDefault<z.ZodUnion<[z.ZodNumber, z.ZodLiteral<"latest">]>>;
}, "strip", z.ZodTypeAny, {
    address: string;
    fromBlock: number | "latest";
    toBlock: number | "latest";
    topics?: string[] | undefined;
}, {
    address: string;
    topics?: string[] | undefined;
    fromBlock?: number | "latest" | undefined;
    toBlock?: number | "latest" | undefined;
}>;
type EventFilter = z.infer<typeof EventFilterSchema>;
/**
 * Contract event log
 */
declare const ContractEventSchema: z.ZodObject<{
    /** Event name */
    eventName: z.ZodString;
    /** Contract address */
    address: z.ZodString;
    /** Block number */
    blockNumber: z.ZodNumber;
    /** Transaction hash */
    transactionHash: z.ZodString;
    /** Event data */
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    address: string;
    data: Record<string, unknown>;
    blockNumber: number;
    eventName: string;
    transactionHash: string;
}, {
    address: string;
    data: Record<string, unknown>;
    blockNumber: number;
    eventName: string;
    transactionHash: string;
}>;
type ContractEvent = z.infer<typeof ContractEventSchema>;
/**
 * Default contract addresses for supported networks
 */
declare const DEFAULT_CONTRACT_ADDRESSES: Record<number, {
    entryPoint: Address;
    simpleAccountFactory: Address;
    multiSigAccountFactory: Address;
    verifyingPaymaster: Address;
}>;
/**
 * Contract deployment gas limits
 */
declare const CONTRACT_GAS_LIMITS: {
    readonly SIMPLE_ACCOUNT_DEPLOY: 1000000n;
    readonly MULTI_SIG_ACCOUNT_DEPLOY: 1500000n;
    readonly PAYMASTER_DEPLOY: 800000n;
    readonly ENTRY_POINT_DEPLOY: 2000000n;
};
/**
 * Function selectors for common operations
 */
declare const FUNCTION_SELECTORS: {
    readonly EXECUTE: "0xb61d27f6";
    readonly EXECUTE_BATCH: "0x18dfb3c7";
    readonly ADD_SIGNER: "0x7065cb48";
    readonly REMOVE_SIGNER: "0x0e316ab7";
    readonly CHANGE_THRESHOLD: "0x694e80c3";
};

/**
 * Base class for account abstraction wallets
 */
declare abstract class BaseAccount {
    protected provider: ethers.Provider;
    protected address: Address;
    protected entryPointAddress: Address;
    constructor(provider: ethers.Provider, address: Address, entryPointAddress: Address);
    /**
     * Get the account address
     */
    getAddress(): Address;
    /**
     * Get the current nonce for the account
     */
    getNonce(): Promise<bigint>;
    /**
     * Estimate gas for a transaction
     */
    estimateGas(transaction: TransactionData): Promise<GasEstimation>;
    /**
     * Build a UserOperation for the given transaction
     */
    abstract buildUserOperation(transaction: TransactionData, options?: {
        nonce?: bigint;
        gasLimits?: Partial<GasEstimation>;
        paymasterData?: HexString;
    }): Promise<UserOperation>;
    /**
     * Execute a single transaction
     */
    abstract execute(transaction: TransactionData, signature: HexString): Promise<AccountOperationResult>;
    /**
     * Execute multiple transactions in batch
     */
    abstract executeBatch(batch: BatchTransaction, signature: HexString): Promise<AccountOperationResult>;
}
/**
 * Simple Account implementation (ECDSA signature-based)
 */
declare class SimpleAccount extends BaseAccount {
    private contract;
    constructor(provider: ethers.Provider, address: Address, entryPointAddress: Address);
    /**
     * Build a UserOperation for a simple account transaction
     */
    buildUserOperation(transaction: TransactionData, options?: {
        nonce?: bigint;
        gasLimits?: Partial<GasEstimation>;
        paymasterData?: HexString;
    }): Promise<UserOperation>;
    /**
     * Execute a single transaction
     */
    execute(transaction: TransactionData, signature: HexString): Promise<AccountOperationResult>;
    /**
     * Execute multiple transactions in batch
     */
    executeBatch(batch: BatchTransaction, signature: HexString): Promise<AccountOperationResult>;
}
/**
 * Multi-Signature Account implementation
 */
declare class MultiSigAccount extends BaseAccount {
    private contract;
    private threshold;
    private signers;
    constructor(provider: ethers.Provider, address: Address, entryPointAddress: Address, threshold: number, signers: Address[]);
    /**
     * Get current signers and threshold
     */
    getSignerInfo(): Promise<{
        signers: Address[];
        threshold: number;
    }>;
    /**
     * Add a new signer to the multi-sig account
     */
    addSigner(newSigner: Address, signatures: SignatureData[]): Promise<AccountOperationResult>;
    /**
     * Remove a signer from the multi-sig account
     */
    removeSigner(signerToRemove: Address, signatures: SignatureData[]): Promise<AccountOperationResult>;
    /**
     * Change the signature threshold
     */
    changeThreshold(newThreshold: number, signatures: SignatureData[]): Promise<AccountOperationResult>;
    /**
     * Build UserOperation for multi-sig account
     */
    buildUserOperation(transaction: TransactionData, options?: {
        nonce?: bigint;
        gasLimits?: Partial<GasEstimation>;
        paymasterData?: HexString;
    }): Promise<UserOperation>;
    /**
     * Execute with multi-sig verification
     */
    execute(transaction: TransactionData, signature: HexString): Promise<AccountOperationResult>;
    /**
     * Execute batch with multi-sig verification
     */
    executeBatch(batch: BatchTransaction, signature: HexString): Promise<AccountOperationResult>;
    /**
     * Combine multiple signatures into a single signature for multi-sig verification
     */
    private combineSignatures;
}

/**
 * Paymaster configuration for gasless transactions
 */
interface ContractPaymasterConfig {
    address: Address;
    signer: ethers.Wallet;
    validUntil: number;
    validAfter: number;
}
/**
 * Paymaster signature data
 */
interface PaymasterSignature {
    validUntil: number;
    validAfter: number;
    signature: HexString;
}
/**
 * Verifying Paymaster implementation for sponsoring user operations
 */
declare class VerifyingPaymaster {
    private provider;
    private config;
    constructor(provider: ethers.Provider, config: ContractPaymasterConfig);
    /**
     * Generate paymaster data for a user operation
     */
    generatePaymasterData(userOp: UserOperation, validUntil?: number, validAfter?: number): Promise<HexString>;
    /**
     * Verify if a user operation can be sponsored
     */
    canSponsor(userOp: UserOperation): Promise<boolean>;
    /**
     * Get the paymaster's balance in the EntryPoint
     */
    getBalance(): Promise<bigint>;
    /**
     * Deposit funds to the paymaster's EntryPoint balance
     */
    deposit(amount: bigint): Promise<string>;
    /**
     * Withdraw funds from the paymaster's EntryPoint balance
     */
    withdraw(amount: bigint, to: Address): Promise<string>;
    /**
     * Update paymaster configuration
     */
    updateConfig(newConfig: Partial<ContractPaymasterConfig>): void;
    /**
     * Get the current paymaster configuration
     */
    getConfig(): ContractPaymasterConfig;
    /**
     * Get the hash that needs to be signed for paymaster verification
     */
    private getPaymasterHash;
    /**
     * Estimate the cost of sponsoring a user operation
     */
    private estimateOperationCost;
}
/**
 * Factory for creating paymaster instances
 */
declare class PaymasterFactory {
    private provider;
    constructor(provider: ethers.Provider);
    /**
     * Create a new VerifyingPaymaster instance
     */
    createVerifyingPaymaster(config: ContractPaymasterConfig): VerifyingPaymaster;
    /**
     * Deploy a new paymaster contract
     */
    deployPaymaster(deployer: ethers.Wallet, entryPointAddress: Address, owner: Address): Promise<{
        address: Address;
        txHash: string;
    }>;
}

/**
 * Account factory configuration
 */
interface AccountFactoryConfig {
    factoryAddress: Address;
    entryPointAddress: Address;
    implementationAddress: Address;
}
/**
 * Account deployment result
 */
interface AccountDeploymentResult {
    accountAddress: Address;
    txHash: string;
    isNewDeployment: boolean;
}
/**
 * Simple Account Factory implementation
 */
declare class SimpleAccountFactory {
    private provider;
    private config;
    private contract;
    constructor(provider: ethers.Provider, config: AccountFactoryConfig);
    /**
     * Calculate the counterfactual address for a simple account
     */
    getAccountAddress(owner: Address, salt: bigint): Promise<Address>;
    /**
     * Deploy a new simple account
     */
    deployAccount(owner: Address, salt: bigint, signer?: ethers.Wallet): Promise<AccountDeploymentResult>;
    /**
     * Create a SimpleAccount instance
     */
    createAccountInstance(accountAddress: Address): SimpleAccount;
    /**
     * Get the init code for account deployment
     */
    getInitCode(owner: Address, salt: bigint): Promise<HexString>;
}
/**
 * Multi-Sig Account Factory implementation
 */
declare class MultiSigAccountFactory {
    private provider;
    private config;
    private contract;
    constructor(provider: ethers.Provider, config: AccountFactoryConfig);
    /**
     * Calculate the counterfactual address for a multi-sig account
     */
    getAccountAddress(owners: Address[], threshold: number, salt: bigint): Promise<Address>;
    /**
     * Deploy a new multi-sig account
     */
    deployAccount(owners: Address[], threshold: number, salt: bigint, signer?: ethers.Wallet): Promise<AccountDeploymentResult>;
    /**
     * Create a MultiSigAccount instance
     */
    createAccountInstance(accountAddress: Address, threshold: number, signers: Address[]): MultiSigAccount;
    /**
     * Get the init code for multi-sig account deployment
     */
    getInitCode(owners: Address[], threshold: number, salt: bigint): Promise<HexString>;
}
/**
 * Factory manager for creating different types of account factories
 */
declare class AccountFactoryManager {
    private provider;
    constructor(provider: ethers.Provider);
    /**
     * Create a SimpleAccountFactory instance
     */
    createSimpleAccountFactory(config: AccountFactoryConfig): SimpleAccountFactory;
    /**
     * Create a MultiSigAccountFactory instance
     */
    createMultiSigAccountFactory(config: AccountFactoryConfig): MultiSigAccountFactory;
}

/**
 * EntryPoint client for ERC-4337 operations
 */
declare class EntryPointClient {
    private provider;
    private address;
    private contract;
    constructor(provider: ethers.Provider, address: Address);
    /**
     * Get the EntryPoint contract address
     */
    getAddress(): Address;
    /**
     * Calculate the hash of a UserOperation
     */
    getUserOpHash(userOp: UserOperation): Promise<HexString>;
    /**
     * Handle a batch of UserOperations (submit to bundler)
     */
    handleOps(userOps: UserOperation[], beneficiary: Address, signer: ethers.Wallet): Promise<string>;
    /**
     * Simulate a UserOperation to check for validation errors
     */
    simulateValidation(userOp: UserOperation): Promise<{
        preOpGas: bigint;
        prefund: bigint;
        sigFailed: boolean;
        validAfter: number;
        validUntil: number;
    }>;
    /**
     * Get the deposit balance for an account
     */
    balanceOf(account: Address): Promise<bigint>;
    /**
     * Deposit ETH for an account
     */
    depositTo(account: Address, amount: bigint, signer: ethers.Wallet): Promise<string>;
    /**
     * Withdraw ETH from an account's deposit
     */
    withdrawTo(withdrawAddress: Address, amount: bigint, signer: ethers.Wallet): Promise<string>;
    /**
     * Get the nonce for an account
     */
    getNonce(account: Address, key?: bigint): Promise<bigint>;
    /**
     * Check if an operation is valid
     */
    validateUserOp(userOp: UserOperation): Promise<boolean>;
    /**
     * Estimate gas for a UserOperation
     */
    estimateUserOpGas(userOp: UserOperation): Promise<{
        callGasLimit: bigint;
        verificationGasLimit: bigint;
        preVerificationGas: bigint;
    }>;
}

/**
 * Configuration for the contracts client
 */
interface ContractsClientConfig {
    network: NetworkConfig;
    entryPointAddress?: Address;
    simpleAccountFactoryAddress?: Address;
    multiSigAccountFactoryAddress?: Address;
    verifyingPaymasterAddress?: Address;
    signer?: ethers.Wallet;
}
/**
 * Main contracts client that provides a unified interface for all contract operations
 */
declare class ContractsClient {
    private provider;
    private config;
    private entryPoint;
    private accountFactoryManager;
    private paymasterFactory;
    private signer?;
    constructor(config: ContractsClientConfig);
    /**
     * Get contract address for the current network
     */
    private getContractAddress;
    /**
     * Create a simple account factory
     */
    createSimpleAccountFactory(): SimpleAccountFactory;
    /**
     * Create a multi-sig account factory
     */
    createMultiSigAccountFactory(): MultiSigAccountFactory;
    /**
     * Create a verifying paymaster
     */
    createVerifyingPaymaster(signer: ethers.Wallet): VerifyingPaymaster;
    /**
     * Deploy a new simple account
     */
    deploySimpleAccount(owner: Address, salt?: bigint): Promise<SimpleAccount>;
    /**
     * Deploy a new multi-sig account
     */
    deployMultiSigAccount(owners: Address[], threshold: number, salt?: bigint): Promise<MultiSigAccount>;
    /**
     * Get an existing simple account instance
     */
    getSimpleAccount(accountAddress: Address): SimpleAccount;
    /**
     * Get an existing multi-sig account instance
     */
    getMultiSigAccount(accountAddress: Address, threshold: number, signers: Address[]): MultiSigAccount;
    /**
     * Execute a transaction through an account
     */
    executeTransaction(account: SimpleAccount | MultiSigAccount, transaction: TransactionData, signature: HexString, usePaymaster?: boolean): Promise<string>;
    /**
     * Execute a batch of transactions
     */
    executeBatchTransaction(account: SimpleAccount | MultiSigAccount, batch: BatchTransaction, signature: HexString, usePaymaster?: boolean): Promise<string>;
    /**
     * Estimate gas for a user operation
     */
    estimateUserOpGas(userOp: UserOperation): Promise<{
        callGasLimit: bigint;
        verificationGasLimit: bigint;
        preVerificationGas: bigint;
    }>;
    /**
     * Get the hash of a user operation
     */
    getUserOpHash(userOp: UserOperation): Promise<HexString>;
    /**
     * Validate a user operation
     */
    validateUserOp(userOp: UserOperation): Promise<boolean>;
    /**
     * Get account balance in the EntryPoint
     */
    getAccountBalance(account: Address): Promise<bigint>;
    /**
     * Deposit ETH for an account
     */
    depositForAccount(account: Address, amount: bigint): Promise<string>;
    /**
     * Withdraw ETH from an account
     */
    withdrawFromAccount(withdrawAddress: Address, amount: bigint): Promise<string>;
    /**
     * Get the current network configuration
     */
    getNetworkConfig(): NetworkConfig;
    /**
     * Update the signer
     */
    updateSigner(signer: ethers.Wallet): void;
    /**
     * Get the EntryPoint client
     */
    getEntryPoint(): EntryPointClient;
}

export { type AccountDeploymentResult, type AccountFactoryConfig, AccountFactoryManager, type AccountOperationResult, AccountOperationResultSchema, BaseAccount, CONTRACT_GAS_LIMITS, type ContractCallConfig, ContractCallConfigSchema, type ContractDeployConfig, ContractDeployConfigSchema, type ContractEvent, ContractEventSchema, type ContractPaymasterConfig, ContractsClient, type ContractsClientConfig, DEFAULT_CONTRACT_ADDRESSES, ENTRY_POINT_ABI, EntryPointClient, type EventFilter, EventFilterSchema, FUNCTION_SELECTORS, type GasEstimation, GasEstimationSchema, MULTI_SIG_ACCOUNT_ABI, MultiSigAccount, MultiSigAccountFactory, PaymasterFactory, type PaymasterSignature, SIMPLE_ACCOUNT_ABI, type SignatureData, SignatureDataSchema, SimpleAccount, SimpleAccountFactory, VERIFYING_PAYMASTER_ABI, VerifyingPaymaster };
