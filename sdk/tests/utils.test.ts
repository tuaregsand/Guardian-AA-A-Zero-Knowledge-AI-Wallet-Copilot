import { describe, it, expect } from 'vitest';
import {
  isValidAddress,
  isValidPrivateKey,
  isValidHexString,
  formatEther,
  parseEther,
  generateSalt,
  formatAddress,
  truncateAddress,
} from '../src/utils';

describe('Utility Functions', () => {
  describe('Validation Functions', () => {
    it('should validate Ethereum addresses', () => {
      expect(isValidAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')).toBe(true);
      expect(isValidAddress('0xd8da6bf26964af9d7eed9e03e53415d37aa96045')).toBe(true);
      expect(isValidAddress('0xd8da6bf26964af9d7eed9e03e53415d37aa960')).toBe(false);
      expect(isValidAddress('d8da6bf26964af9d7eed9e03e53415d37aa96045')).toBe(false);
      expect(isValidAddress('')).toBe(false);
    });

    it('should validate private keys', () => {
      expect(isValidPrivateKey('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')).toBe(true);
      expect(isValidPrivateKey('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff8')).toBe(false);
      expect(isValidPrivateKey('ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')).toBe(false);
      expect(isValidPrivateKey('')).toBe(false);
    });

    it('should validate hex strings', () => {
      expect(isValidHexString('0x123abc')).toBe(true);
      expect(isValidHexString('0x')).toBe(true);
      expect(isValidHexString('0x123ABCdef')).toBe(true);
      expect(isValidHexString('123abc')).toBe(false);
      expect(isValidHexString('0x123xyz')).toBe(false);
    });
  });

  describe('Formatting Functions', () => {
    it('should format Ether values', () => {
      expect(formatEther(1000000000000000000n)).toBe('1.0000');
      expect(formatEther(500000000000000000n)).toBe('0.5000');
      expect(formatEther(1500000000000000000n)).toBe('1.5000');
      expect(formatEther(0n)).toBe('0.0000');
    });

    it('should parse Ether values', () => {
      expect(parseEther('1.0')).toBe(1000000000000000000n);
      expect(parseEther('0.5')).toBe(500000000000000000n);
      expect(parseEther('1.5')).toBe(1500000000000000000n);
      expect(parseEther('0')).toBe(0n);
    });

    it('should format addresses', () => {
      const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
      expect(formatAddress(address)).toBe(address);
      expect(formatAddress(address.toLowerCase())).toBe(address);
    });

    it('should truncate addresses', () => {
      const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
      expect(truncateAddress(address)).toBe('0xd8dA...6045');
      expect(truncateAddress(address, 4, 4)).toBe('0xd8...6045');
    });
  });

  describe('Crypto Functions', () => {
    it('should generate salt values', () => {
      const salt1 = generateSalt('test');
      const salt2 = generateSalt('test');
      const salt3 = generateSalt('different');

      expect(salt1).toBe(salt2); // Same input = same salt
      expect(salt1).not.toBe(salt3); // Different input = different salt
      expect(typeof salt1).toBe('bigint');
    });
  });

  describe('Constants', () => {
    it('should export supported networks', async () => {
      const { SUPPORTED_NETWORKS } = await import('../src/utils/constants');
      expect(SUPPORTED_NETWORKS.ETHEREUM_SEPOLIA.chainId).toBe(11155111);
      expect(SUPPORTED_NETWORKS.ETHEREUM_MAINNET.chainId).toBe(1);
    });

    it('should export gas limits', async () => {
      const { GAS_LIMITS } = await import('../src/utils/constants');
      expect(GAS_LIMITS.ACCOUNT_DEPLOYMENT).toBeGreaterThan(0n);
      expect(GAS_LIMITS.SIMPLE_EXECUTION).toBeGreaterThan(0n);
    });
  });
}); 