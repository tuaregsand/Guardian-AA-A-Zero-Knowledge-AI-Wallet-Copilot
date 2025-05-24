import { ethers } from 'ethers';
import { sha256 } from '@noble/hashes/sha256';

// src/utils/validation.ts
function isValidAddress(address) {
  if (!address.startsWith("0x") || address.length !== 42) {
    return false;
  }
  return ethers.isAddress(address);
}
function isValidHexString(hex) {
  return /^0x[a-fA-F0-9]*$/.test(hex);
}
function isValidHexLength(hex, expectedLength) {
  if (!isValidHexString(hex)) return false;
  return hex.length === 2 + expectedLength * 2;
}
function isValidTxHash(hash) {
  return isValidHexLength(hash, 32);
}
function isValidSignature(signature) {
  return isValidHexLength(signature, 65);
}
function isValidUserOperation(userOp) {
  const requiredFields = [
    "sender",
    "nonce",
    "initCode",
    "callData",
    "callGasLimit",
    "verificationGasLimit",
    "preVerificationGas",
    "maxFeePerGas",
    "maxPriorityFeePerGas",
    "paymasterAndData",
    "signature"
  ];
  for (const field of requiredFields) {
    if (userOp[field] === void 0 || userOp[field] === null) {
      return false;
    }
  }
  if (!isValidAddress(userOp.sender)) return false;
  if (typeof userOp.nonce !== "bigint") return false;
  if (!isValidHexString(userOp.initCode)) return false;
  if (!isValidHexString(userOp.callData)) return false;
  if (!isValidHexString(userOp.paymasterAndData)) return false;
  if (!isValidHexString(userOp.signature)) return false;
  if (userOp.callGasLimit < 0n) return false;
  if (userOp.verificationGasLimit < 0n) return false;
  if (userOp.preVerificationGas < 0n) return false;
  if (userOp.maxFeePerGas < 0n) return false;
  if (userOp.maxPriorityFeePerGas < 0n) return false;
  return true;
}
function isSupportedChainId(chainId) {
  const supportedChains = [1, 11155111, 137, 80001, 42161, 421614, 10, 11155420];
  return supportedChains.includes(chainId);
}
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
function isValidPrivateKey(privateKey) {
  if (!privateKey.startsWith("0x") || privateKey.length !== 66) {
    return false;
  }
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
function isValidMnemonic(mnemonic) {
  try {
    ethers.Mnemonic.fromPhrase(mnemonic);
    return true;
  } catch {
    return false;
  }
}
function isValidAmount(amount) {
  return amount >= 0n;
}
function isValidGasLimit(gasLimit) {
  const MIN_GAS = 21000n;
  const MAX_GAS = 30000000n;
  return gasLimit >= MIN_GAS && gasLimit <= MAX_GAS;
}
function isValidGasPrice(gasPrice) {
  const MIN_GAS_PRICE = 1n;
  const MAX_GAS_PRICE = 1000000000000n;
  return gasPrice >= MIN_GAS_PRICE && gasPrice <= MAX_GAS_PRICE;
}
function isValidThreshold(threshold, totalSigners) {
  return threshold > 0 && threshold <= totalSigners;
}
function areValidUniqueAddresses(addresses) {
  if (addresses.length === 0) return false;
  const uniqueAddresses = new Set(addresses.map((addr) => addr.toLowerCase()));
  if (uniqueAddresses.size !== addresses.length) return false;
  return addresses.every(isValidAddress);
}
function isValidSalt(salt) {
  return salt >= 0n;
}
function validateAccountDeployment(params) {
  const errors = [];
  if (params.owner && !isValidAddress(params.owner)) {
    errors.push("Invalid owner address");
  }
  if (params.owners) {
    if (!areValidUniqueAddresses(params.owners)) {
      errors.push("Invalid or duplicate owner addresses");
    }
    if (params.threshold && !isValidThreshold(params.threshold, params.owners.length)) {
      errors.push("Invalid threshold for number of owners");
    }
  }
  if (params.salt !== void 0 && !isValidSalt(params.salt)) {
    errors.push("Invalid salt value");
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}
function formatAddress(address) {
  return ethers.getAddress(address);
}
function truncateAddress(address, startChars = 6, endChars = 4) {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}
function formatHexString(hex) {
  if (!hex.startsWith("0x")) {
    return `0x${hex}`;
  }
  return hex;
}
function formatEther(wei, decimals = 4) {
  return parseFloat(ethers.formatEther(wei)).toFixed(decimals);
}
function formatGwei(wei, decimals = 2) {
  return parseFloat(ethers.formatUnits(wei, "gwei")).toFixed(decimals);
}
function parseEther(ether) {
  return ethers.parseEther(ether);
}
function parseGwei(gwei) {
  return ethers.parseUnits(gwei, "gwei");
}
function formatLargeNumber(num) {
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
function formatTimestamp(timestamp) {
  return new Date(timestamp * 1e3).toLocaleString();
}
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }
  if (seconds < 86400) {
    const hours2 = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    return `${hours2}h ${minutes}m`;
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds % 86400 / 3600);
  return `${days}d ${hours}h`;
}
function formatGas(gas) {
  const gasNumber = Number(gas);
  if (gasNumber >= 1e6) {
    return `${(gasNumber / 1e6).toFixed(2)}M`;
  }
  if (gasNumber >= 1e3) {
    return `${(gasNumber / 1e3).toFixed(2)}K`;
  }
  return gasNumber.toString();
}
function formatPercentage(value, decimals = 2) {
  return `${(value * 100).toFixed(decimals)}%`;
}
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
function formatTxHash(hash, startChars = 10, endChars = 8) {
  return truncateAddress(hash, startChars, endChars);
}
function formatChainId(chainId) {
  const networks = {
    1: "Ethereum Mainnet",
    11155111: "Ethereum Sepolia",
    137: "Polygon Mainnet",
    80001: "Polygon Mumbai",
    42161: "Arbitrum One",
    421614: "Arbitrum Sepolia",
    10: "Optimism Mainnet",
    11155420: "Optimism Sepolia"
  };
  return networks[chainId] ?? `Chain ${chainId}`;
}
function formatUserOperation(userOp) {
  return JSON.stringify({
    sender: truncateAddress(userOp.sender),
    nonce: userOp.nonce.toString(),
    callData: truncateAddress(userOp.callData, 10, 10),
    callGasLimit: formatGas(userOp.callGasLimit),
    verificationGasLimit: formatGas(userOp.verificationGasLimit),
    maxFeePerGas: formatGwei(userOp.maxFeePerGas),
    signature: userOp.signature ? truncateAddress(userOp.signature, 10, 10) : "none"
  }, null, 2);
}
function padHex(hex, length) {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const padded = cleanHex.padStart(length * 2, "0");
  return `0x${padded}`;
}
function numberToHex(num) {
  return `0x${num.toString(16)}`;
}
function hexToNumber(hex) {
  return parseInt(hex, 16);
}
function formatError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error occurred";
}
function generatePrivateKey() {
  return ethers.Wallet.createRandom().privateKey;
}
function generateMnemonic() {
  return ethers.Wallet.createRandom().mnemonic?.phrase ?? "";
}
function privateKeyToAddress(privateKey) {
  const wallet = new ethers.Wallet(privateKey);
  return wallet.address;
}
function publicKeyToAddress(publicKey) {
  return ethers.computeAddress(publicKey);
}
async function signMessage(message, privateKey) {
  const wallet = new ethers.Wallet(privateKey);
  return await wallet.signMessage(message);
}
function verifySignature(message, signature, address) {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}
function recoverAddress(message, signature) {
  return ethers.verifyMessage(message, signature);
}
function hashSHA256(data) {
  return sha256(data);
}
function hashKeccak256(data) {
  return ethers.keccak256(data);
}
function hashString(str) {
  return ethers.id(str);
}
function generateSalt(data) {
  const hash = hashString(data);
  return BigInt(hash);
}
function hashTypedData(domain, types, value) {
  return ethers.TypedDataEncoder.hash(domain, types, value);
}
async function signTypedData(privateKey, domain, types, value) {
  const wallet = new ethers.Wallet(privateKey);
  return await wallet.signTypedData(domain, types, value);
}
function verifyTypedData(domain, types, value, signature, address) {
  try {
    const recoveredAddress = ethers.verifyTypedData(domain, types, value, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}
function generateNonce() {
  return BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
}
function generateSecureSalt() {
  const randomBytes = ethers.randomBytes(32);
  return BigInt(ethers.hexlify(randomBytes));
}
function derivePrivateKey(masterKey, index) {
  const combined = `${masterKey}${index}`;
  const hash = hashString(combined);
  return hash;
}
function createWalletFromMnemonic(mnemonic, path = "m/44'/60'/0'/0/0") {
  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic, void 0, path);
  return new ethers.Wallet(hdNode.privateKey);
}
async function encryptPrivateKey(privateKey, password) {
  const wallet = new ethers.Wallet(privateKey);
  return await wallet.encrypt(password);
}
async function decryptPrivateKey(encryptedKey, password) {
  const wallet = await ethers.Wallet.fromEncryptedJson(encryptedKey, password);
  return wallet.privateKey;
}
function generateDeterministicAddress(factory, salt, initCodeHash) {
  const packed = ethers.solidityPacked(
    ["bytes1", "address", "uint256", "bytes32"],
    ["0xff", factory, salt, initCodeHash]
  );
  const hash = hashKeccak256(packed);
  return `0x${hash.slice(-40)}`;
}
function splitSignature(signature) {
  return ethers.Signature.from(signature);
}
function joinSignature(r, s, v) {
  const signature = ethers.Signature.from({ r, s, v });
  return signature.serialized;
}
function getUserOpHash(userOp, entryPoint, chainId) {
  const packed = ethers.solidityPacked(
    ["address", "uint256", "bytes32", "bytes32", "uint256", "uint256", "uint256", "uint256", "uint256", "bytes32"],
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
      hashKeccak256(userOp.paymasterAndData)
    ]
  );
  const opHash = hashKeccak256(packed);
  const finalPacked = ethers.solidityPacked(
    ["bytes32", "address", "uint256"],
    [opHash, entryPoint, chainId]
  );
  return hashKeccak256(finalPacked);
}

