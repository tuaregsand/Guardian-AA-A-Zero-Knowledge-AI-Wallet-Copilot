import { ethers } from 'ethers';
import { ContractError, ConfigError } from '../types';
import type { 
  UserOperation, 
  TransactionData, 
  BatchTransaction,
  Address, 
  HexString,
  NetworkConfig,
} from '../types';
import { SimpleAccount, MultiSigAccount } from './account';
import { VerifyingPaymaster, PaymasterFactory } from './paymaster';
import { SimpleAccountFactory, MultiSigAccountFactory, AccountFactoryManager } from './factory';
import { EntryPointClient } from './entrypoint';
import { DEFAULT_CONTRACT_ADDRESSES } from './types';

/**
 * Configuration for the contracts client
 */
export interface ContractsClientConfig {
  network: NetworkConfig;
  entryPointAddress?: Address;
  simpleAccountFactoryAddress?: Address;
  multiSigAccountFactoryAddress?: Address;
  verifyingPaymasterAddress?: Address;
  signer?: ethers.Wallet;
}

/**
 * Main contracts client that provides a unified interface for all contract operations
 */
export class ContractsClient {
  private provider: ethers.Provider;
  private config: ContractsClientConfig;
  private entryPoint: EntryPointClient;
  private accountFactoryManager: AccountFactoryManager;
  private paymasterFactory: PaymasterFactory;
  private signer?: ethers.Wallet;

  constructor(config: ContractsClientConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.network.rpcUrl);
    
    if (config.signer) {
      this.signer = config.signer.connect(this.provider);
    }

    // Initialize EntryPoint
    const entryPointAddress = this.getContractAddress('entryPoint');
    this.entryPoint = new EntryPointClient(this.provider, entryPointAddress);

