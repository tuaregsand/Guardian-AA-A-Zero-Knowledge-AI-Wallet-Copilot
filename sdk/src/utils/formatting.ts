import { ethers } from 'ethers';
import type { Address, HexString } from '../types';

/**
 * Format an address for display (checksum format)
 */
export function formatAddress(address: string): Address {
  return ethers.getAddress(address) as Address;
}

/**
 * Truncate an address for display (0x1234...5678)
 */
export function truncateAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format a hex string to ensure proper 0x prefix
 */
export function formatHexString(hex: string): HexString {
  if (!hex.startsWith('0x')) {
    return `0x${hex}` as HexString;
  }
  return hex as HexString;
}

/**
 * Format wei amount to ether string
 */
export function formatEther(wei: bigint, decimals: number = 4): string {
  return parseFloat(ethers.formatEther(wei)).toFixed(decimals);
}

/**
 * Format wei amount to gwei string
 */
export function formatGwei(wei: bigint, decimals: number = 2): string {
  return parseFloat(ethers.formatUnits(wei, 'gwei')).toFixed(decimals);
}

/**
 * Parse ether string to wei
 */
export function parseEther(ether: string): bigint {
  return ethers.parseEther(ether);
}

/**
 * Parse gwei string to wei
 */
export function parseGwei(gwei: string): bigint {
  return ethers.parseUnits(gwei, 'gwei');
}

/**
 * Format a large number with appropriate units (K, M, B)
 */
export function formatLargeNumber(num: number): string {
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

/**
 * Format a timestamp to a readable date string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

/**
 * Format a duration in seconds to human readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
}

/**
 * Format gas amount with appropriate units
 */
export function formatGas(gas: bigint): string {
  const gasNumber = Number(gas);
  if (gasNumber >= 1e6) {
    return `${(gasNumber / 1e6).toFixed(2)}M`;
  }
  if (gasNumber >= 1e3) {
    return `${(gasNumber / 1e3).toFixed(2)}K`;
  }
  return gasNumber.toString();
}

/**
 * Format a percentage with specified decimal places
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format a transaction hash for display
 */
export function formatTxHash(hash: string, startChars: number = 10, endChars: number = 8): string {
  return truncateAddress(hash, startChars, endChars);
}

/**
 * Format a chain ID to network name
 */
export function formatChainId(chainId: number): string {
  const networks: Record<number, string> = {
    1: 'Ethereum Mainnet',
    11155111: 'Ethereum Sepolia',
    137: 'Polygon Mainnet',
    80001: 'Polygon Mumbai',
    42161: 'Arbitrum One',
    421614: 'Arbitrum Sepolia',
    10: 'Optimism Mainnet',
    11155420: 'Optimism Sepolia',
  };
  
  return networks[chainId] ?? `Chain ${chainId}`;
}

/**
 * Format a UserOperation for logging/display
 */
export function formatUserOperation(userOp: any): string {
  return JSON.stringify({
    sender: truncateAddress(userOp.sender),
    nonce: userOp.nonce.toString(),
    callData: truncateAddress(userOp.callData, 10, 10),
    callGasLimit: formatGas(userOp.callGasLimit),
    verificationGasLimit: formatGas(userOp.verificationGasLimit),
    maxFeePerGas: formatGwei(userOp.maxFeePerGas),
    signature: userOp.signature ? truncateAddress(userOp.signature, 10, 10) : 'none',
  }, null, 2);
}

/**
 * Pad a hex string to a specific length
 */
export function padHex(hex: string, length: number): HexString {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const padded = cleanHex.padStart(length * 2, '0');
  return `0x${padded}` as HexString;
}

/**
 * Convert a number to hex string
 */
export function numberToHex(num: number | bigint): HexString {
  return `0x${num.toString(16)}` as HexString;
}

/**
 * Convert hex string to number
 */
export function hexToNumber(hex: string): number {
  return parseInt(hex, 16);
}

/**
 * Format an error message for display
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
} 