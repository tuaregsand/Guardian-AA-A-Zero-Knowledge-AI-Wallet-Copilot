# AGENTS.md
## 1 – Purpose
Codex agents reading this file are expected to **implement, test, and optimise the Guardian-AA wallet copilot** across the whole stack (Rust zkML prover → Solidity smart-account → mobile UI & bridge SDK).  
Follow every rule below unless a task ticket overrides it explicitly.  
_Read this file top-down before touching code._

---

## 2 – Repository map
| Directory | Description | Primary language | Build / Test command |
|-----------|-------------|------------------|----------------------|
| `contracts/` | ERC-4337 smart account, paymaster & zkML verifier | Solidity (+ Yul) | `forge test -vv` |
| `prover/` | Halo2/EZKL circuits, Rust FFI, CUDA kernels | Rust (+ C++) | `cargo test --all` |
| `mobile/` | Native bindings + React-Native wallet UI | Kotlin / Swift / TS | `npm test` |
| `sdk/` | JS/TS helper for dApps | TypeScript | `npm run test` |

All unit tests **must pass** before proposing a PR. Codex will run the commands above automatically (see OpenAI Codex doc on “honouring lint/test commands”). :contentReference[oaicite:0]{index=0}

---

## 3 – Workflow & task lifecycle
1. **Tasks arrive via GitHub Issues** with an “_acceptance criteria_” section.  
2. Codex clones the repo into its sandbox, works on a *feature branch* named `codex/<ticket-id>`. :contentReference[oaicite:1]{index=1}  
3. It writes tests **first**, then code, then iterates until all tests pass. :contentReference[oaicite:2]{index=2}  
4. The agent opens a Pull Request with:  
   * descriptive title  
   * checklist of changed subsystems  
   * link to the issue  
   * “## Self-review” section explaining reasoning.  
5. PR must keep CI green; if not, the agent continues pushing fixes until green. :contentReference[oaicite:3]{index=3}  
6. Human maintainers review & merge.

---

## 4 – Global coding rules
* **Language versions**: Rust 1.78+, Solidity ^0.8.25, Node 18, Kotlin 1.10.  
* **Formatting**: run `rustfmt`, `prettier`, `ktlint`, `solhint`.  
* **Commits**: Conventional Commits (`feat: …`, `fix: …`).  
* **Tests**: every new public function or contract method gets coverage ≥90 %.  
* **Security**:  
  * No network access inside tests (Codex sandbox is network-disabled). :contentReference[oaicite:4]{index=4}  
  * Handle secrets via environment variables only, never commit keys.  
  * Run `forge-fmt && forge test --ffi fuzz` for contracts.  
* **Performance budgets**:  
  * zk proof ≤ 3 s on Snapdragon 8 Gen 3 (Android) & Apple A17 (iOS).  
  * Gas cost for proof verification ≤ 240 k.  
* **Style guides**: follow Airbnb TS style; Solmate patterns for Solidity.

---

## 5 – Subsystem-specific guidance
### 5.1 Smart-contracts (`contracts/`)
* Use **Foundry** for build & tests.  
* Optimise with Yul inline assembly only when it cuts*
