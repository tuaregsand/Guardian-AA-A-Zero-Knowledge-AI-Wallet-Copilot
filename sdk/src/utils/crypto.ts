import { ethers } from 'ethers';
import { sha256 } from '@noble/hashes/sha256';
import type { Address, HexString } from '../types';

/**
 * Generate a random private key
 */
export function generatePrivateKey(): string {
  return ethers.Wallet.createRandom().privateKey;
}

/**
 * Generate a random mnemonic phrase
 */
export function generateMnemonic(): string {
  return ethers.Wallet.createRandom().mnemonic?.phrase ?? '';
}

/**
 * Derive an address from a private key
 */
export function privateKeyToAddress(privateKey: string): Address {
  const wallet = new ethers.Wallet(privateKey);
  return wallet.address as Address;
}

/**
 * Derive an address from a public key
 */
export function publicKeyToAddress(publicKey: string): Address {
  return ethers.computeAddress(publicKey) as Address;
}

/**
 * Sign a message with a private key
 */
export async function signMessage(
  message: string | Uint8Array,
  privateKey: string
): Promise<HexString> {
  const wallet = new ethers.Wallet(privateKey);
  return await wallet.signMessage(message) as HexString;
}

/**
 * Verify a signature against a message and address
 */
export function verifySignature(
  message: string | Uint8Array,
  signature: string,
  address: string
): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Recover the address from a signature
 */
export function recoverAddress(
  message: string | Uint8Array,
  signature: string
): Address {
  return ethers.verifyMessage(message, signature) as Address;
}

/**
 * Hash data using SHA256
 */
export function hashSHA256(data: Uint8Array): Uint8Array {
  return sha256(data);
}

/**
 * Hash data using Keccak256 (Ethereum's hash function)
 */
export function hashKeccak256(data: string | Uint8Array): HexString {
  return ethers.keccak256(data) as HexString;
}

/**
 * Hash a string using Keccak256
 */
export function hashString(str: string): HexString {
  return ethers.id(str) as HexString;
}

/**
 * Generate a deterministic salt from input data
 */
export function generateSalt(data: string): bigint {
  const hash = hashString(data);
  return BigInt(hash);
}

/**
 * Create a message hash for EIP-712 structured data
 */
export function hashTypedData(
  domain: ethers.TypedDataDomain,
  types: Record<string, ethers.TypedDataField[]>,
  value: Record<string, unknown>
): HexString {
  return ethers.TypedDataEncoder.hash(domain, types, value) as HexString;
}

/**
 * Sign EIP-712 structured data
 */
export async function signTypedData(
  privateKey: string,
  domain: ethers.TypedDataDomain,
  types: Record<string, ethers.TypedDataField[]>,
  value: Record<string, unknown>
): Promise<HexString> {
  const wallet = new ethers.Wallet(privateKey);
  return await wallet.signTypedData(domain, types, value) as HexString;
}

/**
 * Verify EIP-712 structured data signature
 */
export function verifyTypedData(
  domain: ethers.TypedDataDomain,
  types: Record<string, ethers.TypedDataField[]>,
  value: Record<string, unknown>,
  signature: string,
  address: string
): boolean {
  try {
    const recoveredAddress = ethers.verifyTypedData(domain, types, value, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Generate a random nonce
 */
export function generateNonce(): bigint {
  return BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
}

/**
 * Generate a secure random salt
 */
export function generateSecureSalt(): bigint {
  const randomBytes = ethers.randomBytes(32);
  return BigInt(ethers.hexlify(randomBytes));
}

/**
 * Derive a child private key from a master private key and path (simplified HD wallet)
 */
export function derivePrivateKey(masterKey: string, index: number): string {
  // This is a simplified derivation - in production, use proper HD wallet derivation
  const combined = `${masterKey}${index}`;
  const hash = hashString(combined);
  return hash;
}

/**
 * Create a wallet from mnemonic and derivation path
 */
export function createWalletFromMnemonic(
  mnemonic: string,
  path: string = "m/44'/60'/0'/0/0"
): ethers.Wallet {
  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, path);
  return new ethers.Wallet(hdNode.privateKey);
}

/**
 * Encrypt a private key with a password
 */
export async function encryptPrivateKey(
  privateKey: string,
  password: string
): Promise<string> {
  const wallet = new ethers.Wallet(privateKey);
  return await wallet.encrypt(password);
}

/**
 * Decrypt an encrypted private key with a password
 */
export async function decryptPrivateKey(
  encryptedKey: string,
  password: string
): Promise<string> {
  const wallet = await ethers.Wallet.fromEncryptedJson(encryptedKey, password);
  return wallet.privateKey;
}

/**
 * Generate a deterministic address from multiple inputs
 */
export function generateDeterministicAddress(
  factory: Address,
  salt: bigint,
  initCodeHash: HexString
): Address {
  const packed = ethers.solidityPacked(
    ['bytes1', 'address', 'uint256', 'bytes32'],
    ['0xff', factory, salt, initCodeHash]
  );
  const hash = hashKeccak256(packed);
  return `0x${hash.slice(-40)}` as Address;
}

/**
 * Split a signature into r, s, v components
 */
export function splitSignature(signature: string): {
  r: string;
  s: string;
  v: number;
} {
  return ethers.Signature.from(signature);
}

/**
 * Join signature components into a signature string
 */
export function joinSignature(r: string, s: string, v: number): HexString {
  const signature = ethers.Signature.from({ r, s, v });
  return signature.serialized as HexString;
}

/**
 * Generate a UserOperation hash for signing
 */
export function getUserOpHash(
  userOp: any,
  entryPoint: Address,
  chainId: number
): HexString {
  // Simplified UserOperation hash calculation
  // In production, this should match the EntryPoint contract's hash calculation
  const packed = ethers.solidityPacked(
    ['address', 'uint256', 'bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes32'],
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
      hashKeccak256(userOp.paymasterAndData),
    ]
  );
  
  const opHash = hashKeccak256(packed);
  
  // Add entryPoint and chainId
  const finalPacked = ethers.solidityPacked(
    ['bytes32', 'address', 'uint256'],
    [opHash, entryPoint, chainId]
  );
  
  return hashKeccak256(finalPacked);
} 