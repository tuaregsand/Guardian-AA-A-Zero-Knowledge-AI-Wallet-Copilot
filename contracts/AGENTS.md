## contracts/ – additional agent guidance
* **Build / test command**: `forge test -vv`  
* **Target EVM**: London hard-fork, calldata size < 4 KB.  
* **Gas budget**: ≤ 240 000 for `verifyProof()` ; use Yul **only** when it saves ≥10 % gas.  
* **Security**: run `slither .` and `forge fuzz` before opening a PR.  
* **Forbidden**: no external calls inside constructors; no `tx.origin`; no upgradeable proxies in POC phase.
