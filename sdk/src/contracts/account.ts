import { ethers } from 'ethers';
import { ContractError, ValidationError } from '../types';
import type { 
  UserOperation, 
  TransactionData, 
  BatchTransaction,
  Address,
  HexString,
} from '../types';
import {
  AccountOperationResult,
  SignatureData,
  GasEstimation,
  SIMPLE_ACCOUNT_ABI,
  MULTI_SIG_ACCOUNT_ABI,
  CONTRACT_GAS_LIMITS,
} from './types';

/**
 * Base class for account abstraction wallets
 */
export abstract class BaseAccount {
  protected provider: ethers.Provider;
  protected address: Address;
  protected entryPointAddress: Address;

  constructor(
    provider: ethers.Provider,
    address: Address,
    entryPointAddress: Address
  ) {
    this.provider = provider;
    this.address = address;
    this.entryPointAddress = entryPointAddress;
  }

  /**
   * Get the account address
   */
  getAddress(): Address {
    return this.address;
  }

  /**
   * Get the current nonce for the account
   */
  async getNonce(): Promise<bigint> {
    try {
      const contract = new ethers.Contract(
        this.address,
        ['function getNonce() view returns (uint256)'],
        this.provider
      );
      
      const getNonceMethod = contract['getNonce'];
      if (!getNonceMethod) {
        throw new Error('getNonce method not found on contract');
      }
      
      const result = await getNonceMethod();
      return result as bigint;
    } catch (error) {
      throw new ContractError(
        'Failed to get account nonce',
        { error, address: this.address }
      );
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(transaction: TransactionData): Promise<GasEstimation> {
    try {
      const feeData = await this.provider.getFeeData();
      const gasLimit = await this.provider.estimateGas({
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
      });

      const gasPrice = feeData.gasPrice ?? 0n;
      const maxFeePerGas = feeData.maxFeePerGas ?? gasPrice;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? 0n;

      return {
        gasLimit: gasLimit + (gasLimit / 10n), // Add 10% buffer
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas,
        totalCost: gasLimit * gasPrice,
      };
    } catch (error) {
      throw new ContractError(
        'Failed to estimate gas',
        { error, transaction }
      );
    }
  }

  /**
   * Build a UserOperation for the given transaction
   */
  abstract buildUserOperation(
    transaction: TransactionData,
    options?: {
      nonce?: bigint;
      gasLimits?: Partial<GasEstimation>;
      paymasterData?: HexString;
    }
  ): Promise<UserOperation>;

  /**
   * Execute a single transaction
   */
  abstract execute(
    transaction: TransactionData,
    signature: HexString
  ): Promise<AccountOperationResult>;

  /**
   * Execute multiple transactions in batch
   */
  abstract executeBatch(
    batch: BatchTransaction,
    signature: HexString
  ): Promise<AccountOperationResult>;
}

/**
 * Simple Account implementation (ECDSA signature-based)
 */
export class SimpleAccount extends BaseAccount {
  private contract: ethers.Contract;

  constructor(
    provider: ethers.Provider,
    address: Address,
    entryPointAddress: Address
  ) {
    super(provider, address, entryPointAddress);
    this.contract = new ethers.Contract(address, SIMPLE_ACCOUNT_ABI, provider);
  }

  /**
   * Build a UserOperation for a simple account transaction
   */
  async buildUserOperation(
    transaction: TransactionData,
    options: {
      nonce?: bigint;
      gasLimits?: Partial<GasEstimation>;
      paymasterData?: HexString;
    } = {}
  ): Promise<UserOperation> {
    try {
      const nonce = options.nonce ?? await this.getNonce();
      const gasEstimation = await this.estimateGas(transaction);

      // Encode the execute function call
      const callData = this.contract.interface.encodeFunctionData('execute', [
        transaction.to,
        transaction.value,
        transaction.data,
      ]);

      return {
        sender: this.address,
        nonce,
        initCode: '0x', // Account already deployed
        callData,
        callGasLimit: options.gasLimits?.gasLimit ?? gasEstimation.gasLimit,
        verificationGasLimit: CONTRACT_GAS_LIMITS.SIMPLE_ACCOUNT_DEPLOY / 10n,
        preVerificationGas: 21000n,
        maxFeePerGas: options.gasLimits?.maxFeePerGas ?? gasEstimation.maxFeePerGas ?? 0n,
        maxPriorityFeePerGas: options.gasLimits?.maxPriorityFeePerGas ?? gasEstimation.maxPriorityFeePerGas ?? 0n,
        paymasterAndData: options.paymasterData ?? '0x',
        signature: '0x', // Will be filled by the signer
      };
    } catch (error) {
      throw new ContractError(
        'Failed to build UserOperation',
        { error, transaction }
      );
    }
  }

  /**
   * Execute a single transaction
   */
  async execute(
    transaction: TransactionData,
    signature: HexString
  ): Promise<AccountOperationResult> {
    try {
      const userOp = await this.buildUserOperation(transaction);
      userOp.signature = signature;

      // In a real implementation, this would submit to a bundler
      // For now, we'll simulate the execution
      const txHash = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(userOp))
      );

      return {
        txHash: txHash as HexString,
        blockNumber: await this.provider.getBlockNumber(),
        gasUsed: userOp.callGasLimit,
        status: 'SUCCESS',
      };
    } catch (error) {
      throw new ContractError(
        'Failed to execute transaction',
        { error, transaction }
      );
    }
  }

