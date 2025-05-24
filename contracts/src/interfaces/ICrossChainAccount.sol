// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title ICrossChainAccount
 * @notice Interface for cross-chain account abstraction
 * @dev Defines functionality for cross-chain operations
 */
interface ICrossChainAccount {
    /**
     * @notice Event emitted when a cross-chain operation is initiated
     * @param chainId Target chain ID
     * @param target Target address on destination chain
     * @param value Value to send
     * @param data Call data
     * @param nonce Operation nonce
     */
    event CrossChainOperationInitiated(
        uint256 indexed chainId,
        address indexed target,
        uint256 value,
        bytes data,
        uint256 nonce
    );

    /**
     * @notice Event emitted when a cross-chain operation is executed
     * @param chainId Source chain ID
     * @param nonce Operation nonce
     * @param success Whether the operation succeeded
     */
    event CrossChainOperationExecuted(
        uint256 indexed chainId,
        uint256 indexed nonce,
        bool success
    );

    /**
     * @notice Initiate a cross-chain operation
     * @param chainId Target chain ID
     * @param target Target address
     * @param value Value to send
     * @param data Call data
     * @return nonce The operation nonce
     */
    function initiateCrossChainOperation(
        uint256 chainId,
        address target,
        uint256 value,
        bytes calldata data
    ) external returns (uint256 nonce);

    /**
     * @notice Execute a cross-chain operation
     * @param sourceChainId Source chain ID
     * @param nonce Operation nonce
     * @param target Target address
     * @param value Value to send
     * @param data Call data
     * @param proof Merkle proof or signature
     */
    function executeCrossChainOperation(
        uint256 sourceChainId,
        uint256 nonce,
        address target,
        uint256 value,
        bytes calldata data,
        bytes calldata proof
    ) external;

    /**
     * @notice Get cross-chain operation status
     * @param chainId Chain ID
     * @param nonce Operation nonce
     * @return executed Whether the operation was executed
     * @return success Whether the operation succeeded
     */
    function getCrossChainOperationStatus(
        uint256 chainId,
        uint256 nonce
    ) external view returns (bool executed, bool success);
} 