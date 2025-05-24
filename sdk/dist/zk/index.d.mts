import { z } from 'zod';

/**
 * FFI interface types for the Rust prover
 */
interface FFIInput {
    data: Uint8Array;
    len: number;
}
interface FFIOutput {
    len: number;
    hash: number[];
}
/**
 * Prover performance metrics
 */
declare const ProverMetricsSchema: z.ZodObject<{
    setupTime: z.ZodNumber;
    proofTime: z.ZodNumber;
    verificationTime: z.ZodNumber;
    proofSize: z.ZodNumber;
    circuitSize: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    setupTime: number;
    proofTime: number;
    verificationTime: number;
    proofSize: number;
    circuitSize: number;
}, {
    setupTime: number;
    proofTime: number;
    verificationTime: number;
    proofSize: number;
    circuitSize: number;
}>;
type ProverMetrics = z.infer<typeof ProverMetricsSchema>;
/**
 * Proof verification status
 */
declare const VerificationStatusSchema: z.ZodEnum<["VALID", "INVALID", "ERROR", "TIMEOUT"]>;
type VerificationStatus = z.infer<typeof VerificationStatusSchema>;
/**
 * Proof verification result
 */
declare const VerificationResultSchema: z.ZodObject<{
    status: z.ZodEnum<["VALID", "INVALID", "ERROR", "TIMEOUT"]>;
    message: z.ZodOptional<z.ZodString>;
    verificationTime: z.ZodOptional<z.ZodNumber>;
    publicInputsHash: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "ERROR" | "VALID" | "INVALID" | "TIMEOUT";
    message?: string | undefined;
    verificationTime?: number | undefined;
    publicInputsHash?: string | undefined;
}, {
    status: "ERROR" | "VALID" | "INVALID" | "TIMEOUT";
    message?: string | undefined;
    verificationTime?: number | undefined;
    publicInputsHash?: string | undefined;
}>;
type VerificationResult = z.infer<typeof VerificationResultSchema>;
/**
 * Prover configuration extending base ZkProofConfig
 */
declare const ProverConfigSchema: z.ZodObject<{
    circuitK: z.ZodDefault<z.ZodNumber>;
    useCachedKeys: z.ZodDefault<z.ZodBoolean>;
    timeout: z.ZodDefault<z.ZodNumber>;
    maxInputSize: z.ZodDefault<z.ZodNumber>;
    enableBenchmarking: z.ZodDefault<z.ZodBoolean>;
    logLevel: z.ZodDefault<z.ZodEnum<["ERROR", "WARN", "INFO", "DEBUG"]>>;
}, "strip", z.ZodTypeAny, {
    circuitK: number;
    useCachedKeys: boolean;
    timeout: number;
    maxInputSize: number;
    enableBenchmarking: boolean;
    logLevel: "ERROR" | "WARN" | "INFO" | "DEBUG";
}, {
    circuitK?: number | undefined;
    useCachedKeys?: boolean | undefined;
    timeout?: number | undefined;
    maxInputSize?: number | undefined;
    enableBenchmarking?: boolean | undefined;
    logLevel?: "ERROR" | "WARN" | "INFO" | "DEBUG" | undefined;
}>;
type ProverConfig = z.infer<typeof ProverConfigSchema>;
/**
 * Proving key cache information
 */
declare const ProvingKeyCacheSchema: z.ZodObject<{
    circuitK: z.ZodNumber;
    keyHash: z.ZodString;
    createdAt: z.ZodNumber;
    size: z.ZodNumber;
    isValid: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    circuitK: number;
    keyHash: string;
    createdAt: number;
    size: number;
    isValid: boolean;
}, {
    circuitK: number;
    keyHash: string;
    createdAt: number;
    size: number;
    isValid: boolean;
}>;
type ProvingKeyCache = z.infer<typeof ProvingKeyCacheSchema>;
/**
 * Circuit statistics
 */
declare const CircuitStatsSchema: z.ZodObject<{
    numConstraints: z.ZodNumber;
    numAdvice: z.ZodNumber;
    numFixed: z.ZodNumber;
    numInstance: z.ZodNumber;
    degree: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    numConstraints: number;
    numAdvice: number;
    numFixed: number;
    numInstance: number;
    degree: number;
}, {
    numConstraints: number;
    numAdvice: number;
    numFixed: number;
    numInstance: number;
    degree: number;
}>;
type CircuitStats = z.infer<typeof CircuitStatsSchema>;
/**
 * Proof batch for multiple inputs
 */
