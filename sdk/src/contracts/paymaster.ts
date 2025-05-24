import { ethers } from 'ethers';
import { ContractError } from '../types';
import type { UserOperation, Address, HexString } from '../types';
import { VERIFYING_PAYMASTER_ABI } from './types';

/**
 * Paymaster configuration for gasless transactions
 */
export interface ContractPaymasterConfig {
  address: Address;
  signer: ethers.Wallet;
  validUntil: number;
  validAfter: number;
}

/**
 * Paymaster signature data
 */
export interface PaymasterSignature {
  validUntil: number;
  validAfter: number;
  signature: HexString;
}

/**
 * Verifying Paymaster implementation for sponsoring user operations
 */
export class VerifyingPaymaster {
  private provider: ethers.Provider;
  private config: ContractPaymasterConfig;

  constructor(provider: ethers.Provider, config: ContractPaymasterConfig) {
    this.provider = provider;
    this.config = config;
  }

  /**
   * Generate paymaster data for a user operation
   */
  async generatePaymasterData(
    userOp: UserOperation,
    validUntil?: number,
    validAfter?: number
  ): Promise<HexString> {
    try {
      const until = validUntil ?? this.config.validUntil;
      const after = validAfter ?? this.config.validAfter;

      // Get the hash that needs to be signed
      const hash = await this.getPaymasterHash(userOp, until, after);
      
      // Sign the hash
      const signature = await this.config.signer.signMessage(
        ethers.getBytes(hash)
      );

      // Encode paymaster data: address + validUntil + validAfter + signature
      const paymasterData = ethers.solidityPacked(
        ['address', 'uint48', 'uint48', 'bytes'],
        [this.config.address, until, after, signature]
      );

      return paymasterData as HexString;
    } catch (error) {
      throw new ContractError(
        'Failed to generate paymaster data',
        { error, userOp }
      );
    }
  }

  /**
   * Verify if a user operation can be sponsored
   */
  async canSponsor(userOp: UserOperation): Promise<boolean> {
    try {
      // Check if the paymaster has sufficient balance
      const balance = await this.getBalance();
      const estimatedCost = this.estimateOperationCost(userOp);

      if (balance < estimatedCost) {
        return false;
      }

      // Additional sponsorship logic can be added here
      // e.g., whitelist checks, rate limiting, etc.
      
      return true;
    } catch (error) {
      // If we can't determine sponsorship eligibility, err on the side of caution
      return false;
    }
  }

  /**
   * Get the paymaster's balance in the EntryPoint
   */
  async getBalance(): Promise<bigint> {
    try {
      // In a real implementation, this would query the EntryPoint contract
      // for the paymaster's deposited balance
      const entryPointContract = new ethers.Contract(
        '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', // Standard EntryPoint address
        ['function balanceOf(address) view returns (uint256)'],
        this.provider
      );

      const balanceOfMethod = entryPointContract['balanceOf'];
      if (!balanceOfMethod) {
        throw new Error('balanceOf method not found on contract');
      }
      return await balanceOfMethod(this.config.address) as bigint;
    } catch (error) {
      throw new ContractError(
        'Failed to get paymaster balance',
        { error, address: this.config.address }
      );
    }
  }

  /**
   * Deposit funds to the paymaster's EntryPoint balance
   */
  async deposit(amount: bigint): Promise<string> {
    try {
      const entryPointContract = new ethers.Contract(
        '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
        ['function depositTo(address) payable'],
        this.config.signer
      );

      const depositToMethod = entryPointContract['depositTo'];
      if (!depositToMethod) {
        throw new Error('depositTo method not found on contract');
      }
      const tx = await depositToMethod(this.config.address, {
        value: amount,
      });

      return tx.hash;
    } catch (error) {
      throw new ContractError(
        'Failed to deposit to paymaster',
        { error, amount }
      );
    }
  }

  /**
   * Withdraw funds from the paymaster's EntryPoint balance
   */
  async withdraw(amount: bigint, to: Address): Promise<string> {
    try {
      const entryPointContract = new ethers.Contract(
        '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
        ['function withdrawTo(address, uint256)'],
        this.config.signer
      );

      const withdrawToMethod = entryPointContract['withdrawTo'];
      if (!withdrawToMethod) {
        throw new Error('withdrawTo method not found on contract');
      }
      const tx = await withdrawToMethod(to, amount);
      return tx.hash;
    } catch (error) {
      throw new ContractError(
        'Failed to withdraw from paymaster',
        { error, amount, to }
      );
    }
  }

  /**
   * Update paymaster configuration
   */
  updateConfig(newConfig: Partial<ContractPaymasterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get the current paymaster configuration
   */
  getConfig(): ContractPaymasterConfig {
    return { ...this.config };
  }

  /**
   * Get the hash that needs to be signed for paymaster verification
   */
  private async getPaymasterHash(
    userOp: UserOperation,
    validUntil: number,
    validAfter: number
  ): Promise<string> {
    try {
      // In a real implementation, this would call the paymaster contract
      // For now, we'll create a hash manually
      const encoded = ethers.solidityPacked(
        ['address', 'uint256', 'bytes32', 'uint48', 'uint48'],
        [
          userOp.sender,
          userOp.nonce,
          ethers.keccak256(userOp.callData),
          validUntil,
          validAfter,
        ]
      );

      return ethers.keccak256(encoded);
    } catch (error) {
      throw new ContractError(
        'Failed to get paymaster hash',
        { error, userOp, validUntil, validAfter }
      );
    }
  }

  /**
   * Estimate the cost of sponsoring a user operation
   */
  private estimateOperationCost(userOp: UserOperation): bigint {
    // Estimate total gas cost including verification and execution
    const totalGas = userOp.callGasLimit + 
                    userOp.verificationGasLimit + 
                    userOp.preVerificationGas;
    
    const gasPrice = userOp.maxFeePerGas;
    
    return totalGas * gasPrice;
  }
}

/**
 * Factory for creating paymaster instances
 */
export class PaymasterFactory {
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
  }

  /**
   * Create a new VerifyingPaymaster instance
   */
  createVerifyingPaymaster(config: ContractPaymasterConfig): VerifyingPaymaster {
    return new VerifyingPaymaster(this.provider, config);
  }

  /**
   * Deploy a new paymaster contract
   */
  async deployPaymaster(
    deployer: ethers.Wallet,
    entryPointAddress: Address,
    owner: Address
  ): Promise<{ address: Address; txHash: string }> {
    try {
      // In a real implementation, this would deploy the actual paymaster contract
      // For now, we'll simulate the deployment
      const factory = new ethers.ContractFactory(
        VERIFYING_PAYMASTER_ABI,
        '0x', // Bytecode would be here
        deployer
      );

      const contract = await factory.deploy(entryPointAddress, owner);
      await contract.waitForDeployment();

      return {
        address: await contract.getAddress() as Address,
        txHash: contract.deploymentTransaction()?.hash ?? '',
      };
    } catch (error) {
      throw new ContractError(
        'Failed to deploy paymaster',
        { error, entryPointAddress, owner }
      );
    }
  }
} 