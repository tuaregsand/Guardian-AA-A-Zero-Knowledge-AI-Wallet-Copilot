// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title UserOperation
 * @notice Struct and library for ERC-4337 user operations
 */
library UserOperationLib {
    /**
     * @notice User operation struct per ERC-4337
     * @param sender The account making the operation
     * @param nonce Anti-replay parameter (key, sequence)
     * @param initCode Packed factory address and calldata (for account creation)
     * @param callData The method call to execute on sender
     * @param callGasLimit Gas limit for the main execution call
     * @param verificationGasLimit Gas limit for the verification step
     * @param preVerificationGas Gas to compensate the bundler
     * @param maxFeePerGas Maximum fee per gas unit
     * @param maxPriorityFeePerGas Maximum priority fee per gas unit
     * @param paymasterAndData Paymaster address and extra data
     * @param signature Packed signature from the account
     */
    struct UserOperation {
        address sender;
        uint256 nonce;
        bytes initCode;
        bytes callData;
        uint256 callGasLimit;
        uint256 verificationGasLimit;
        uint256 preVerificationGas;
        uint256 maxFeePerGas;
        uint256 maxPriorityFeePerGas;
        bytes paymasterAndData;
        bytes signature;
    }

    /**
     * @notice Calculate the hash of a user operation
     * @param userOp The user operation
     * @return The hash of the user operation
     */
    function hash(UserOperation memory userOp) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                userOp.sender,
                userOp.nonce,
                keccak256(userOp.initCode),
                keccak256(userOp.callData),
                userOp.callGasLimit,
                userOp.verificationGasLimit,
                userOp.preVerificationGas,
                userOp.maxFeePerGas,
                userOp.maxPriorityFeePerGas,
                keccak256(userOp.paymasterAndData)
            )
        );
    }

    /**
     * @notice Pack the user operation hash with entry point and chain id
     * @param userOp The user operation
     * @param entryPoint The entry point address
     * @param chainId The chain id
     * @return The packed hash
     */
    function getUserOpHash(UserOperation memory userOp, address entryPoint, uint256 chainId)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(hash(userOp), entryPoint, chainId));
    }

    /**
     * @notice Unpack nonce into key and sequence
     * @param nonce The packed nonce
     * @return key The nonce key
     * @return sequence The nonce sequence
     */
    function unpackNonce(uint256 nonce) internal pure returns (uint192 key, uint64 sequence) {
        sequence = uint64(nonce);
        key = uint192(nonce >> 64);
    }

    /**
     * @notice Pack key and sequence into nonce
     * @param key The nonce key
     * @param sequence The nonce sequence
     * @return nonce The packed nonce
     */
    function packNonce(uint192 key, uint64 sequence) internal pure returns (uint256 nonce) {
        nonce = (uint256(key) << 64) | uint256(sequence);
    }
}
