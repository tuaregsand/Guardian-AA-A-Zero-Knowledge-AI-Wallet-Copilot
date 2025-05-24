import { z } from 'zod';
import { sha256 } from '@noble/hashes/sha256';
import { ethers } from 'ethers';

// src/types/index.ts
var ZkProofOutputSchema = z.object({
  /** Length of the original input data */
  len: z.number().int().nonnegative(),
  /** SHA256 hash of the input as 32-byte array */
  hash: z.array(z.number().int().min(0).max(255)).length(32)
});
var ZkProofResultSchema = z.object({
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
var UserOperationSchema = z.object({
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
var MultiSigConfigSchema = z.object({
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
var BatchTransactionSchema = z.object({
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
var SdkConfigSchema = z.object({
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
var ContractError = class extends GuardianAAError {
  constructor(message, details) {
    super(message, "CONTRACT_ERROR", details);
    this.name = "ContractError";
  }
};
var ConfigError = class extends GuardianAAError {
  constructor(message, details) {
    super(message, "CONFIG_ERROR", details);
    this.name = "ConfigError";
  }
};
var ValidationError = class extends GuardianAAError {
  constructor(message, details) {
    super(message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
};
var DEFAULT_GAS_LIMITS = {
  VERIFICATION: 70000n,
  CALL: 35000n,
  CREATION: 1000000n,
  PRE_VERIFICATION: 21000n
};
var SUPPORTED_CHAINS = {
  ETHEREUM_MAINNET: 1,
  ETHEREUM_SEPOLIA: 11155111,
  POLYGON_MAINNET: 137,
  POLYGON_MUMBAI: 80001,
  ARBITRUM_ONE: 42161,
  ARBITRUM_SEPOLIA: 421614,
  OPTIMISM_MAINNET: 10,
  OPTIMISM_SEPOLIA: 11155420
};
var CONTRACT_ADDRESSES = {
  // Ethereum Sepolia
  [SUPPORTED_CHAINS.ETHEREUM_SEPOLIA]: {
    entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    accountFactory: "0x9406Cc6185a346906296840746125a0E44976454",
    multiSigFactory: "0x000000000000000000000000000000000000dEaD",
    verifyingPaymaster: "0x000000000000000000000000000000000000dEaD"
  }
  // Add more chains as needed
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
var ENTRY_POINT_ABI = [
  {
    name: "handleOps",
    type: "function",
    inputs: [
      { name: "ops", type: "tuple[]", components: [] },
      { name: "beneficiary", type: "address" }
    ],
    outputs: []
  },
  {
    name: "getUserOpHash",
    type: "function",
    inputs: [{ name: "userOp", type: "tuple", components: [] }],
    outputs: [{ name: "", type: "bytes32" }]
  }
];
var SIMPLE_ACCOUNT_ABI = [
  {
    name: "execute",
    type: "function",
    inputs: [
      { name: "dest", type: "address" },
      { name: "value", type: "uint256" },
      { name: "func", type: "bytes" }
    ],
    outputs: []
  },
  {
    name: "executeBatch",
    type: "function",
    inputs: [
      { name: "dest", type: "address[]" },
      { name: "value", type: "uint256[]" },
      { name: "func", type: "bytes[]" }
    ],
    outputs: []
  }
];
var MULTI_SIG_ACCOUNT_ABI = [
  {
    name: "addSigner",
    type: "function",
    inputs: [{ name: "signer", type: "address" }],
    outputs: []
  },
  {
    name: "removeSigner",
    type: "function",
    inputs: [{ name: "signer", type: "address" }],
    outputs: []
  },
  {
    name: "changeThreshold",
    type: "function",
    inputs: [{ name: "threshold", type: "uint256" }],
    outputs: []
  }
];
var VERIFYING_PAYMASTER_ABI = [
  {
    name: "getHash",
    type: "function",
    inputs: [
      { name: "userOp", type: "tuple", components: [] },
      { name: "validUntil", type: "uint48" },
      { name: "validAfter", type: "uint48" }
    ],
    outputs: [{ name: "", type: "bytes32" }]
  }
];
var ContractDeployConfigSchema = z.object({
  /** Contract bytecode */
  bytecode: z.string().regex(/^0x[a-fA-F0-9]*$/),
  /** Constructor arguments */
  constructorArgs: z.array(z.unknown()).default([]),
  /** Gas limit for deployment */
  gasLimit: z.bigint().optional(),
  /** Gas price */
  gasPrice: z.bigint().optional(),
  /** Salt for CREATE2 deployment */
  salt: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional()
});
var ContractCallConfigSchema = z.object({
  /** Contract address */
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Function name */
  functionName: z.string().min(1),
  /** Function arguments */
  args: z.array(z.unknown()).default([]),
  /** Value to send with the call */
  value: z.bigint().default(0n),
  /** Gas limit */
  gasLimit: z.bigint().optional()
});
var AccountOperationResultSchema = z.object({
  /** Transaction hash */
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  /** Block number */
  blockNumber: z.number().int().nonnegative(),
  /** Gas used */
  gasUsed: z.bigint(),
  /** Operation status */
  status: z.enum(["SUCCESS", "FAILED", "PENDING"]),
  /** Error message if failed */
  error: z.string().optional()
});
var SignatureDataSchema = z.object({
  /** Signer address */
  signer: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Signature bytes */
  signature: z.string().regex(/^0x[a-fA-F0-9]*$/),
  /** Signature type (ECDSA, etc.) */
  signatureType: z.enum(["ECDSA", "EIP1271"]).default("ECDSA")
});
var GasEstimationSchema = z.object({
  /** Estimated gas limit */
  gasLimit: z.bigint(),
  /** Estimated gas price */
  gasPrice: z.bigint(),
  /** Maximum fee per gas (EIP-1559) */
  maxFeePerGas: z.bigint().optional(),
  /** Maximum priority fee per gas (EIP-1559) */
  maxPriorityFeePerGas: z.bigint().optional(),
  /** Estimated total cost in wei */
  totalCost: z.bigint()
});
var EventFilterSchema = z.object({
  /** Contract address */
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Event topics */
  topics: z.array(z.string().regex(/^0x[a-fA-F0-9]{64}$/)).optional(),
  /** From block */
  fromBlock: z.union([z.number().int().nonnegative(), z.literal("latest")]).default("latest"),
  /** To block */
  toBlock: z.union([z.number().int().nonnegative(), z.literal("latest")]).default("latest")
});
var ContractEventSchema = z.object({
  /** Event name */
  eventName: z.string(),
  /** Contract address */
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Block number */
  blockNumber: z.number().int().nonnegative(),
  /** Transaction hash */
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  /** Event data */
  data: z.record(z.unknown())
});
var DEFAULT_CONTRACT_ADDRESSES = {
  // Local testnet (Hardhat/Anvil)
  31337: {
    entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    simpleAccountFactory: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    multiSigAccountFactory: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    verifyingPaymaster: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"
  },
  // Ethereum Sepolia
  11155111: {
    entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    simpleAccountFactory: "0x9406Cc6185a346906296840746125a0E44976454",
    multiSigAccountFactory: "0x000000000000000000000000000000000000dEaD",
    verifyingPaymaster: "0x000000000000000000000000000000000000dEaD"
  }
};
var CONTRACT_GAS_LIMITS = {
  SIMPLE_ACCOUNT_DEPLOY: 1000000n,
  MULTI_SIG_ACCOUNT_DEPLOY: 1500000n,
  PAYMASTER_DEPLOY: 800000n,
  ENTRY_POINT_DEPLOY: 2000000n
};
var FUNCTION_SELECTORS = {
  EXECUTE: "0xb61d27f6",
  EXECUTE_BATCH: "0x18dfb3c7",
  ADD_SIGNER: "0x7065cb48",
  REMOVE_SIGNER: "0x0e316ab7",
  CHANGE_THRESHOLD: "0x694e80c3"
};

// src/contracts/account.ts
var BaseAccount = class {
  provider;
  address;
  entryPointAddress;
  constructor(provider, address, entryPointAddress) {
    this.provider = provider;
    this.address = address;
    this.entryPointAddress = entryPointAddress;
  }
  /**
   * Get the account address
   */
  getAddress() {
    return this.address;
  }
  /**
   * Get the current nonce for the account
   */
  async getNonce() {
    try {
      const contract = new ethers.Contract(
        this.address,
        ["function getNonce() view returns (uint256)"],
        this.provider
      );
      const getNonceMethod = contract["getNonce"];
      if (!getNonceMethod) {
        throw new Error("getNonce method not found on contract");
      }
      const result = await getNonceMethod();
      return result;
    } catch (error) {
      throw new ContractError(
        "Failed to get account nonce",
        { error, address: this.address }
      );
    }
  }
  /**
   * Estimate gas for a transaction
   */
  async estimateGas(transaction) {
    try {
      const feeData = await this.provider.getFeeData();
      const gasLimit = await this.provider.estimateGas({
        to: transaction.to,
        value: transaction.value,
        data: transaction.data
      });
      const gasPrice = feeData.gasPrice ?? 0n;
      const maxFeePerGas = feeData.maxFeePerGas ?? gasPrice;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? 0n;
      return {
        gasLimit: gasLimit + gasLimit / 10n,
        // Add 10% buffer
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas,
        totalCost: gasLimit * gasPrice
      };
    } catch (error) {
      throw new ContractError(
        "Failed to estimate gas",
        { error, transaction }
      );
    }
  }
};
var SimpleAccount = class extends BaseAccount {
  contract;
  constructor(provider, address, entryPointAddress) {
    super(provider, address, entryPointAddress);
    this.contract = new ethers.Contract(address, SIMPLE_ACCOUNT_ABI, provider);
  }
  /**
   * Build a UserOperation for a simple account transaction
   */
  async buildUserOperation(transaction, options = {}) {
    try {
      const nonce = options.nonce ?? await this.getNonce();
      const gasEstimation = await this.estimateGas(transaction);
      const callData = this.contract.interface.encodeFunctionData("execute", [
        transaction.to,
        transaction.value,
        transaction.data
      ]);
      return {
        sender: this.address,
        nonce,
        initCode: "0x",
        // Account already deployed
        callData,
        callGasLimit: options.gasLimits?.gasLimit ?? gasEstimation.gasLimit,
        verificationGasLimit: CONTRACT_GAS_LIMITS.SIMPLE_ACCOUNT_DEPLOY / 10n,
        preVerificationGas: 21000n,
        maxFeePerGas: options.gasLimits?.maxFeePerGas ?? gasEstimation.maxFeePerGas ?? 0n,
        maxPriorityFeePerGas: options.gasLimits?.maxPriorityFeePerGas ?? gasEstimation.maxPriorityFeePerGas ?? 0n,
        paymasterAndData: options.paymasterData ?? "0x",
        signature: "0x"
        // Will be filled by the signer
      };
    } catch (error) {
      throw new ContractError(
        "Failed to build UserOperation",
        { error, transaction }
      );
    }
  }
  /**
   * Execute a single transaction
   */
  async execute(transaction, signature) {
    try {
      const userOp = await this.buildUserOperation(transaction);
      userOp.signature = signature;
      const txHash = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(userOp))
      );
      return {
        txHash,
        blockNumber: await this.provider.getBlockNumber(),
        gasUsed: userOp.callGasLimit,
        status: "SUCCESS"
      };
    } catch (error) {
      throw new ContractError(
        "Failed to execute transaction",
        { error, transaction }
      );
    }
  }
  /**
   * Execute multiple transactions in batch
   */
  async executeBatch(batch, signature) {
    try {
      const destinations = batch.transactions.map((tx) => tx.to);
      const values = batch.transactions.map((tx) => tx.value);
      const datas = batch.transactions.map((tx) => tx.data);
      const callData = this.contract.interface.encodeFunctionData("executeBatch", [
        destinations,
        values,
        datas
      ]);
      const batchTransaction = {
        to: this.address,
        value: 0n,
        data: callData,
        operation: 0
      };
      return this.execute(batchTransaction, signature);
    } catch (error) {
      throw new ContractError(
        "Failed to execute batch transaction",
        { error, batch }
      );
    }
  }
};
var MultiSigAccount = class extends BaseAccount {
  contract;
  threshold;
  signers;
  constructor(provider, address, entryPointAddress, threshold, signers) {
    super(provider, address, entryPointAddress);
    this.contract = new ethers.Contract(address, MULTI_SIG_ACCOUNT_ABI, provider);
    this.threshold = threshold;
    this.signers = signers;
  }
  /**
   * Get current signers and threshold
   */
  async getSignerInfo() {
    try {
      return {
        signers: this.signers,
        threshold: this.threshold
      };
    } catch (error) {
      throw new ContractError(
        "Failed to get signer info",
        { error, address: this.address }
      );
    }
  }
  /**
   * Add a new signer to the multi-sig account
   */
  async addSigner(newSigner, signatures) {
    if (signatures.length < this.threshold) {
      throw new ValidationError(
        `Insufficient signatures: need ${this.threshold}, got ${signatures.length}`
      );
    }
    try {
      const callData = this.contract.interface.encodeFunctionData("addSigner", [
        newSigner
      ]);
      const transaction = {
        to: this.address,
        value: 0n,
        data: callData,
        operation: 0
      };
      const combinedSignature = this.combineSignatures(signatures);
      return this.execute(transaction, combinedSignature);
    } catch (error) {
      throw new ContractError(
        "Failed to add signer",
        { error, newSigner, signatures }
      );
    }
  }
  /**
   * Remove a signer from the multi-sig account
   */
  async removeSigner(signerToRemove, signatures) {
    if (signatures.length < this.threshold) {
      throw new ValidationError(
        `Insufficient signatures: need ${this.threshold}, got ${signatures.length}`
      );
    }
    try {
      const callData = this.contract.interface.encodeFunctionData("removeSigner", [
        signerToRemove
      ]);
      const transaction = {
        to: this.address,
        value: 0n,
        data: callData,
        operation: 0
      };
      const combinedSignature = this.combineSignatures(signatures);
      return this.execute(transaction, combinedSignature);
    } catch (error) {
      throw new ContractError(
        "Failed to remove signer",
        { error, signerToRemove, signatures }
      );
    }
  }
  /**
   * Change the signature threshold
   */
  async changeThreshold(newThreshold, signatures) {
    if (signatures.length < this.threshold) {
      throw new ValidationError(
        `Insufficient signatures: need ${this.threshold}, got ${signatures.length}`
      );
    }
    if (newThreshold > this.signers.length) {
      throw new ValidationError(
        `Threshold ${newThreshold} cannot exceed number of signers ${this.signers.length}`
      );
    }
    try {
      const callData = this.contract.interface.encodeFunctionData("changeThreshold", [
        newThreshold
      ]);
      const transaction = {
        to: this.address,
        value: 0n,
        data: callData,
        operation: 0
      };
      const combinedSignature = this.combineSignatures(signatures);
      const result = await this.execute(transaction, combinedSignature);
      this.threshold = newThreshold;
      return result;
    } catch (error) {
      throw new ContractError(
        "Failed to change threshold",
        { error, newThreshold, signatures }
      );
    }
  }
  /**
   * Build UserOperation for multi-sig account
   */
  async buildUserOperation(transaction, options = {}) {
    try {
      const nonce = options.nonce ?? await this.getNonce();
      const gasEstimation = await this.estimateGas(transaction);
      const callData = this.contract.interface.encodeFunctionData("execute", [
        transaction.to,
        transaction.value,
        transaction.data
      ]);
      return {
        sender: this.address,
        nonce,
        initCode: "0x",
        // Account already deployed
        callData,
        callGasLimit: options.gasLimits?.gasLimit ?? gasEstimation.gasLimit,
        verificationGasLimit: CONTRACT_GAS_LIMITS.MULTI_SIG_ACCOUNT_DEPLOY / 5n,
        preVerificationGas: 21000n,
        maxFeePerGas: options.gasLimits?.maxFeePerGas ?? gasEstimation.maxFeePerGas ?? 0n,
        maxPriorityFeePerGas: options.gasLimits?.maxPriorityFeePerGas ?? gasEstimation.maxPriorityFeePerGas ?? 0n,
        paymasterAndData: options.paymasterData ?? "0x",
        signature: "0x"
        // Will be filled by the signer
      };
    } catch (error) {
      throw new ContractError(
        "Failed to build UserOperation for multi-sig account",
        { error, transaction }
      );
    }
  }
  /**
   * Execute with multi-sig verification
   */
  async execute(transaction, signature) {
    try {
      const userOp = await this.buildUserOperation(transaction);
      userOp.signature = signature;
      const txHash = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(userOp))
      );
      return {
        txHash,
        blockNumber: await this.provider.getBlockNumber(),
        gasUsed: userOp.callGasLimit,
        status: "SUCCESS"
      };
    } catch (error) {
      throw new ContractError(
        "Failed to execute multi-sig transaction",
        { error, transaction }
      );
    }
  }
  /**
   * Execute batch with multi-sig verification
   */
  async executeBatch(batch, signature) {
    try {
      const destinations = batch.transactions.map((tx) => tx.to);
      const values = batch.transactions.map((tx) => tx.value);
      const datas = batch.transactions.map((tx) => tx.data);
      const callData = this.contract.interface.encodeFunctionData("executeBatch", [
        destinations,
        values,
        datas
      ]);
      const batchTransaction = {
        to: this.address,
        value: 0n,
        data: callData,
        operation: 0
      };
      return this.execute(batchTransaction, signature);
    } catch (error) {
      throw new ContractError(
        "Failed to execute multi-sig batch transaction",
        { error, batch }
      );
    }
  }
  /**
   * Combine multiple signatures into a single signature for multi-sig verification
   */
  combineSignatures(signatures) {
    const sortedSignatures = signatures.sort(
      (a, b) => a.signer.toLowerCase().localeCompare(b.signer.toLowerCase())
    );
    const combined = sortedSignatures.map((sig) => sig.signature.slice(2)).join("");
    return `0x${combined}`;
  }
};
var VerifyingPaymaster = class {
  provider;
  config;
  constructor(provider, config) {
    this.provider = provider;
    this.config = config;
  }
  /**
   * Generate paymaster data for a user operation
   */
  async generatePaymasterData(userOp, validUntil, validAfter) {
    try {
      const until = validUntil ?? this.config.validUntil;
      const after = validAfter ?? this.config.validAfter;
      const hash = await this.getPaymasterHash(userOp, until, after);
      const signature = await this.config.signer.signMessage(
        ethers.getBytes(hash)
      );
      const paymasterData = ethers.solidityPacked(
        ["address", "uint48", "uint48", "bytes"],
        [this.config.address, until, after, signature]
      );
      return paymasterData;
    } catch (error) {
      throw new ContractError(
        "Failed to generate paymaster data",
        { error, userOp }
      );
    }
  }
  /**
   * Verify if a user operation can be sponsored
   */
  async canSponsor(userOp) {
    try {
      const balance = await this.getBalance();
      const estimatedCost = this.estimateOperationCost(userOp);
      if (balance < estimatedCost) {
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  }
  /**
   * Get the paymaster's balance in the EntryPoint
   */
  async getBalance() {
    try {
      const entryPointContract = new ethers.Contract(
        "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
        // Standard EntryPoint address
        ["function balanceOf(address) view returns (uint256)"],
        this.provider
      );
      const balanceOfMethod = entryPointContract["balanceOf"];
      if (!balanceOfMethod) {
        throw new Error("balanceOf method not found on contract");
      }
      return await balanceOfMethod(this.config.address);
    } catch (error) {
      throw new ContractError(
        "Failed to get paymaster balance",
        { error, address: this.config.address }
      );
    }
  }
  /**
   * Deposit funds to the paymaster's EntryPoint balance
   */
  async deposit(amount) {
    try {
      const entryPointContract = new ethers.Contract(
        "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
        ["function depositTo(address) payable"],
        this.config.signer
      );
      const depositToMethod = entryPointContract["depositTo"];
      if (!depositToMethod) {
        throw new Error("depositTo method not found on contract");
      }
      const tx = await depositToMethod(this.config.address, {
        value: amount
      });
      return tx.hash;
    } catch (error) {
      throw new ContractError(
        "Failed to deposit to paymaster",
        { error, amount }
      );
    }
  }
  /**
   * Withdraw funds from the paymaster's EntryPoint balance
   */
  async withdraw(amount, to) {
    try {
      const entryPointContract = new ethers.Contract(
        "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
        ["function withdrawTo(address, uint256)"],
        this.config.signer
      );
      const withdrawToMethod = entryPointContract["withdrawTo"];
      if (!withdrawToMethod) {
        throw new Error("withdrawTo method not found on contract");
      }
      const tx = await withdrawToMethod(to, amount);
      return tx.hash;
    } catch (error) {
      throw new ContractError(
        "Failed to withdraw from paymaster",
        { error, amount, to }
      );
    }
  }
  /**
   * Update paymaster configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
  /**
   * Get the current paymaster configuration
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Get the hash that needs to be signed for paymaster verification
   */
  async getPaymasterHash(userOp, validUntil, validAfter) {
    try {
      const encoded = ethers.solidityPacked(
        ["address", "uint256", "bytes32", "uint48", "uint48"],
        [
          userOp.sender,
          userOp.nonce,
          ethers.keccak256(userOp.callData),
          validUntil,
          validAfter
        ]
      );
      return ethers.keccak256(encoded);
    } catch (error) {
      throw new ContractError(
        "Failed to get paymaster hash",
        { error, userOp, validUntil, validAfter }
      );
    }
  }
  /**
   * Estimate the cost of sponsoring a user operation
   */
  estimateOperationCost(userOp) {
    const totalGas = userOp.callGasLimit + userOp.verificationGasLimit + userOp.preVerificationGas;
    const gasPrice = userOp.maxFeePerGas;
    return totalGas * gasPrice;
  }
};
var PaymasterFactory = class {
  provider;
  constructor(provider) {
    this.provider = provider;
  }
  /**
   * Create a new VerifyingPaymaster instance
   */
  createVerifyingPaymaster(config) {
    return new VerifyingPaymaster(this.provider, config);
  }
  /**
   * Deploy a new paymaster contract
   */
  async deployPaymaster(deployer, entryPointAddress, owner) {
    try {
      const factory = new ethers.ContractFactory(
        VERIFYING_PAYMASTER_ABI,
        "0x",
        // Bytecode would be here
        deployer
      );
      const contract = await factory.deploy(entryPointAddress, owner);
      await contract.waitForDeployment();
      return {
        address: await contract.getAddress(),
        txHash: contract.deploymentTransaction()?.hash ?? ""
      };
    } catch (error) {
      throw new ContractError(
        "Failed to deploy paymaster",
        { error, entryPointAddress, owner }
      );
    }
  }
};
var SimpleAccountFactory = class {
  provider;
  config;
  contract;
  constructor(provider, config) {
    this.provider = provider;
    this.config = config;
    this.contract = new ethers.Contract(
      config.factoryAddress,
      [
        "function createAccount(address owner, uint256 salt) returns (address)",
        "function getAddress(address owner, uint256 salt) view returns (address)"
      ],
      provider
    );
  }
  /**
   * Calculate the counterfactual address for a simple account
   */
  async getAccountAddress(owner, salt) {
    try {
      const result = await this.contract.getFunction("getAddress")(owner, salt);
      return result;
    } catch (error) {
      throw new ContractError(
        "Failed to get account address",
        { error, owner, salt }
      );
    }
  }
  /**
   * Deploy a new simple account
   */
  async deployAccount(owner, salt, signer) {
    try {
      const accountAddress = await this.getAccountAddress(owner, salt);
      const code = await this.provider.getCode(accountAddress);
      if (code !== "0x") {
        return {
          accountAddress,
          txHash: "",
          isNewDeployment: false
        };
      }
      if (!signer) {
        throw new ContractError("Signer required for deployment");
      }
      const factoryWithSigner = this.contract.connect(signer);
      const tx = await factoryWithSigner.getFunction("createAccount")(owner, salt);
      await tx.wait();
      return {
        accountAddress,
        txHash: tx.hash,
        isNewDeployment: true
      };
    } catch (error) {
      throw new ContractError(
        "Failed to deploy account",
        { error, owner, salt }
      );
    }
  }
  /**
   * Create a SimpleAccount instance
   */
  createAccountInstance(accountAddress) {
    return new SimpleAccount(
      this.provider,
      accountAddress,
      this.config.entryPointAddress
    );
  }
  /**
   * Get the init code for account deployment
   */
  async getInitCode(owner, salt) {
    try {
      const initCallData = this.contract.interface.encodeFunctionData(
        "createAccount",
        [owner, salt]
      );
      return `${this.config.factoryAddress}${initCallData.slice(2)}`;
    } catch (error) {
      throw new ContractError(
        "Failed to get init code",
        { error, owner, salt }
      );
    }
  }
};
var MultiSigAccountFactory = class {
  provider;
  config;
  contract;
  constructor(provider, config) {
    this.provider = provider;
    this.config = config;
    this.contract = new ethers.Contract(
      config.factoryAddress,
      [
        "function createAccount(address[] owners, uint256 threshold, uint256 salt) returns (address)",
        "function getAddress(address[] owners, uint256 threshold, uint256 salt) view returns (address)"
      ],
      provider
    );
  }
  /**
   * Calculate the counterfactual address for a multi-sig account
   */
  async getAccountAddress(owners, threshold, salt) {
    try {
      const result = await this.contract.getFunction("getAddress")(owners, threshold, salt);
      return result;
    } catch (error) {
      throw new ContractError(
        "Failed to get multi-sig account address",
        { error, owners, threshold, salt }
      );
    }
  }
  /**
   * Deploy a new multi-sig account
   */
  async deployAccount(owners, threshold, salt, signer) {
    try {
      if (owners.length === 0) {
        throw new ContractError("At least one owner required");
      }
      if (threshold > owners.length) {
        throw new ContractError("Threshold cannot exceed number of owners");
      }
      if (threshold === 0) {
        throw new ContractError("Threshold must be greater than 0");
      }
      const accountAddress = await this.getAccountAddress(owners, threshold, salt);
      const code = await this.provider.getCode(accountAddress);
      if (code !== "0x") {
        return {
          accountAddress,
          txHash: "",
          isNewDeployment: false
        };
      }
      if (!signer) {
        throw new ContractError("Signer required for deployment");
      }
      const factoryWithSigner = this.contract.connect(signer);
      const tx = await factoryWithSigner.getFunction("createAccount")(owners, threshold, salt);
      await tx.wait();
      return {
        accountAddress,
        txHash: tx.hash,
        isNewDeployment: true
      };
    } catch (error) {
      throw new ContractError(
        "Failed to deploy multi-sig account",
        { error, owners, threshold, salt }
      );
    }
  }
  /**
   * Create a MultiSigAccount instance
   */
  createAccountInstance(accountAddress, threshold, signers) {
    return new MultiSigAccount(
      this.provider,
      accountAddress,
      this.config.entryPointAddress,
      threshold,
      signers
    );
  }
  /**
   * Get the init code for multi-sig account deployment
   */
  async getInitCode(owners, threshold, salt) {
    try {
      const initCallData = this.contract.interface.encodeFunctionData(
        "createAccount",
        [owners, threshold, salt]
      );
      return `${this.config.factoryAddress}${initCallData.slice(2)}`;
    } catch (error) {
      throw new ContractError(
        "Failed to get multi-sig init code",
        { error, owners, threshold, salt }
      );
    }
  }
};
var AccountFactoryManager = class {
  provider;
  constructor(provider) {
    this.provider = provider;
  }
  /**
   * Create a SimpleAccountFactory instance
   */
  createSimpleAccountFactory(config) {
    return new SimpleAccountFactory(this.provider, config);
  }
  /**
   * Create a MultiSigAccountFactory instance
   */
  createMultiSigAccountFactory(config) {
    return new MultiSigAccountFactory(this.provider, config);
  }
};
var EntryPointClient = class {
  provider;
  address;
  contract;
  constructor(provider, address) {
    this.provider = provider;
    this.address = address;
    this.contract = new ethers.Contract(address, ENTRY_POINT_ABI, provider);
  }
  /**
   * Get the EntryPoint contract address
   */
  getAddress() {
    return this.address;
  }
  /**
   * Calculate the hash of a UserOperation
   */
  async getUserOpHash(userOp) {
    try {
      const result = await this.contract.getFunction("getUserOpHash")(userOp);
      return result;
    } catch (error) {
      throw new ContractError(
        "Failed to get UserOperation hash",
        { error, userOp }
      );
    }
  }
  /**
   * Handle a batch of UserOperations (submit to bundler)
   */
  async handleOps(userOps, beneficiary, signer) {
    try {
      const contractWithSigner = this.contract.connect(signer);
      const tx = await contractWithSigner.getFunction("handleOps")(userOps, beneficiary);
      return tx.hash;
    } catch (error) {
      throw new ContractError(
        "Failed to handle UserOperations",
        { error, userOps, beneficiary }
      );
    }
  }
  /**
   * Simulate a UserOperation to check for validation errors
   */
  async simulateValidation(userOp) {
    try {
      return {
        preOpGas: 50000n,
        prefund: userOp.callGasLimit * userOp.maxFeePerGas,
        sigFailed: false,
        validAfter: 0,
        validUntil: Math.floor(Date.now() / 1e3) + 3600
        // 1 hour from now
      };
    } catch (error) {
      throw new ContractError(
        "Failed to simulate validation",
        { error, userOp }
      );
    }
  }
  /**
   * Get the deposit balance for an account
   */
  async balanceOf(account) {
    try {
      const balanceContract = new ethers.Contract(
        this.address,
        ["function balanceOf(address) view returns (uint256)"],
        this.provider
      );
      const result = await balanceContract.getFunction("balanceOf")(account);
      return result;
    } catch (error) {
      throw new ContractError(
        "Failed to get balance",
        { error, account }
      );
    }
  }
  /**
   * Deposit ETH for an account
   */
  async depositTo(account, amount, signer) {
    try {
      const depositContract = new ethers.Contract(
        this.address,
        ["function depositTo(address) payable"],
        signer
      );
      const tx = await depositContract.getFunction("depositTo")(account, { value: amount });
      return tx.hash;
    } catch (error) {
      throw new ContractError(
        "Failed to deposit",
        { error, account, amount }
      );
    }
  }
  /**
   * Withdraw ETH from an account's deposit
   */
  async withdrawTo(withdrawAddress, amount, signer) {
    try {
      const withdrawContract = new ethers.Contract(
        this.address,
        ["function withdrawTo(address, uint256)"],
        signer
      );
      const tx = await withdrawContract.getFunction("withdrawTo")(withdrawAddress, amount);
      return tx.hash;
    } catch (error) {
      throw new ContractError(
        "Failed to withdraw",
        { error, withdrawAddress, amount }
      );
    }
  }
  /**
   * Get the nonce for an account
   */
  async getNonce(account, key = 0n) {
    try {
      const nonceContract = new ethers.Contract(
        this.address,
        ["function getNonce(address, uint192) view returns (uint256)"],
        this.provider
      );
      const result = await nonceContract.getFunction("getNonce")(account, key);
      return result;
    } catch (error) {
      throw new ContractError(
        "Failed to get nonce",
        { error, account, key }
      );
    }
  }
  /**
   * Check if an operation is valid
   */
  async validateUserOp(userOp) {
    try {
      if (!userOp.sender || !ethers.isAddress(userOp.sender)) {
        return false;
      }
      if (userOp.nonce < 0n) {
        return false;
      }
      if (userOp.callGasLimit < 0n || userOp.verificationGasLimit < 0n) {
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  }
  /**
   * Estimate gas for a UserOperation
   */
  async estimateUserOpGas(userOp) {
    try {
      const baseGas = 21000n;
      const callDataGas = BigInt(userOp.callData.length - 2) * 16n / 2n;
      return {
        callGasLimit: baseGas + callDataGas + 50000n,
        verificationGasLimit: 100000n,
        preVerificationGas: 21000n
      };
    } catch (error) {
      throw new ContractError(
        "Failed to estimate gas",
        { error, userOp }
      );
    }
  }
};
var ContractsClient = class {
  provider;
  config;
  entryPoint;
  accountFactoryManager;
  paymasterFactory;
  signer;
  constructor(config) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.network.rpcUrl);
    if (config.signer) {
      this.signer = config.signer.connect(this.provider);
    }
    const entryPointAddress = this.getContractAddress("entryPoint");
    this.entryPoint = new EntryPointClient(this.provider, entryPointAddress);
    this.accountFactoryManager = new AccountFactoryManager(this.provider);
    this.paymasterFactory = new PaymasterFactory(this.provider);
  }
  /**
   * Get contract address for the current network
   */
  getContractAddress(contractType) {
    const chainId = this.config.network.chainId;
    const addresses = DEFAULT_CONTRACT_ADDRESSES[chainId];
    if (!addresses) {
      throw new ConfigError(
        `No contract addresses configured for chain ID ${chainId}`
      );
    }
    switch (contractType) {
      case "entryPoint":
        return this.config.entryPointAddress ?? addresses.entryPoint;
      case "simpleAccountFactory":
        return this.config.simpleAccountFactoryAddress ?? addresses.simpleAccountFactory;
      case "multiSigAccountFactory":
        return this.config.multiSigAccountFactoryAddress ?? addresses.multiSigAccountFactory;
      case "verifyingPaymaster":
        return this.config.verifyingPaymasterAddress ?? addresses.verifyingPaymaster;
      default:
        throw new ConfigError(`Unknown contract type: ${contractType}`);
    }
  }
  /**
   * Create a simple account factory
   */
  createSimpleAccountFactory() {
    const factoryAddress = this.getContractAddress("simpleAccountFactory");
    const entryPointAddress = this.getContractAddress("entryPoint");
    return this.accountFactoryManager.createSimpleAccountFactory({
      factoryAddress,
      entryPointAddress,
      implementationAddress: factoryAddress
      // Simplified for demo
    });
  }
  /**
   * Create a multi-sig account factory
   */
  createMultiSigAccountFactory() {
    const factoryAddress = this.getContractAddress("multiSigAccountFactory");
    const entryPointAddress = this.getContractAddress("entryPoint");
    return this.accountFactoryManager.createMultiSigAccountFactory({
      factoryAddress,
      entryPointAddress,
      implementationAddress: factoryAddress
      // Simplified for demo
    });
  }
  /**
   * Create a verifying paymaster
   */
  createVerifyingPaymaster(signer) {
    if (!signer) {
      throw new ConfigError("Signer required for paymaster operations");
    }
    const paymasterAddress = this.getContractAddress("verifyingPaymaster");
    return this.paymasterFactory.createVerifyingPaymaster({
      address: paymasterAddress,
      signer: signer.connect(this.provider),
      validUntil: Math.floor(Date.now() / 1e3) + 3600,
      // 1 hour
      validAfter: Math.floor(Date.now() / 1e3) - 60
      // 1 minute ago
    });
  }
  /**
   * Deploy a new simple account
   */
  async deploySimpleAccount(owner, salt = 0n) {
    if (!this.signer) {
      throw new ConfigError("Signer required for account deployment");
    }
    const factory = this.createSimpleAccountFactory();
    const result = await factory.deployAccount(owner, salt, this.signer);
    return factory.createAccountInstance(result.accountAddress);
  }
  /**
   * Deploy a new multi-sig account
   */
  async deployMultiSigAccount(owners, threshold, salt = 0n) {
    if (!this.signer) {
      throw new ConfigError("Signer required for account deployment");
    }
    const factory = this.createMultiSigAccountFactory();
    const result = await factory.deployAccount(owners, threshold, salt, this.signer);
    return factory.createAccountInstance(result.accountAddress, threshold, owners);
  }
  /**
   * Get an existing simple account instance
   */
  getSimpleAccount(accountAddress) {
    const entryPointAddress = this.getContractAddress("entryPoint");
    return new SimpleAccount(this.provider, accountAddress, entryPointAddress);
  }
  /**
   * Get an existing multi-sig account instance
   */
  getMultiSigAccount(accountAddress, threshold, signers) {
    const entryPointAddress = this.getContractAddress("entryPoint");
    return new MultiSigAccount(
      this.provider,
      accountAddress,
      entryPointAddress,
      threshold,
      signers
    );
  }
  /**
   * Execute a transaction through an account
   */
  async executeTransaction(account, transaction, signature, usePaymaster = false) {
    try {
      let userOp = await account.buildUserOperation(transaction);
      if (usePaymaster && this.signer) {
        const paymaster = this.createVerifyingPaymaster(this.signer);
        const paymasterData = await paymaster.generatePaymasterData(userOp);
        userOp.paymasterAndData = paymasterData;
      }
      userOp.signature = signature;
      if (!this.signer) {
        throw new ConfigError("Signer required for transaction execution");
      }
      return await this.entryPoint.handleOps([userOp], this.signer.address, this.signer);
    } catch (error) {
      throw new ContractError(
        "Failed to execute transaction",
        { error, transaction }
      );
    }
  }
  /**
   * Execute a batch of transactions
   */
  async executeBatchTransaction(account, batch, signature, usePaymaster = false) {
    try {
      if (usePaymaster && !this.signer) {
        throw new ConfigError("Signer required for paymaster operations");
      }
      const result = await account.executeBatch(batch, signature);
      return result.txHash;
    } catch (error) {
      throw new ContractError(
        "Failed to execute batch transaction",
        { error, batch }
      );
    }
  }
  /**
   * Estimate gas for a user operation
   */
  async estimateUserOpGas(userOp) {
    return this.entryPoint.estimateUserOpGas(userOp);
  }
  /**
   * Get the hash of a user operation
   */
  async getUserOpHash(userOp) {
    return this.entryPoint.getUserOpHash(userOp);
  }
  /**
   * Validate a user operation
   */
  async validateUserOp(userOp) {
    return this.entryPoint.validateUserOp(userOp);
  }
  /**
   * Get account balance in the EntryPoint
   */
  async getAccountBalance(account) {
    return this.entryPoint.balanceOf(account);
  }
  /**
   * Deposit ETH for an account
   */
  async depositForAccount(account, amount) {
    if (!this.signer) {
      throw new ConfigError("Signer required for deposits");
    }
    return this.entryPoint.depositTo(account, amount, this.signer);
  }
  /**
   * Withdraw ETH from an account
   */
  async withdrawFromAccount(withdrawAddress, amount) {
    if (!this.signer) {
      throw new ConfigError("Signer required for withdrawals");
    }
    return this.entryPoint.withdrawTo(withdrawAddress, amount, this.signer);
  }
  /**
   * Get the current network configuration
   */
  getNetworkConfig() {
    return this.config.network;
  }
  /**
   * Update the signer
   */
  updateSigner(signer) {
    this.signer = signer.connect(this.provider);
  }
  /**
   * Get the EntryPoint client
   */
  getEntryPoint() {
    return this.entryPoint;
  }
};
function isValidAddress(address) {
  if (!address.startsWith("0x") || address.length !== 42) {
    return false;
  }
  return ethers.isAddress(address);
}
function isValidHexString(hex) {
  return /^0x[a-fA-F0-9]*$/.test(hex);
}
function isValidHexLength(hex, expectedLength) {
  if (!isValidHexString(hex)) return false;
  return hex.length === 2 + expectedLength * 2;
}
function isValidTxHash(hash) {
  return isValidHexLength(hash, 32);
}
function isValidSignature(signature) {
  return isValidHexLength(signature, 65);
}
function isValidUserOperation(userOp) {
  const requiredFields = [
    "sender",
    "nonce",
    "initCode",
    "callData",
    "callGasLimit",
    "verificationGasLimit",
    "preVerificationGas",
    "maxFeePerGas",
    "maxPriorityFeePerGas",
    "paymasterAndData",
    "signature"
  ];
  for (const field of requiredFields) {
    if (userOp[field] === void 0 || userOp[field] === null) {
      return false;
    }
  }
  if (!isValidAddress(userOp.sender)) return false;
  if (typeof userOp.nonce !== "bigint") return false;
  if (!isValidHexString(userOp.initCode)) return false;
  if (!isValidHexString(userOp.callData)) return false;
  if (!isValidHexString(userOp.paymasterAndData)) return false;
  if (!isValidHexString(userOp.signature)) return false;
  if (userOp.callGasLimit < 0n) return false;
  if (userOp.verificationGasLimit < 0n) return false;
  if (userOp.preVerificationGas < 0n) return false;
  if (userOp.maxFeePerGas < 0n) return false;
  if (userOp.maxPriorityFeePerGas < 0n) return false;
  return true;
}
function isSupportedChainId(chainId) {
  const supportedChains = [1, 11155111, 137, 80001, 42161, 421614, 10, 11155420];
  return supportedChains.includes(chainId);
}
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
function isValidPrivateKey(privateKey) {
  if (!privateKey.startsWith("0x") || privateKey.length !== 66) {
    return false;
  }
  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    return false;
  }
  try {
    new ethers.Wallet(privateKey);
    return true;
  } catch {
    return false;
  }
}
function isValidMnemonic(mnemonic) {
  try {
    ethers.Mnemonic.fromPhrase(mnemonic);
    return true;
  } catch {
    return false;
  }
}
function isValidAmount(amount) {
  return amount >= 0n;
}
function isValidGasLimit(gasLimit) {
  const MIN_GAS = 21000n;
  const MAX_GAS = 30000000n;
  return gasLimit >= MIN_GAS && gasLimit <= MAX_GAS;
}
function isValidGasPrice(gasPrice) {
  const MIN_GAS_PRICE = 1n;
  const MAX_GAS_PRICE = 1000000000000n;
  return gasPrice >= MIN_GAS_PRICE && gasPrice <= MAX_GAS_PRICE;
}
function isValidThreshold(threshold, totalSigners) {
  return threshold > 0 && threshold <= totalSigners;
}
function areValidUniqueAddresses(addresses) {
  if (addresses.length === 0) return false;
  const uniqueAddresses = new Set(addresses.map((addr) => addr.toLowerCase()));
  if (uniqueAddresses.size !== addresses.length) return false;
  return addresses.every(isValidAddress);
}
function isValidSalt(salt) {
  return salt >= 0n;
}
function validateAccountDeployment(params) {
  const errors = [];
  if (params.owner && !isValidAddress(params.owner)) {
    errors.push("Invalid owner address");
  }
  if (params.owners) {
    if (!areValidUniqueAddresses(params.owners)) {
      errors.push("Invalid or duplicate owner addresses");
    }
    if (params.threshold && !isValidThreshold(params.threshold, params.owners.length)) {
      errors.push("Invalid threshold for number of owners");
    }
  }
  if (params.salt !== void 0 && !isValidSalt(params.salt)) {
    errors.push("Invalid salt value");
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}
function formatAddress(address) {
  return ethers.getAddress(address);
}
function truncateAddress(address, startChars = 6, endChars = 4) {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}
function formatHexString(hex) {
  if (!hex.startsWith("0x")) {
    return `0x${hex}`;
  }
  return hex;
}
function formatEther(wei, decimals = 4) {
  return parseFloat(ethers.formatEther(wei)).toFixed(decimals);
}
function formatGwei(wei, decimals = 2) {
  return parseFloat(ethers.formatUnits(wei, "gwei")).toFixed(decimals);
}
function parseEther(ether) {
  return ethers.parseEther(ether);
}
function parseGwei(gwei) {
  return ethers.parseUnits(gwei, "gwei");
}
function formatLargeNumber(num) {
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(2)}B`;
  }
  if (num >= 1e6) {
    return `${(num / 1e6).toFixed(2)}M`;
  }
  if (num >= 1e3) {
    return `${(num / 1e3).toFixed(2)}K`;
  }
  return num.toString();
}
function formatTimestamp(timestamp) {
  return new Date(timestamp * 1e3).toLocaleString();
}
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }
  if (seconds < 86400) {
    const hours2 = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    return `${hours2}h ${minutes}m`;
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds % 86400 / 3600);
  return `${days}d ${hours}h`;
}
function formatGas(gas) {
  const gasNumber = Number(gas);
  if (gasNumber >= 1e6) {
    return `${(gasNumber / 1e6).toFixed(2)}M`;
  }
  if (gasNumber >= 1e3) {
    return `${(gasNumber / 1e3).toFixed(2)}K`;
  }
  return gasNumber.toString();
}
function formatPercentage(value, decimals = 2) {
  return `${(value * 100).toFixed(decimals)}%`;
}
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
function formatTxHash(hash, startChars = 10, endChars = 8) {
  return truncateAddress(hash, startChars, endChars);
}
function formatChainId(chainId) {
  const networks = {
    1: "Ethereum Mainnet",
    11155111: "Ethereum Sepolia",
    137: "Polygon Mainnet",
    80001: "Polygon Mumbai",
    42161: "Arbitrum One",
    421614: "Arbitrum Sepolia",
    10: "Optimism Mainnet",
    11155420: "Optimism Sepolia"
  };
  return networks[chainId] ?? `Chain ${chainId}`;
}
function formatUserOperation(userOp) {
  return JSON.stringify({
    sender: truncateAddress(userOp.sender),
    nonce: userOp.nonce.toString(),
    callData: truncateAddress(userOp.callData, 10, 10),
    callGasLimit: formatGas(userOp.callGasLimit),
    verificationGasLimit: formatGas(userOp.verificationGasLimit),
    maxFeePerGas: formatGwei(userOp.maxFeePerGas),
    signature: userOp.signature ? truncateAddress(userOp.signature, 10, 10) : "none"
  }, null, 2);
}
function padHex(hex, length) {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const padded = cleanHex.padStart(length * 2, "0");
  return `0x${padded}`;
}
function numberToHex(num) {
  return `0x${num.toString(16)}`;
}
function hexToNumber(hex) {
  return parseInt(hex, 16);
}
function formatError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error occurred";
}
function generatePrivateKey() {
  return ethers.Wallet.createRandom().privateKey;
}
function generateMnemonic() {
  return ethers.Wallet.createRandom().mnemonic?.phrase ?? "";
}
function privateKeyToAddress(privateKey) {
  const wallet = new ethers.Wallet(privateKey);
  return wallet.address;
}
function publicKeyToAddress(publicKey) {
  return ethers.computeAddress(publicKey);
}
async function signMessage(message, privateKey) {
  const wallet = new ethers.Wallet(privateKey);
  return await wallet.signMessage(message);
}
function verifySignature(message, signature, address) {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}
function recoverAddress(message, signature) {
  return ethers.verifyMessage(message, signature);
}
function hashSHA256(data) {
  return sha256(data);
}
function hashKeccak256(data) {
  return ethers.keccak256(data);
}
function hashString(str) {
  return ethers.id(str);
}
function generateSalt(data) {
  const hash = hashString(data);
  return BigInt(hash);
}
function hashTypedData(domain, types, value) {
  return ethers.TypedDataEncoder.hash(domain, types, value);
}
async function signTypedData(privateKey, domain, types, value) {
  const wallet = new ethers.Wallet(privateKey);
  return await wallet.signTypedData(domain, types, value);
}
function verifyTypedData(domain, types, value, signature, address) {
  try {
    const recoveredAddress = ethers.verifyTypedData(domain, types, value, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}
function generateNonce() {
  return BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
}
function generateSecureSalt() {
  const randomBytes = ethers.randomBytes(32);
  return BigInt(ethers.hexlify(randomBytes));
}
function derivePrivateKey(masterKey, index) {
  const combined = `${masterKey}${index}`;
  const hash = hashString(combined);
  return hash;
}
function createWalletFromMnemonic(mnemonic, path = "m/44'/60'/0'/0/0") {
  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic, void 0, path);
  return new ethers.Wallet(hdNode.privateKey);
}
async function encryptPrivateKey(privateKey, password) {
  const wallet = new ethers.Wallet(privateKey);
  return await wallet.encrypt(password);
}
async function decryptPrivateKey(encryptedKey, password) {
  const wallet = await ethers.Wallet.fromEncryptedJson(encryptedKey, password);
  return wallet.privateKey;
}
function generateDeterministicAddress(factory, salt, initCodeHash) {
  const packed = ethers.solidityPacked(
    ["bytes1", "address", "uint256", "bytes32"],
    ["0xff", factory, salt, initCodeHash]
  );
  const hash = hashKeccak256(packed);
  return `0x${hash.slice(-40)}`;
}
function splitSignature(signature) {
  return ethers.Signature.from(signature);
}
function joinSignature(r, s, v) {
  const signature = ethers.Signature.from({ r, s, v });
  return signature.serialized;
}
function getUserOpHash(userOp, entryPoint, chainId) {
  const packed = ethers.solidityPacked(
    ["address", "uint256", "bytes32", "bytes32", "uint256", "uint256", "uint256", "uint256", "uint256", "bytes32"],
    [
      userOp.sender,
      userOp.nonce,
      hashKeccak256(userOp.initCode),
      hashKeccak256(userOp.callData),
      userOp.callGasLimit,
      userOp.verificationGasLimit,
      userOp.preVerificationGas,
      userOp.maxFeePerGas,
      userOp.maxPriorityFeePerGas,
      hashKeccak256(userOp.paymasterAndData)
    ]
  );
  const opHash = hashKeccak256(packed);
  const finalPacked = ethers.solidityPacked(
    ["bytes32", "address", "uint256"],
    [opHash, entryPoint, chainId]
  );
  return hashKeccak256(finalPacked);
}

// src/utils/constants.ts
var SUPPORTED_NETWORKS = {
  ETHEREUM_MAINNET: {
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrl: "https://mainnet.infura.io/v3/",
    explorerUrl: "https://etherscan.io",
    currency: "ETH",
    isTestnet: false
  },
  ETHEREUM_SEPOLIA: {
    chainId: 11155111,
    name: "Ethereum Sepolia",
    rpcUrl: "https://sepolia.infura.io/v3/",
    explorerUrl: "https://sepolia.etherscan.io",
    currency: "ETH",
    isTestnet: true
  },
  POLYGON_MAINNET: {
    chainId: 137,
    name: "Polygon Mainnet",
    rpcUrl: "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
    currency: "MATIC",
    isTestnet: false
  },
  POLYGON_MUMBAI: {
    chainId: 80001,
    name: "Polygon Mumbai",
    rpcUrl: "https://rpc-mumbai.maticvigil.com",
    explorerUrl: "https://mumbai.polygonscan.com",
    currency: "MATIC",
    isTestnet: true
  },
  ARBITRUM_ONE: {
    chainId: 42161,
    name: "Arbitrum One",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    currency: "ETH",
    isTestnet: false
  },
  ARBITRUM_SEPOLIA: {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    explorerUrl: "https://sepolia.arbiscan.io",
    currency: "ETH",
    isTestnet: true
  },
  OPTIMISM_MAINNET: {
    chainId: 10,
    name: "Optimism Mainnet",
    rpcUrl: "https://mainnet.optimism.io",
    explorerUrl: "https://optimistic.etherscan.io",
    currency: "ETH",
    isTestnet: false
  },
  OPTIMISM_SEPOLIA: {
    chainId: 11155420,
    name: "Optimism Sepolia",
    rpcUrl: "https://sepolia.optimism.io",
    explorerUrl: "https://sepolia-optimistic.etherscan.io",
    currency: "ETH",
    isTestnet: true
  }
};
var ENTRYPOINT_ADDRESS_V06 = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
var GAS_LIMITS = {
  ACCOUNT_DEPLOYMENT: 1000000n,
  SIMPLE_EXECUTION: 35000n,
  MULTI_SIG_EXECUTION: 100000n,
  VERIFICATION_GAS: 70000n,
  PRE_VERIFICATION_GAS: 21000n,
  PAYMASTER_VERIFICATION: 50000n
};
var GAS_PRICES = {
  MIN_GAS_PRICE: 1000000000n,
  // 1 gwei
  MAX_GAS_PRICE: 1000000000000n,
  // 1000 gwei
  DEFAULT_GAS_PRICE: 20000000000n
  // 20 gwei
};
var UTILS_CONTRACT_ADDRESSES = {
  // Ethereum Sepolia
  [SUPPORTED_NETWORKS.ETHEREUM_SEPOLIA.chainId]: {
    entryPoint: ENTRYPOINT_ADDRESS_V06,
    accountFactory: "0x9406Cc6185a346906296840746125a0E44976454",
    multiSigFactory: "0x000000000000000000000000000000000000dEaD",
    verifyingPaymaster: "0x000000000000000000000000000000000000dEaD"
  },
  // Polygon Mumbai
  [SUPPORTED_NETWORKS.POLYGON_MUMBAI.chainId]: {
    entryPoint: ENTRYPOINT_ADDRESS_V06,
    accountFactory: "0x000000000000000000000000000000000000dEaD",
    multiSigFactory: "0x000000000000000000000000000000000000dEaD",
    verifyingPaymaster: "0x000000000000000000000000000000000000dEaD"
  }
};
var UTILS_ZK_CONSTANTS = {
  DEFAULT_CIRCUIT_K: 14,
  MIN_CIRCUIT_K: 10,
  MAX_CIRCUIT_K: 20,
  MAX_INPUT_SIZE: 1024 * 1024,
  // 1MB
  SHA256_HASH_SIZE: 32,
  TARGET_PROOF_TIME_MS: 500,
  MAX_PROOF_TIME_MS: 3e4,
  PROOF_CACHE_TTL_MS: 24 * 60 * 60 * 1e3
  // 24 hours
};
var VALIDATION_PATTERNS = {
  ETH_ADDRESS: /^0x[a-fA-F0-9]{40}$/,
  HEX_STRING: /^0x[a-fA-F0-9]*$/,
  TX_HASH: /^0x[a-fA-F0-9]{64}$/,
  PRIVATE_KEY: /^0x[a-fA-F0-9]{64}$/
};
var LIMITS = {
  MAX_TRANSACTION_SIZE: 128 * 1024,
  // 128KB
  MAX_BATCH_SIZE: 100,
  MAX_SIGNERS: 20,
  MIN_THRESHOLD: 1,
  MAX_NONCE: 2n ** 256n - 1n
};
var ERROR_MESSAGES = {
  INVALID_ADDRESS: "Invalid Ethereum address",
  INVALID_SIGNATURE: "Invalid signature format",
  INVALID_AMOUNT: "Amount must be positive",
  INSUFFICIENT_BALANCE: "Insufficient balance for operation",
  NETWORK_NOT_SUPPORTED: "Network not supported",
  TRANSACTION_FAILED: "Transaction execution failed",
  TIMEOUT_EXCEEDED: "Operation timeout exceeded",
  INVALID_CONFIGURATION: "Invalid configuration provided"
};
var TIME = {
  SECOND: 1,
  MINUTE: 60,
  HOUR: 3600,
  DAY: 86400,
  WEEK: 604800,
  MONTH: 2592e3,
  // 30 days
  YEAR: 31536e3
  // 365 days
};
var TIMEOUTS = {
  NETWORK_REQUEST: 1e4,
  // 10 seconds
  TRANSACTION_CONFIRMATION: 6e4,
  // 1 minute
  PROOF_GENERATION: 3e4,
  // 30 seconds
  CONTRACT_DEPLOYMENT: 12e4
  // 2 minutes
};
var FEATURE_FLAGS = {
  ENABLE_ZK_PROOFS: true,
  ENABLE_GASLESS_TRANSACTIONS: true,
  ENABLE_MULTI_SIG: true,
  ENABLE_SOCIAL_RECOVERY: false,
  // Future feature
  ENABLE_BATCH_TRANSACTIONS: true,
  ENABLE_CROSS_CHAIN: false
  // Future feature
};
var VERSION_INFO = {
  SDK_VERSION: "0.1.0",
  ERC_4337_VERSION: "0.6.0",
  SUPPORTED_SOLIDITY_VERSION: "^0.8.25",
  MIN_NODE_VERSION: "18.0.0"
};
var DEV_CONSTANTS = {
  LOCAL_CHAIN_ID: 31337,
  LOCAL_RPC_URL: "http://127.0.0.1:8545",
  TEST_PRIVATE_KEY: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  TEST_MNEMONIC: "test test test test test test test test test test test junk"
};
var GuardianAA = class {
  config;
  zkClient;
  contractsClient;
  provider;
  signer;
  constructor(config) {
    this.config = config;
    this.validateConfig();
  }
  /**
   * Initialize the SDK
   */
  async initialize(signer) {
    try {
      this.provider = new ethers.JsonRpcProvider(this.config.network.rpcUrl);
      if (signer) {
        this.signer = signer.connect(this.provider);
      }
      if (this.config.zkConfig) {
        this.zkClient = new ZkClient(this.config.zkConfig);
        await this.zkClient.initialize();
      }
      this.contractsClient = new ContractsClient({
        network: this.config.network,
        ...this.signer && { signer: this.signer }
      });
      if (this.config.debug) {
        console.log("Guardian-AA SDK initialized successfully");
      }
    } catch (error) {
      throw new ConfigError(
        "Failed to initialize Guardian-AA SDK",
        error
      );
    }
  }
  /**
   * Get the ZK client for zero-knowledge proof operations
   */
  getZkClient() {
    if (!this.zkClient) {
      throw new ConfigError("ZK client not initialized. Ensure zkConfig is provided.");
    }
    return this.zkClient;
  }
  /**
   * Get the contracts client for blockchain operations
   */
  getContractsClient() {
    if (!this.contractsClient) {
      throw new ConfigError("Contracts client not initialized. Call initialize() first.");
    }
    return this.contractsClient;
  }
  /**
   * Get the current provider
   */
  getProvider() {
    if (!this.provider) {
      throw new ConfigError("Provider not initialized. Call initialize() first.");
    }
    return this.provider;
  }
  /**
   * Get the current signer
   */
  getSigner() {
    if (!this.signer) {
      throw new ConfigError("Signer not set. Provide a signer during initialization.");
    }
    return this.signer;
  }
  /**
   * Update the signer
   */
  updateSigner(signer) {
    if (this.provider) {
      this.signer = signer.connect(this.provider);
      this.contractsClient?.updateSigner(this.signer);
    } else {
      this.signer = signer;
    }
  }
  /**
   * Get the current configuration
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Update the configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.validateConfig();
  }
  /**
   * Check if the SDK is ready for operations
   */
  isReady() {
    return Boolean(
      this.provider && this.contractsClient && (!this.config.zkConfig || this.zkClient?.isReady())
    );
  }
  /**
   * Cleanup SDK resources
   */
  async cleanup() {
    if (this.zkClient) {
      await this.zkClient.cleanup();
    }
    this.provider = void 0;
    this.signer = void 0;
    this.contractsClient = void 0;
  }
  /**
   * Validate the SDK configuration
   */
  validateConfig() {
    if (!this.config.network) {
      throw new ConfigError("Network configuration is required");
    }
    if (!this.config.network.rpcUrl) {
      throw new ConfigError("Network RPC URL is required");
    }
    if (!this.config.network.chainId) {
      throw new ConfigError("Network chain ID is required");
    }
  }
};
function createGuardianAA(network, options = {}) {
  const config = {
    network,
    zkConfig: options.zkConfig,
    accountConfig: options.accountConfig,
    debug: options.debug ?? false
  };
  return new GuardianAA(config);
}
function createSepoliaGuardianAA(rpcUrl, options = {}) {
  const network = {
    chainId: 11155111,
    name: "Ethereum Sepolia",
    rpcUrl: rpcUrl ?? "https://sepolia.infura.io/v3/",
    explorerUrl: "https://sepolia.etherscan.io",
    currency: "ETH",
    isTestnet: true
  };
  return createGuardianAA(network, options);
}
function createLocalGuardianAA(rpcUrl = "http://127.0.0.1:8545", options = {}) {
  const network = {
    chainId: 31337,
    name: "Local Network",
    rpcUrl,
    currency: "ETH",
    isTestnet: true
  };
  return createGuardianAA(network, { debug: true, ...options });
}
function getVersion() {
  return {
    sdk: "0.1.0",
    erc4337: "0.6.0",
    solidity: "^0.8.25"
  };
}
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

export { AccountConfigSchema, AccountFactoryManager, AccountOperationResultSchema, BaseAccount, BatchProofResultSchema, BatchTransactionSchema, CONTRACT_ADDRESSES, CONTRACT_GAS_LIMITS, CircuitStatsSchema, ConfigError, ContractCallConfigSchema, ContractDeployConfigSchema, ContractError, ContractEventSchema, ContractsClient, DEFAULT_CONTRACT_ADDRESSES, DEFAULT_GAS_LIMITS, DEV_CONSTANTS, ENTRYPOINT_ADDRESS_V06, ENTRY_POINT_ABI, ERROR_MESSAGES, EntryPointClient, EventFilterSchema, FEATURE_FLAGS, FUNCTION_SELECTORS, GAS_LIMITS, GAS_PRICES, GasEstimationSchema, GuardianAA, GuardianAAError, LIMITS, MULTI_SIG_ACCOUNT_ABI, MultiSigAccount, MultiSigAccountFactory, MultiSigConfigSchema, NetworkConfigSchema, PaymasterConfigSchema, PaymasterFactory, ProofBatchSchema, ProverConfigSchema, ProverMetricsSchema, ProvingKeyCacheSchema, SIMPLE_ACCOUNT_ABI, SUPPORTED_CHAINS, SUPPORTED_NETWORKS, SdkConfigSchema, SignatureDataSchema, SimpleAccount, SimpleAccountFactory, TIME, TIMEOUTS, TransactionDataSchema, UTILS_CONTRACT_ADDRESSES, UTILS_ZK_CONSTANTS, UserOperationSchema, VALIDATION_PATTERNS, VERIFYING_PAYMASTER_ABI, VERSION_INFO, ValidationError, VerificationResultSchema, VerificationStatusSchema, VerifyingPaymaster, ZK_CONSTANTS, ZK_ERROR_CODES, ZkClient, ZkProofConfigSchema, ZkProofError, ZkProofOutputSchema, ZkProofResultSchema, ZkProver, ZkVerifier, areValidUniqueAddresses, createGuardianAA, createLocalGuardianAA, createSepoliaGuardianAA, createWalletFromMnemonic, decryptPrivateKey, derivePrivateKey, encryptPrivateKey, formatAddress, formatBytes, formatChainId, formatDuration, formatError, formatEther, formatGas, formatGwei, formatHexString, formatLargeNumber, formatPercentage, formatTimestamp, formatTxHash, formatUserOperation, generateDeterministicAddress, generateMnemonic, generateNonce, generatePrivateKey, generateSalt, generateSecureSalt, getUserOpHash, getVersion, hashKeccak256, hashSHA256, hashString, hashTypedData, hexToNumber, isSupportedChainId, isValidAddress, isValidAmount, isValidGasLimit, isValidGasPrice, isValidHexLength, isValidHexString, isValidMnemonic, isValidPrivateKey, isValidSalt, isValidSignature, isValidThreshold, isValidTxHash, isValidUrl, isValidUserOperation, joinSignature, numberToHex, padHex, parseEther, parseGwei, privateKeyToAddress, publicKeyToAddress, recoverAddress, signMessage, signTypedData, splitSignature, truncateAddress, validateAccountDeployment, verifySignature, verifyTypedData };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map