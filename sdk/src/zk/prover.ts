import { sha256 } from '@noble/hashes/sha256';
import { ZkProofError } from '../types';
import {
  ProverConfig,
  ProverConfigSchema,
  ProverMetrics,
  ZK_CONSTANTS,
  ZK_ERROR_CODES,
  ProofBatch,
  BatchProofResult,
} from './types';

/**
 * ZK Prover class that interfaces with the Rust guardian_zkml library
 */
export class ZkProver {
  private config: ProverConfig;
  private isInitialized = false;
  private setupTime = 0;

  constructor(config: Partial<ProverConfig> = {}) {
    this.config = ProverConfigSchema.parse(config);
  }

  /**
   * Initialize the prover (setup proving keys, etc.)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const startTime = performance.now();

    try {
      // In a real implementation, this would load the Rust WASM module
      // or initialize FFI bindings to the guardian_zkml library
      await this.setupProvingSystem();
      
      this.setupTime = performance.now() - startTime;
      this.isInitialized = true;

      if (this.config.enableBenchmarking) {
        this.logPerformance('Prover initialization', this.setupTime);
      }
    } catch (error) {
      throw new ZkProofError(
        'Failed to initialize ZK prover',
        { error, config: this.config }
      );
    }
  }

  /**
   * Generate a ZK proof for the given input data
   */
  async generateProof(input: Uint8Array): Promise<{
    hash: number[];
    proof: Uint8Array;
    generationTime: number;
  }> {
    if (!this.isInitialized) {
      throw new ZkProofError(
        'Prover not initialized',
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
      // For now, we'll simulate the proof generation
      // In the real implementation, this would call the Rust FFI
      const result = await this.callRustProver(input);
      
      const generationTime = performance.now() - startTime;

      if (generationTime > ZK_CONSTANTS.TARGET_PROOF_TIME_MS) {
        // eslint-disable-next-line no-console
        console.warn(
          `Proof generation time ${generationTime}ms exceeds target ${ZK_CONSTANTS.TARGET_PROOF_TIME_MS}ms`
        );
      }

      if (this.config.enableBenchmarking) {
        this.logPerformance('Proof generation', generationTime);
      }

      return {
        hash: result.hash,
        proof: result.proof,
        generationTime,
      };
    } catch (error) {
      throw new ZkProofError(
        'Proof generation failed',
        { error, inputSize: input.length }
      );
    }
  }

  /**
   * Generate proofs for multiple inputs in batch
   */
  async generateBatchProofs(batch: ProofBatch): Promise<BatchProofResult> {
    if (!this.isInitialized) {
      throw new ZkProofError(
        'Prover not initialized',
        { code: ZK_ERROR_CODES.PROVER_NOT_INITIALIZED }
      );
    }

    const startTime = performance.now();
    const results = [];

    try {
      if (batch.parallelization) {
        // Generate proofs in parallel
        const promises = batch.inputs.map(async (input, index) => {
          const result = await this.generateProof(input);
          return { index, ...result };
        });

        const parallelResults = await Promise.all(promises);
        results.push(...parallelResults);
      } else {
        // Generate proofs sequentially
        for (let i = 0; i < batch.inputs.length; i += 1) {
          const result = await this.generateProof(batch.inputs[i]!);
          results.push({ index: i, ...result });
        }
      }

      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / batch.inputs.length;

      return {
        batchId: batch.batchId,
        results,
        totalTime,
        averageTime,
      };
    } catch (error) {
      throw new ZkProofError(
        'Batch proof generation failed',
        { error, batchSize: batch.inputs.length }
      );
    }
  }

  /**
   * Get prover performance metrics
   */
  getMetrics(): ProverMetrics {
    return {
      setupTime: this.setupTime,
      proofTime: 0, // Would be calculated from actual measurements
      verificationTime: 0,
      proofSize: 0,
      circuitSize: 2 ** this.config.circuitK,
    };
  }

  /**
   * Update prover configuration
   */
  updateConfig(newConfig: Partial<ProverConfig>): void {
    const updatedConfig = { ...this.config, ...newConfig };
    this.config = ProverConfigSchema.parse(updatedConfig);
  }

  /**
   * Check if prover is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // In real implementation, this would clean up FFI resources
    this.isInitialized = false;
    this.setupTime = 0;
  }

  /**
   * Private method to setup the proving system
   */
  private async setupProvingSystem(): Promise<void> {
    // Simulate proving system setup
    // In real implementation, this would:
    // 1. Load or generate proving keys
    // 2. Initialize the Halo2 circuit
    // 3. Setup universal SRS if needed
    
    await this.delay(100); // Simulate setup time
  }

  /**
   * Private method to call the Rust prover via FFI
   */
  private async callRustProver(input: Uint8Array): Promise<{
    hash: number[];
    proof: Uint8Array;
  }> {
    // Simulate the actual FFI call to guardian_zkml
    // In real implementation, this would:
    // 1. Convert JS Uint8Array to FFI-compatible format
    // 2. Call the Rust generate_proof_with_proof function
    // 3. Convert the result back to JS types

    // For now, compute the actual SHA256 hash
    const hashBuffer = sha256(input);
    const hash = Array.from(hashBuffer);

    // Simulate proof bytes (in real implementation, this comes from Halo2)
    const proof = new Uint8Array(1024); // Typical Halo2 proof size
    crypto.getRandomValues(proof);

    // Simulate proof generation time
    await this.delay(50);

    return { hash, proof };
  }

  /**
   * Utility method for simulating async operations
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Log performance metrics
   */
  private logPerformance(operation: string, timeMs: number): void {
    if (this.config.logLevel === 'DEBUG' || this.config.logLevel === 'INFO') {
      // eslint-disable-next-line no-console
      console.log(`[ZkProver] ${operation}: ${timeMs.toFixed(2)}ms`);
    }
  }
} 