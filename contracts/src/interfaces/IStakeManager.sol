// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title IStakeManager
 * @notice Interface for stake management in ERC-4337
 */
interface IStakeManager {
    /**
     * @notice Event emitted when stake is deposited
     * @param account The account that deposited
     * @param totalDeposit The total deposit amount
     */
    event Deposited(address indexed account, uint256 totalDeposit);

    /**
     * @notice Event emitted when stake is withdrawn
     * @param account The account that withdrew
     * @param withdrawAddress The address that received the withdrawal
     * @param amount The amount withdrawn
     */
    event Withdrawn(address indexed account, address withdrawAddress, uint256 amount);

    /**
     * @notice Event emitted when stake is locked
     * @param account The account whose stake was locked
     * @param withdrawTime The time when withdrawal will be allowed
     * @param unstakeDelaySec The unstake delay in seconds
     */
    event StakeLocked(address indexed account, uint256 withdrawTime, uint256 unstakeDelaySec);

    /**
     * @notice Event emitted when stake is unlocked
     * @param account The account whose stake was unlocked
     * @param withdrawTime The time when withdrawal is allowed
     */
    event StakeUnlocked(address indexed account, uint256 withdrawTime);

    /**
     * @notice Event emitted when stake is withdrawn
     * @param account The account that withdrew stake
     * @param withdrawAddress The address that received the stake
     * @param amount The amount withdrawn
     */
    event StakeWithdrawn(address indexed account, address withdrawAddress, uint256 amount);

    /**
     * @notice Deposit stake for an account
     * @param unstakeDelaySec The delay in seconds before the stake can be withdrawn
     */
    function addStake(uint32 unstakeDelaySec) external payable;

    /**
     * @notice Unlock stake for withdrawal
     */
    function unlockStake() external;

    /**
     * @notice Withdraw unlocked stake
     * @param withdrawAddress The address to receive the withdrawn stake
     */
    function withdrawStake(address payable withdrawAddress) external;

    /**
     * @notice Withdraw deposit
     * @param withdrawAddress The address to receive the withdrawn deposit
     * @param withdrawAmount The amount to withdraw
     */
    function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) external;

    /**
     * @notice Get deposit info for an account
     * @param account The account to query
     * @return deposit The deposit amount
     * @return staked Whether the account is staked
     * @return stake The stake amount
     * @return unstakeDelaySec The unstake delay in seconds
     * @return withdrawTime The time when withdrawal is allowed
     */
    function getDepositInfo(address account) external view returns (
        uint256 deposit,
        bool staked,
        uint112 stake,
        uint32 unstakeDelaySec,
        uint48 withdrawTime
    );

    /**
     * @notice Get the balance of an account
     * @param account The account to query
     * @return The account balance
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @notice Deposit funds for an account
     * @param account The account to deposit for
     */
    function depositTo(address account) external payable;
} 