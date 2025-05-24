// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/IPaymaster.sol";
import "../interfaces/IEntryPoint.sol";
import "../interfaces/UserOperation.sol";

/**
 * @title BasePaymaster
 * @notice Base contract for ERC-4337 paymaster implementation
 * @dev Paymaster implementation should inherit from this contract
 */
abstract contract BasePaymaster is IPaymaster {
    using UserOperationLib for UserOperationLib.UserOperation;

    /// @notice The EntryPoint contract
    IEntryPoint public immutable entryPoint;

    /// @notice Constructor
    /// @param _entryPoint The EntryPoint contract address
    constructor(IEntryPoint _entryPoint) {
        entryPoint = _entryPoint;
    }

    /**
     * @notice Validate a user operation
     * @dev Must verify the caller is the entryPoint
     */
    function validatePaymasterUserOp(
        UserOperationLib.UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external override returns (bytes memory context, uint256 validationData) {
        _requireFromEntryPoint();
        return _validatePaymasterUserOp(userOp, userOpHash, maxCost);
    }

    /**
     * @notice Post-operation handler
     * @dev Must verify the caller is the entryPoint
     */
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external override {
        _requireFromEntryPoint();
        _postOp(mode, context, actualGasCost);
    }

    /**
     * @notice Internal validation function
     * @dev Must be implemented by the paymaster
     * @param userOp The user operation
     * @param userOpHash The hash of the user operation
     * @param maxCost The maximum cost of the operation
     * @return context Value to pass to postOp
     * @return validationData Validation result
     */
    function _validatePaymasterUserOp(
        UserOperationLib.UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) internal virtual returns (bytes memory context, uint256 validationData);

    /**
     * @notice Internal post-operation handler
     * @dev Must be implemented by the paymaster
     * @param mode The post-operation mode
     * @param context The context from validation
     * @param actualGasCost The actual gas cost
     */
    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) internal virtual {
        // Default implementation does nothing
        mode; // silence unused variable warning
        context; // silence unused variable warning
        actualGasCost; // silence unused variable warning
    }

    /**
     * @notice Ensure the caller is the entryPoint
     */
    function _requireFromEntryPoint() internal view {
        require(msg.sender == address(entryPoint), "BasePaymaster: not from EntryPoint");
    }

    /**
     * @notice Withdraw to a specific address
     * @param withdrawAddress The address to withdraw to
     * @param amount The amount to withdraw
     */
    function withdrawTo(address payable withdrawAddress, uint256 amount) public virtual {
        entryPoint.withdrawTo(withdrawAddress, amount);
    }

    /**
     * @notice Add stake to the paymaster
     * @param unstakeDelaySec The unstake delay in seconds
     */
    function addStake(uint32 unstakeDelaySec) external payable {
        entryPoint.addStake{value: msg.value}(unstakeDelaySec);
    }

    /**
     * @notice Unlock stake
     */
    function unlockStake() external {
        entryPoint.unlockStake();
    }

    /**
     * @notice Withdraw stake
     * @param withdrawAddress The address to withdraw to
     */
    function withdrawStake(address payable withdrawAddress) external {
        entryPoint.withdrawStake(withdrawAddress);
    }

    /**
     * @notice Get deposit info
     * @return deposit The deposit amount
     * @return staked Whether staked
     * @return stake The stake amount
     * @return unstakeDelaySec The unstake delay
     * @return withdrawTime The withdraw time
     */
    function getDeposit() public view returns (
        uint256 deposit,
        bool staked,
        uint112 stake,
        uint32 unstakeDelaySec,
        uint48 withdrawTime
    ) {
        return entryPoint.getDepositInfo(address(this));
    }

    /**
     * @notice Pack the validation data
     * @param sigFailed True if signature validation failed
     * @param validAfter Valid after timestamp (6 bytes)
     * @param validUntil Valid until timestamp (6 bytes)
     * @return Packed validation data
     */
    function packSigTimeRange(
        bool sigFailed,
        uint48 validAfter,
        uint48 validUntil
    ) internal pure returns (uint256) {
        return (sigFailed ? 1 : 0) |
            (uint256(validUntil) << 160) |
            (uint256(validAfter) << (160 + 48));
    }

    /// @notice Deposit funds to the paymaster's stake
    receive() external payable {
        entryPoint.depositTo{value: msg.value}(address(this));
    }
} 