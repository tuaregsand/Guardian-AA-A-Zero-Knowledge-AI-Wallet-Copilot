import { z } from 'zod';
import type { Address } from '../types';

// ============================================================================
// Contract ABI Types
// ============================================================================

/**
 * Entry Point contract ABI (simplified)
 */
export const ENTRY_POINT_ABI = [
  {
    name: 'handleOps',
    type: 'function',
    inputs: [
      { name: 'ops', type: 'tuple[]', components: [] },
      { name: 'beneficiary', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'getUserOpHash',
    type: 'function',
    inputs: [{ name: 'userOp', type: 'tuple', components: [] }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
] as const;

/**
 * Simple Account contract ABI (simplified)
 */
export const SIMPLE_ACCOUNT_ABI = [
  {
    name: 'execute',
    type: 'function',
    inputs: [
      { name: 'dest', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'func', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'executeBatch',
    type: 'function',
    inputs: [
      { name: 'dest', type: 'address[]' },
      { name: 'value', type: 'uint256[]' },
      { name: 'func', type: 'bytes[]' },
    ],
    outputs: [],
  },
] as const;

/**
 * Multi-Sig Account contract ABI (simplified)
 */
export const MULTI_SIG_ACCOUNT_ABI = [
  {
    name: 'addSigner',
    type: 'function',
    inputs: [{ name: 'signer', type: 'address' }],
    outputs: [],
  },
  {
    name: 'removeSigner',
    type: 'function',
    inputs: [{ name: 'signer', type: 'address' }],
    outputs: [],
  },
  {
    name: 'changeThreshold',
    type: 'function',
    inputs: [{ name: 'threshold', type: 'uint256' }],
    outputs: [],
  },
] as const;

/**
 * Verifying Paymaster contract ABI (simplified)
 */
export const VERIFYING_PAYMASTER_ABI = [
  {
    name: 'getHash',
    type: 'function',
    inputs: [
      { name: 'userOp', type: 'tuple', components: [] },
      { name: 'validUntil', type: 'uint48' },
      { name: 'validAfter', type: 'uint48' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
] as const;

// ============================================================================
// Contract Configuration Types
// ============================================================================

/**
 * Contract deployment configuration
 */
export const ContractDeployConfigSchema = z.object({
  /** Contract bytecode */
  bytecode: z.string().regex(/^0x[a-fA-F0-9]*$/),
  /** Constructor arguments */
  constructorArgs: z.array(z.unknown()).default([]),
  /** Gas limit for deployment */
  gasLimit: z.bigint().optional(),
  /** Gas price */
  gasPrice: z.bigint().optional(),
  /** Salt for CREATE2 deployment */
  salt: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
});

export type ContractDeployConfig = z.infer<typeof ContractDeployConfigSchema>;

/**
 * Contract interaction configuration
 */
export const ContractCallConfigSchema = z.object({
  /** Contract address */
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Function name */
  functionName: z.string().min(1),
  /** Function arguments */
  args: z.array(z.unknown()).default([]),
  /** Value to send with the call */
  value: z.bigint().default(0n),
  /** Gas limit */
  gasLimit: z.bigint().optional(),
});

export type ContractCallConfig = z.infer<typeof ContractCallConfigSchema>;

// ============================================================================
// Account Operation Types
// ============================================================================

/**
 * Account operation result
 */
export const AccountOperationResultSchema = z.object({
  /** Transaction hash */
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  /** Block number */
  blockNumber: z.number().int().nonnegative(),
  /** Gas used */
  gasUsed: z.bigint(),
  /** Operation status */
  status: z.enum(['SUCCESS', 'FAILED', 'PENDING']),
  /** Error message if failed */
  error: z.string().optional(),
});

export type AccountOperationResult = z.infer<typeof AccountOperationResultSchema>;

/**
 * Signature data for multi-sig operations
 */
export const SignatureDataSchema = z.object({
  /** Signer address */
  signer: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Signature bytes */
  signature: z.string().regex(/^0x[a-fA-F0-9]*$/),
  /** Signature type (ECDSA, etc.) */
  signatureType: z.enum(['ECDSA', 'EIP1271']).default('ECDSA'),
});

export type SignatureData = z.infer<typeof SignatureDataSchema>;

// ============================================================================
// Gas Estimation Types
// ============================================================================

/**
 * Gas estimation result
 */
export const GasEstimationSchema = z.object({
  /** Estimated gas limit */
  gasLimit: z.bigint(),
  /** Estimated gas price */
  gasPrice: z.bigint(),
  /** Maximum fee per gas (EIP-1559) */
  maxFeePerGas: z.bigint().optional(),
  /** Maximum priority fee per gas (EIP-1559) */
  maxPriorityFeePerGas: z.bigint().optional(),
  /** Estimated total cost in wei */
  totalCost: z.bigint(),
});

export type GasEstimation = z.infer<typeof GasEstimationSchema>;

// ============================================================================
// Event Types
// ============================================================================

/**
 * Contract event filter
 */
export const EventFilterSchema = z.object({
  /** Contract address */
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Event topics */
  topics: z.array(z.string().regex(/^0x[a-fA-F0-9]{64}$/)).optional(),
  /** From block */
  fromBlock: z.union([z.number().int().nonnegative(), z.literal('latest')]).default('latest'),
  /** To block */
  toBlock: z.union([z.number().int().nonnegative(), z.literal('latest')]).default('latest'),
});

export type EventFilter = z.infer<typeof EventFilterSchema>;

/**
 * Contract event log
 */
export const ContractEventSchema = z.object({
  /** Event name */
  eventName: z.string(),
  /** Contract address */
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Block number */
  blockNumber: z.number().int().nonnegative(),
  /** Transaction hash */
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  /** Event data */
  data: z.record(z.unknown()),
});

export type ContractEvent = z.infer<typeof ContractEventSchema>;

// ============================================================================
// Constants
// ============================================================================

/**
 * Default contract addresses for supported networks
 */
export const DEFAULT_CONTRACT_ADDRESSES: Record<number, {
  entryPoint: Address;
  simpleAccountFactory: Address;
  multiSigAccountFactory: Address;
  verifyingPaymaster: Address;
}> = {
  // Local testnet (Hardhat/Anvil)
  31337: {
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as Address,
    simpleAccountFactory: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as Address,
    multiSigAccountFactory: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9' as Address,
    verifyingPaymaster: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9' as Address,
  },
  // Ethereum Sepolia
  11155111: {
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as Address,
    simpleAccountFactory: '0x9406Cc6185a346906296840746125a0E44976454' as Address,
    multiSigAccountFactory: '0x000000000000000000000000000000000000dEaD' as Address,
    verifyingPaymaster: '0x000000000000000000000000000000000000dEaD' as Address,
  },
} as const;

/**
 * Contract deployment gas limits
 */
export const CONTRACT_GAS_LIMITS = {
  SIMPLE_ACCOUNT_DEPLOY: 1000000n,
  MULTI_SIG_ACCOUNT_DEPLOY: 1500000n,
  PAYMASTER_DEPLOY: 800000n,
  ENTRY_POINT_DEPLOY: 2000000n,
} as const;

/**
 * Function selectors for common operations
 */
export const FUNCTION_SELECTORS = {
  EXECUTE: '0xb61d27f6',
  EXECUTE_BATCH: '0x18dfb3c7',
  ADD_SIGNER: '0x7065cb48',
  REMOVE_SIGNER: '0x0e316ab7',
  CHANGE_THRESHOLD: '0x694e80c3',
} as const; 