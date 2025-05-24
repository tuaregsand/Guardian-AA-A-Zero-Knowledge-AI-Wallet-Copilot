use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
// This should match the name of your library crate, often derived from the package name in Cargo.toml
// e.g., if your package name is "guardian_zkml", the lib name might be "guardian_zkml"
// or if you have a specific lib target name in Cargo.toml, use that.
// For this example, I'll assume the library can be accessed via `guardian_zkml`.
// You might need to adjust this to `crate_name` or however your lib is exposed.
use guardian_zkml; // Assuming lib.rs functions are part of this crate
use guardian_zkml::{benchmark_proof_generation, generate_proof_slice};
use std::time::Duration;

fn benchmark_sha256_proof_generation(c: &mut Criterion) {
    // Test data of various sizes
    let test_cases = vec![
        ("empty", vec![]),
        ("small", b"hello world".to_vec()),
        ("medium", b"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.".to_vec()),
        ("large", vec![0u8; 1024]), // 1KB of zeros
    ];

    let mut group = c.benchmark_group("sha256_proof_generation");
    
    // Configure benchmark parameters
    group.sample_size(10);
    group.measurement_time(Duration::from_secs(30));
    group.warm_up_time(Duration::from_secs(5));

    for (name, data) in test_cases {
        group.bench_with_input(
            BenchmarkId::new("generate_proof", name),
            &data,
            |b, data| {
                b.iter(|| {
                    match benchmark_proof_generation(black_box(data)) {
                        Ok(duration) => {
                            if duration.as_millis() > 500 {
                                println!("WARNING: Proof time for {} data: {:?} exceeds 500ms target", name, duration);
                            }
                        }
                        Err(e) => panic!("Benchmark failed for {}: {}", name, e),
                    }
                })
            },
        );

        group.bench_with_input(
            BenchmarkId::new("hash_only", name),
            &data,
            |b, data| {
                b.iter(|| {
                    let _output = generate_proof_slice(black_box(data));
                })
            },
        );
    }

    group.finish();
}

fn benchmark_proof_verification(c: &mut Criterion) {
    let test_data = b"verification test data".to_vec();
    
    // Pre-generate proof for verification benchmark
    let output = generate_proof_slice(&test_data);
    
    let mut group = c.benchmark_group("sha256_proof_verification");
    group.sample_size(20);

    group.bench_function("verify_proof", |b| {
        b.iter(|| {
            guardian_zkml::verify_proof_slice(black_box(&test_data), black_box(&output))
        })
    });

    group.finish();
}

fn performance_test(_c: &mut Criterion) {
    println!("\n=== Performance Test Results ===");
    
    let test_cases = vec![
        ("empty", vec![]),
        ("small", b"hello".to_vec()),
        ("medium", b"This is a medium-sized test string for SHA256 proof generation.".to_vec()),
        ("large", vec![42u8; 512]),
    ];

    for (name, data) in test_cases {
        print!("Testing {} data ({} bytes)... ", name, data.len());
        
        match benchmark_proof_generation(&data) {
            Ok(duration) => {
                let ms = duration.as_millis();
                println!("{:?} ({}ms)", duration, ms);
                
                if ms <= 500 {
                    println!("  ✓ PASS: Under 500ms target");
                } else {
                    println!("  ✗ FAIL: Exceeds 500ms target by {}ms", ms - 500);
                }
            }
            Err(e) => {
                println!("ERROR: {}", e);
            }
        }
    }
    
    println!("=== End Performance Test ===\n");
}

criterion_group!(
    benches, 
    benchmark_sha256_proof_generation,
    benchmark_proof_verification,
    performance_test
);
criterion_main!(benches); 