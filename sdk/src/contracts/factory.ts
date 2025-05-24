import { ethers } from 'ethers';
import { ContractError } from '../types';
import type { Address, HexString } from '../types';
import { SimpleAccount, MultiSigAccount } from './account';

/**
 * Account factory configuration
 */
export interface AccountFactoryConfig {
  factoryAddress: Address;
  entryPointAddress: Address;
  implementationAddress: Address;
}

/**
 * Account deployment result
 */
export interface AccountDeploymentResult {
  accountAddress: Address;
  txHash: string;
  isNewDeployment: boolean;
}

/**
 * Simple Account Factory implementation
 */
export class SimpleAccountFactory {
  private provider: ethers.Provider;
  private config: AccountFactoryConfig;
  private contract: ethers.Contract;

  constructor(provider: ethers.Provider, config: AccountFactoryConfig) {
    this.provider = provider;
    this.config = config;
    this.contract = new ethers.Contract(
      config.factoryAddress,
      [
        'function createAccount(address owner, uint256 salt) returns (address)',
        'function getAddress(address owner, uint256 salt) view returns (address)',
      ],
      provider
    );
  }

  /**
   * Calculate the counterfactual address for a simple account
   */
  async getAccountAddress(owner: Address, salt: bigint): Promise<Address> {
    try {
      const result = await this.contract.getFunction('getAddress')(owner, salt);
      return result as Address;
    } catch (error) {
      throw new ContractError(
        'Failed to get account address',
        { error, owner, salt }
      );
    }
  }

  /**
   * Deploy a new simple account
   */
  async deployAccount(
    owner: Address,
    salt: bigint,
    signer?: ethers.Wallet
  ): Promise<AccountDeploymentResult> {
    try {
      // First check if account already exists
      const accountAddress = await this.getAccountAddress(owner, salt);
      const code = await this.provider.getCode(accountAddress);
      
      if (code !== '0x') {
        // Account already deployed
        return {
          accountAddress,
          txHash: '',
          isNewDeployment: false,
        };
      }

      // Deploy new account
      if (!signer) {
        throw new ContractError('Signer required for deployment');
      }

      const factoryWithSigner = this.contract.connect(signer);
      const tx = await factoryWithSigner.getFunction('createAccount')(owner, salt);
      await tx.wait();

      return {
        accountAddress,
        txHash: tx.hash,
        isNewDeployment: true,
      };
    } catch (error) {
      throw new ContractError(
        'Failed to deploy account',
        { error, owner, salt }
      );
    }
  }

  /**
   * Create a SimpleAccount instance
   */
  createAccountInstance(accountAddress: Address): SimpleAccount {
    return new SimpleAccount(
      this.provider,
      accountAddress,
      this.config.entryPointAddress
    );
  }

  /**
   * Get the init code for account deployment
   */
  async getInitCode(owner: Address, salt: bigint): Promise<HexString> {
    try {
      const initCallData = this.contract.interface.encodeFunctionData(
        'createAccount',
        [owner, salt]
      );

      return `${this.config.factoryAddress}${initCallData.slice(2)}` as HexString;
    } catch (error) {
      throw new ContractError(
        'Failed to get init code',
        { error, owner, salt }
      );
    }
  }
}

/**
 * Multi-Sig Account Factory implementation
 */
export class MultiSigAccountFactory {
  private provider: ethers.Provider;
  private config: AccountFactoryConfig;
  private contract: ethers.Contract;

  constructor(provider: ethers.Provider, config: AccountFactoryConfig) {
    this.provider = provider;
    this.config = config;
    this.contract = new ethers.Contract(
      config.factoryAddress,
      [
        'function createAccount(address[] owners, uint256 threshold, uint256 salt) returns (address)',
        'function getAddress(address[] owners, uint256 threshold, uint256 salt) view returns (address)',
      ],
      provider
    );
  }

  /**
   * Calculate the counterfactual address for a multi-sig account
   */
  async getAccountAddress(
    owners: Address[],
    threshold: number,
    salt: bigint
  ): Promise<Address> {
    try {
      const result = await this.contract.getFunction('getAddress')(owners, threshold, salt);
      return result as Address;
    } catch (error) {
      throw new ContractError(
        'Failed to get multi-sig account address',
        { error, owners, threshold, salt }
      );
    }
  }

  /**
   * Deploy a new multi-sig account
   */
  async deployAccount(
    owners: Address[],
    threshold: number,
    salt: bigint,
    signer?: ethers.Wallet
  ): Promise<AccountDeploymentResult> {
    try {
      // Validate inputs
      if (owners.length === 0) {
        throw new ContractError('At least one owner required');
      }
      if (threshold > owners.length) {
        throw new ContractError('Threshold cannot exceed number of owners');
      }
      if (threshold === 0) {
        throw new ContractError('Threshold must be greater than 0');
      }

      // Check if account already exists
      const accountAddress = await this.getAccountAddress(owners, threshold, salt);
      const code = await this.provider.getCode(accountAddress);
      
      if (code !== '0x') {
        return {
          accountAddress,
          txHash: '',
          isNewDeployment: false,
        };
      }

      // Deploy new account
      if (!signer) {
        throw new ContractError('Signer required for deployment');
      }

      const factoryWithSigner = this.contract.connect(signer);
      const tx = await factoryWithSigner.getFunction('createAccount')(owners, threshold, salt);
      await tx.wait();

      return {
        accountAddress,
        txHash: tx.hash,
        isNewDeployment: true,
      };
    } catch (error) {
      throw new ContractError(
        'Failed to deploy multi-sig account',
        { error, owners, threshold, salt }
      );
    }
  }

  /**
   * Create a MultiSigAccount instance
   */
  createAccountInstance(
    accountAddress: Address,
    threshold: number,
    signers: Address[]
  ): MultiSigAccount {
    return new MultiSigAccount(
      this.provider,
      accountAddress,
      this.config.entryPointAddress,
      threshold,
      signers
    );
  }

  /**
   * Get the init code for multi-sig account deployment
   */
  async getInitCode(
    owners: Address[],
    threshold: number,
    salt: bigint
  ): Promise<HexString> {
    try {
      const initCallData = this.contract.interface.encodeFunctionData(
        'createAccount',
        [owners, threshold, salt]
      );

      return `${this.config.factoryAddress}${initCallData.slice(2)}` as HexString;
    } catch (error) {
      throw new ContractError(
        'Failed to get multi-sig init code',
        { error, owners, threshold, salt }
      );
    }
  }
}

/**
 * Factory manager for creating different types of account factories
 */
export class AccountFactoryManager {
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
  }

  /**
   * Create a SimpleAccountFactory instance
   */
  createSimpleAccountFactory(config: AccountFactoryConfig): SimpleAccountFactory {
    return new SimpleAccountFactory(this.provider, config);
  }

  /**
   * Create a MultiSigAccountFactory instance
   */
  createMultiSigAccountFactory(config: AccountFactoryConfig): MultiSigAccountFactory {
    return new MultiSigAccountFactory(this.provider, config);
  }
} 