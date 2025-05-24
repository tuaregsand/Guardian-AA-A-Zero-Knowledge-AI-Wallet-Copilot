// ============================================================================
// Guardian-AA SDK - Main Entry Point
// ============================================================================

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

// Re-export all from types (main types)
export * from './types';

// Re-export ZK functionality  
export * from './zk';

// Re-export contract functionality
export * from './contracts';

// Re-export utilities
export * from './utils';

// ============================================================================
// Main SDK Classes
// ============================================================================

import { ethers } from 'ethers';
import { ZkClient } from './zk/client';
import { ContractsClient } from './contracts/client';
import type { 
  SdkConfig, 
  NetworkConfig, 
  ZkProofConfig,
  AccountConfig,
} from './types';
import { ConfigError } from './types';

/**
 * Main Guardian-AA SDK client
 * Provides a unified interface for all Guardian-AA functionality
 */
export class GuardianAA {
  private config: SdkConfig;
  private zkClient: ZkClient | undefined;
  private contractsClient: ContractsClient | undefined;
  private provider: ethers.Provider | undefined;
  private signer: ethers.Wallet | undefined;

  constructor(config: SdkConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Initialize the SDK
   */
  async initialize(signer?: ethers.Wallet): Promise<void> {
    try {
      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(this.config.network.rpcUrl);
      
      if (signer) {
        this.signer = signer.connect(this.provider);
      }

      // Initialize ZK client if enabled
      if (this.config.zkConfig) {
        this.zkClient = new ZkClient(this.config.zkConfig);
        await this.zkClient.initialize();
      }

      // Initialize contracts client - always initialize but signer is optional
      this.contractsClient = new ContractsClient({
        network: this.config.network,
        ...(this.signer && { signer: this.signer }),
      });

      if (this.config.debug) {
        // eslint-disable-next-line no-console
        console.log('Guardian-AA SDK initialized successfully');
      }
    } catch (error) {
      throw new ConfigError(
        'Failed to initialize Guardian-AA SDK',
        error
      );
    }
  }

  /**
   * Get the ZK client for zero-knowledge proof operations
   */
  getZkClient(): ZkClient {
    if (!this.zkClient) {
      throw new ConfigError('ZK client not initialized. Ensure zkConfig is provided.');
    }
    return this.zkClient;
  }

  /**
   * Get the contracts client for blockchain operations
   */
  getContractsClient(): ContractsClient {
    if (!this.contractsClient) {
      throw new ConfigError('Contracts client not initialized. Call initialize() first.');
    }
    return this.contractsClient;
  }

  /**
   * Get the current provider
   */
  getProvider(): ethers.Provider {
    if (!this.provider) {
      throw new ConfigError('Provider not initialized. Call initialize() first.');
    }
    return this.provider;
  }

  /**
   * Get the current signer
   */
  getSigner(): ethers.Wallet {
    if (!this.signer) {
      throw new ConfigError('Signer not set. Provide a signer during initialization.');
    }
    return this.signer;
  }

  /**
   * Update the signer
   */
  updateSigner(signer: ethers.Wallet): void {
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
  getConfig(): SdkConfig {
    return { ...this.config };
  }

  /**
   * Update the configuration
   */
  updateConfig(newConfig: Partial<SdkConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.validateConfig();
  }

  /**
   * Check if the SDK is ready for operations
   */
  isReady(): boolean {
    return Boolean(
      this.provider &&
      this.contractsClient &&
      (!this.config.zkConfig || this.zkClient?.isReady())
    );
  }

  /**
   * Cleanup SDK resources
   */
  async cleanup(): Promise<void> {
    if (this.zkClient) {
      await this.zkClient.cleanup();
    }
    this.provider = undefined;
    this.signer = undefined;
    this.contractsClient = undefined;
  }

  /**
   * Validate the SDK configuration
   */
  private validateConfig(): void {
    if (!this.config.network) {
      throw new ConfigError('Network configuration is required');
    }

    if (!this.config.network.rpcUrl) {
      throw new ConfigError('Network RPC URL is required');
    }

    if (!this.config.network.chainId) {
      throw new ConfigError('Network chain ID is required');
    }
  }
}

// ============================================================================
// Convenience Factory Functions
// ============================================================================

/**
 * Create a Guardian-AA SDK instance with minimal configuration
 */
export function createGuardianAA(
  network: NetworkConfig,
  options: {
    zkConfig?: ZkProofConfig;
    accountConfig?: AccountConfig;
    debug?: boolean;
  } = {}
): GuardianAA {
  const config: SdkConfig = {
    network,
    zkConfig: options.zkConfig,
    accountConfig: options.accountConfig,
    debug: options.debug ?? false,
  };

  return new GuardianAA(config);
}

/**
 * Create a Guardian-AA SDK instance for Ethereum Sepolia testnet
 */
export function createSepoliaGuardianAA(
  rpcUrl?: string,
  options: {
    zkConfig?: ZkProofConfig;
    debug?: boolean;
  } = {}
): GuardianAA {
  const network: NetworkConfig = {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    rpcUrl: rpcUrl ?? 'https://sepolia.infura.io/v3/',
    explorerUrl: 'https://sepolia.etherscan.io',
    currency: 'ETH',
    isTestnet: true,
  };

  return createGuardianAA(network, options);
}

/**
 * Create a Guardian-AA SDK instance for local development
 */
export function createLocalGuardianAA(
  rpcUrl: string = 'http://127.0.0.1:8545',
  options: {
    zkConfig?: ZkProofConfig;
    debug?: boolean;
  } = {}
): GuardianAA {
  const network: NetworkConfig = {
    chainId: 31337,
    name: 'Local Network',
    rpcUrl,
    currency: 'ETH',
    isTestnet: true,
  };

  return createGuardianAA(network, { debug: true, ...options });
}

// ============================================================================
// Version Information
// ============================================================================

/**
 * Get SDK version information
 */
export function getVersion(): {
  sdk: string;
  erc4337: string;
  solidity: string;
} {
  return {
    sdk: '0.1.0',
    erc4337: '0.6.0',
    solidity: '^0.8.25',
  };
} 