declare const ProofBatchSchema: z.ZodObject<{
    inputs: z.ZodArray<z.ZodType<Uint8Array<ArrayBuffer>, z.ZodTypeDef, Uint8Array<ArrayBuffer>>, "many">;
    parallelization: z.ZodDefault<z.ZodBoolean>;
    batchId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    inputs: Uint8Array<ArrayBuffer>[];
    parallelization: boolean;
    batchId?: string | undefined;
}, {
    inputs: Uint8Array<ArrayBuffer>[];
    parallelization?: boolean | undefined;
    batchId?: string | undefined;
}>;
type ProofBatch = z.infer<typeof ProofBatchSchema>;
/**
 * Batch proof result
 */
declare const BatchProofResultSchema: z.ZodObject<{
    batchId: z.ZodOptional<z.ZodString>;
    results: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        hash: z.ZodArray<z.ZodNumber, "many">;
        proof: z.ZodType<Uint8Array<ArrayBuffer>, z.ZodTypeDef, Uint8Array<ArrayBuffer>>;
        generationTime: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        hash: number[];
        proof: Uint8Array<ArrayBuffer>;
        generationTime: number;
        index: number;
    }, {
        hash: number[];
        proof: Uint8Array<ArrayBuffer>;
        generationTime: number;
        index: number;
    }>, "many">;
    totalTime: z.ZodNumber;
    averageTime: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    results: {
        hash: number[];
        proof: Uint8Array<ArrayBuffer>;
        generationTime: number;
        index: number;
    }[];
    totalTime: number;
    averageTime: number;
    batchId?: string | undefined;
}, {
    results: {
        hash: number[];
        proof: Uint8Array<ArrayBuffer>;
        generationTime: number;
        index: number;
    }[];
    totalTime: number;
    averageTime: number;
    batchId?: string | undefined;
}>;
type BatchProofResult = z.infer<typeof BatchProofResultSchema>;
/**
 * Constants for ZK operations
 */
declare const ZK_CONSTANTS: {
    readonly MAX_CIRCUIT_K: 20;
    readonly MIN_CIRCUIT_K: 10;
    readonly DEFAULT_CIRCUIT_K: 14;
    readonly MAX_INPUT_SIZE: number;
    readonly SHA256_HASH_SIZE: 32;
    readonly TARGET_PROOF_TIME_MS: 500;
    readonly MAX_PROOF_TIME_MS: 30000;
    readonly PROOF_CACHE_TTL_MS: number;
};
/**
 * Error codes specific to ZK operations
 */
declare const ZK_ERROR_CODES: {
    readonly PROVER_NOT_INITIALIZED: "PROVER_NOT_INITIALIZED";
    readonly INVALID_INPUT_SIZE: "INVALID_INPUT_SIZE";
    readonly PROOF_GENERATION_FAILED: "PROOF_GENERATION_FAILED";
    readonly VERIFICATION_FAILED: "VERIFICATION_FAILED";
    readonly TIMEOUT_EXCEEDED: "TIMEOUT_EXCEEDED";
    readonly INVALID_CIRCUIT_K: "INVALID_CIRCUIT_K";
    readonly PROVING_KEY_NOT_FOUND: "PROVING_KEY_NOT_FOUND";
    readonly FFI_ERROR: "FFI_ERROR";
};
type ZkErrorCode = keyof typeof ZK_ERROR_CODES;

/**
 * ZK Prover class that interfaces with the Rust guardian_zkml library
 */
declare class ZkProver {
    private config;
    private isInitialized;
    private setupTime;
    constructor(config?: Partial<ProverConfig>);
    /**
     * Initialize the prover (setup proving keys, etc.)
     */
    initialize(): Promise<void>;
    /**
     * Generate a ZK proof for the given input data
     */
    generateProof(input: Uint8Array): Promise<{
        hash: number[];
        proof: Uint8Array;
        generationTime: number;
    }>;
    /**
     * Generate proofs for multiple inputs in batch
     */
    generateBatchProofs(batch: ProofBatch): Promise<BatchProofResult>;
    /**
     * Get prover performance metrics
     */
    getMetrics(): ProverMetrics;
    /**
     * Update prover configuration
     */
    updateConfig(newConfig: Partial<ProverConfig>): void;
    /**
     * Check if prover is initialized
     */
    isReady(): boolean;
    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
    /**
     * Private method to setup the proving system
     */
    private setupProvingSystem;
    /**
     * Private method to call the Rust prover via FFI
     */
    private callRustProver;
    /**
     * Utility method for simulating async operations
     */
    private delay;
    /**
     * Log performance metrics
     */
    private logPerformance;
}

