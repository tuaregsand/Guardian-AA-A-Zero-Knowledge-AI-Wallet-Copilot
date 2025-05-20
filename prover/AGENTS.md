## prover/ – additional agent guidance
* **Build / test command**: `cargo test --all && cargo bench`  
* **Rust version**: nightly-2025-05-15; MSRV = 1.78.  
* **Proof latency target**: < 3 s on Snapdragon 8 Gen 3 (Android) and Apple A17 (iOS).  
* **GPU kernels** go in `cuda/` and must compile with  
  `nvcc -O3 --ptxas-options="-v"`  
* **Expose** FFI entry-points:  
  `generate_proof`, `verify_proof`, `bytes_required`.  
* **Forbidden**: `unsafe` blocks without an accompanying `// SAFETY:` comment.