// src/utils/constants.ts
var SUPPORTED_NETWORKS = {
  ETHEREUM_MAINNET: {
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrl: "https://mainnet.infura.io/v3/",
    explorerUrl: "https://etherscan.io",
    currency: "ETH",
    isTestnet: false
  },
  ETHEREUM_SEPOLIA: {
    chainId: 11155111,
    name: "Ethereum Sepolia",
    rpcUrl: "https://sepolia.infura.io/v3/",
    explorerUrl: "https://sepolia.etherscan.io",
    currency: "ETH",
    isTestnet: true
  },
  POLYGON_MAINNET: {
    chainId: 137,
    name: "Polygon Mainnet",
    rpcUrl: "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
    currency: "MATIC",
    isTestnet: false
  },
  POLYGON_MUMBAI: {
    chainId: 80001,
    name: "Polygon Mumbai",
    rpcUrl: "https://rpc-mumbai.maticvigil.com",
    explorerUrl: "https://mumbai.polygonscan.com",
    currency: "MATIC",
    isTestnet: true
  },
  ARBITRUM_ONE: {
    chainId: 42161,
    name: "Arbitrum One",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    currency: "ETH",
    isTestnet: false
  },
  ARBITRUM_SEPOLIA: {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    explorerUrl: "https://sepolia.arbiscan.io",
    currency: "ETH",
    isTestnet: true
  },
  OPTIMISM_MAINNET: {
    chainId: 10,
    name: "Optimism Mainnet",
    rpcUrl: "https://mainnet.optimism.io",
    explorerUrl: "https://optimistic.etherscan.io",
    currency: "ETH",
    isTestnet: false
  },
  OPTIMISM_SEPOLIA: {
    chainId: 11155420,
    name: "Optimism Sepolia",
    rpcUrl: "https://sepolia.optimism.io",
    explorerUrl: "https://sepolia-optimistic.etherscan.io",
    currency: "ETH",
    isTestnet: true
  }
};
var ENTRYPOINT_ADDRESS_V06 = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
var GAS_LIMITS = {
  ACCOUNT_DEPLOYMENT: 1000000n,
  SIMPLE_EXECUTION: 35000n,
  MULTI_SIG_EXECUTION: 100000n,
  VERIFICATION_GAS: 70000n,
  PRE_VERIFICATION_GAS: 21000n,
  PAYMASTER_VERIFICATION: 50000n
};
var GAS_PRICES = {
  MIN_GAS_PRICE: 1000000000n,
  // 1 gwei
  MAX_GAS_PRICE: 1000000000000n,
  // 1000 gwei
  DEFAULT_GAS_PRICE: 20000000000n
  // 20 gwei
};
var UTILS_CONTRACT_ADDRESSES = {
  // Ethereum Sepolia
  [SUPPORTED_NETWORKS.ETHEREUM_SEPOLIA.chainId]: {
    entryPoint: ENTRYPOINT_ADDRESS_V06,
    accountFactory: "0x9406Cc6185a346906296840746125a0E44976454",
    multiSigFactory: "0x000000000000000000000000000000000000dEaD",
    verifyingPaymaster: "0x000000000000000000000000000000000000dEaD"
  },
  // Polygon Mumbai
  [SUPPORTED_NETWORKS.POLYGON_MUMBAI.chainId]: {
    entryPoint: ENTRYPOINT_ADDRESS_V06,
    accountFactory: "0x000000000000000000000000000000000000dEaD",
    multiSigFactory: "0x000000000000000000000000000000000000dEaD",
    verifyingPaymaster: "0x000000000000000000000000000000000000dEaD"
  }
};
var UTILS_ZK_CONSTANTS = {
  DEFAULT_CIRCUIT_K: 14,
  MIN_CIRCUIT_K: 10,
  MAX_CIRCUIT_K: 20,
  MAX_INPUT_SIZE: 1024 * 1024,
  // 1MB
  SHA256_HASH_SIZE: 32,
  TARGET_PROOF_TIME_MS: 500,
  MAX_PROOF_TIME_MS: 3e4,
  PROOF_CACHE_TTL_MS: 24 * 60 * 60 * 1e3
  // 24 hours
};
var VALIDATION_PATTERNS = {
  ETH_ADDRESS: /^0x[a-fA-F0-9]{40}$/,
  HEX_STRING: /^0x[a-fA-F0-9]*$/,
  TX_HASH: /^0x[a-fA-F0-9]{64}$/,
  PRIVATE_KEY: /^0x[a-fA-F0-9]{64}$/
};
var LIMITS = {
  MAX_TRANSACTION_SIZE: 128 * 1024,
  // 128KB
  MAX_BATCH_SIZE: 100,
  MAX_SIGNERS: 20,
  MIN_THRESHOLD: 1,
  MAX_NONCE: 2n ** 256n - 1n
};
var ERROR_MESSAGES = {
  INVALID_ADDRESS: "Invalid Ethereum address",
  INVALID_SIGNATURE: "Invalid signature format",
  INVALID_AMOUNT: "Amount must be positive",
  INSUFFICIENT_BALANCE: "Insufficient balance for operation",
  NETWORK_NOT_SUPPORTED: "Network not supported",
  TRANSACTION_FAILED: "Transaction execution failed",
  TIMEOUT_EXCEEDED: "Operation timeout exceeded",
  INVALID_CONFIGURATION: "Invalid configuration provided"
};
var TIME = {
  SECOND: 1,
  MINUTE: 60,
  HOUR: 3600,
  DAY: 86400,
  WEEK: 604800,
  MONTH: 2592e3,
  // 30 days
  YEAR: 31536e3
  // 365 days
};
var TIMEOUTS = {
  NETWORK_REQUEST: 1e4,
  // 10 seconds
  TRANSACTION_CONFIRMATION: 6e4,
  // 1 minute
  PROOF_GENERATION: 3e4,
  // 30 seconds
  CONTRACT_DEPLOYMENT: 12e4
  // 2 minutes
};
var FEATURE_FLAGS = {
  ENABLE_ZK_PROOFS: true,
  ENABLE_GASLESS_TRANSACTIONS: true,
  ENABLE_MULTI_SIG: true,
  ENABLE_SOCIAL_RECOVERY: false,
  // Future feature
  ENABLE_BATCH_TRANSACTIONS: true,
  ENABLE_CROSS_CHAIN: false
  // Future feature
};
var VERSION_INFO = {
  SDK_VERSION: "0.1.0",
  ERC_4337_VERSION: "0.6.0",
  SUPPORTED_SOLIDITY_VERSION: "^0.8.25",
  MIN_NODE_VERSION: "18.0.0"
};
var DEV_CONSTANTS = {
  LOCAL_CHAIN_ID: 31337,
  LOCAL_RPC_URL: "http://127.0.0.1:8545",
  TEST_PRIVATE_KEY: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  TEST_MNEMONIC: "test test test test test test test test test test test junk"
};

