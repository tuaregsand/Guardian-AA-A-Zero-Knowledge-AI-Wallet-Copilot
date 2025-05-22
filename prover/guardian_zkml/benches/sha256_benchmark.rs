use criterion::{black_box, criterion_group, criterion_main, Criterion};
// This should match the name of your library crate, often derived from the package name in Cargo.toml
// e.g., if your package name is "guardian_zkml", the lib name might be "guardian_zkml"
// or if you have a specific lib target name in Cargo.toml, use that.
// For this example, I'll assume the library can be accessed via `guardian_zkml`.
// You might need to adjust this to `crate_name` or however your lib is exposed.
use guardian_zkml; // Assuming lib.rs functions are part of this crate

fn benchmark_sha256_proof_generation(c: &mut Criterion) {
    // Prepare some input data
    let data = b"hello world benchmark data for sha256 proof generation";

    // IMPORTANT PRE-REQUISITE:
    // The EZKL setup (keys, settings, SRS) must be completed MANUALLY before running benchmarks.
    // The `setup_keys_if_needed` function in lib.rs currently only checks for existence
    // and doesn't perform the actual generation for raw Halo2 circuits.
    // Ensure circuit.pk, circuit.vk, settings.json, and kzg.srs are present and correct.
    // You might need to run appropriate EZKL CLI commands manually based on your MyCircuit structure.
    // Example (conceptual - actual commands depend on EZKL's support for raw Halo2):
    // 1. Manually create/determine settings.json for MyCircuit (logrows, public inputs etc.)
    // 2. ezkl setup --compiled-circuit <path_to_compiled_MyCircuit_if_any> --srs-path kzg.srs --pk-path circuit.pk --vk-path circuit.vk --settings-path settings.json

    // A simple check to remind the user if files are missing, though `generate_proof_ezkl` also checks.
    if !std::path::Path::new("circuit.pk").exists() {
        panic!("Missing circuit.pk. Please ensure EZKL setup is complete before benchmarking.");
    }
    if !std::path::Path::new("kzg.srs").exists() {
        panic!("Missing kzg.srs. Please ensure EZKL setup is complete before benchmarking.");
    }

    let mut group = c.benchmark_group("sha256_proof_generation");
    // Configure the group, e.g., sample size
    // group.sample_size(10);

    group.bench_function("generate_proof_ezkl_sha256", |b| {
        b.iter(|| {
            match guardian_zkml::generate_proof_ezkl(black_box(data)) {
                Ok((_hash, _proof_bytes)) => (),
                Err(e) => panic!(\"Benchmark iteration failed: {}\", e),
            }
        })
    });
    group.finish();
}

criterion_group!(benches, benchmark_sha256_proof_generation);
criterion_main!(benches); 