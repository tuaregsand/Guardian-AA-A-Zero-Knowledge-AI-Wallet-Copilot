// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../core/BasePaymaster.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title VerifyingPaymaster
 * @notice Paymaster that sponsors transactions with valid signatures
 * @dev Uses a trusted signer to approve sponsorships
 */
contract VerifyingPaymaster is BasePaymaster {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    using UserOperationLib for UserOperationLib.UserOperation;

    /// @notice The trusted signer
    address public immutable verifyingSigner;

    /// @notice Mapping of used nonces to prevent replay
    mapping(address => uint256) public nonces;

    /// @notice Constructor
    /// @param _entryPoint The EntryPoint contract
    /// @param _verifyingSigner The trusted signer address
    constructor(IEntryPoint _entryPoint, address _verifyingSigner) BasePaymaster(_entryPoint) {
        verifyingSigner = _verifyingSigner;
    }

    /**
     * @notice Internal validation function
     * @param userOp The user operation
     * @param userOpHash The operation hash
     * @param maxCost The maximum cost
     * @return context Empty context
     * @return validationData 0 for success, 1 for signature failure
     */
    function _validatePaymasterUserOp(
        UserOperationLib.UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) internal virtual override returns (bytes memory context, uint256 validationData) {
        (maxCost); // silence unused variable warning
        
        // Decode paymaster data
        require(userOp.paymasterAndData.length >= 20 + 32 + 65, "VerifyingPaymaster: invalid data length");
        
        // Extract nonce and signature directly from calldata
        uint256 nonce = uint256(bytes32(userOp.paymasterAndData[20:52]));
        bytes memory signature = userOp.paymasterAndData[52:];
        
        // Check nonce
        require(nonces[userOp.sender] == nonce, "VerifyingPaymaster: invalid nonce");
        
        // Create hash to sign
        bytes32 hash = keccak256(
            abi.encode(
                userOp.sender,
                userOp.nonce,
                userOp.initCode,
                userOp.callData,
                userOp.callGasLimit,
                userOp.verificationGasLimit,
                userOp.preVerificationGas,
                userOp.maxFeePerGas,
                userOp.maxPriorityFeePerGas,
                address(this),
                nonce,
                block.chainid
            )
        );
        
        // Verify signature
        address signer = hash.toEthSignedMessageHash().recover(signature);
        
        if (signer != verifyingSigner) {
            return ("", 1); // Signature validation failed
        }
        
        // Increment nonce to prevent replay
        nonces[userOp.sender]++;
        
        // Return empty context and success
        return ("", 0);
    }

    /**
     * @notice Post-operation handler
     * @dev Deduct gas cost from paymaster deposit and send to signer
     */
    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) internal override {
        // Deduct gas cost from paymaster deposit and send to signer
        withdrawTo(payable(verifyingSigner), actualGasCost);
    }

    /**
     * @notice Get the current nonce for an account
     * @param account The account address
     * @return The current nonce
     */
    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }

    /**
     * @notice Owner function to withdraw funds
     * @param withdrawAddress Address to withdraw to
     * @param amount Amount to withdraw
     */
    function withdraw(address payable withdrawAddress, uint256 amount) external {
        require(msg.sender == verifyingSigner, "VerifyingPaymaster: not signer");
        withdrawTo(withdrawAddress, amount);
    }

    /**
     * @notice Pack paymaster data
     * @param account The account address
     * @param signature The signature
     * @return The packed data
     */
    function packPaymasterData(address account, bytes calldata signature) external view returns (bytes memory) {
        uint256 nonce = nonces[account];
        return abi.encodePacked(address(this), nonce, signature);
    }
} 