export { DEV_CONSTANTS, ENTRYPOINT_ADDRESS_V06, ERROR_MESSAGES, FEATURE_FLAGS, GAS_LIMITS, GAS_PRICES, LIMITS, SUPPORTED_NETWORKS, TIME, TIMEOUTS, UTILS_CONTRACT_ADDRESSES, UTILS_ZK_CONSTANTS, VALIDATION_PATTERNS, VERSION_INFO, areValidUniqueAddresses, createWalletFromMnemonic, decryptPrivateKey, derivePrivateKey, encryptPrivateKey, formatAddress, formatBytes, formatChainId, formatDuration, formatError, formatEther, formatGas, formatGwei, formatHexString, formatLargeNumber, formatPercentage, formatTimestamp, formatTxHash, formatUserOperation, generateDeterministicAddress, generateMnemonic, generateNonce, generatePrivateKey, generateSalt, generateSecureSalt, getUserOpHash, hashKeccak256, hashSHA256, hashString, hashTypedData, hexToNumber, isSupportedChainId, isValidAddress, isValidAmount, isValidGasLimit, isValidGasPrice, isValidHexLength, isValidHexString, isValidMnemonic, isValidPrivateKey, isValidSalt, isValidSignature, isValidThreshold, isValidTxHash, isValidUrl, isValidUserOperation, joinSignature, numberToHex, padHex, parseEther, parseGwei, privateKeyToAddress, publicKeyToAddress, recoverAddress, signMessage, signTypedData, splitSignature, truncateAddress, validateAccountDeployment, verifySignature, verifyTypedData };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map