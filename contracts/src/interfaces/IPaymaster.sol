// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./UserOperation.sol";

/**
 * @title IPaymaster
 * @notice Interface for paymasters that sponsor user operations
 */
interface IPaymaster {
    /**
     * @notice Post-operation mode enum
     * @dev Defines how the paymaster behaves after operation execution
     */
    enum PostOpMode {
        // User operation succeeded
        opSucceeded,
        // User operation reverted, still pay
        opReverted,
        // Paymaster's postOp reverted, prevent user paying
        postOpReverted
    }

    /**
     * @notice Validate a user operation and agree to pay for it
     * @dev Must verify the sender is the entryPoint
     * @param userOp The user operation
     * @param userOpHash The hash of the user operation
     * @param maxCost The maximum cost of the operation
     * @return context Value to pass to postOp
     * @return validationData Validation result (0 for success, 1 for sig fail, or time range)
     */
    function validatePaymasterUserOp(
        UserOperationLib.UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external returns (bytes memory context, uint256 validationData);

    /**
     * @notice Post-operation handler
     * @dev Called after the user operation execution
     * @param mode The post-operation mode
     * @param context The context returned by validatePaymasterUserOp
     * @param actualGasCost The actual gas cost of the operation
     */
    function postOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost) external;
}
