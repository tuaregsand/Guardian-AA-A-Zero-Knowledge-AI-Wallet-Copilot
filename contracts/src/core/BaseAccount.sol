// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/IAccount.sol";
import "../interfaces/IEntryPoint.sol";
import "../interfaces/UserOperation.sol";

/**
 * @title BaseAccount
 * @notice Base contract for ERC-4337 account implementation
 * @dev Account implementation should inherit from this contract
 */
abstract contract BaseAccount is IAccount {
    using UserOperationLib for UserOperationLib.UserOperation;

    /// @notice Signature validation failed
    uint256 constant internal SIG_VALIDATION_FAILED = 1;

    /**
     * @notice Return value in case of signature validation success
     * @dev Equivalent to packSigTimeRange(true, 0, 0);
     */
    uint256 constant internal SIG_VALIDATION_SUCCESS = 0;

    /**
     * @notice Validate user operation
     * @dev Must validate caller is the entryPoint
     */
    function validateUserOp(
        UserOperationLib.UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external virtual override returns (uint256 validationData) {
        _requireFromEntryPoint();
        validationData = _validateSignature(userOp, userOpHash);
        _validateNonce(userOp.nonce);
        _payPrefund(missingAccountFunds);
    }

    /**
     * @notice Get the entryPoint address
     * @dev Must be implemented by the account
     */
    function entryPoint() public view virtual returns (IEntryPoint);

    /**
     * @notice Validate the signature of a user operation
     * @dev Must be implemented by the account
     * @param userOp The user operation
     * @param userOpHash The hash of the user operation
     * @return validationData 0 for valid signature, 1 for invalid signature,
     *                        otherwise packed ValidAfter and ValidUntil
     */
    function _validateSignature(
        UserOperationLib.UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal virtual returns (uint256 validationData);

    /**
     * @notice Validate the nonce of the user operation
     * @dev By default, accepts any nonce. Account may override
     * @param nonce The nonce to validate
     */
    function _validateNonce(uint256 nonce) internal view virtual {
        // Default implementation accepts any nonce
        nonce; // silence unused variable warning
    }

    /**
     * @notice Send the prefund to the entryPoint
     * @param missingAccountFunds The amount to send
     */
    function _payPrefund(uint256 missingAccountFunds) internal virtual {
        if (missingAccountFunds != 0) {
            (bool success, ) = payable(msg.sender).call{
                value: missingAccountFunds,
                gas: type(uint256).max
            }("");
            require(success, "BaseAccount: prefund failed");
        }
    }

    /**
     * @notice Ensure the caller is the entryPoint
     */
    function _requireFromEntryPoint() internal view virtual {
        require(
            msg.sender == address(entryPoint()),
            "BaseAccount: not from EntryPoint"
        );
    }

    /**
     * @notice Ensure the caller is the entryPoint or the account itself
     */
    function _requireFromEntryPointOrOwner() internal view virtual {
        require(
            msg.sender == address(entryPoint()) || msg.sender == address(this),
            "BaseAccount: not from EntryPoint or self"
        );
    }

    /**
     * @notice Get the user operation hash
     * @param userOp The user operation
     * @return The hash of the user operation
     */
    function getUserOpHash(
        UserOperationLib.UserOperation calldata userOp
    ) public view returns (bytes32) {
        return userOp.getUserOpHash(address(entryPoint()), block.chainid);
    }

    /**
     * @notice Pack the signature validation data
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

    /**
     * @notice Get nonce from the entryPoint
     * @param key The nonce key
     * @return The nonce value
     */
    function getNonce(uint192 key) public view returns (uint256) {
        return entryPoint().getNonce(address(this), key);
    }
} 