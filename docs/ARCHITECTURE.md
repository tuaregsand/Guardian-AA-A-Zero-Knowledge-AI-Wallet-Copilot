# Guardian-AA Architecture

## High-Level Overview

```
┌─────────┐          ┌────────────┐      ┌───────────────┐
│  Data   │  feeds   │   Agents   │ ZK   │ Recursion &   │ final    ┌────────────────┐
│sources  │ ───────► │ (LLM/NN)   │────► │ Aggregator    │ proof ──►│Smart-contract  │
└─────────┘          └────────────┘      └───────────────┘          └────────────────┘
                      (universal SRS, PoT-bootstrapped)
```

---

## Workflow and Technical Steps

| Step                    | Action                                                                                                                                                                       | Guardian-AA Reference                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **SRS Setup**           | Fork or join existing perpetual PoT ceremony; extend to \~2^20 powers for universal key.                                                                                     | *Universal SRS (One-and-Done Setup)* |
| **Circuit Granularity** | Create one circuit per agent **per modality**: <br>• News BERT-style classifier (int8)<br>• Factor MLP (≤50k constraints)<br>• Vision CNN for candlestick charts (quantised) | *Layered Circuit Design*             |
| **Recursion**           | Use Halo 2 "accumulator" gadget; inner proofs verified within outer circuit (\~7k constraints/proof).                                                                        | *Recursive Aggregator Circuit*       |

---

## Detailed Technical Instructions

### Porting Multi-Agent Logic into Circuits

* **Freeze** fine-tuned expert models after training (§3.3 agent paper).
* Use **EZKL** to export ONNX → Halo 2 circuit, quantised to 8-bit (< 2^17 rows).
* Encode arithmetic constraints for:

  * Log-prob-to-linear-prob transform
  * 0.5 threshold decision (§3.4.1 Eq.2)
* Circuit public outputs:

  * Binary decision (rise/fall)
  * 16-bit fixed-point probability
  * SHA-256 hash of natural-language explanation (text remains off-chain)
* Add "glue" circuit enforcing ensemble rules (probability mean, top-quintile logic Eq.4) with outputs:

  * Selected asset-set commitment
  * Cash/crypto ratio

### Proof Workflow in Production

| Device                        | Tasks Performed                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| User phone / edge node        | Runs agents, generates witness per circuit, produces inner proofs sequentially (low RAM). |
| Relayer / L2 sequencer (opt.) | Performs final recursion to shrink proof size (Goblin Plonk style).                       |
| On-chain contract             | Verifies single proof, triggers vault rebalancing; proofs are challengeable.              |

---

## Data & Privacy Considerations

* Only hashes of raw market/news data are public; full text remains off-chain but committed to by proof.
* Explanations human-readable in UI; hashes prevent post-hoc edits ("honest disclosure").

---

## Developer Milestones

| Milestone | Deliverable                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------ |
| **M1**    | Compile one agent (e.g., Crypto-Factor) into Halo 2; produce and verify standalone proof.        |
| **M2**    | Run PoT bootstrapping ceremony; publish universal params.                                        |
| **M3**    | Implement recursion circuit verifying ≥2 agent proofs.                                           |
| **M4**    | End-to-end demo: Phone proves News + Market-Factor + recursion; contract verifies & emits event. |
| **M5**    | Security audit of aggregator circuit; gas-profiling on L2.                                       |

---

## Trade-offs & Recommendations

* **Model size vs. Prover time:**

  * Target <60 s per inner proof on modern phones (use 8-bit quantisation & layer splitting).
* **Explainability:**

  * Proof guarantees displayed text matches proof hash; semantics remain open research.
* **Upgradability:**

  * Reuse SRS when retraining agents; regenerate proving/verifying keys only.
* **Gas Costs:**

  * Halo 2 KZG proof (\~1kb) costs \~200k gas on Ethereum L1 (<\$0.05 on L2).

---

## Document Purpose and Scope

This document outlines Guardian-AA's technical architecture, serving as:

1. **Comprehensive context for contributors and future AI agents**.
2. **Foundational reference** for ZKML pipeline, wallet interaction → Halo 2 proof verification.
3. **Implicit guidance for technology and language choices**, such as:

   * Smart Contracts: **Solidity**
   * ZK Provers/Verifiers: **Rust**
   * Mobile (Android): **Kotlin**

Refer to project standards document or Architecture Decision Records (ADRs) for detailed rationale.

---

## System Flow

```mermaid
graph TD
    subgraph User Device
        A[User Wallet Interaction] --> B{Initiate ZKML Proof};
        B --> C[EZKL: Model to Circuit];
        C --> D[Segmented Circuit Proving];
        D -- Universal SRS --> D;
        D -- π1 --> E;
        D -- π2 --> E;
        D -- ... --> E;
        D -- πN --> E;
        E[Intermediate Proofs {π1...πN}] --> F{Aggregation};
        F -- Universal SRS --> F;
        F -- Π_final --> G{Proof Submission};
    end

    subgraph Verification Layer
        G --> H[Smart Contract / Verifier App];
        H -- Verification Key (from Universal SRS) --> H;
        H --> I{Verification Result};
    end

    A ==> H;
```

### Flow Summary:

1. **User wallet triggers ZKML proof generation**.
2. **Model converted to Halo 2 circuit via EZKL**.
3. **Proof generation per circuit segment** using universal SRS.
4. **Intermediate proofs aggregated into single final proof**.
5. **Final proof submitted for verification**.
6. **Smart contract/verifier confirms validity** and triggers necessary actions.

---

## Core Technologies & References

* **Halo 2:** Recursive proofs and cryptographic primitives ([Halo2 Book](https://zcash.github.io/halo2/))
* **EZKL:** Model to ZK circuits ([EZKL GitHub](https://github.com/zkonduit/ezkl))
* **Powers-of-Tau (PoT) Ceremony:** Universal SRS generation ([Lite-PoT arXiv](https://arxiv.org/abs/2503.04549))

---

## Trust Boundaries & Security

| Component                        | Trust Boundary                          | Key Threat Actors                              |
| -------------------------------- | --------------------------------------- | ---------------------------------------------- |
| User Device & Wallet Software    | Device & app integrity                  | Malware, compromised OS/app                    |
| Universal SRS                    | Integrity of PoT ceremony               | Ceremony collusion, malicious participation    |
| EZKL (Model-to-Circuit Compiler) | Correctness of model translation        | Compromised tool, compiler bugs                |
| Halo 2 Prover/Verifier Libraries | Cryptographic soundness                 | Implementation bugs                            |
| Smart Contract / Verifier App    | Verification logic implementation       | Smart contract bugs, verifier misconfiguration |
| Off-Chain Aggregation (Optional) | Server aggregation integrity & security | Malicious servers, MITM attacks                |

Rigorous auditing of key components is essential for maintaining Guardian-AA's integrity and security.
