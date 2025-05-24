'use strict';

var ethers = require('ethers');
var zod = require('zod');

// src/contracts/account.ts
zod.z.object({
  /** Length of the original input data */
  len: zod.z.number().int().nonnegative(),
  /** SHA256 hash of the input as 32-byte array */
  hash: zod.z.array(zod.z.number().int().min(0).max(255)).length(32)
});
zod.z.object({
  /** SHA256 hash of the input */
  hash: zod.z.array(zod.z.number().int().min(0).max(255)).length(32),
  /** Serialized proof bytes */
  proof: zod.z.instanceof(Uint8Array),
  /** Proof generation time in milliseconds */
  generationTime: zod.z.number().int().nonnegative()
});
var ZkProofConfigSchema = zod.z.object({
  /** Circuit size parameter (k value) */
  circuitK: zod.z.number().int().min(10).max(20).default(14),
  /** Whether to use cached proving keys */
  useCachedKeys: zod.z.boolean().default(true),
  /** Timeout for proof generation in milliseconds */
  timeout: zod.z.number().int().positive().default(3e4)
});
zod.z.object({
  sender: zod.z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  nonce: zod.z.bigint(),
  initCode: zod.z.string().regex(/^0x[a-fA-F0-9]*$/),
  callData: zod.z.string().regex(/^0x[a-fA-F0-9]*$/),
  callGasLimit: zod.z.bigint(),
  verificationGasLimit: zod.z.bigint(),
  preVerificationGas: zod.z.bigint(),
  maxFeePerGas: zod.z.bigint(),
  maxPriorityFeePerGas: zod.z.bigint(),
  paymasterAndData: zod.z.string().regex(/^0x[a-fA-F0-9]*$/),
  signature: zod.z.string().regex(/^0x[a-fA-F0-9]*$/)
});
var AccountConfigSchema = zod.z.object({
  /** Account implementation address */
  implementation: zod.z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Account factory address */
  factory: zod.z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Entry point address */
  entryPoint: zod.z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Initial account owner */
  owner: zod.z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Salt for deterministic address generation */
  salt: zod.z.bigint().default(0n)
});
zod.z.object({
  /** List of signer addresses */
  signers: zod.z.array(zod.z.string().regex(/^0x[a-fA-F0-9]{40}$/)).min(1),
  /** Required number of signatures (threshold) */
  threshold: zod.z.number().int().positive(),
  /** Delay for signer management operations in seconds */
  delay: zod.z.number().int().nonnegative().default(0)
});
var PaymasterConfigSchema = zod.z.object({
  /** Paymaster contract address */
  address: zod.z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Verifying signer for paymaster */
  signer: zod.z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Valid until timestamp */
  validUntil: zod.z.number().int().nonnegative(),
  /** Valid after timestamp */
  validAfter: zod.z.number().int().nonnegative()
});
var TransactionDataSchema = zod.z.object({
  /** Target contract address */
  to: zod.z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Value in wei */
  value: zod.z.bigint().default(0n),
  /** Call data */
  data: zod.z.string().regex(/^0x[a-fA-F0-9]*$/),
  /** Operation type (0 = call, 1 = delegatecall) */
  operation: zod.z.number().int().min(0).max(1).default(0)
});
zod.z.object({
  /** Array of transaction data */
  transactions: zod.z.array(TransactionDataSchema).min(1),
  /** Whether to fail on first error */
  failOnError: zod.z.boolean().default(true)
});
var NetworkConfigSchema = zod.z.object({
  /** Chain ID */
  chainId: zod.z.number().int().positive(),
  /** Network name */
  name: zod.z.string().min(1),
  /** RPC URL */
  rpcUrl: zod.z.string().url(),
  /** Block explorer URL */
  explorerUrl: zod.z.string().url().optional(),
  /** Native currency symbol */
  currency: zod.z.string().min(1).default("ETH"),
  /** Whether this is a testnet */
  isTestnet: zod.z.boolean().default(false)
});
zod.z.object({
  /** Network configuration */
  network: NetworkConfigSchema,
  /** ZK proof configuration */
  zkConfig: ZkProofConfigSchema.optional(),
  /** Account configuration */
  accountConfig: AccountConfigSchema.optional(),
  /** Paymaster configuration */
  paymasterConfig: PaymasterConfigSchema.optional(),
  /** Enable debug logging */
  debug: zod.z.boolean().default(false)
});
var GuardianAAError = class extends Error {
  constructor(message, code, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "GuardianAAError";
  }
};
var ContractError = class extends GuardianAAError {
  constructor(message, details) {
    super(message, "CONTRACT_ERROR", details);
    this.name = "ContractError";
  }
};
var ConfigError = class extends GuardianAAError {
  constructor(message, details) {
    super(message, "CONFIG_ERROR", details);
    this.name = "ConfigError";
  }
};
var ValidationError = class extends GuardianAAError {
  constructor(message, details) {
    super(message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
};
var ENTRY_POINT_ABI = [
  {
    name: "handleOps",
    type: "function",
    inputs: [
      { name: "ops", type: "tuple[]", components: [] },
      { name: "beneficiary", type: "address" }
    ],
    outputs: []
  },
  {
    name: "getUserOpHash",
    type: "function",
    inputs: [{ name: "userOp", type: "tuple", components: [] }],
    outputs: [{ name: "", type: "bytes32" }]
  }
];
var SIMPLE_ACCOUNT_ABI = [
  {
    name: "execute",
    type: "function",
    inputs: [
      { name: "dest", type: "address" },
      { name: "value", type: "uint256" },
      { name: "func", type: "bytes" }
    ],
    outputs: []
  },
  {
    name: "executeBatch",
    type: "function",
    inputs: [
      { name: "dest", type: "address[]" },
      { name: "value", type: "uint256[]" },
      { name: "func", type: "bytes[]" }
    ],
    outputs: []
  }
];
var MULTI_SIG_ACCOUNT_ABI = [
  {
    name: "addSigner",
    type: "function",
    inputs: [{ name: "signer", type: "address" }],
    outputs: []
  },
  {
    name: "removeSigner",
    type: "function",
    inputs: [{ name: "signer", type: "address" }],
    outputs: []
  },
  {
    name: "changeThreshold",
    type: "function",
    inputs: [{ name: "threshold", type: "uint256" }],
    outputs: []
  }
];
var VERIFYING_PAYMASTER_ABI = [
  {
    name: "getHash",
    type: "function",
    inputs: [
      { name: "userOp", type: "tuple", components: [] },
      { name: "validUntil", type: "uint48" },
      { name: "validAfter", type: "uint48" }
    ],
    outputs: [{ name: "", type: "bytes32" }]
  }
];
var ContractDeployConfigSchema = zod.z.object({
  /** Contract bytecode */
  bytecode: zod.z.string().regex(/^0x[a-fA-F0-9]*$/),
  /** Constructor arguments */
  constructorArgs: zod.z.array(zod.z.unknown()).default([]),
  /** Gas limit for deployment */
  gasLimit: zod.z.bigint().optional(),
  /** Gas price */
  gasPrice: zod.z.bigint().optional(),
  /** Salt for CREATE2 deployment */
  salt: zod.z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional()
});
var ContractCallConfigSchema = zod.z.object({
  /** Contract address */
  address: zod.z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Function name */
  functionName: zod.z.string().min(1),
  /** Function arguments */
  args: zod.z.array(zod.z.unknown()).default([]),
  /** Value to send with the call */
  value: zod.z.bigint().default(0n),
  /** Gas limit */
  gasLimit: zod.z.bigint().optional()
});
var AccountOperationResultSchema = zod.z.object({
  /** Transaction hash */
  txHash: zod.z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  /** Block number */
  blockNumber: zod.z.number().int().nonnegative(),
  /** Gas used */
  gasUsed: zod.z.bigint(),
  /** Operation status */
  status: zod.z.enum(["SUCCESS", "FAILED", "PENDING"]),
  /** Error message if failed */
  error: zod.z.string().optional()
});
var SignatureDataSchema = zod.z.object({
  /** Signer address */
  signer: zod.z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Signature bytes */
  signature: zod.z.string().regex(/^0x[a-fA-F0-9]*$/),
  /** Signature type (ECDSA, etc.) */
  signatureType: zod.z.enum(["ECDSA", "EIP1271"]).default("ECDSA")
});
var GasEstimationSchema = zod.z.object({
  /** Estimated gas limit */
  gasLimit: zod.z.bigint(),
  /** Estimated gas price */
  gasPrice: zod.z.bigint(),
  /** Maximum fee per gas (EIP-1559) */
  maxFeePerGas: zod.z.bigint().optional(),
  /** Maximum priority fee per gas (EIP-1559) */
  maxPriorityFeePerGas: zod.z.bigint().optional(),
  /** Estimated total cost in wei */
  totalCost: zod.z.bigint()
});
var EventFilterSchema = zod.z.object({
  /** Contract address */
  address: zod.z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Event topics */
  topics: zod.z.array(zod.z.string().regex(/^0x[a-fA-F0-9]{64}$/)).optional(),
  /** From block */
  fromBlock: zod.z.union([zod.z.number().int().nonnegative(), zod.z.literal("latest")]).default("latest"),
  /** To block */
  toBlock: zod.z.union([zod.z.number().int().nonnegative(), zod.z.literal("latest")]).default("latest")
});
var ContractEventSchema = zod.z.object({
  /** Event name */
  eventName: zod.z.string(),
  /** Contract address */
  address: zod.z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Block number */
  blockNumber: zod.z.number().int().nonnegative(),
  /** Transaction hash */
  transactionHash: zod.z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  /** Event data */
  data: zod.z.record(zod.z.unknown())
});
var DEFAULT_CONTRACT_ADDRESSES = {
  // Local testnet (Hardhat/Anvil)
  31337: {
    entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    simpleAccountFactory: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    multiSigAccountFactory: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    verifyingPaymaster: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"
  },
  // Ethereum Sepolia
  11155111: {
    entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    simpleAccountFactory: "0x9406Cc6185a346906296840746125a0E44976454",
    multiSigAccountFactory: "0x000000000000000000000000000000000000dEaD",
    verifyingPaymaster: "0x000000000000000000000000000000000000dEaD"
  }
};
var CONTRACT_GAS_LIMITS = {
  SIMPLE_ACCOUNT_DEPLOY: 1000000n,
  MULTI_SIG_ACCOUNT_DEPLOY: 1500000n,
  PAYMASTER_DEPLOY: 800000n,
  ENTRY_POINT_DEPLOY: 2000000n
};
var FUNCTION_SELECTORS = {
  EXECUTE: "0xb61d27f6",
  EXECUTE_BATCH: "0x18dfb3c7",
  ADD_SIGNER: "0x7065cb48",
  REMOVE_SIGNER: "0x0e316ab7",
  CHANGE_THRESHOLD: "0x694e80c3"
};

// src/contracts/account.ts
var BaseAccount = class {
  provider;
  address;
  entryPointAddress;
  constructor(provider, address, entryPointAddress) {
    this.provider = provider;
    this.address = address;
    this.entryPointAddress = entryPointAddress;
  }
  /**
   * Get the account address
   */
  getAddress() {
    return this.address;
  }
  /**
   * Get the current nonce for the account
   */
  async getNonce() {
    try {
      const contract = new ethers.ethers.Contract(
        this.address,
        ["function getNonce() view returns (uint256)"],
        this.provider
      );
      const getNonceMethod = contract["getNonce"];
      if (!getNonceMethod) {
        throw new Error("getNonce method not found on contract");
      }
      const result = await getNonceMethod();
      return result;
    } catch (error) {
      throw new ContractError(
        "Failed to get account nonce",
        { error, address: this.address }
      );
    }
  }
  /**
   * Estimate gas for a transaction
   */
  async estimateGas(transaction) {
    try {
      const feeData = await this.provider.getFeeData();
      const gasLimit = await this.provider.estimateGas({
        to: transaction.to,
        value: transaction.value,
        data: transaction.data
      });
      const gasPrice = feeData.gasPrice ?? 0n;
      const maxFeePerGas = feeData.maxFeePerGas ?? gasPrice;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? 0n;
      return {
        gasLimit: gasLimit + gasLimit / 10n,
        // Add 10% buffer
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas,
        totalCost: gasLimit * gasPrice
      };
    } catch (error) {
      throw new ContractError(
        "Failed to estimate gas",
        { error, transaction }
      );
    }
  }
};
var SimpleAccount = class extends BaseAccount {
  contract;
  constructor(provider, address, entryPointAddress) {
    super(provider, address, entryPointAddress);
    this.contract = new ethers.ethers.Contract(address, SIMPLE_ACCOUNT_ABI, provider);
  }
  /**
   * Build a UserOperation for a simple account transaction
   */
  async buildUserOperation(transaction, options = {}) {
    try {
      const nonce = options.nonce ?? await this.getNonce();
      const gasEstimation = await this.estimateGas(transaction);
      const callData = this.contract.interface.encodeFunctionData("execute", [
        transaction.to,
        transaction.value,
        transaction.data
      ]);
      return {
        sender: this.address,
        nonce,
        initCode: "0x",
        // Account already deployed
        callData,
        callGasLimit: options.gasLimits?.gasLimit ?? gasEstimation.gasLimit,
        verificationGasLimit: CONTRACT_GAS_LIMITS.SIMPLE_ACCOUNT_DEPLOY / 10n,
        preVerificationGas: 21000n,
        maxFeePerGas: options.gasLimits?.maxFeePerGas ?? gasEstimation.maxFeePerGas ?? 0n,
        maxPriorityFeePerGas: options.gasLimits?.maxPriorityFeePerGas ?? gasEstimation.maxPriorityFeePerGas ?? 0n,
        paymasterAndData: options.paymasterData ?? "0x",
        signature: "0x"
        // Will be filled by the signer
      };
    } catch (error) {
      throw new ContractError(
        "Failed to build UserOperation",
        { error, transaction }
      );
    }
  }
  /**
   * Execute a single transaction
   */
  async execute(transaction, signature) {
    try {
      const userOp = await this.buildUserOperation(transaction);
      userOp.signature = signature;
      const txHash = ethers.ethers.keccak256(
        ethers.ethers.toUtf8Bytes(JSON.stringify(userOp))
      );
      return {
        txHash,
        blockNumber: await this.provider.getBlockNumber(),
        gasUsed: userOp.callGasLimit,
        status: "SUCCESS"
      };
    } catch (error) {
      throw new ContractError(
        "Failed to execute transaction",
        { error, transaction }
      );
    }
  }
  /**
   * Execute multiple transactions in batch
   */
  async executeBatch(batch, signature) {
    try {
      const destinations = batch.transactions.map((tx) => tx.to);
      const values = batch.transactions.map((tx) => tx.value);
      const datas = batch.transactions.map((tx) => tx.data);
      const callData = this.contract.interface.encodeFunctionData("executeBatch", [
        destinations,
        values,
        datas
      ]);
      const batchTransaction = {
        to: this.address,
        value: 0n,
        data: callData,
        operation: 0
      };
      return this.execute(batchTransaction, signature);
    } catch (error) {
      throw new ContractError(
        "Failed to execute batch transaction",
        { error, batch }
      );
    }
  }
};
var MultiSigAccount = class extends BaseAccount {
  contract;
  threshold;
  signers;
  constructor(provider, address, entryPointAddress, threshold, signers) {
    super(provider, address, entryPointAddress);
    this.contract = new ethers.ethers.Contract(address, MULTI_SIG_ACCOUNT_ABI, provider);
    this.threshold = threshold;
    this.signers = signers;
  }
  /**
   * Get current signers and threshold
   */
  async getSignerInfo() {
    try {
      return {
        signers: this.signers,
        threshold: this.threshold
      };
    } catch (error) {
      throw new ContractError(
        "Failed to get signer info",
        { error, address: this.address }
      );
    }
  }
  /**
   * Add a new signer to the multi-sig account
   */
  async addSigner(newSigner, signatures) {
    if (signatures.length < this.threshold) {
      throw new ValidationError(
        `Insufficient signatures: need ${this.threshold}, got ${signatures.length}`
      );
    }
    try {
      const callData = this.contract.interface.encodeFunctionData("addSigner", [
        newSigner
      ]);
      const transaction = {
        to: this.address,
        value: 0n,
        data: callData,
        operation: 0
      };
      const combinedSignature = this.combineSignatures(signatures);
      return this.execute(transaction, combinedSignature);
    } catch (error) {
      throw new ContractError(
        "Failed to add signer",
        { error, newSigner, signatures }
      );
    }
  }
  /**
   * Remove a signer from the multi-sig account
   */
  async removeSigner(signerToRemove, signatures) {
    if (signatures.length < this.threshold) {
      throw new ValidationError(
        `Insufficient signatures: need ${this.threshold}, got ${signatures.length}`
      );
    }
    try {
      const callData = this.contract.interface.encodeFunctionData("removeSigner", [
        signerToRemove
      ]);
      const transaction = {
        to: this.address,
        value: 0n,
        data: callData,
        operation: 0
      };
      const combinedSignature = this.combineSignatures(signatures);
      return this.execute(transaction, combinedSignature);
    } catch (error) {
      throw new ContractError(
        "Failed to remove signer",
        { error, signerToRemove, signatures }
      );
    }
  }
  /**
   * Change the signature threshold
   */
  async changeThreshold(newThreshold, signatures) {
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
      const callData = this.contract.interface.encodeFunctionData("changeThreshold", [
        newThreshold
      ]);
      const transaction = {
        to: this.address,
        value: 0n,
        data: callData,
        operation: 0
      };
      const combinedSignature = this.combineSignatures(signatures);
      const result = await this.execute(transaction, combinedSignature);
      this.threshold = newThreshold;
      return result;
    } catch (error) {
      throw new ContractError(
        "Failed to change threshold",
        { error, newThreshold, signatures }
      );
    }
  }
  /**
   * Build UserOperation for multi-sig account
   */
  async buildUserOperation(transaction, options = {}) {
    try {
      const nonce = options.nonce ?? await this.getNonce();
      const gasEstimation = await this.estimateGas(transaction);
      const callData = this.contract.interface.encodeFunctionData("execute", [
        transaction.to,
        transaction.value,
        transaction.data
      ]);
      return {
        sender: this.address,
        nonce,
        initCode: "0x",
        // Account already deployed
        callData,
        callGasLimit: options.gasLimits?.gasLimit ?? gasEstimation.gasLimit,
        verificationGasLimit: CONTRACT_GAS_LIMITS.MULTI_SIG_ACCOUNT_DEPLOY / 5n,
        preVerificationGas: 21000n,
        maxFeePerGas: options.gasLimits?.maxFeePerGas ?? gasEstimation.maxFeePerGas ?? 0n,
        maxPriorityFeePerGas: options.gasLimits?.maxPriorityFeePerGas ?? gasEstimation.maxPriorityFeePerGas ?? 0n,
        paymasterAndData: options.paymasterData ?? "0x",
        signature: "0x"
        // Will be filled by the signer
      };
    } catch (error) {
      throw new ContractError(
        "Failed to build UserOperation for multi-sig account",
        { error, transaction }
      );
    }
  }
  /**
   * Execute with multi-sig verification
   */
  async execute(transaction, signature) {
    try {
      const userOp = await this.buildUserOperation(transaction);
      userOp.signature = signature;
      const txHash = ethers.ethers.keccak256(
        ethers.ethers.toUtf8Bytes(JSON.stringify(userOp))
      );
      return {
        txHash,
        blockNumber: await this.provider.getBlockNumber(),
        gasUsed: userOp.callGasLimit,
        status: "SUCCESS"
      };
    } catch (error) {
      throw new ContractError(
        "Failed to execute multi-sig transaction",
        { error, transaction }
      );
    }
  }
  /**
   * Execute batch with multi-sig verification
   */
  async executeBatch(batch, signature) {
    try {
      const destinations = batch.transactions.map((tx) => tx.to);
      const values = batch.transactions.map((tx) => tx.value);
      const datas = batch.transactions.map((tx) => tx.data);
      const callData = this.contract.interface.encodeFunctionData("executeBatch", [
        destinations,
        values,
        datas
      ]);
      const batchTransaction = {
        to: this.address,
        value: 0n,
        data: callData,
        operation: 0
      };
      return this.execute(batchTransaction, signature);
    } catch (error) {
      throw new ContractError(
        "Failed to execute multi-sig batch transaction",
        { error, batch }
      );
    }
  }
  /**
   * Combine multiple signatures into a single signature for multi-sig verification
   */
  combineSignatures(signatures) {
    const sortedSignatures = signatures.sort(
      (a, b) => a.signer.toLowerCase().localeCompare(b.signer.toLowerCase())
    );
    const combined = sortedSignatures.map((sig) => sig.signature.slice(2)).join("");
    return `0x${combined}`;
  }
};
var VerifyingPaymaster = class {
  provider;
  config;
  constructor(provider, config) {
    this.provider = provider;
    this.config = config;
  }
  /**
   * Generate paymaster data for a user operation
   */
  async generatePaymasterData(userOp, validUntil, validAfter) {
    try {
      const until = validUntil ?? this.config.validUntil;
      const after = validAfter ?? this.config.validAfter;
      const hash = await this.getPaymasterHash(userOp, until, after);
      const signature = await this.config.signer.signMessage(
        ethers.ethers.getBytes(hash)
      );
      const paymasterData = ethers.ethers.solidityPacked(
        ["address", "uint48", "uint48", "bytes"],
        [this.config.address, until, after, signature]
      );
      return paymasterData;
    } catch (error) {
      throw new ContractError(
        "Failed to generate paymaster data",
        { error, userOp }
      );
    }
  }
  /**
   * Verify if a user operation can be sponsored
   */
  async canSponsor(userOp) {
    try {
      const balance = await this.getBalance();
      const estimatedCost = this.estimateOperationCost(userOp);
      if (balance < estimatedCost) {
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  }
  /**
   * Get the paymaster's balance in the EntryPoint
   */
  async getBalance() {
    try {
      const entryPointContract = new ethers.ethers.Contract(
        "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
        // Standard EntryPoint address
        ["function balanceOf(address) view returns (uint256)"],
        this.provider
      );
      const balanceOfMethod = entryPointContract["balanceOf"];
      if (!balanceOfMethod) {
        throw new Error("balanceOf method not found on contract");
      }
      return await balanceOfMethod(this.config.address);
    } catch (error) {
      throw new ContractError(
        "Failed to get paymaster balance",
        { error, address: this.config.address }
      );
    }
  }
  /**
   * Deposit funds to the paymaster's EntryPoint balance
   */
  async deposit(amount) {
    try {
      const entryPointContract = new ethers.ethers.Contract(
        "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
        ["function depositTo(address) payable"],
        this.config.signer
      );
      const depositToMethod = entryPointContract["depositTo"];
      if (!depositToMethod) {
        throw new Error("depositTo method not found on contract");
      }
      const tx = await depositToMethod(this.config.address, {
        value: amount
      });
      return tx.hash;
    } catch (error) {
      throw new ContractError(
        "Failed to deposit to paymaster",
        { error, amount }
      );
    }
  }
  /**
   * Withdraw funds from the paymaster's EntryPoint balance
   */
  async withdraw(amount, to) {
    try {
      const entryPointContract = new ethers.ethers.Contract(
        "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
        ["function withdrawTo(address, uint256)"],
        this.config.signer
      );
      const withdrawToMethod = entryPointContract["withdrawTo"];
      if (!withdrawToMethod) {
        throw new Error("withdrawTo method not found on contract");
      }
      const tx = await withdrawToMethod(to, amount);
      return tx.hash;
    } catch (error) {
      throw new ContractError(
        "Failed to withdraw from paymaster",
        { error, amount, to }
      );
    }
  }
  /**
   * Update paymaster configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
  /**
   * Get the current paymaster configuration
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Get the hash that needs to be signed for paymaster verification
   */
  async getPaymasterHash(userOp, validUntil, validAfter) {
    try {
      const encoded = ethers.ethers.solidityPacked(
        ["address", "uint256", "bytes32", "uint48", "uint48"],
        [
          userOp.sender,
          userOp.nonce,
          ethers.ethers.keccak256(userOp.callData),
          validUntil,
          validAfter
        ]
      );
      return ethers.ethers.keccak256(encoded);
    } catch (error) {
      throw new ContractError(
        "Failed to get paymaster hash",
        { error, userOp, validUntil, validAfter }
      );
    }
  }
  /**
   * Estimate the cost of sponsoring a user operation
   */
  estimateOperationCost(userOp) {
    const totalGas = userOp.callGasLimit + userOp.verificationGasLimit + userOp.preVerificationGas;
    const gasPrice = userOp.maxFeePerGas;
    return totalGas * gasPrice;
  }
};
var PaymasterFactory = class {
  provider;
  constructor(provider) {
    this.provider = provider;
  }
  /**
   * Create a new VerifyingPaymaster instance
   */
  createVerifyingPaymaster(config) {
    return new VerifyingPaymaster(this.provider, config);
  }
  /**
   * Deploy a new paymaster contract
   */
  async deployPaymaster(deployer, entryPointAddress, owner) {
    try {
      const factory = new ethers.ethers.ContractFactory(
        VERIFYING_PAYMASTER_ABI,
        "0x",
        // Bytecode would be here
        deployer
      );
      const contract = await factory.deploy(entryPointAddress, owner);
      await contract.waitForDeployment();
      return {
        address: await contract.getAddress(),
        txHash: contract.deploymentTransaction()?.hash ?? ""
      };
    } catch (error) {
      throw new ContractError(
        "Failed to deploy paymaster",
        { error, entryPointAddress, owner }
      );
    }
  }
};
var SimpleAccountFactory = class {
  provider;
  config;
  contract;
  constructor(provider, config) {
    this.provider = provider;
    this.config = config;
    this.contract = new ethers.ethers.Contract(
      config.factoryAddress,
      [
        "function createAccount(address owner, uint256 salt) returns (address)",
        "function getAddress(address owner, uint256 salt) view returns (address)"
      ],
      provider
    );
  }
  /**
   * Calculate the counterfactual address for a simple account
   */
  async getAccountAddress(owner, salt) {
    try {
      const result = await this.contract.getFunction("getAddress")(owner, salt);
      return result;
    } catch (error) {
      throw new ContractError(
        "Failed to get account address",
        { error, owner, salt }
      );
    }
  }
  /**
   * Deploy a new simple account
   */
  async deployAccount(owner, salt, signer) {
    try {
      const accountAddress = await this.getAccountAddress(owner, salt);
      const code = await this.provider.getCode(accountAddress);
      if (code !== "0x") {
        return {
          accountAddress,
          txHash: "",
          isNewDeployment: false
        };
      }
      if (!signer) {
        throw new ContractError("Signer required for deployment");
      }
      const factoryWithSigner = this.contract.connect(signer);
      const tx = await factoryWithSigner.getFunction("createAccount")(owner, salt);
      await tx.wait();
      return {
        accountAddress,
        txHash: tx.hash,
        isNewDeployment: true
      };
    } catch (error) {
      throw new ContractError(
        "Failed to deploy account",
        { error, owner, salt }
      );
    }
  }
  /**
   * Create a SimpleAccount instance
   */
  createAccountInstance(accountAddress) {
    return new SimpleAccount(
      this.provider,
      accountAddress,
      this.config.entryPointAddress
    );
  }
  /**
   * Get the init code for account deployment
   */
  async getInitCode(owner, salt) {
    try {
      const initCallData = this.contract.interface.encodeFunctionData(
        "createAccount",
        [owner, salt]
      );
      return `${this.config.factoryAddress}${initCallData.slice(2)}`;
    } catch (error) {
      throw new ContractError(
        "Failed to get init code",
        { error, owner, salt }
      );
    }
  }
};
var MultiSigAccountFactory = class {
  provider;
  config;
  contract;
  constructor(provider, config) {
    this.provider = provider;
    this.config = config;
    this.contract = new ethers.ethers.Contract(
      config.factoryAddress,
      [
        "function createAccount(address[] owners, uint256 threshold, uint256 salt) returns (address)",
        "function getAddress(address[] owners, uint256 threshold, uint256 salt) view returns (address)"
      ],
      provider
    );
  }
  /**
   * Calculate the counterfactual address for a multi-sig account
   */
  async getAccountAddress(owners, threshold, salt) {
    try {
      const result = await this.contract.getFunction("getAddress")(owners, threshold, salt);
      return result;
    } catch (error) {
      throw new ContractError(
        "Failed to get multi-sig account address",
        { error, owners, threshold, salt }
      );
    }
  }
  /**
   * Deploy a new multi-sig account
   */
  async deployAccount(owners, threshold, salt, signer) {
    try {
      if (owners.length === 0) {
        throw new ContractError("At least one owner required");
      }
      if (threshold > owners.length) {
        throw new ContractError("Threshold cannot exceed number of owners");
      }
      if (threshold === 0) {
        throw new ContractError("Threshold must be greater than 0");
      }
      const accountAddress = await this.getAccountAddress(owners, threshold, salt);
      const code = await this.provider.getCode(accountAddress);
      if (code !== "0x") {
        return {
          accountAddress,
          txHash: "",
          isNewDeployment: false
        };
      }
      if (!signer) {
        throw new ContractError("Signer required for deployment");
      }
      const factoryWithSigner = this.contract.connect(signer);
      const tx = await factoryWithSigner.getFunction("createAccount")(owners, threshold, salt);
      await tx.wait();
      return {
        accountAddress,
        txHash: tx.hash,
        isNewDeployment: true
      };
    } catch (error) {
      throw new ContractError(
        "Failed to deploy multi-sig account",
        { error, owners, threshold, salt }
      );
    }
  }
  /**
   * Create a MultiSigAccount instance
   */
  createAccountInstance(accountAddress, threshold, signers) {
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
  async getInitCode(owners, threshold, salt) {
    try {
      const initCallData = this.contract.interface.encodeFunctionData(
        "createAccount",
        [owners, threshold, salt]
      );
      return `${this.config.factoryAddress}${initCallData.slice(2)}`;
    } catch (error) {
      throw new ContractError(
        "Failed to get multi-sig init code",
        { error, owners, threshold, salt }
      );
    }
  }
};
var AccountFactoryManager = class {
  provider;
  constructor(provider) {
    this.provider = provider;
  }
  /**
   * Create a SimpleAccountFactory instance
   */
  createSimpleAccountFactory(config) {
    return new SimpleAccountFactory(this.provider, config);
  }
  /**
   * Create a MultiSigAccountFactory instance
   */
  createMultiSigAccountFactory(config) {
    return new MultiSigAccountFactory(this.provider, config);
  }
};
var EntryPointClient = class {
  provider;
  address;
  contract;
  constructor(provider, address) {
    this.provider = provider;
    this.address = address;
    this.contract = new ethers.ethers.Contract(address, ENTRY_POINT_ABI, provider);
  }
  /**
   * Get the EntryPoint contract address
   */
  getAddress() {
    return this.address;
  }
  /**
   * Calculate the hash of a UserOperation
   */
  async getUserOpHash(userOp) {
    try {
      const result = await this.contract.getFunction("getUserOpHash")(userOp);
      return result;
    } catch (error) {
      throw new ContractError(
        "Failed to get UserOperation hash",
        { error, userOp }
      );
    }
  }
  /**
   * Handle a batch of UserOperations (submit to bundler)
   */
  async handleOps(userOps, beneficiary, signer) {
    try {
      const contractWithSigner = this.contract.connect(signer);
      const tx = await contractWithSigner.getFunction("handleOps")(userOps, beneficiary);
      return tx.hash;
    } catch (error) {
      throw new ContractError(
        "Failed to handle UserOperations",
        { error, userOps, beneficiary }
      );
    }
  }
  /**
   * Simulate a UserOperation to check for validation errors
   */
  async simulateValidation(userOp) {
    try {
      return {
        preOpGas: 50000n,
        prefund: userOp.callGasLimit * userOp.maxFeePerGas,
        sigFailed: false,
        validAfter: 0,
        validUntil: Math.floor(Date.now() / 1e3) + 3600
        // 1 hour from now
      };
    } catch (error) {
      throw new ContractError(
        "Failed to simulate validation",
        { error, userOp }
      );
    }
  }
  /**
   * Get the deposit balance for an account
   */
  async balanceOf(account) {
    try {
      const balanceContract = new ethers.ethers.Contract(
        this.address,
        ["function balanceOf(address) view returns (uint256)"],
        this.provider
      );
      const result = await balanceContract.getFunction("balanceOf")(account);
      return result;
    } catch (error) {
      throw new ContractError(
        "Failed to get balance",
        { error, account }
      );
    }
  }
  /**
   * Deposit ETH for an account
   */
  async depositTo(account, amount, signer) {
    try {
      const depositContract = new ethers.ethers.Contract(
        this.address,
        ["function depositTo(address) payable"],
        signer
      );
      const tx = await depositContract.getFunction("depositTo")(account, { value: amount });
      return tx.hash;
    } catch (error) {
      throw new ContractError(
        "Failed to deposit",
        { error, account, amount }
      );
    }
  }
  /**
   * Withdraw ETH from an account's deposit
   */
  async withdrawTo(withdrawAddress, amount, signer) {
    try {
      const withdrawContract = new ethers.ethers.Contract(
        this.address,
        ["function withdrawTo(address, uint256)"],
        signer
      );
      const tx = await withdrawContract.getFunction("withdrawTo")(withdrawAddress, amount);
      return tx.hash;
    } catch (error) {
      throw new ContractError(
        "Failed to withdraw",
        { error, withdrawAddress, amount }
      );
    }
  }
  /**
   * Get the nonce for an account
   */
  async getNonce(account, key = 0n) {
    try {
      const nonceContract = new ethers.ethers.Contract(
        this.address,
        ["function getNonce(address, uint192) view returns (uint256)"],
        this.provider
      );
      const result = await nonceContract.getFunction("getNonce")(account, key);
      return result;
    } catch (error) {
      throw new ContractError(
        "Failed to get nonce",
        { error, account, key }
      );
    }
  }
  /**
   * Check if an operation is valid
   */
  async validateUserOp(userOp) {
    try {
      if (!userOp.sender || !ethers.ethers.isAddress(userOp.sender)) {
        return false;
      }
      if (userOp.nonce < 0n) {
        return false;
      }
      if (userOp.callGasLimit < 0n || userOp.verificationGasLimit < 0n) {
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  }
  /**
   * Estimate gas for a UserOperation
   */
  async estimateUserOpGas(userOp) {
    try {
      const baseGas = 21000n;
      const callDataGas = BigInt(userOp.callData.length - 2) * 16n / 2n;
      return {
        callGasLimit: baseGas + callDataGas + 50000n,
        verificationGasLimit: 100000n,
        preVerificationGas: 21000n
      };
    } catch (error) {
      throw new ContractError(
        "Failed to estimate gas",
        { error, userOp }
      );
    }
  }
};
var ContractsClient = class {
  provider;
  config;
  entryPoint;
  accountFactoryManager;
  paymasterFactory;
  signer;
  constructor(config) {
    this.config = config;
    this.provider = new ethers.ethers.JsonRpcProvider(config.network.rpcUrl);
    if (config.signer) {
      this.signer = config.signer.connect(this.provider);
    }
    const entryPointAddress = this.getContractAddress("entryPoint");
    this.entryPoint = new EntryPointClient(this.provider, entryPointAddress);
    this.accountFactoryManager = new AccountFactoryManager(this.provider);
    this.paymasterFactory = new PaymasterFactory(this.provider);
  }
  /**
   * Get contract address for the current network
   */
  getContractAddress(contractType) {
    const chainId = this.config.network.chainId;
    const addresses = DEFAULT_CONTRACT_ADDRESSES[chainId];
    if (!addresses) {
      throw new ConfigError(
        `No contract addresses configured for chain ID ${chainId}`
      );
    }
    switch (contractType) {
      case "entryPoint":
        return this.config.entryPointAddress ?? addresses.entryPoint;
      case "simpleAccountFactory":
        return this.config.simpleAccountFactoryAddress ?? addresses.simpleAccountFactory;
      case "multiSigAccountFactory":
        return this.config.multiSigAccountFactoryAddress ?? addresses.multiSigAccountFactory;
      case "verifyingPaymaster":
        return this.config.verifyingPaymasterAddress ?? addresses.verifyingPaymaster;
      default:
        throw new ConfigError(`Unknown contract type: ${contractType}`);
    }
  }
  /**
   * Create a simple account factory
   */
  createSimpleAccountFactory() {
    const factoryAddress = this.getContractAddress("simpleAccountFactory");
    const entryPointAddress = this.getContractAddress("entryPoint");
    return this.accountFactoryManager.createSimpleAccountFactory({
      factoryAddress,
      entryPointAddress,
      implementationAddress: factoryAddress
      // Simplified for demo
    });
  }
  /**
   * Create a multi-sig account factory
   */
  createMultiSigAccountFactory() {
    const factoryAddress = this.getContractAddress("multiSigAccountFactory");
    const entryPointAddress = this.getContractAddress("entryPoint");
    return this.accountFactoryManager.createMultiSigAccountFactory({
      factoryAddress,
      entryPointAddress,
      implementationAddress: factoryAddress
      // Simplified for demo
    });
  }
  /**
   * Create a verifying paymaster
   */
  createVerifyingPaymaster(signer) {
    if (!signer) {
      throw new ConfigError("Signer required for paymaster operations");
    }
    const paymasterAddress = this.getContractAddress("verifyingPaymaster");
    return this.paymasterFactory.createVerifyingPaymaster({
      address: paymasterAddress,
      signer: signer.connect(this.provider),
      validUntil: Math.floor(Date.now() / 1e3) + 3600,
      // 1 hour
      validAfter: Math.floor(Date.now() / 1e3) - 60
      // 1 minute ago
    });
  }
  /**
   * Deploy a new simple account
   */
  async deploySimpleAccount(owner, salt = 0n) {
    if (!this.signer) {
      throw new ConfigError("Signer required for account deployment");
    }
    const factory = this.createSimpleAccountFactory();
    const result = await factory.deployAccount(owner, salt, this.signer);
    return factory.createAccountInstance(result.accountAddress);
  }
  /**
   * Deploy a new multi-sig account
   */
  async deployMultiSigAccount(owners, threshold, salt = 0n) {
    if (!this.signer) {
      throw new ConfigError("Signer required for account deployment");
    }
    const factory = this.createMultiSigAccountFactory();
    const result = await factory.deployAccount(owners, threshold, salt, this.signer);
    return factory.createAccountInstance(result.accountAddress, threshold, owners);
  }
  /**
   * Get an existing simple account instance
   */
  getSimpleAccount(accountAddress) {
    const entryPointAddress = this.getContractAddress("entryPoint");
    return new SimpleAccount(this.provider, accountAddress, entryPointAddress);
  }
  /**
   * Get an existing multi-sig account instance
   */
  getMultiSigAccount(accountAddress, threshold, signers) {
    const entryPointAddress = this.getContractAddress("entryPoint");
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
  async executeTransaction(account, transaction, signature, usePaymaster = false) {
    try {
      let userOp = await account.buildUserOperation(transaction);
      if (usePaymaster && this.signer) {
        const paymaster = this.createVerifyingPaymaster(this.signer);
        const paymasterData = await paymaster.generatePaymasterData(userOp);
        userOp.paymasterAndData = paymasterData;
      }
      userOp.signature = signature;
      if (!this.signer) {
        throw new ConfigError("Signer required for transaction execution");
      }
      return await this.entryPoint.handleOps([userOp], this.signer.address, this.signer);
    } catch (error) {
      throw new ContractError(
        "Failed to execute transaction",
        { error, transaction }
      );
    }
  }
  /**
   * Execute a batch of transactions
   */
  async executeBatchTransaction(account, batch, signature, usePaymaster = false) {
    try {
      if (usePaymaster && !this.signer) {
        throw new ConfigError("Signer required for paymaster operations");
      }
      const result = await account.executeBatch(batch, signature);
      return result.txHash;
    } catch (error) {
      throw new ContractError(
        "Failed to execute batch transaction",
        { error, batch }
      );
    }
  }
  /**
   * Estimate gas for a user operation
   */
  async estimateUserOpGas(userOp) {
    return this.entryPoint.estimateUserOpGas(userOp);
  }
  /**
   * Get the hash of a user operation
   */
  async getUserOpHash(userOp) {
    return this.entryPoint.getUserOpHash(userOp);
  }
  /**
   * Validate a user operation
   */
  async validateUserOp(userOp) {
    return this.entryPoint.validateUserOp(userOp);
  }
  /**
   * Get account balance in the EntryPoint
   */
  async getAccountBalance(account) {
    return this.entryPoint.balanceOf(account);
  }
  /**
   * Deposit ETH for an account
   */
  async depositForAccount(account, amount) {
    if (!this.signer) {
      throw new ConfigError("Signer required for deposits");
    }
    return this.entryPoint.depositTo(account, amount, this.signer);
  }
  /**
   * Withdraw ETH from an account
   */
  async withdrawFromAccount(withdrawAddress, amount) {
    if (!this.signer) {
      throw new ConfigError("Signer required for withdrawals");
    }
    return this.entryPoint.withdrawTo(withdrawAddress, amount, this.signer);
  }
  /**
   * Get the current network configuration
   */
  getNetworkConfig() {
    return this.config.network;
  }
  /**
   * Update the signer
   */
  updateSigner(signer) {
    this.signer = signer.connect(this.provider);
  }
  /**
   * Get the EntryPoint client
   */
  getEntryPoint() {
    return this.entryPoint;
  }
};

exports.AccountFactoryManager = AccountFactoryManager;
exports.AccountOperationResultSchema = AccountOperationResultSchema;
exports.BaseAccount = BaseAccount;
exports.CONTRACT_GAS_LIMITS = CONTRACT_GAS_LIMITS;
exports.ContractCallConfigSchema = ContractCallConfigSchema;
exports.ContractDeployConfigSchema = ContractDeployConfigSchema;
exports.ContractEventSchema = ContractEventSchema;
exports.ContractsClient = ContractsClient;
exports.DEFAULT_CONTRACT_ADDRESSES = DEFAULT_CONTRACT_ADDRESSES;
exports.ENTRY_POINT_ABI = ENTRY_POINT_ABI;
exports.EntryPointClient = EntryPointClient;
exports.EventFilterSchema = EventFilterSchema;
exports.FUNCTION_SELECTORS = FUNCTION_SELECTORS;
exports.GasEstimationSchema = GasEstimationSchema;
exports.MULTI_SIG_ACCOUNT_ABI = MULTI_SIG_ACCOUNT_ABI;
exports.MultiSigAccount = MultiSigAccount;
exports.MultiSigAccountFactory = MultiSigAccountFactory;
exports.PaymasterFactory = PaymasterFactory;
exports.SIMPLE_ACCOUNT_ABI = SIMPLE_ACCOUNT_ABI;
exports.SignatureDataSchema = SignatureDataSchema;
exports.SimpleAccount = SimpleAccount;
exports.SimpleAccountFactory = SimpleAccountFactory;
exports.VERIFYING_PAYMASTER_ABI = VERIFYING_PAYMASTER_ABI;
exports.VerifyingPaymaster = VerifyingPaymaster;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map