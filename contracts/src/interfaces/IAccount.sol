// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./UserOperation.sol";

/**
 * @title IAccount
 * @notice Interface for ERC-4337 account contracts
 */
interface IAccount {
    /**
     * @notice Validate a user operation
     * @dev Must validate the signature and nonce, and pay the entryPoint if required
     * @param userOp The user operation to validate
     * @param userOpHash The hash of the user operation
     * @param missingAccountFunds The amount to pay the entryPoint (if any)
     * @return validationData Packed validation data:
     *         - 0: validation success
     *         - 1: signature failure
     *         - otherwise: packed ValidAfter (6 bytes) and ValidUntil (6 bytes)
     */
    function validateUserOp(
        UserOperationLib.UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData);
} 