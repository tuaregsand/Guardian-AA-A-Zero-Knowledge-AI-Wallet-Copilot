// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/IStakeManager.sol";

/**
 * @title StakeManager
 * @notice Manages deposits and stakes for ERC-4337 participants
 * @dev Abstract contract to be inherited by EntryPoint
 */
abstract contract StakeManager is IStakeManager {
    /// @notice Minimum stake amount (0.5 ETH)
    uint256 private constant MIN_STAKE_VALUE = 0.5 ether;

    /// @notice Minimum unstake delay (1 day)
    uint256 private constant MIN_UNSTAKE_DELAY = 1 days;

    /// @notice Deposit information for each account
    struct DepositInfo {
        uint256 deposit;
        bool staked;
        uint112 stake;
        uint32 unstakeDelaySec;
        uint48 withdrawTime;
    }

    /// @notice Mapping of account deposits
    mapping(address => DepositInfo) private deposits;

    /// @notice Get deposit info for an account
    function getDepositInfo(address account)
        public
        view
        returns (uint256 deposit, bool staked, uint112 stake, uint32 unstakeDelaySec, uint48 withdrawTime)
    {
        DepositInfo storage info = deposits[account];
        return (info.deposit, info.staked, info.stake, info.unstakeDelaySec, info.withdrawTime);
    }

    /// @notice Get balance of an account
    function balanceOf(address account) public view returns (uint256) {
        return deposits[account].deposit;
    }

    /// @notice Internal function to increment deposit
    function _incrementDeposit(address account, uint256 amount) internal {
        deposits[account].deposit += amount;
    }

    /// @notice Add stake for the calling account
    function addStake(uint32 unstakeDelaySec) public payable {
        require(unstakeDelaySec >= MIN_UNSTAKE_DELAY, "StakeManager: unstake delay too low");
        require(msg.value >= MIN_STAKE_VALUE, "StakeManager: stake value too low");

        DepositInfo storage info = deposits[msg.sender];
        require(!info.staked, "StakeManager: already staked");

        info.stake = uint112(msg.value);
        info.unstakeDelaySec = unstakeDelaySec;
        info.staked = true;
        info.deposit += msg.value;

        emit StakeLocked(msg.sender, 0, unstakeDelaySec);
    }

    /// @notice Unlock stake for withdrawal
    function unlockStake() external {
        DepositInfo storage info = deposits[msg.sender];
        require(info.staked, "StakeManager: not staked");
        require(info.withdrawTime == 0, "StakeManager: already unlocked");

        info.withdrawTime = uint48(block.timestamp + info.unstakeDelaySec);

        emit StakeUnlocked(msg.sender, info.withdrawTime);
    }

    /// @notice Withdraw unlocked stake
    function withdrawStake(address payable withdrawAddress) external {
        DepositInfo storage info = deposits[msg.sender];
        require(info.staked, "StakeManager: not staked");
        require(info.withdrawTime > 0, "StakeManager: stake not unlocked");
        require(info.withdrawTime <= block.timestamp, "StakeManager: stake locked");

        uint256 stake = info.stake;
        info.deposit -= stake;
        info.stake = 0;
        info.staked = false;
        info.withdrawTime = 0;

        (bool success,) = withdrawAddress.call{ value: stake }("");
        require(success, "StakeManager: withdraw failed");

        emit StakeWithdrawn(msg.sender, withdrawAddress, stake);
    }

    /// @notice Withdraw from deposit
    function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) external {
        DepositInfo storage info = deposits[msg.sender];
        require(withdrawAmount <= info.deposit, "StakeManager: insufficient deposit");

        info.deposit -= withdrawAmount;

        (bool success,) = withdrawAddress.call{ value: withdrawAmount }("");
        require(success, "StakeManager: withdraw failed");

        emit Withdrawn(msg.sender, withdrawAddress, withdrawAmount);
    }

    /// @notice Deposit to an account
    function depositTo(address account) public payable {
        _incrementDeposit(account, msg.value);
        emit Deposited(account, deposits[account].deposit);
    }

    /// @notice Check if an account is staked
    function isStaked(address account) internal view returns (bool) {
        return deposits[account].staked;
    }

    /// @notice Get stake info
    function getStakeInfo(address account) internal view returns (uint112 stake, uint32 unstakeDelaySec) {
        DepositInfo storage info = deposits[account];
        return (info.stake, info.unstakeDelaySec);
    }

    /// @notice Internal deposit
    function internalIncrementDeposit(address account, uint256 amount) internal {
        _incrementDeposit(account, amount);
    }

    /// @notice Check required stake
    function requireStaked(address account) internal view {
        require(isStaked(account), "StakeManager: account not staked");
    }

    /// @notice Check required stake with minimum
    function requireStaked(address account, uint256 minStake, uint256 minUnstakeDelay) internal view {
        (uint112 stake, uint32 unstakeDelaySec) = getStakeInfo(account);
        require(stake >= minStake, "StakeManager: stake too low");
        require(unstakeDelaySec >= minUnstakeDelay, "StakeManager: unstake delay too low");
    }
}
