// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./StakeManager.sol";
import "../interfaces/IEntryPoint.sol";
import "../interfaces/IAccount.sol";
import "../interfaces/IPaymaster.sol";
import "../interfaces/UserOperation.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

/**
 * @title EntryPoint
 * @notice Core ERC-4337 contract that handles user operations
 * @dev Singleton contract that processes UserOperations
 */
contract EntryPoint is IEntryPoint, StakeManager, ReentrancyGuard, ERC165 {
    using UserOperationLib for UserOperationLib.UserOperation;

    /// @notice Version of the EntryPoint
    string public constant VERSION = "0.7.0";

    /// @notice Minimum gas for verification
    uint256 private constant VERIFICATION_GAS_OVERHEAD = 26000;

    /// @notice Minimum gas for call
    uint256 private constant CALL_GAS_OVERHEAD = 9000;

    /// @notice Compensate the caller's beneficiary address with the collected fees of all UserOperations
    uint256 private constant UNUSED_GAS_PENALTY_PERCENT = 10;

    /// @notice Mapping of sender nonces
    mapping(address => mapping(uint192 => uint256)) private nonceSequenceNumber;

    /// @notice Struct to hold temporary operation info during execution
    struct MemoryUserOp {
        address sender;
        uint256 nonce;
        uint256 callGasLimit;
        uint256 verificationGasLimit;
        uint256 preVerificationGas;
        uint256 maxFeePerGas;
        uint256 maxPriorityFeePerGas;
        address paymaster;
    }

    /**
     * @notice Execute a batch of UserOperations
     * @param ops Array of operations to execute
     * @param beneficiary Address to receive gas payments
     */
    function handleOps(
        UserOperationLib.UserOperation[] calldata ops,
        address payable beneficiary
    ) external nonReentrant {
        uint256 opslen = ops.length;
        uint256 totalGasCost = 0;

        unchecked {
            for (uint256 i = 0; i < opslen; i++) {
                uint256 gasBefore = gasleft();
                
                totalGasCost += _handleOperation(ops[i], beneficiary);
                
                uint256 gasUsed = gasBefore - gasleft();
                if (gasUsed > ops[i].callGasLimit + ops[i].verificationGasLimit + VERIFICATION_GAS_OVERHEAD) {
                    // Penalize bundler for providing insufficient gas limit
                    uint256 penalty = (gasUsed - ops[i].callGasLimit - ops[i].verificationGasLimit) * UNUSED_GAS_PENALTY_PERCENT / 100;
                    totalGasCost += penalty;
                }
            }
        }

        // Transfer collected fees to beneficiary
        if (totalGasCost > 0) {
            (bool success, ) = beneficiary.call{value: totalGasCost}("");
            require(success, "EntryPoint: beneficiary transfer failed");
        }
    }

    /**
     * @notice Handle a single user operation
     * @param userOp The user operation to handle
     * @param beneficiary The beneficiary for gas payment
     * @return actualGasCost The actual gas cost of the operation
     */
    function _handleOperation(
        UserOperationLib.UserOperation calldata userOp,
        address payable beneficiary
    ) private returns (uint256 actualGasCost) {
        uint256 preGas = gasleft();
        bytes32 userOpHash = getUserOpHash(userOp);
        
        // Create memory struct for gas efficiency
        MemoryUserOp memory mUserOp = MemoryUserOp({
            sender: userOp.sender,
            nonce: userOp.nonce,
            callGasLimit: userOp.callGasLimit,
            verificationGasLimit: userOp.verificationGasLimit,
            preVerificationGas: userOp.preVerificationGas,
            maxFeePerGas: userOp.maxFeePerGas,
            maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
            paymaster: _getPaymaster(userOp.paymasterAndData)
        });

        // Calculate required prefund
        uint256 requiredPrefund = _getRequiredPrefund(mUserOp);
        
        // Validate and execute
        (bool success, uint256 validationData) = _validateOperation(userOp, userOpHash, requiredPrefund);
        
        if (!success) {
            revert FailedOp(0, "AA13 initCode failed or OOG");
        }

        // Check time range
        uint256 validAfter = validationData >> (160 + 48);
        uint256 validUntil = (validationData >> 160) & ((1 << 48) - 1);
        
        if (block.timestamp < validAfter || (validUntil != 0 && block.timestamp > validUntil)) {
            revert FailedOp(0, "AA22 expired or not due");
        }

        // Check signature
        if ((validationData & 1) == 1) {
            revert FailedOp(0, "AA24 signature error");
        }

        // Emit before execution event
        emit BeforeExecution(userOpHash, mUserOp.sender, _getFactory(userOp.initCode), mUserOp.paymaster);

        // Execute the operation
        bool callSuccess = _executeUserOp(userOp, mUserOp);

        // Calculate actual gas cost
        actualGasCost = _handlePostOp(
            userOp,
            mUserOp,
            userOpHash,
            actualGasCost,
            preGas,
            callSuccess
        );

        emit UserOperationEvent(
            userOpHash,
            mUserOp.sender,
            mUserOp.paymaster,
            mUserOp.nonce,
            callSuccess,
            actualGasCost,
            preGas - gasleft()
        );
    }

    /**
     * @notice Validate a user operation
     */
    function _validateOperation(
        UserOperationLib.UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 requiredPrefund
    ) private returns (bool success, uint256 validationData) {
        // Deploy sender if needed
        if (userOp.initCode.length > 0) {
            address factory = _getFactory(userOp.initCode);
            if (factory == address(0)) {
                revert FailedOp(0, "AA13 initCode failed");
            }
            
            if (userOp.sender.code.length == 0) {
                // Deploy the sender
                (success, ) = factory.call(userOp.initCode[20:]);
                if (!success || userOp.sender.code.length == 0) {
                    revert FailedOp(0, "AA13 initCode failed");
                }
                emit AccountDeployed(userOpHash, userOp.sender, factory, _getPaymaster(userOp.paymasterAndData));
            }
        }

        // Validate with account
        try IAccount(userOp.sender).validateUserOp{gas: userOp.verificationGasLimit}(
            userOp,
            userOpHash,
            requiredPrefund
        ) returns (uint256 _validationData) {
            validationData = _validationData;
            success = true;
        } catch {
            success = false;
        }
    }

    /**
     * @notice Execute the user operation call
     */
    function _executeUserOp(
        UserOperationLib.UserOperation calldata userOp,
        MemoryUserOp memory mUserOp
    ) private returns (bool success) {
        uint256 callGasLimit = mUserOp.callGasLimit;
        
        try this.innerHandleOp{gas: callGasLimit}(
            userOp.callData,
            mUserOp.sender,
            callGasLimit
        ) returns (bool _success) {
            success = _success;
        } catch {
            success = false;
        }
    }

    /**
     * @notice Inner handle operation - executes the actual call
     */
    function innerHandleOp(
        bytes calldata callData,
        address sender,
        uint256 callGasLimit
    ) external returns (bool success) {
        require(msg.sender == address(this), "EntryPoint: invalid caller");
        
        uint256 gasUsed = callGasLimit - gasleft();
        (success, ) = sender.call{gas: callGasLimit - gasUsed - CALL_GAS_OVERHEAD}(callData);
    }

    /**
     * @notice Handle post-operation logic
     */
    function _handlePostOp(
        UserOperationLib.UserOperation calldata userOp,
        MemoryUserOp memory mUserOp,
        bytes32 userOpHash,
        uint256 actualGasCost,
        uint256 preGas,
        bool callSuccess
    ) private returns (uint256) {
        uint256 gasUsed = preGas - gasleft() + userOp.preVerificationGas;
        
        // Add gas overhead
        if (userOp.paymasterAndData.length > 0) {
            gasUsed += 50000; // Paymaster overhead
        }
        
        actualGasCost = gasUsed * mUserOp.maxFeePerGas;
        
        // Handle paymaster postOp if exists
        if (mUserOp.paymaster != address(0)) {
            _handlePaymasterPostOp(
                userOp,
                userOpHash,
                actualGasCost,
                callSuccess
            );
        }
        
        return actualGasCost;
    }

    /**
     * @notice Handle paymaster post-operation
     */
    function _handlePaymasterPostOp(
        UserOperationLib.UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 actualGasCost,
        bool callSuccess
    ) private {
        address paymaster = _getPaymaster(userOp.paymasterAndData);
        
        IPaymaster.PostOpMode mode = callSuccess 
            ? IPaymaster.PostOpMode.opSucceeded 
            : IPaymaster.PostOpMode.opReverted;
            
        try IPaymaster(paymaster).postOp{gas: userOp.verificationGasLimit}(
            mode,
            "",
            actualGasCost
        ) {} catch {
            // postOp failed - paymaster pays
        }
    }

    /**
     * @notice Get nonce for a sender and key
     */
    function getNonce(address sender, uint192 key) external view returns (uint256) {
        return nonceSequenceNumber[sender][key] | (uint256(key) << 64);
    }

    /**
     * @notice Get user operation hash
     */
    function getUserOpHash(
        UserOperationLib.UserOperation calldata userOp
    ) public view returns (bytes32) {
        return userOp.getUserOpHash(address(this), block.chainid);
    }

    /**
     * @notice Extract factory address from initCode
     */
    function _getFactory(bytes calldata initCode) private pure returns (address) {
        if (initCode.length < 20) return address(0);
        return address(bytes20(initCode[0:20]));
    }

    /**
     * @notice Extract paymaster address from paymasterAndData
     */
    function _getPaymaster(bytes calldata paymasterAndData) private pure returns (address) {
        if (paymasterAndData.length < 20) return address(0);
        return address(bytes20(paymasterAndData[0:20]));
    }

    /**
     * @notice Calculate required prefund for the operation
     */
    function _getRequiredPrefund(MemoryUserOp memory mUserOp) private pure returns (uint256) {
        uint256 maxGas = mUserOp.callGasLimit + mUserOp.verificationGasLimit + mUserOp.preVerificationGas;
        return maxGas * mUserOp.maxFeePerGas;
    }

    /**
     * @notice Validate and update nonce
     */
    function _validateAndUpdateNonce(address sender, uint256 nonce) private returns (bool) {
        (uint192 key, uint64 seq) = UserOperationLib.unpackNonce(nonce);
        uint256 currentNonce = nonceSequenceNumber[sender][key];
        
        if (seq != currentNonce) {
            return false;
        }
        
        nonceSequenceNumber[sender][key] = currentNonce + 1;
        return true;
    }

    /**
     * @notice Check if contract supports interface
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IEntryPoint).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @notice Receive function to accept ETH prefunds from accounts
     */
    receive() external payable {
        // Accept ETH for prefunding operations
    }
} 