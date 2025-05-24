// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../core/BaseAccount.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title SimpleAccount
 * @notice A simple ERC-4337 account implementation
 * @dev Minimal implementation with single owner
 */
contract SimpleAccount is BaseAccount, Initializable, UUPSUpgradeable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @notice The account owner
    address public owner;

    /// @notice The EntryPoint contract
    IEntryPoint private immutable _entryPoint;

    /// @notice Event emitted when account is initialized
    event SimpleAccountInitialized(IEntryPoint indexed entryPoint, address indexed owner);

    /// @notice Only owner modifier
    modifier onlyOwner() {
        require(msg.sender == owner, "SimpleAccount: not owner");
        _;
    }

    /// @notice Constructor
    /// @param anEntryPoint The EntryPoint contract
    constructor(IEntryPoint anEntryPoint) {
        _entryPoint = anEntryPoint;
        _disableInitializers();
    }

    /**
     * @notice Initialize the account
     * @param anOwner The owner of the account
     */
    function initialize(address anOwner) public virtual initializer {
        owner = anOwner;
        emit SimpleAccountInitialized(_entryPoint, owner);
    }

    /**
     * @notice Execute a transaction
     * @param target The target address
     * @param value The value to send
     * @param data The call data
     */
    function execute(address target, uint256 value, bytes calldata data) external {
        _requireFromEntryPointOrOwner();
        _execute(target, value, data);
    }

    /**
     * @notice Execute a batch of transactions
     * @param targets Array of target addresses
     * @param values Array of values to send
     * @param datas Array of call data
     */
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external {
        _requireFromEntryPointOrOwner();
        require(
            targets.length == values.length && values.length == datas.length,
            "SimpleAccount: length mismatch"
        );
        
        for (uint256 i = 0; i < targets.length; i++) {
            _execute(targets[i], values[i], datas[i]);
        }
    }

    /**
     * @notice Internal execute function
     */
    function _execute(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            // If the call failed, revert with the original revert reason
            if (result.length > 0) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            } else {
                revert("SimpleAccount: execution failed");
            }
        }
    }

    /**
     * @notice Get the EntryPoint
     */
    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }

    /**
     * @notice Validate the signature
     * @dev Returns 0 if signature is valid
     */
    function _validateSignature(
        UserOperationLib.UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal virtual override returns (uint256) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        address signer = hash.recover(userOp.signature);
        
        if (signer == owner) {
            return SIG_VALIDATION_SUCCESS;
        }
        return SIG_VALIDATION_FAILED;
    }

    /**
     * @notice Authorize an upgrade
     * @dev Only the owner can upgrade
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @notice Deposit to the account
     */
    function addDeposit() public payable {
        entryPoint().depositTo{value: msg.value}(address(this));
    }

    /**
     * @notice Get deposit balance
     */
    function getDeposit() public view returns (uint256) {
        return entryPoint().balanceOf(address(this));
    }

    /**
     * @notice Withdraw deposit
     * @param withdrawAddress Address to withdraw to
     * @param amount Amount to withdraw
     */
    function withdrawDepositTo(address payable withdrawAddress, uint256 amount) public onlyOwner {
        entryPoint().withdrawTo(withdrawAddress, amount);
    }

    /**
     * @notice Receive ETH
     */
    receive() external payable {}
} 