  /**
   * Execute multiple transactions in batch
   */
  async executeBatch(
    batch: BatchTransaction,
    signature: HexString
  ): Promise<AccountOperationResult> {
    try {
      const destinations = batch.transactions.map(tx => tx.to);
      const values = batch.transactions.map(tx => tx.value);
      const datas = batch.transactions.map(tx => tx.data);

      // Encode the executeBatch function call
      const callData = this.contract.interface.encodeFunctionData('executeBatch', [
        destinations,
        values,
        datas,
      ]);

      const batchTransaction: TransactionData = {
        to: this.address,
        value: 0n,
        data: callData,
        operation: 0,
      };

      return this.execute(batchTransaction, signature);
    } catch (error) {
      throw new ContractError(
        'Failed to execute batch transaction',
        { error, batch }
      );
    }
  }
}

/**
 * Multi-Signature Account implementation
 */
export class MultiSigAccount extends BaseAccount {
  private contract: ethers.Contract;
  private threshold: number;
  private signers: Address[];

  constructor(
    provider: ethers.Provider,
    address: Address,
    entryPointAddress: Address,
    threshold: number,
    signers: Address[]
  ) {
    super(provider, address, entryPointAddress);
    this.contract = new ethers.Contract(address, MULTI_SIG_ACCOUNT_ABI, provider);
    this.threshold = threshold;
    this.signers = signers;
  }

  /**
   * Get current signers and threshold
   */
  async getSignerInfo(): Promise<{ signers: Address[]; threshold: number }> {
    try {
      // In a real implementation, this would query the contract
      return {
        signers: this.signers,
        threshold: this.threshold,
      };
    } catch (error) {
      throw new ContractError(
        'Failed to get signer info',
        { error, address: this.address }
      );
    }
  }

  /**
   * Add a new signer to the multi-sig account
   */
  async addSigner(
    newSigner: Address,
    signatures: SignatureData[]
  ): Promise<AccountOperationResult> {
    if (signatures.length < this.threshold) {
      throw new ValidationError(
        `Insufficient signatures: need ${this.threshold}, got ${signatures.length}`
      );
    }

    try {
      const callData = this.contract.interface.encodeFunctionData('addSigner', [
        newSigner,
      ]);

      const transaction: TransactionData = {
        to: this.address,
        value: 0n,
        data: callData,
        operation: 0,
      };

      // Combine signatures for multi-sig verification
      const combinedSignature = this.combineSignatures(signatures);
      
      return this.execute(transaction, combinedSignature);
    } catch (error) {
      throw new ContractError(
        'Failed to add signer',
        { error, newSigner, signatures }
      );
    }
  }

  /**
   * Remove a signer from the multi-sig account
   */
  async removeSigner(
    signerToRemove: Address,
    signatures: SignatureData[]
  ): Promise<AccountOperationResult> {
    if (signatures.length < this.threshold) {
      throw new ValidationError(
        `Insufficient signatures: need ${this.threshold}, got ${signatures.length}`
      );
    }

    try {
      const callData = this.contract.interface.encodeFunctionData('removeSigner', [
        signerToRemove,
      ]);

      const transaction: TransactionData = {
        to: this.address,
        value: 0n,
        data: callData,
        operation: 0,
      };

      const combinedSignature = this.combineSignatures(signatures);
      
      return this.execute(transaction, combinedSignature);
    } catch (error) {
      throw new ContractError(
        'Failed to remove signer',
        { error, signerToRemove, signatures }
      );
    }
  }

