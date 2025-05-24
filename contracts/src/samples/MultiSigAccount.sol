// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../core/BaseAccount.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title MultiSigAccount
 * @notice Multi-signature ERC-4337 account implementation
 * @dev Requires multiple signatures to execute transactions
 */
contract MultiSigAccount is BaseAccount, Initializable, UUPSUpgradeable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @notice The EntryPoint contract
    IEntryPoint private immutable _entryPoint;

    /// @notice List of signers
    address[] public signers;

    /// @notice Mapping to check if address is signer
    mapping(address => bool) public isSigner;

    /// @notice Required number of signatures
    uint256 public threshold;

    /// @notice Event emitted when signers are updated
    event SignersUpdated(address[] signers, uint256 threshold);

    /// @notice Event emitted when account is initialized
    event MultiSigAccountInitialized(IEntryPoint indexed entryPoint, address[] signers, uint256 threshold);

    /// @notice Only self modifier
    modifier onlySelf() {
        require(msg.sender == address(this), "MultiSigAccount: only self");
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
     * @param _signers Initial signers
     * @param _threshold Required signatures
     */
    function initialize(address[] calldata _signers, uint256 _threshold) public virtual initializer {
        _setSigners(_signers, _threshold);
        emit MultiSigAccountInitialized(_entryPoint, _signers, _threshold);
    }

    /**
     * @notice Execute a transaction
     * @param target The target address
     * @param value The value to send
     * @param data The call data
     */
    function execute(address target, uint256 value, bytes calldata data) external {
        _requireFromEntryPointOrSelf();
        _execute(target, value, data);
    }

    /**
     * @notice Execute a batch of transactions
     * @param targets Array of target addresses
     * @param values Array of values
     * @param datas Array of call data
     */
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external {
        _requireFromEntryPointOrSelf();
        require(
            targets.length == values.length && values.length == datas.length,
            "MultiSigAccount: length mismatch"
        );
        
        for (uint256 i = 0; i < targets.length; i++) {
            _execute(targets[i], values[i], datas[i]);
        }
    }

    /**
     * @notice Update signers and threshold
     * @param _signers New signers
     * @param _threshold New threshold
     */
    function updateSigners(address[] calldata _signers, uint256 _threshold) external onlySelf {
        _setSigners(_signers, _threshold);
    }

    /**
     * @notice Internal function to set signers
     */
    function _setSigners(address[] calldata _signers, uint256 _threshold) internal {
        require(_signers.length > 0, "MultiSigAccount: no signers");
        require(_threshold > 0 && _threshold <= _signers.length, "MultiSigAccount: invalid threshold");
        
        // Remove old signers
        for (uint256 i = 0; i < signers.length; i++) {
            isSigner[signers[i]] = false;
        }
        
        // Set new signers
        delete signers;
        for (uint256 i = 0; i < _signers.length; i++) {
            require(_signers[i] != address(0), "MultiSigAccount: zero address");
            require(!isSigner[_signers[i]], "MultiSigAccount: duplicate signer");
            signers.push(_signers[i]);
            isSigner[_signers[i]] = true;
        }
        
        threshold = _threshold;
        emit SignersUpdated(_signers, _threshold);
    }

    /**
     * @notice Internal execute function
     */
    function _execute(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            if (result.length > 0) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            } else {
                revert("MultiSigAccount: execution failed");
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
     * @dev Validates multi-signature
     */
    function _validateSignature(
        UserOperationLib.UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal virtual override returns (uint256) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        bytes memory signatures = userOp.signature;
        
        // Check signature length (65 bytes per signature)
        if (signatures.length != threshold * 65) {
            return SIG_VALIDATION_FAILED;
        }
        
        address lastSigner = address(0);
        
        for (uint256 i = 0; i < threshold; i++) {
            // Extract signature
            bytes memory signature = new bytes(65);
            for (uint256 j = 0; j < 65; j++) {
                signature[j] = signatures[i * 65 + j];
            }
            
            // Recover signer
            address signer = hash.recover(signature);
            
            // Check if valid signer and ordered (prevent duplicates)
            if (!isSigner[signer] || signer <= lastSigner) {
                return SIG_VALIDATION_FAILED;
            }
            
            lastSigner = signer;
        }
        
        return SIG_VALIDATION_SUCCESS;
    }

    /**
     * @notice Require from EntryPoint or self
     */
    function _requireFromEntryPointOrSelf() internal view {
        require(
            msg.sender == address(entryPoint()) || msg.sender == address(this),
            "MultiSigAccount: not from EntryPoint or self"
        );
    }

    /**
     * @notice Authorize an upgrade
     * @dev Only self can upgrade
     */
    function _authorizeUpgrade(address newImplementation) internal override onlySelf {}

    /**
     * @notice Get signers count
     */
    function getSignersCount() external view returns (uint256) {
        return signers.length;
    }

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
    function withdrawDepositTo(address payable withdrawAddress, uint256 amount) public onlySelf {
        entryPoint().withdrawTo(withdrawAddress, amount);
    }

    /**
     * @notice Receive ETH
     */
    receive() external payable {}
} 