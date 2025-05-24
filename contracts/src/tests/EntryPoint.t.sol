// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Test.sol";
import "../core/EntryPoint.sol";
import "../samples/SimpleAccount.sol";
import "../samples/SimpleAccountFactory.sol";
import "../samples/VerifyingPaymaster.sol";
import "../interfaces/UserOperation.sol";

contract EntryPointTest is Test {
    using UserOperationLib for UserOperationLib.UserOperation;

    EntryPoint public entryPoint;
    SimpleAccountFactory public factory;
    VerifyingPaymaster public paymaster;

    address public owner;
    uint256 public ownerKey;
    address public bundler;
    address public paymasterSigner;
    uint256 public paymasterSignerKey;

    function setUp() public {
        // Setup accounts
        (owner, ownerKey) = makeAddrAndKey("owner");
        bundler = makeAddr("bundler");
        (paymasterSigner, paymasterSignerKey) = makeAddrAndKey("paymasterSigner");

        // Deploy contracts
        entryPoint = new EntryPoint();
        factory = new SimpleAccountFactory(IEntryPoint(address(entryPoint)));
        paymaster = new VerifyingPaymaster(IEntryPoint(address(entryPoint)), paymasterSigner);

        // Fund paymaster
        vm.deal(address(paymaster), 10 ether);
    }

    function testDeployAccount() public {
        // Create account
        SimpleAccount account = factory.createAccount(owner, 0);

        // Verify account
        assertEq(account.owner(), owner);
        assertEq(address(account.entryPoint()), address(entryPoint));
    }

    function testSimpleOperation() public {
        // Create account
        SimpleAccount account = factory.createAccount(owner, 0);

        // Fund account and deposit to EntryPoint
        vm.deal(address(account), 1 ether);
        account.addDeposit{ value: 0.5 ether }();

        // Create user operation
        UserOperationLib.UserOperation memory userOp = UserOperationLib.UserOperation({
            sender: address(account),
            nonce: account.getNonce(0),
            initCode: "",
            callData: abi.encodeCall(SimpleAccount.execute, (address(0x1234), 0.1 ether, "")),
            callGasLimit: 100000,
            verificationGasLimit: 100000,
            preVerificationGas: 21000,
            maxFeePerGas: 20 gwei,
            maxPriorityFeePerGas: 1 gwei,
            paymasterAndData: "",
            signature: ""
        });

        // Sign operation (need to sign the Ethereum signed message hash)
        bytes32 userOpHash = entryPoint.getUserOpHash(userOp);
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", userOpHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerKey, ethSignedHash);
        userOp.signature = abi.encodePacked(r, s, v);

        // Execute
        UserOperationLib.UserOperation[] memory ops = new UserOperationLib.UserOperation[](1);
        ops[0] = userOp;

        vm.prank(bundler);
        entryPoint.handleOps(ops, payable(bundler));

        // Verify execution
        assertEq(address(0x1234).balance, 0.1 ether);
    }

    function testGaslessOperation() public {
        // Create account
        SimpleAccount account = factory.createAccount(owner, 0);

        // Give account minimal ETH for prefund (will be refunded by paymaster)
        vm.deal(address(account), 0.01 ether);

        // Fund paymaster and deposit to EntryPoint
        vm.deal(address(paymaster), 1 ether);
        (bool success,) = address(paymaster).call{ value: 0.5 ether }("");
        require(success, "Paymaster deposit failed");

        // Create user operation with paymaster
        UserOperationLib.UserOperation memory userOp = UserOperationLib.UserOperation({
            sender: address(account),
            nonce: account.getNonce(0),
            initCode: "",
            callData: abi.encodeCall(SimpleAccount.execute, (address(0x1234), 0, "")),
            callGasLimit: 100000,
            verificationGasLimit: 150000,
            preVerificationGas: 21000,
            maxFeePerGas: 20 gwei,
            maxPriorityFeePerGas: 1 gwei,
            paymasterAndData: "",
            signature: ""
        });

        // Get paymaster nonce and sign
        uint256 pmNonce = paymaster.getNonce(address(account));
        bytes32 pmHash = keccak256(
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
                address(paymaster),
                pmNonce,
                block.chainid
            )
        );

        bytes32 pmEthSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", pmHash));
        (uint8 pmV, bytes32 pmR, bytes32 pmS) = vm.sign(paymasterSignerKey, pmEthSignedHash);
        userOp.paymasterAndData = abi.encodePacked(address(paymaster), pmNonce, pmR, pmS, pmV);

        // Sign user operation (need to sign the Ethereum signed message hash)
        bytes32 userOpHash = entryPoint.getUserOpHash(userOp);
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", userOpHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerKey, ethSignedHash);
        userOp.signature = abi.encodePacked(r, s, v);

        // Execute
        UserOperationLib.UserOperation[] memory ops = new UserOperationLib.UserOperation[](1);
        ops[0] = userOp;

        uint256 paymasterBalanceBefore = address(paymaster).balance;
        (uint256 paymasterDepositBefore,,,,) = paymaster.getDeposit();

        vm.prank(bundler);
        entryPoint.handleOps(ops, payable(bundler));

        (uint256 paymasterDepositAfter,,,,) = paymaster.getDeposit();

        // Verify paymaster paid (deposit should decrease)
        assertLt(paymasterDepositAfter, paymasterDepositBefore);
    }
}