/**
 * ZK Verifier class for verifying zero-knowledge proofs
 */
declare class ZkVerifier {
    private config;
    private isInitialized;
    constructor(config?: Partial<ProverConfig>);
    /**
     * Initialize the verifier
     */
    initialize(): Promise<void>;
    /**
     * Verify a ZK proof against the original input
     */
    verifyProof(input: Uint8Array, proof: Uint8Array, expectedHash: number[]): Promise<VerificationResult>;
    /**
     * Verify only the proof (without re-computing the hash)
     */
    verifyProofOnly(proof: Uint8Array, publicInputs: number[]): Promise<VerificationResult>;
    /**
     * Batch verify multiple proofs
     */
    verifyBatchProofs(proofs: Array<{
        input: Uint8Array;
        proof: Uint8Array;
        expectedHash: number[];
    }>): Promise<VerificationResult[]>;
    /**
     * Check if verifier is ready
     */
    isReady(): boolean;
    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
    /**
     * Private method to setup verification system
     */
    private setupVerificationSystem;
    /**
     * Private method to verify the ZK proof
     */
    private verifyZkProof;
    /**
     * Utility method to compare arrays
     */
    private arraysEqual;
    /**
     * Convert number array to hex string
     */
    private arrayToHex;
    /**
     * Utility method for simulating async operations
     */
    private delay;
    /**
     * Log performance metrics
     */
    private logPerformance;
}

/**
 * High-level ZK client that combines prover and verifier functionality
 */
declare class ZkClient {
    private prover;
    private verifier;
    private isInitialized;
    constructor(config?: Partial<ProverConfig>);
    /**
     * Initialize both prover and verifier
     */
    initialize(): Promise<void>;
    /**
     * Generate a proof for input data
     */
    generateProof(input: Uint8Array): Promise<{
        hash: number[];
        proof: Uint8Array;
        generationTime: number;
    }>;
    /**
     * Verify a proof against the original input
     */
    verifyProof(input: Uint8Array, proof: Uint8Array, expectedHash: number[]): Promise<VerificationResult>;
    /**
     * Generate and verify a proof in one operation
     */
    proveAndVerify(input: Uint8Array): Promise<{
        proof: {
            hash: number[];
            proof: Uint8Array;
            generationTime: number;
        };
        verification: VerificationResult;
    }>;
    /**
     * Generate proofs for multiple inputs
     */
    generateBatchProofs(batch: ProofBatch): Promise<BatchProofResult>;
    /**
     * Verify multiple proofs
     */
    verifyBatchProofs(proofs: Array<{
        input: Uint8Array;
        proof: Uint8Array;
        expectedHash: number[];
    }>): Promise<VerificationResult[]>;
    /**
     * Get performance metrics from the prover
     */
    getMetrics(): {
        setupTime: number;
        proofTime: number;
        verificationTime: number;
        proofSize: number;
        circuitSize: number;
    };
    /**
     * Check if the client is ready
     */
    isReady(): boolean;
    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
    /**
     * Update configuration for both prover and verifier
     */
    updateConfig(newConfig: Partial<ProverConfig>): void;
    /**
     * Ensure the client is initialized
     */
    private ensureInitialized;
}

export { type BatchProofResult, BatchProofResultSchema, type CircuitStats, CircuitStatsSchema, type FFIInput, type FFIOutput, type ProofBatch, ProofBatchSchema, type ProverConfig, ProverConfigSchema, type ProverMetrics, ProverMetricsSchema, type ProvingKeyCache, ProvingKeyCacheSchema, type VerificationResult, VerificationResultSchema, type VerificationStatus, VerificationStatusSchema, ZK_CONSTANTS, ZK_ERROR_CODES, ZkClient, type ZkErrorCode, ZkProver, ZkVerifier };
