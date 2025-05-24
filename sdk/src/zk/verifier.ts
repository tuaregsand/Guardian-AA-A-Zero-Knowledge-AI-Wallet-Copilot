import { sha256 } from '@noble/hashes/sha256';
import { ZkProofError } from '../types';
import {
  VerificationResult,
  VerificationStatus,
  ProverConfig,
  ZK_ERROR_CODES,
} from './types';

/**
 * ZK Verifier class for verifying zero-knowledge proofs
 */
export class ZkVerifier {
  private config: ProverConfig;
  private isInitialized = false;

  constructor(config: Partial<ProverConfig> = {}) {
    this.config = {
      circuitK: 14,
      useCachedKeys: true,
      timeout: 30000,
      maxInputSize: 1024 * 1024,
      enableBenchmarking: false,
      logLevel: 'INFO',
      ...config,
    };
  }

  /**
   * Initialize the verifier
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // In real implementation, this would load verifying keys
      await this.setupVerificationSystem();
      this.isInitialized = true;
    } catch (error) {
      throw new ZkProofError(
        'Failed to initialize ZK verifier',
        { error, config: this.config }
      );
    }
  }

  /**
   * Verify a ZK proof against the original input
   */
  async verifyProof(
    input: Uint8Array,
    proof: Uint8Array,
    expectedHash: number[]
  ): Promise<VerificationResult> {
    if (!this.isInitialized) {
      throw new ZkProofError(
        'Verifier not initialized',
        { code: ZK_ERROR_CODES.PROVER_NOT_INITIALIZED }
      );
    }

    const startTime = performance.now();

    try {
      // First, verify the hash matches
      const computedHashBuffer = sha256(input);
      const computedHash = Array.from(computedHashBuffer);

      if (!this.arraysEqual(computedHash, expectedHash)) {
        return {
          status: 'INVALID' as VerificationStatus,
          message: 'Hash mismatch',
          verificationTime: performance.now() - startTime,
        };
      }

      // In real implementation, this would verify the ZK proof
      const isValidProof = await this.verifyZkProof(proof, expectedHash);
      const verificationTime = performance.now() - startTime;

      if (this.config.enableBenchmarking) {
        this.logPerformance('Proof verification', verificationTime);
      }

      return {
        status: isValidProof ? 'VALID' : 'INVALID',
        verificationTime,
        publicInputsHash: this.arrayToHex(expectedHash),
      };
    } catch (error) {
      return {
        status: 'ERROR' as VerificationStatus,
        message: error instanceof Error ? error.message : 'Unknown error',
        verificationTime: performance.now() - startTime,
      };
    }
  }

  /**
   * Verify only the proof (without re-computing the hash)
   */
  async verifyProofOnly(
    proof: Uint8Array,
    publicInputs: number[]
  ): Promise<VerificationResult> {
    if (!this.isInitialized) {
      throw new ZkProofError(
        'Verifier not initialized',
        { code: ZK_ERROR_CODES.PROVER_NOT_INITIALIZED }
      );
    }

    const startTime = performance.now();

    try {
      const isValid = await this.verifyZkProof(proof, publicInputs);
      const verificationTime = performance.now() - startTime;

      if (this.config.enableBenchmarking) {
        this.logPerformance('Proof-only verification', verificationTime);
      }

      return {
        status: isValid ? 'VALID' : 'INVALID',
        verificationTime,
        publicInputsHash: this.arrayToHex(publicInputs),
      };
    } catch (error) {
      return {
        status: 'ERROR' as VerificationStatus,
        message: error instanceof Error ? error.message : 'Unknown error',
        verificationTime: performance.now() - startTime,
      };
    }
  }

  /**
   * Batch verify multiple proofs
   */
  async verifyBatchProofs(
    proofs: Array<{
      input: Uint8Array;
      proof: Uint8Array;
      expectedHash: number[];
    }>
  ): Promise<VerificationResult[]> {
    if (!this.isInitialized) {
      throw new ZkProofError(
        'Verifier not initialized',
        { code: ZK_ERROR_CODES.PROVER_NOT_INITIALIZED }
      );
    }

    const promises = proofs.map(({ input, proof, expectedHash }) =>
      this.verifyProof(input, proof, expectedHash)
    );

    return Promise.all(promises);
  }

  /**
   * Check if verifier is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.isInitialized = false;
  }

  /**
   * Private method to setup verification system
   */
  private async setupVerificationSystem(): Promise<void> {
    // Simulate verification system setup
    // In real implementation, this would load verifying keys
    await this.delay(50);
  }

  /**
   * Private method to verify the ZK proof
   */
  private async verifyZkProof(
    proof: Uint8Array,
    publicInputs: number[]
  ): Promise<boolean> {
    // Simulate ZK proof verification
    // In real implementation, this would:
    // 1. Call the Rust verify_proof_with_proof function
    // 2. Use the loaded verifying key and public inputs
    // 3. Return the verification result

    await this.delay(10); // Simulate verification time

    // For demonstration, we'll do a basic check
    return proof.length > 0 && publicInputs.length === 32;
  }

  /**
   * Utility method to compare arrays
   */
  private arraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }

  /**
   * Convert number array to hex string
   */
  private arrayToHex(arr: number[]): string {
    return `0x${arr.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
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
      console.log(`[ZkVerifier] ${operation}: ${timeMs.toFixed(2)}ms`);
    }
  }
} 