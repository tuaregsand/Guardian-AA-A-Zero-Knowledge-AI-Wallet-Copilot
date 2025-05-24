import { describe, it, expect, beforeEach } from 'vitest';
import { 
  GuardianAA, 
  createGuardianAA, 
  createSepoliaGuardianAA,
  createLocalGuardianAA,
  getVersion,
} from '../src';
import type { NetworkConfig, ZkProofConfig } from '../src';

describe('Guardian-AA SDK', () => {
  let testNetwork: NetworkConfig;

  beforeEach(() => {
    testNetwork = {
      chainId: 31337,
      name: 'Test Network',
      rpcUrl: 'http://127.0.0.1:8545',
      currency: 'ETH',
      isTestnet: true,
    };
  });

  describe('Factory Functions', () => {
    it('should create GuardianAA instance with createGuardianAA', () => {
      const guardianAA = createGuardianAA(testNetwork);
      expect(guardianAA).toBeInstanceOf(GuardianAA);
      expect(guardianAA.getConfig().network.chainId).toBe(31337);
    });

    it('should create Sepolia GuardianAA instance', () => {
      const guardianAA = createSepoliaGuardianAA();
      expect(guardianAA).toBeInstanceOf(GuardianAA);
      expect(guardianAA.getConfig().network.chainId).toBe(11155111);
      expect(guardianAA.getConfig().network.name).toBe('Ethereum Sepolia');
    });

    it('should create local GuardianAA instance', () => {
      const guardianAA = createLocalGuardianAA();
      expect(guardianAA).toBeInstanceOf(GuardianAA);
      expect(guardianAA.getConfig().network.chainId).toBe(31337);
      expect(guardianAA.getConfig().network.name).toBe('Local Network');
    });

    it('should create GuardianAA with ZK config', () => {
      const zkConfig: ZkProofConfig = {
        circuitK: 14,
        useCachedKeys: true,
        timeout: 30000,
      };

      const guardianAA = createGuardianAA(testNetwork, { zkConfig });
      expect(guardianAA.getConfig().zkConfig).toEqual(zkConfig);
    });
  });

  describe('GuardianAA Class', () => {
    let guardianAA: GuardianAA;

    beforeEach(() => {
      guardianAA = createGuardianAA(testNetwork);
    });

    it('should initialize without signer', async () => {
      await expect(guardianAA.initialize()).resolves.not.toThrow();
      expect(guardianAA.getProvider()).toBeDefined();
      expect(guardianAA.getContractsClient()).toBeDefined();
    });

    it('should throw error when accessing uninitialized clients', () => {
      expect(() => guardianAA.getProvider()).toThrow('Provider not initialized');
      expect(() => guardianAA.getContractsClient()).toThrow('Contracts client not initialized');
      expect(() => guardianAA.getSigner()).toThrow('Signer not set');
    });

    it('should validate configuration on construction', () => {
      expect(() => {
        new GuardianAA({
          network: {
            chainId: 0,
            name: '',
            rpcUrl: '',
            currency: 'ETH',
            isTestnet: true,
          },
          debug: false,
        });
      }).toThrow('Network RPC URL is required');
    });

    it('should get and update configuration', () => {
      const config = guardianAA.getConfig();
      expect(config.network.chainId).toBe(31337);

      guardianAA.updateConfig({
        debug: true,
      });

      expect(guardianAA.getConfig().debug).toBe(true);
    });

    it('should check readiness status', async () => {
      expect(guardianAA.isReady()).toBe(false);
      
      await guardianAA.initialize();
      expect(guardianAA.isReady()).toBe(true);
    });

    it('should cleanup resources', async () => {
      await guardianAA.initialize();
      expect(guardianAA.isReady()).toBe(true);

      await guardianAA.cleanup();
      expect(() => guardianAA.getProvider()).toThrow();
    });
  });

  describe('Version Information', () => {
    it('should return correct version info', () => {
      const version = getVersion();
      expect(version).toEqual({
        sdk: '0.1.0',
        erc4337: '0.6.0',
        solidity: '^0.8.25',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network validation errors', () => {
      expect(() => {
        new GuardianAA({
          network: {
            chainId: -1,
            name: '',
            rpcUrl: '',
            currency: 'ETH',
            isTestnet: true,
          },
          debug: false,
        });
      }).toThrow('Network RPC URL is required');
    });
  });
}); 