    // Initialize factories
    this.accountFactoryManager = new AccountFactoryManager(this.provider);
    this.paymasterFactory = new PaymasterFactory(this.provider);
  }

  /**
   * Get contract address for the current network
   */
  private getContractAddress(contractType: string): Address {
    const chainId = this.config.network.chainId;
    const addresses = DEFAULT_CONTRACT_ADDRESSES[chainId];
    
    if (!addresses) {
      throw new ConfigError(
        `No contract addresses configured for chain ID ${chainId}`
      );
    }

    // Check for custom addresses in config first
    switch (contractType) {
      case 'entryPoint':
        return this.config.entryPointAddress ?? addresses.entryPoint;
      case 'simpleAccountFactory':
        return this.config.simpleAccountFactoryAddress ?? addresses.simpleAccountFactory;
      case 'multiSigAccountFactory':
        return this.config.multiSigAccountFactoryAddress ?? addresses.multiSigAccountFactory;
      case 'verifyingPaymaster':
        return this.config.verifyingPaymasterAddress ?? addresses.verifyingPaymaster;
      default:
        throw new ConfigError(`Unknown contract type: ${contractType}`);
    }
  }

  /**
   * Create a simple account factory
   */
  createSimpleAccountFactory(): SimpleAccountFactory {
    const factoryAddress = this.getContractAddress('simpleAccountFactory');
    const entryPointAddress = this.getContractAddress('entryPoint');
    
    return this.accountFactoryManager.createSimpleAccountFactory({
      factoryAddress,
      entryPointAddress,
      implementationAddress: factoryAddress, // Simplified for demo
    });
  }

  /**
   * Create a multi-sig account factory
   */
  createMultiSigAccountFactory(): MultiSigAccountFactory {
    const factoryAddress = this.getContractAddress('multiSigAccountFactory');
    const entryPointAddress = this.getContractAddress('entryPoint');
    
    return this.accountFactoryManager.createMultiSigAccountFactory({
      factoryAddress,
      entryPointAddress,
      implementationAddress: factoryAddress, // Simplified for demo
    });
  }

  /**
   * Create a verifying paymaster
   */
  createVerifyingPaymaster(signer: ethers.Wallet): VerifyingPaymaster {
    if (!signer) {
      throw new ConfigError('Signer required for paymaster operations');
    }

    const paymasterAddress = this.getContractAddress('verifyingPaymaster');
    
    return this.paymasterFactory.createVerifyingPaymaster({
      address: paymasterAddress,
      signer: signer.connect(this.provider),
      validUntil: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      validAfter: Math.floor(Date.now() / 1000) - 60, // 1 minute ago
    });
  }

  /**
   * Deploy a new simple account
   */
  async deploySimpleAccount(
    owner: Address,
    salt: bigint = 0n
  ): Promise<SimpleAccount> {
    if (!this.signer) {
      throw new ConfigError('Signer required for account deployment');
    }

    const factory = this.createSimpleAccountFactory();
    const result = await factory.deployAccount(owner, salt, this.signer);
    
    return factory.createAccountInstance(result.accountAddress);
  }

  /**
   * Deploy a new multi-sig account
   */
  async deployMultiSigAccount(
    owners: Address[],
    threshold: number,
    salt: bigint = 0n
  ): Promise<MultiSigAccount> {
    if (!this.signer) {
      throw new ConfigError('Signer required for account deployment');
    }

    const factory = this.createMultiSigAccountFactory();
    const result = await factory.deployAccount(owners, threshold, salt, this.signer);
    
    return factory.createAccountInstance(result.accountAddress, threshold, owners);
  }

  /**
   * Get an existing simple account instance
   */
  getSimpleAccount(accountAddress: Address): SimpleAccount {
    const entryPointAddress = this.getContractAddress('entryPoint');
    return new SimpleAccount(this.provider, accountAddress, entryPointAddress);
  }

  /**
   * Get an existing multi-sig account instance
   */
  getMultiSigAccount(
    accountAddress: Address,
    threshold: number,
    signers: Address[]
  ): MultiSigAccount {
    const entryPointAddress = this.getContractAddress('entryPoint');
    return new MultiSigAccount(
      this.provider,
      accountAddress,
      entryPointAddress,
      threshold,
      signers
    );
  }

  /**
   * Execute a transaction through an account
   */
  async executeTransaction(
    account: SimpleAccount | MultiSigAccount,
    transaction: TransactionData,
    signature: HexString,
    usePaymaster: boolean = false
  ): Promise<string> {
    try {
      let userOp = await account.buildUserOperation(transaction);

      // Add paymaster data if requested
      if (usePaymaster && this.signer) {
        const paymaster = this.createVerifyingPaymaster(this.signer);
        const paymasterData = await paymaster.generatePaymasterData(userOp);
        userOp.paymasterAndData = paymasterData;
      }

      // Set signature
      userOp.signature = signature;

      // Submit to EntryPoint (in real implementation, this would go through a bundler)
      if (!this.signer) {
        throw new ConfigError('Signer required for transaction execution');
      }

      return await this.entryPoint.handleOps([userOp], this.signer.address as Address, this.signer);
    } catch (error) {
      throw new ContractError(
        'Failed to execute transaction',
        { error, transaction }
      );
    }
  }

  /**
   * Execute a batch of transactions
   */
  async executeBatchTransaction(
    account: SimpleAccount | MultiSigAccount,
    batch: BatchTransaction,
    signature: HexString,
    usePaymaster: boolean = false
  ): Promise<string> {
    try {
      // For batch transactions, paymaster support would need to be implemented
      // at the account level. For now, we acknowledge the parameter.
      if (usePaymaster && !this.signer) {
        throw new ConfigError('Signer required for paymaster operations');
      }
      
      const result = await account.executeBatch(batch, signature);
      return result.txHash;
    } catch (error) {
      throw new ContractError(
        'Failed to execute batch transaction',
        { error, batch }
      );
    }
  }

  /**
   * Estimate gas for a user operation
   */
  async estimateUserOpGas(userOp: UserOperation): Promise<{
    callGasLimit: bigint;
    verificationGasLimit: bigint;
    preVerificationGas: bigint;
  }> {
    return this.entryPoint.estimateUserOpGas(userOp);
  }

  /**
   * Get the hash of a user operation
   */
  async getUserOpHash(userOp: UserOperation): Promise<HexString> {
    return this.entryPoint.getUserOpHash(userOp);
  }

  /**
   * Validate a user operation
   */
  async validateUserOp(userOp: UserOperation): Promise<boolean> {
    return this.entryPoint.validateUserOp(userOp);
  }

  /**
   * Get account balance in the EntryPoint
   */
  async getAccountBalance(account: Address): Promise<bigint> {
    return this.entryPoint.balanceOf(account);
  }

  /**
   * Deposit ETH for an account
   */
  async depositForAccount(account: Address, amount: bigint): Promise<string> {
    if (!this.signer) {
      throw new ConfigError('Signer required for deposits');
    }
    return this.entryPoint.depositTo(account, amount, this.signer);
  }

  /**
   * Withdraw ETH from an account
   */
  async withdrawFromAccount(
    withdrawAddress: Address,
    amount: bigint
  ): Promise<string> {
    if (!this.signer) {
      throw new ConfigError('Signer required for withdrawals');
    }
    return this.entryPoint.withdrawTo(withdrawAddress, amount, this.signer);
  }

  /**
   * Get the current network configuration
   */
  getNetworkConfig(): NetworkConfig {
    return this.config.network;
  }

  /**
   * Update the signer
   */
  updateSigner(signer: ethers.Wallet): void {
    this.signer = signer.connect(this.provider);
  }

  /**
   * Get the EntryPoint client
   */
  getEntryPoint(): EntryPointClient {
    return this.entryPoint;
  }
} 