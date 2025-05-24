import { ZkProver } from './prover';
import { ZkVerifier } from './verifier';
import { ZkProofError } from '../types';
import {
  ProverConfig,
  VerificationResult,
  ProofBatch,
  BatchProofResult,
  ZK_ERROR_CODES,
} from './types';

/**
 * High-level ZK client that combines prover and verifier functionality
 */
export class ZkClient {
  private prover: ZkProver;
  private verifier: ZkVerifier;
  private isInitialized = false;

  constructor(config: Partial<ProverConfig> = {}) {
    this.prover = new ZkProver(config);
    this.verifier = new ZkVerifier(config);
  }

  /**
   * Initialize both prover and verifier
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await Promise.all([
        this.prover.initialize(),
        this.verifier.initialize(),
      ]);
      this.isInitialized = true;
    } catch (error) {
      throw new ZkProofError(
        'Failed to initialize ZK client',
        { error }
      );
    }
  }

  /**
   * Generate a proof for input data
   */
  async generateProof(input: Uint8Array): Promise<{
    hash: number[];
    proof: Uint8Array;
    generationTime: number;
  }> {
    this.ensureInitialized();
    return this.prover.generateProof(input);
  }

  /**
   * Verify a proof against the original input
   */
  async verifyProof(
    input: Uint8Array,
    proof: Uint8Array,
    expectedHash: number[]
  ): Promise<VerificationResult> {
    this.ensureInitialized();
    return this.verifier.verifyProof(input, proof, expectedHash);
  }

  /**
   * Generate and verify a proof in one operation
   */
  async proveAndVerify(input: Uint8Array): Promise<{
    proof: {
      hash: number[];
      proof: Uint8Array;
      generationTime: number;
    };
    verification: VerificationResult;
  }> {
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
  async generateBatchProofs(batch: ProofBatch): Promise<BatchProofResult> {
    this.ensureInitialized();
    return this.prover.generateBatchProofs(batch);
  }

  /**
   * Verify multiple proofs
   */
  async verifyBatchProofs(
    proofs: Array<{
      input: Uint8Array;
      proof: Uint8Array;
      expectedHash: number[];
    }>
  ): Promise<VerificationResult[]> {
    this.ensureInitialized();
    return this.verifier.verifyBatchProofs(proofs);
  }

  /**
   * Get performance metrics from the prover
   */
  getMetrics(): {
    setupTime: number;
    proofTime: number;
    verificationTime: number;
    proofSize: number;
    circuitSize: number;
  } {
    this.ensureInitialized();
    return this.prover.getMetrics();
  }

  /**
   * Check if the client is ready
   */
  isReady(): boolean {
    return this.isInitialized && 
           this.prover.isReady() && 
           this.verifier.isReady();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await Promise.all([
      this.prover.cleanup(),
      this.verifier.cleanup(),
    ]);
    this.isInitialized = false;
  }

  /**
   * Update configuration for both prover and verifier
   */
  updateConfig(newConfig: Partial<ProverConfig>): void {
    this.prover.updateConfig(newConfig);
    // Note: Verifier doesn't have updateConfig method in current implementation
  }

  /**
   * Ensure the client is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new ZkProofError(
        'ZK client not initialized. Call initialize() first.',
        { code: ZK_ERROR_CODES.PROVER_NOT_INITIALIZED }
      );
    }
  }
} 