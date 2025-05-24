import { z } from 'zod';

/**
 * FFI interface types for the Rust prover
 */
export interface FFIInput {
  data: Uint8Array;
  len: number;
}

export interface FFIOutput {
  len: number;
  hash: number[];
}

/**
 * Prover performance metrics
 */
export const ProverMetricsSchema = z.object({
  setupTime: z.number().nonnegative(),
  proofTime: z.number().nonnegative(),
  verificationTime: z.number().nonnegative(),
  proofSize: z.number().int().nonnegative(),
  circuitSize: z.number().int().nonnegative(),
});

export type ProverMetrics = z.infer<typeof ProverMetricsSchema>;

/**
 * Proof verification status
 */
export const VerificationStatusSchema = z.enum([
  'VALID',
  'INVALID', 
  'ERROR',
  'TIMEOUT',
]);

export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

/**
 * Proof verification result
 */
export const VerificationResultSchema = z.object({
  status: VerificationStatusSchema,
  message: z.string().optional(),
  verificationTime: z.number().nonnegative().optional(),
  publicInputsHash: z.string().optional(),
});

export type VerificationResult = z.infer<typeof VerificationResultSchema>;

/**
 * Prover configuration extending base ZkProofConfig
 */
export const ProverConfigSchema = z.object({
  circuitK: z.number().int().min(10).max(20).default(14),
  useCachedKeys: z.boolean().default(true),
  timeout: z.number().int().positive().default(30000),
  maxInputSize: z.number().int().positive().default(1024 * 1024), // 1MB
  enableBenchmarking: z.boolean().default(false),
  logLevel: z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG']).default('INFO'),
});

export type ProverConfig = z.infer<typeof ProverConfigSchema>;

/**
 * Proving key cache information
 */
export const ProvingKeyCacheSchema = z.object({
  circuitK: z.number().int(),
  keyHash: z.string(),
  createdAt: z.number().int(),
  size: z.number().int(),
  isValid: z.boolean(),
});

export type ProvingKeyCache = z.infer<typeof ProvingKeyCacheSchema>;

/**
 * Circuit statistics
 */
export const CircuitStatsSchema = z.object({
  numConstraints: z.number().int().nonnegative(),
  numAdvice: z.number().int().nonnegative(),
  numFixed: z.number().int().nonnegative(),
  numInstance: z.number().int().nonnegative(),
  degree: z.number().int().nonnegative(),
});

export type CircuitStats = z.infer<typeof CircuitStatsSchema>;

/**
 * Proof batch for multiple inputs
 */
export const ProofBatchSchema = z.object({
  inputs: z.array(z.instanceof(Uint8Array)).min(1),
  parallelization: z.boolean().default(true),
  batchId: z.string().optional(),
});

export type ProofBatch = z.infer<typeof ProofBatchSchema>;

/**
 * Batch proof result
 */
export const BatchProofResultSchema = z.object({
  batchId: z.string().optional(),
  results: z.array(z.object({
    index: z.number().int().nonnegative(),
    hash: z.array(z.number().int().min(0).max(255)).length(32),
    proof: z.instanceof(Uint8Array),
    generationTime: z.number().nonnegative(),
  })),
  totalTime: z.number().nonnegative(),
  averageTime: z.number().nonnegative(),
});

export type BatchProofResult = z.infer<typeof BatchProofResultSchema>;

/**
 * Constants for ZK operations
 */
export const ZK_CONSTANTS = {
  MAX_CIRCUIT_K: 20,
  MIN_CIRCUIT_K: 10,
  DEFAULT_CIRCUIT_K: 14,
  MAX_INPUT_SIZE: 1024 * 1024, // 1MB
  SHA256_HASH_SIZE: 32,
  TARGET_PROOF_TIME_MS: 500,
  MAX_PROOF_TIME_MS: 30000,
  PROOF_CACHE_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/**
 * Error codes specific to ZK operations
 */
export const ZK_ERROR_CODES = {
  PROVER_NOT_INITIALIZED: 'PROVER_NOT_INITIALIZED',
  INVALID_INPUT_SIZE: 'INVALID_INPUT_SIZE',
  PROOF_GENERATION_FAILED: 'PROOF_GENERATION_FAILED',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  TIMEOUT_EXCEEDED: 'TIMEOUT_EXCEEDED',
  INVALID_CIRCUIT_K: 'INVALID_CIRCUIT_K',
  PROVING_KEY_NOT_FOUND: 'PROVING_KEY_NOT_FOUND',
  FFI_ERROR: 'FFI_ERROR',
} as const;

export type ZkErrorCode = keyof typeof ZK_ERROR_CODES; 