  /**
   * Change the signature threshold
   */
  async changeThreshold(
    newThreshold: number,
    signatures: SignatureData[]
  ): Promise<AccountOperationResult> {
    if (signatures.length < this.threshold) {
      throw new ValidationError(
        `Insufficient signatures: need ${this.threshold}, got ${signatures.length}`
      );
    }

    if (newThreshold > this.signers.length) {
      throw new ValidationError(
        `Threshold ${newThreshold} cannot exceed number of signers ${this.signers.length}`
      );
    }

    try {
      const callData = this.contract.interface.encodeFunctionData('changeThreshold', [
        newThreshold,
      ]);

      const transaction: TransactionData = {
        to: this.address,
        value: 0n,
        data: callData,
        operation: 0,
      };

      const combinedSignature = this.combineSignatures(signatures);
      
      const result = await this.execute(transaction, combinedSignature);
      
      // Update local threshold after successful execution
      this.threshold = newThreshold;
      
      return result;
    } catch (error) {
      throw new ContractError(
        'Failed to change threshold',
        { error, newThreshold, signatures }
      );
    }
  }

  /**
   * Build UserOperation for multi-sig account
   */
  async buildUserOperation(
    transaction: TransactionData,
    options: {
      nonce?: bigint;
      gasLimits?: Partial<GasEstimation>;
      paymasterData?: HexString;
    } = {}
  ): Promise<UserOperation> {
    try {
      const nonce = options.nonce ?? await this.getNonce();
      const gasEstimation = await this.estimateGas(transaction);

      // Encode the execute function call
      const callData = this.contract.interface.encodeFunctionData('execute', [
        transaction.to,
        transaction.value,
        transaction.data,
      ]);

      return {
        sender: this.address,
        nonce,
        initCode: '0x', // Account already deployed
        callData,
        callGasLimit: options.gasLimits?.gasLimit ?? gasEstimation.gasLimit,
        verificationGasLimit: CONTRACT_GAS_LIMITS.MULTI_SIG_ACCOUNT_DEPLOY / 5n,
        preVerificationGas: 21000n,
        maxFeePerGas: options.gasLimits?.maxFeePerGas ?? gasEstimation.maxFeePerGas ?? 0n,
        maxPriorityFeePerGas: options.gasLimits?.maxPriorityFeePerGas ?? gasEstimation.maxPriorityFeePerGas ?? 0n,
        paymasterAndData: options.paymasterData ?? '0x',
        signature: '0x', // Will be filled by the signer
      };
    } catch (error) {
      throw new ContractError(
        'Failed to build UserOperation for multi-sig account',
        { error, transaction }
      );
    }
  }

  /**
   * Execute with multi-sig verification
   */
  async execute(
    transaction: TransactionData,
    signature: HexString
  ): Promise<AccountOperationResult> {
    try {
      const userOp = await this.buildUserOperation(transaction);
      userOp.signature = signature;

      // In a real implementation, this would submit to a bundler
      // For now, we'll simulate the execution
      const txHash = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(userOp))
      );

      return {
        txHash: txHash as HexString,
        blockNumber: await this.provider.getBlockNumber(),
        gasUsed: userOp.callGasLimit,
        status: 'SUCCESS',
      };
    } catch (error) {
      throw new ContractError(
        'Failed to execute multi-sig transaction',
        { error, transaction }
      );
    }
  }

  /**
   * Execute batch with multi-sig verification
   */
  async executeBatch(
    batch: BatchTransaction,
    signature: HexString
  ): Promise<AccountOperationResult> {
    try {
      const destinations = batch.transactions.map(tx => tx.to);
      const values = batch.transactions.map(tx => tx.value);
      const datas = batch.transactions.map(tx => tx.data);

      // Encode the executeBatch function call
      const callData = this.contract.interface.encodeFunctionData('executeBatch', [
        destinations,
        values,
        datas,
      ]);

      const batchTransaction: TransactionData = {
        to: this.address,
        value: 0n,
        data: callData,
        operation: 0,
      };

      return this.execute(batchTransaction, signature);
    } catch (error) {
      throw new ContractError(
        'Failed to execute multi-sig batch transaction',
        { error, batch }
      );
    }
  }

  /**
   * Combine multiple signatures into a single signature for multi-sig verification
   */
  private combineSignatures(signatures: SignatureData[]): HexString {
    // Sort signatures by signer address to ensure deterministic order
    const sortedSignatures = signatures.sort((a, b) => 
      a.signer.toLowerCase().localeCompare(b.signer.toLowerCase())
    );

    // Combine signatures (implementation depends on the multi-sig contract format)
    const combined = sortedSignatures
      .map(sig => sig.signature.slice(2)) // Remove 0x prefix
      .join('');

    return `0x${combined}` as HexString;
  }
} 