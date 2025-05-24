import { ethers } from 'ethers';
import { ContractError } from '../types';
import type { UserOperation, Address, HexString } from '../types';
import { ENTRY_POINT_ABI } from './types';

/**
 * EntryPoint client for ERC-4337 operations
 */
export class EntryPointClient {
  private provider: ethers.Provider;
  private address: Address;
  private contract: ethers.Contract;

  constructor(provider: ethers.Provider, address: Address) {
    this.provider = provider;
    this.address = address;
    this.contract = new ethers.Contract(address, ENTRY_POINT_ABI, provider);
  }

  /**
   * Get the EntryPoint contract address
   */
  getAddress(): Address {
    return this.address;
  }

  /**
   * Calculate the hash of a UserOperation
   */
  async getUserOpHash(userOp: UserOperation): Promise<HexString> {
    try {
      const result = await this.contract.getFunction('getUserOpHash')(userOp);
      return result as HexString;
    } catch (error) {
      throw new ContractError(
        'Failed to get UserOperation hash',
        { error, userOp }
      );
    }
  }

  /**
   * Handle a batch of UserOperations (submit to bundler)
   */
  async handleOps(
    userOps: UserOperation[],
    beneficiary: Address,
    signer: ethers.Wallet
  ): Promise<string> {
    try {
      const contractWithSigner = this.contract.connect(signer);
      const tx = await contractWithSigner.getFunction('handleOps')(userOps, beneficiary);
      return tx.hash;
    } catch (error) {
      throw new ContractError(
        'Failed to handle UserOperations',
        { error, userOps, beneficiary }
      );
    }
  }

  /**
   * Simulate a UserOperation to check for validation errors
   */
  async simulateValidation(userOp: UserOperation): Promise<{
    preOpGas: bigint;
    prefund: bigint;
    sigFailed: boolean;
    validAfter: number;
    validUntil: number;
  }> {
    try {
      // In a real implementation, this would call simulateValidation
      // For now, we'll return mock data
      return {
        preOpGas: 50000n,
        prefund: userOp.callGasLimit * userOp.maxFeePerGas,
        sigFailed: false,
        validAfter: 0,
        validUntil: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };
    } catch (error) {
      throw new ContractError(
        'Failed to simulate validation',
        { error, userOp }
      );
    }
  }

  /**
   * Get the deposit balance for an account
   */
  async balanceOf(account: Address): Promise<bigint> {
    try {
      const balanceContract = new ethers.Contract(
        this.address,
        ['function balanceOf(address) view returns (uint256)'],
        this.provider
      );
      const result = await balanceContract.getFunction('balanceOf')(account);
      return result as bigint;
    } catch (error) {
      throw new ContractError(
        'Failed to get balance',
        { error, account }
      );
    }
  }

  /**
   * Deposit ETH for an account
   */
  async depositTo(account: Address, amount: bigint, signer: ethers.Wallet): Promise<string> {
    try {
      const depositContract = new ethers.Contract(
        this.address,
        ['function depositTo(address) payable'],
        signer
      );
      const tx = await depositContract.getFunction('depositTo')(account, { value: amount });
      return tx.hash;
    } catch (error) {
      throw new ContractError(
        'Failed to deposit',
        { error, account, amount }
      );
    }
  }

  /**
   * Withdraw ETH from an account's deposit
   */
  async withdrawTo(
    withdrawAddress: Address,
    amount: bigint,
    signer: ethers.Wallet
  ): Promise<string> {
    try {
      const withdrawContract = new ethers.Contract(
        this.address,
        ['function withdrawTo(address, uint256)'],
        signer
      );
      const tx = await withdrawContract.getFunction('withdrawTo')(withdrawAddress, amount);
      return tx.hash;
    } catch (error) {
      throw new ContractError(
        'Failed to withdraw',
        { error, withdrawAddress, amount }
      );
    }
  }

  /**
   * Get the nonce for an account
   */
  async getNonce(account: Address, key: bigint = 0n): Promise<bigint> {
    try {
      const nonceContract = new ethers.Contract(
        this.address,
        ['function getNonce(address, uint192) view returns (uint256)'],
        this.provider
      );
      const result = await nonceContract.getFunction('getNonce')(account, key);
      return result as bigint;
    } catch (error) {
      throw new ContractError(
        'Failed to get nonce',
        { error, account, key }
      );
    }
  }

  /**
   * Check if an operation is valid
   */
  async validateUserOp(userOp: UserOperation): Promise<boolean> {
    try {
      // Perform basic validation checks
      if (!userOp.sender || !ethers.isAddress(userOp.sender)) {
        return false;
      }

      if (userOp.nonce < 0n) {
        return false;
      }

      if (userOp.callGasLimit < 0n || userOp.verificationGasLimit < 0n) {
        return false;
      }

      // Additional validation logic can be added here
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Estimate gas for a UserOperation
   */
  async estimateUserOpGas(userOp: UserOperation): Promise<{
    callGasLimit: bigint;
    verificationGasLimit: bigint;
    preVerificationGas: bigint;
  }> {
    try {
      // In a real implementation, this would call the EntryPoint's estimation methods
      // For now, we'll provide reasonable estimates
      const baseGas = 21000n;
      const callDataGas = BigInt(userOp.callData.length - 2) * 16n / 2n; // Rough estimate
      
      return {
        callGasLimit: baseGas + callDataGas + 50000n,
        verificationGasLimit: 100000n,
        preVerificationGas: 21000n,
      };
    } catch (error) {
      throw new ContractError(
        'Failed to estimate gas',
        { error, userOp }
      );
    }
  }
} 