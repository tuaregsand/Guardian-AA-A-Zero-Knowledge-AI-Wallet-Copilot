// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./SimpleAccount.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/utils/Create2.sol";

/**
 * @title SimpleAccountFactory
 * @notice Factory contract for deploying SimpleAccount instances
 * @dev Uses CREATE2 for deterministic addresses
 */
contract SimpleAccountFactory {
    /// @notice The implementation contract
    SimpleAccount public immutable accountImplementation;

    /// @notice Constructor
    /// @param _entryPoint The EntryPoint contract address
    constructor(IEntryPoint _entryPoint) {
        accountImplementation = new SimpleAccount(_entryPoint);
    }

    /**
     * @notice Create an account and return its address
     * @dev Returns existing account if already deployed
     * @param owner The owner of the account
     * @param salt Salt for CREATE2
     * @return ret The account address
     */
    function createAccount(address owner, uint256 salt) public returns (SimpleAccount ret) {
        address addr = getAddress(owner, salt);
        uint256 codeSize = addr.code.length;
        if (codeSize > 0) {
            return SimpleAccount(payable(addr));
        }
        ret = SimpleAccount(payable(new ERC1967Proxy{salt: bytes32(salt)}(
            address(accountImplementation),
            abi.encodeCall(SimpleAccount.initialize, (owner))
        )));
    }

    /**
     * @notice Calculate the counterfactual address
     * @param owner The owner of the account
     * @param salt Salt for CREATE2
     * @return The account address
     */
    function getAddress(address owner, uint256 salt) public view returns (address) {
        return Create2.computeAddress(
            bytes32(salt),
            keccak256(
                abi.encodePacked(
                    type(ERC1967Proxy).creationCode,
                    abi.encode(
                        address(accountImplementation),
                        abi.encodeCall(SimpleAccount.initialize, (owner))
                    )
                )
            ),
            address(this)
        );
    }
} 