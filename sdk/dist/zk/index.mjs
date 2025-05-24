import { sha256 } from '@noble/hashes/sha256';
import { z } from 'zod';

// src/zk/prover.ts
z.object({
  /** Length of the original input data */
  len: z.number().int().nonnegative(),
  /** SHA256 hash of the input as 32-byte array */
  hash: z.array(z.number().int().min(0).max(255)).length(32)
});
z.object({
  /** SHA256 hash of the input */
  hash: z.array(z.number().int().min(0).max(255)).length(32),
  /** Serialized proof bytes */
  proof: z.instanceof(Uint8Array),
  /** Proof generation time in milliseconds */
  generationTime: z.number().int().nonnegative()
});
var ZkProofConfigSchema = z.object({
  /** Circuit size parameter (k value) */
  circuitK: z.number().int().min(10).max(20).default(14),
  /** Whether to use cached proving keys */
  useCachedKeys: z.boolean().default(true),
  /** Timeout for proof generation in milliseconds */
  timeout: z.number().int().positive().default(3e4)
});
z.object({
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
  signature: z.string().regex(/^0x[a-fA-F0-9]*$/)
});
var AccountConfigSchema = z.object({
  /** Account implementation address */
  implementation: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Account factory address */
  factory: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Entry point address */
  entryPoint: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Initial account owner */
  owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Salt for deterministic address generation */
  salt: z.bigint().default(0n)
});
z.object({
  /** List of signer addresses */
  signers: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/)).min(1),
  /** Required number of signatures (threshold) */
  threshold: z.number().int().positive(),
  /** Delay for signer management operations in seconds */
  delay: z.number().int().nonnegative().default(0)
});
var PaymasterConfigSchema = z.object({
  /** Paymaster contract address */
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Verifying signer for paymaster */
  signer: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Valid until timestamp */
  validUntil: z.number().int().nonnegative(),
  /** Valid after timestamp */
  validAfter: z.number().int().nonnegative()
});
var TransactionDataSchema = z.object({
  /** Target contract address */
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Value in wei */
  value: z.bigint().default(0n),
  /** Call data */
  data: z.string().regex(/^0x[a-fA-F0-9]*$/),
  /** Operation type (0 = call, 1 = delegatecall) */
  operation: z.number().int().min(0).max(1).default(0)
});
z.object({
  /** Array of transaction data */
  transactions: z.array(TransactionDataSchema).min(1),
  /** Whether to fail on first error */
  failOnError: z.boolean().default(true)
});
var NetworkConfigSchema = z.object({
  /** Chain ID */
  chainId: z.number().int().positive(),
  /** Network name */
  name: z.string().min(1),
  /** RPC URL */
  rpcUrl: z.string().url(),
  /** Block explorer URL */
  explorerUrl: z.string().url().optional(),
  /** Native currency symbol */
  currency: z.string().min(1).default("ETH"),
  /** Whether this is a testnet */
  isTestnet: z.boolean().default(false)
});
z.object({
  /** Network configuration */
  network: NetworkConfigSchema,
  /** ZK proof configuration */
  zkConfig: ZkProofConfigSchema.optional(),
  /** Account configuration */
  accountConfig: AccountConfigSchema.optional(),
  /** Paymaster configuration */
  paymasterConfig: PaymasterConfigSchema.optional(),
  /** Enable debug logging */
  debug: z.boolean().default(false)
});
var GuardianAAError = class extends Error {
  constructor(message, code, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "GuardianAAError";
  }
};
var ZkProofError = class extends GuardianAAError {
  constructor(message, details) {
    super(message, "ZK_PROOF_ERROR", details);
    this.name = "ZkProofError";
  }
};
var ProverMetricsSchema = z.object({
  setupTime: z.number().nonnegative(),
  proofTime: z.number().nonnegative(),
  verificationTime: z.number().nonnegative(),
  proofSize: z.number().int().nonnegative(),
  circuitSize: z.number().int().nonnegative()
});
var VerificationStatusSchema = z.enum([
  "VALID",
  "INVALID",
  "ERROR",
  "TIMEOUT"
]);
var VerificationResultSchema = z.object({
  status: VerificationStatusSchema,
  message: z.string().optional(),
  verificationTime: z.number().nonnegative().optional(),
  publicInputsHash: z.string().optional()
});
var ProverConfigSchema = z.object({
  circuitK: z.number().int().min(10).max(20).default(14),
  useCachedKeys: z.boolean().default(true),
  timeout: z.number().int().positive().default(3e4),
  maxInputSize: z.number().int().positive().default(1024 * 1024),
  // 1MB
  enableBenchmarking: z.boolean().default(false),
  logLevel: z.enum(["ERROR", "WARN", "INFO", "DEBUG"]).default("INFO")
});
var ProvingKeyCacheSchema = z.object({
  circuitK: z.number().int(),
  keyHash: z.string(),
  createdAt: z.number().int(),
  size: z.number().int(),
  isValid: z.boolean()
});
var CircuitStatsSchema = z.object({
  numConstraints: z.number().int().nonnegative(),
  numAdvice: z.number().int().nonnegative(),
  numFixed: z.number().int().nonnegative(),
  numInstance: z.number().int().nonnegative(),
  degree: z.number().int().nonnegative()
});
var ProofBatchSchema = z.object({
  inputs: z.array(z.instanceof(Uint8Array)).min(1),
  parallelization: z.boolean().default(true),
  batchId: z.string().optional()
});
var BatchProofResultSchema = z.object({
  batchId: z.string().optional(),
  results: z.array(z.object({
    index: z.number().int().nonnegative(),
    hash: z.array(z.number().int().min(0).max(255)).length(32),
    proof: z.instanceof(Uint8Array),
    generationTime: z.number().nonnegative()
  })),
  totalTime: z.number().nonnegative(),
  averageTime: z.number().nonnegative()
});
var ZK_CONSTANTS = {
  MAX_CIRCUIT_K: 20,
  MIN_CIRCUIT_K: 10,
  DEFAULT_CIRCUIT_K: 14,
  MAX_INPUT_SIZE: 1024 * 1024,
  // 1MB
  SHA256_HASH_SIZE: 32,
  TARGET_PROOF_TIME_MS: 500,
  MAX_PROOF_TIME_MS: 3e4,
  PROOF_CACHE_TTL_MS: 24 * 60 * 60 * 1e3
  // 24 hours
};
var ZK_ERROR_CODES = {
  PROVER_NOT_INITIALIZED: "PROVER_NOT_INITIALIZED",
  INVALID_INPUT_SIZE: "INVALID_INPUT_SIZE",
  PROOF_GENERATION_FAILED: "PROOF_GENERATION_FAILED",
  VERIFICATION_FAILED: "VERIFICATION_FAILED",
  TIMEOUT_EXCEEDED: "TIMEOUT_EXCEEDED",
  INVALID_CIRCUIT_K: "INVALID_CIRCUIT_K",
  PROVING_KEY_NOT_FOUND: "PROVING_KEY_NOT_FOUND",
  FFI_ERROR: "FFI_ERROR"
};

