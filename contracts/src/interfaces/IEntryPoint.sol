// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./UserOperation.sol";
import "./IStakeManager.sol";

/**
 * @title IEntryPoint
 * @notice Interface for the ERC-4337 EntryPoint contract
 */
interface IEntryPoint is IStakeManager {
    /**
     * @notice Error for failed operation
     * @param opIndex Index of the operation that failed
     * @param reason Failure reason
     */
    error FailedOp(uint256 opIndex, string reason);

    /**
     * @notice Error for failed operation with revert reason
     * @param opIndex Index of the operation that failed
     * @param reason Failure reason
     * @param inner Inner revert reason
     */
    error FailedOpWithRevert(uint256 opIndex, string reason, bytes inner);

    /**
     * @notice Event emitted before user operation execution
     * @param userOpHash Hash of the user operation
     * @param sender The account that initiated the operation
     * @param factory Factory used to create the account (if any)
     * @param paymaster Paymaster used for the operation (if any)
     */
    event BeforeExecution(
        bytes32 indexed userOpHash,
        address indexed sender,
        address indexed factory,
        address paymaster
    );

    /**
     * @notice Event emitted after user operation execution
     * @param userOpHash Hash of the user operation
     * @param sender The account that initiated the operation
     * @param paymaster Paymaster used for the operation (if any)
     * @param nonce Operation nonce
     * @param success Whether the operation succeeded
     * @param actualGasCost Actual gas cost of the operation
     * @param actualGasUsed Actual gas used by the operation
     */
    event UserOperationEvent(
        bytes32 indexed userOpHash,
        address indexed sender,
        address indexed paymaster,
        uint256 nonce,
        bool success,
        uint256 actualGasCost,
        uint256 actualGasUsed
    );

    /**
     * @notice Event emitted when a user operation reverts
     * @param userOpHash Hash of the user operation
     * @param sender The account that initiated the operation
     * @param nonce Operation nonce
     * @param revertReason The revert reason
     */
    event UserOperationRevertReason(
        bytes32 indexed userOpHash,
        address indexed sender,
        uint256 nonce,
        bytes revertReason
    );

    /**
     * @notice Event emitted when an account is deployed
     * @param userOpHash Hash of the user operation
     * @param sender The deployed account address
     * @param factory Factory used to deploy the account
     * @param paymaster Paymaster used for the operation (if any)
     */
    event AccountDeployed(
        bytes32 indexed userOpHash,
        address indexed sender,
        address factory,
        address paymaster
    );

    /**
     * @notice Execute a batch of user operations
     * @param ops Array of user operations to execute
     * @param beneficiary Address to receive the gas payment
     */
    function handleOps(
        UserOperationLib.UserOperation[] calldata ops,
        address payable beneficiary
    ) external;

    /**
     * @notice Get the nonce for a sender and key
     * @param sender The account address
     * @param key The nonce key
     * @return nonce The next nonce
     */
    function getNonce(address sender, uint192 key) external view returns (uint256 nonce);

    /**
     * @notice Get user operation hash
     * @param userOp The user operation
     * @return The hash of the user operation
     */
    function getUserOpHash(
        UserOperationLib.UserOperation calldata userOp
    ) external view returns (bytes32);
} 