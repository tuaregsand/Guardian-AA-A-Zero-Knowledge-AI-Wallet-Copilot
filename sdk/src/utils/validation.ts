import { ethers } from 'ethers';
import type { Address, HexString, UserOperation } from '../types';

/**
 * Validate if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): address is Address {
  // Must start with 0x and be exactly 42 characters
  if (!address.startsWith('0x') || address.length !== 42) {
    return false;
  }
  return ethers.isAddress(address);
}

/**
 * Validate if a string is a valid hex string
 */
export function isValidHexString(hex: string): hex is HexString {
  return /^0x[a-fA-F0-9]*$/.test(hex);
}

/**
 * Validate if a hex string has the correct length for a specific type
 */
export function isValidHexLength(hex: string, expectedLength: number): boolean {
  if (!isValidHexString(hex)) return false;
  return hex.length === 2 + expectedLength * 2; // 2 for '0x' + 2 chars per byte
}

/**
 * Validate if a string is a valid transaction hash
 */
export function isValidTxHash(hash: string): boolean {
  return isValidHexLength(hash, 32);
}

/**
 * Validate if a string is a valid signature
 */
export function isValidSignature(signature: string): boolean {
  return isValidHexLength(signature, 65); // 65 bytes for ECDSA signature
}

/**
 * Validate if a UserOperation has all required fields
 */
export function isValidUserOperation(userOp: Partial<UserOperation>): userOp is UserOperation {
  const requiredFields: (keyof UserOperation)[] = [
    'sender',
    'nonce',
    'initCode',
    'callData',
    'callGasLimit',
    'verificationGasLimit',
    'preVerificationGas',
    'maxFeePerGas',
    'maxPriorityFeePerGas',
    'paymasterAndData',
    'signature',
  ];

  for (const field of requiredFields) {
    if (userOp[field] === undefined || userOp[field] === null) {
      return false;
    }
  }

  // Validate specific field types
  if (!isValidAddress(userOp.sender!)) return false;
  if (typeof userOp.nonce !== 'bigint') return false;
  if (!isValidHexString(userOp.initCode!)) return false;
  if (!isValidHexString(userOp.callData!)) return false;
  if (!isValidHexString(userOp.paymasterAndData!)) return false;
  if (!isValidHexString(userOp.signature!)) return false;

  // Validate gas values are positive
  if (userOp.callGasLimit! < 0n) return false;
  if (userOp.verificationGasLimit! < 0n) return false;
  if (userOp.preVerificationGas! < 0n) return false;
  if (userOp.maxFeePerGas! < 0n) return false;
  if (userOp.maxPriorityFeePerGas! < 0n) return false;

  return true;
}

/**
 * Validate if a chain ID is supported
 */
export function isSupportedChainId(chainId: number): boolean {
  const supportedChains = [1, 11155111, 137, 80001, 42161, 421614, 10, 11155420];
  return supportedChains.includes(chainId);
}

/**
 * Validate if a URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate if a private key is valid
 */
export function isValidPrivateKey(privateKey: string): boolean {
  // Must start with 0x and be exactly 66 characters (64 hex + 0x)
  if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
    return false;
  }
  
  // Must be valid hex
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

/**
 * Validate if a mnemonic phrase is valid
 */
export function isValidMnemonic(mnemonic: string): boolean {
  try {
    ethers.Mnemonic.fromPhrase(mnemonic);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate if an amount is a valid positive number
 */
export function isValidAmount(amount: bigint): boolean {
  return amount >= 0n;
}

/**
 * Validate if a gas limit is reasonable
 */
export function isValidGasLimit(gasLimit: bigint): boolean {
  const MIN_GAS = 21000n;
  const MAX_GAS = 30000000n; // 30M gas limit
  return gasLimit >= MIN_GAS && gasLimit <= MAX_GAS;
}

/**
 * Validate if a gas price is reasonable
 */
export function isValidGasPrice(gasPrice: bigint): boolean {
  const MIN_GAS_PRICE = 1n; // 1 wei
  const MAX_GAS_PRICE = 1000000000000n; // 1000 gwei
  return gasPrice >= MIN_GAS_PRICE && gasPrice <= MAX_GAS_PRICE;
}

/**
 * Validate if a threshold is valid for multi-sig
 */
export function isValidThreshold(threshold: number, totalSigners: number): boolean {
  return threshold > 0 && threshold <= totalSigners;
}

/**
 * Validate if an array of addresses contains only unique valid addresses
 */
export function areValidUniqueAddresses(addresses: string[]): addresses is Address[] {
  if (addresses.length === 0) return false;
  
  const uniqueAddresses = new Set(addresses.map(addr => addr.toLowerCase()));
  if (uniqueAddresses.size !== addresses.length) return false; // Duplicates found
  
  return addresses.every(isValidAddress);
}

/**
 * Validate if a salt value is valid
 */
export function isValidSalt(salt: bigint): boolean {
  return salt >= 0n;
}

/**
 * Comprehensive validation for account deployment parameters
 */
export function validateAccountDeployment(params: {
  owner?: string;
  owners?: string[];
  threshold?: number;
  salt?: bigint;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate single owner (for simple accounts)
  if (params.owner && !isValidAddress(params.owner)) {
    errors.push('Invalid owner address');
  }

  // Validate multiple owners (for multi-sig accounts)
  if (params.owners) {
    if (!areValidUniqueAddresses(params.owners)) {
      errors.push('Invalid or duplicate owner addresses');
    }
    
    if (params.threshold && !isValidThreshold(params.threshold, params.owners.length)) {
      errors.push('Invalid threshold for number of owners');
    }
  }

  // Validate salt
  if (params.salt !== undefined && !isValidSalt(params.salt)) {
    errors.push('Invalid salt value');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
} 