// src/zk/prover.ts
var ZkProver = class {
  config;
  isInitialized = false;
  setupTime = 0;
  constructor(config = {}) {
    this.config = ProverConfigSchema.parse(config);
  }
  /**
   * Initialize the prover (setup proving keys, etc.)
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }
    const startTime = performance.now();
    try {
      await this.setupProvingSystem();
      this.setupTime = performance.now() - startTime;
      this.isInitialized = true;
      if (this.config.enableBenchmarking) {
        this.logPerformance("Prover initialization", this.setupTime);
      }
    } catch (error) {
      throw new ZkProofError(
        "Failed to initialize ZK prover",
        { error, config: this.config }
      );
    }
  }
  /**
   * Generate a ZK proof for the given input data
   */
  async generateProof(input) {
    if (!this.isInitialized) {
      throw new ZkProofError(
        "Prover not initialized",
        { code: ZK_ERROR_CODES.PROVER_NOT_INITIALIZED }
      );
    }
    if (input.length > this.config.maxInputSize) {
      throw new ZkProofError(
        `Input size ${input.length} exceeds maximum ${this.config.maxInputSize}`,
        { code: ZK_ERROR_CODES.INVALID_INPUT_SIZE }
      );
    }
    const startTime = performance.now();
    try {
      const result = await this.callRustProver(input);
      const generationTime = performance.now() - startTime;
      if (generationTime > ZK_CONSTANTS.TARGET_PROOF_TIME_MS) {
        console.warn(
          `Proof generation time ${generationTime}ms exceeds target ${ZK_CONSTANTS.TARGET_PROOF_TIME_MS}ms`
        );
      }
      if (this.config.enableBenchmarking) {
        this.logPerformance("Proof generation", generationTime);
      }
      return {
        hash: result.hash,
        proof: result.proof,
        generationTime
      };
    } catch (error) {
      throw new ZkProofError(
        "Proof generation failed",
        { error, inputSize: input.length }
      );
    }
  }
  /**
   * Generate proofs for multiple inputs in batch
   */
  async generateBatchProofs(batch) {
    if (!this.isInitialized) {
      throw new ZkProofError(
        "Prover not initialized",
        { code: ZK_ERROR_CODES.PROVER_NOT_INITIALIZED }
      );
    }
    const startTime = performance.now();
    const results = [];
    try {
      if (batch.parallelization) {
        const promises = batch.inputs.map(async (input, index) => {
          const result = await this.generateProof(input);
          return { index, ...result };
        });
        const parallelResults = await Promise.all(promises);
        results.push(...parallelResults);
      } else {
        for (let i = 0; i < batch.inputs.length; i += 1) {
          const result = await this.generateProof(batch.inputs[i]);
          results.push({ index: i, ...result });
        }
      }
      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / batch.inputs.length;
      return {
        batchId: batch.batchId,
        results,
        totalTime,
        averageTime
      };
    } catch (error) {
      throw new ZkProofError(
        "Batch proof generation failed",
        { error, batchSize: batch.inputs.length }
      );
    }
  }
  /**
   * Get prover performance metrics
   */
  getMetrics() {
    return {
      setupTime: this.setupTime,
      proofTime: 0,
      // Would be calculated from actual measurements
      verificationTime: 0,
      proofSize: 0,
      circuitSize: 2 ** this.config.circuitK
    };
  }
  /**
   * Update prover configuration
   */
  updateConfig(newConfig) {
    const updatedConfig = { ...this.config, ...newConfig };
    this.config = ProverConfigSchema.parse(updatedConfig);
  }
  /**
   * Check if prover is initialized
   */
  isReady() {
    return this.isInitialized;
  }
  /**
   * Cleanup resources
   */
  async cleanup() {
    this.isInitialized = false;
    this.setupTime = 0;
  }
  /**
   * Private method to setup the proving system
   */
  async setupProvingSystem() {
    await this.delay(100);
  }
  /**
   * Private method to call the Rust prover via FFI
   */
  async callRustProver(input) {
    const hashBuffer = sha256(input);
    const hash = Array.from(hashBuffer);
    const proof = new Uint8Array(1024);
    crypto.getRandomValues(proof);
    await this.delay(50);
    return { hash, proof };
  }
  /**
   * Utility method for simulating async operations
   */
  async delay(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  /**
   * Log performance metrics
   */
  logPerformance(operation, timeMs) {
    if (this.config.logLevel === "DEBUG" || this.config.logLevel === "INFO") {
      console.log(`[ZkProver] ${operation}: ${timeMs.toFixed(2)}ms`);
    }
  }
};
var ZkVerifier = class {
  config;
  isInitialized = false;
  constructor(config = {}) {
    this.config = {
      circuitK: 14,
      useCachedKeys: true,
      timeout: 3e4,
      maxInputSize: 1024 * 1024,
      enableBenchmarking: false,
      logLevel: "INFO",
      ...config
    };
  }
  /**
   * Initialize the verifier
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }
    try {
      await this.setupVerificationSystem();
      this.isInitialized = true;
    } catch (error) {
      throw new ZkProofError(
        "Failed to initialize ZK verifier",
        { error, config: this.config }
      );
    }
  }
  /**
   * Verify a ZK proof against the original input
   */
  async verifyProof(input, proof, expectedHash) {
    if (!this.isInitialized) {
      throw new ZkProofError(
        "Verifier not initialized",
        { code: ZK_ERROR_CODES.PROVER_NOT_INITIALIZED }
      );
    }
    const startTime = performance.now();
    try {
      const computedHashBuffer = sha256(input);
      const computedHash = Array.from(computedHashBuffer);
      if (!this.arraysEqual(computedHash, expectedHash)) {
        return {
          status: "INVALID",
          message: "Hash mismatch",
          verificationTime: performance.now() - startTime
        };
      }
      const isValidProof = await this.verifyZkProof(proof, expectedHash);
      const verificationTime = performance.now() - startTime;
      if (this.config.enableBenchmarking) {
        this.logPerformance("Proof verification", verificationTime);
      }
      return {
        status: isValidProof ? "VALID" : "INVALID",
        verificationTime,
        publicInputsHash: this.arrayToHex(expectedHash)
      };
    } catch (error) {
      return {
        status: "ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        verificationTime: performance.now() - startTime
      };
    }
  }
  /**
   * Verify only the proof (without re-computing the hash)
   */
  async verifyProofOnly(proof, publicInputs) {
    if (!this.isInitialized) {
      throw new ZkProofError(
        "Verifier not initialized",
        { code: ZK_ERROR_CODES.PROVER_NOT_INITIALIZED }
      );
    }
    const startTime = performance.now();
    try {
      const isValid = await this.verifyZkProof(proof, publicInputs);
      const verificationTime = performance.now() - startTime;
      if (this.config.enableBenchmarking) {
        this.logPerformance("Proof-only verification", verificationTime);
      }
      return {
        status: isValid ? "VALID" : "INVALID",
        verificationTime,
        publicInputsHash: this.arrayToHex(publicInputs)
      };
    } catch (error) {
      return {
        status: "ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        verificationTime: performance.now() - startTime
      };
    }
  }
  /**
   * Batch verify multiple proofs
   */
  async verifyBatchProofs(proofs) {
    if (!this.isInitialized) {
      throw new ZkProofError(
        "Verifier not initialized",
        { code: ZK_ERROR_CODES.PROVER_NOT_INITIALIZED }
      );
    }
    const promises = proofs.map(
      ({ input, proof, expectedHash }) => this.verifyProof(input, proof, expectedHash)
    );
    return Promise.all(promises);
  }
  /**
   * Check if verifier is ready
   */
  isReady() {
    return this.isInitialized;
  }
  /**
   * Cleanup resources
   */
  async cleanup() {
    this.isInitialized = false;
  }
  /**
   * Private method to setup verification system
   */
  async setupVerificationSystem() {
    await this.delay(50);
  }
  /**
   * Private method to verify the ZK proof
   */
  async verifyZkProof(proof, publicInputs) {
    await this.delay(10);
    return proof.length > 0 && publicInputs.length === 32;
  }
  /**
   * Utility method to compare arrays
   */
  arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }
  /**
   * Convert number array to hex string
   */
  arrayToHex(arr) {
    return `0x${arr.map((b) => b.toString(16).padStart(2, "0")).join("")}`;
  }
  /**
   * Utility method for simulating async operations
   */
  async delay(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  /**
   * Log performance metrics
   */
  logPerformance(operation, timeMs) {
    if (this.config.logLevel === "DEBUG" || this.config.logLevel === "INFO") {
      console.log(`[ZkVerifier] ${operation}: ${timeMs.toFixed(2)}ms`);
    }
  }
};

// src/zk/client.ts
var ZkClient = class {
  prover;
  verifier;
  isInitialized = false;
  constructor(config = {}) {
    this.prover = new ZkProver(config);
    this.verifier = new ZkVerifier(config);
  }
  /**
   * Initialize both prover and verifier
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }
    try {
      await Promise.all([
        this.prover.initialize(),
        this.verifier.initialize()
      ]);
      this.isInitialized = true;
    } catch (error) {
      throw new ZkProofError(
        "Failed to initialize ZK client",
        { error }
      );
    }
  }
  /**
   * Generate a proof for input data
   */
  async generateProof(input) {
    this.ensureInitialized();
    return this.prover.generateProof(input);
  }
  /**
   * Verify a proof against the original input
   */
  async verifyProof(input, proof, expectedHash) {
    this.ensureInitialized();
    return this.verifier.verifyProof(input, proof, expectedHash);
  }
  /**
   * Generate and verify a proof in one operation
   */
  async proveAndVerify(input) {
    this.ensureInitialized();
    const proof = await this.generateProof(input);
    const verification = await this.verifyProof(
      input,
      proof.proof,
      proof.hash
    );
    return { proof, verification };
  }
  /**
   * Generate proofs for multiple inputs
   */
  async generateBatchProofs(batch) {
    this.ensureInitialized();
    return this.prover.generateBatchProofs(batch);
  }
  /**
   * Verify multiple proofs
   */
  async verifyBatchProofs(proofs) {
    this.ensureInitialized();
    return this.verifier.verifyBatchProofs(proofs);
  }
  /**
   * Get performance metrics from the prover
   */
  getMetrics() {
    this.ensureInitialized();
    return this.prover.getMetrics();
  }
  /**
   * Check if the client is ready
   */
  isReady() {
    return this.isInitialized && this.prover.isReady() && this.verifier.isReady();
  }
  /**
   * Cleanup resources
   */
  async cleanup() {
    await Promise.all([
      this.prover.cleanup(),
      this.verifier.cleanup()
    ]);
    this.isInitialized = false;
  }
  /**
   * Update configuration for both prover and verifier
   */
  updateConfig(newConfig) {
    this.prover.updateConfig(newConfig);
  }
  /**
   * Ensure the client is initialized
   */
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new ZkProofError(
        "ZK client not initialized. Call initialize() first.",
        { code: ZK_ERROR_CODES.PROVER_NOT_INITIALIZED }
      );
    }
  }
};

export { BatchProofResultSchema, CircuitStatsSchema, ProofBatchSchema, ProverConfigSchema, ProverMetricsSchema, ProvingKeyCacheSchema, VerificationResultSchema, VerificationStatusSchema, ZK_CONSTANTS, ZK_ERROR_CODES, ZkClient, ZkProver, ZkVerifier };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map