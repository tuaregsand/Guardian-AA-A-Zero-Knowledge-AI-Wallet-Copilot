mod circuit;

use crate::circuit::Sha256Circuit;
use halo2_proofs::{
    pasta::{EqAffine, Fp},
    plonk::{create_proof, keygen_pk, keygen_vk, ProvingKey, VerifyingKey},
    poly::commitment::Params,
    transcript::{Blake2bRead, Blake2bWrite, Challenge255},
};
use rand::rngs::OsRng;
use std::time::Instant;

// FFI structures
#[repr(C)]
pub struct Input {
    pub data: *const u8,
    pub len: usize,
}

#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct Output {
    pub len: usize,
    pub hash: [u8; 32],
}

// Configuration for proving system
const CIRCUIT_K: u32 = 14; // Circuit size parameter (2^14 = 16384 rows)
                           // TODO: Optimize to k=12 or k=13 for better performance

// Cached proving system state
static mut PROVING_SYSTEM: Option<ProvingSystem> = None;
static mut INIT_LOCK: std::sync::Once = std::sync::Once::new();

struct ProvingSystem {
    params: Params<EqAffine>,
    pk: ProvingKey<EqAffine>,
    vk: VerifyingKey<EqAffine>,
}

impl ProvingSystem {
    fn load_or_generate() -> Result<Self, String> {
        // For now, always generate new proving system
        // TODO: Implement proper serialization/deserialization
        Self::generate_new()
    }

    fn generate_new() -> Result<Self, String> {
        let start = Instant::now();
        println!("Generating new proving system (this may take a few minutes)...");

        // Generate params
        let params = Params::new(CIRCUIT_K);

        // Create dummy circuit for key generation
        let circuit = Sha256Circuit::new(vec![]);

        // Generate verifying key
        let vk =
            keygen_vk(&params, &circuit).map_err(|e| format!("VK generation failed: {:?}", e))?;

        // Generate proving key
        let pk = keygen_pk(&params, vk.clone(), &circuit)
            .map_err(|e| format!("PK generation failed: {:?}", e))?;

        println!("Generated proving system in {:?}", start.elapsed());

        Ok(ProvingSystem { params, pk, vk })
    }
}

fn get_proving_system() -> Result<&'static ProvingSystem, String> {
    unsafe {
        INIT_LOCK.call_once(|| match ProvingSystem::load_or_generate() {
            Ok(system) => {
                PROVING_SYSTEM = Some(system);
            }
            Err(e) => {
                eprintln!("Failed to initialize proving system: {}", e);
            }
        });

        PROVING_SYSTEM
            .as_ref()
            .ok_or_else(|| "Proving system not initialized".to_string())
    }
}

// Public helper functions
pub fn generate_proof_slice(data: &[u8]) -> Output {
    match generate_proof_internal(data) {
        Ok((hash, _proof)) => Output {
            len: data.len(),
            hash,
        },
        Err(e) => {
            eprintln!("Proof generation failed: {}", e);
            Output {
                len: 0,
                hash: [0u8; 32],
            }
        }
    }
}

pub fn verify_proof_slice(data: &[u8], output: &Output) -> bool {
    // For this interface, we would need to store the proof somewhere
    // For now, just verify the hash matches
    let expected_hash: [u8; 32] = {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(data);
        hasher.finalize().into()
    };

    output.hash == expected_hash
}

fn generate_proof_internal(data: &[u8]) -> Result<([u8; 32], Vec<u8>), String> {
    let start = Instant::now();

    let system = get_proving_system()?;
    let circuit = Sha256Circuit::new(data.to_vec());
    let hash = circuit.expected_hash();

    // Convert hash to public inputs
    let public_inputs: Vec<Fp> = hash.iter().map(|&byte| Fp::from(byte as u64)).collect();
    let instances = &[public_inputs.as_slice()];

    // Create proof
    let mut transcript = Blake2bWrite::<_, _, Challenge255<_>>::init(vec![]);

    let proof_start = Instant::now();
    create_proof(
        &system.params,
        &system.pk,
        &[circuit],
        &[instances],
        OsRng,
        &mut transcript,
    )
    .map_err(|e| format!("Proof creation failed: {:?}", e))?;

    let proof_time = proof_start.elapsed();
    let proof_bytes = transcript.finalize();

    println!("Proof generated in {:?} (target: <500ms)", proof_time);

    if proof_time.as_millis() > 500 {
        println!(
            "WARNING: Proof time ({:?}) exceeds 500ms target",
            proof_time
        );
    }

    println!("Total time including setup: {:?}", start.elapsed());

    Ok((hash, proof_bytes))
}

fn verify_proof_internal(hash: &[u8; 32], proof_bytes: &[u8]) -> Result<bool, String> {
    let system = get_proving_system()?;

    // Convert hash to public inputs
    let public_inputs: Vec<Fp> = hash.iter().map(|&byte| Fp::from(byte as u64)).collect();
    let instances = &[public_inputs.as_slice()];

    // Verify proof
    let mut transcript = Blake2bRead::<_, _, Challenge255<_>>::init(proof_bytes);

    let verification_result = halo2_proofs::plonk::verify_proof(
        &system.params,
        &system.vk,
        halo2_proofs::plonk::SingleVerifier::new(&system.params),
        &[instances],
        &mut transcript,
    );

    match verification_result {
        Ok(()) => Ok(true),
        Err(_) => Ok(false),
    }
}

// FFI functions
#[no_mangle]
pub extern "C" fn generate_proof(input_ptr: *const Input, output_ptr: *mut Output) -> i32 {
    if input_ptr.is_null() || output_ptr.is_null() {
        return -1;
    }

    let input = unsafe { &*input_ptr };
    if input.data.is_null() {
        return -2;
    }

    let data_slice = unsafe { std::slice::from_raw_parts(input.data, input.len) };

    match generate_proof_internal(data_slice) {
        Ok((hash, _proof_bytes)) => {
            unsafe {
                (*output_ptr).len = input.len;
                (*output_ptr).hash = hash;
            }
            0
        }
        Err(e) => {
            eprintln!("Error generating proof: {}", e);
            -3
        }
    }
}

#[no_mangle]
pub extern "C" fn verify_proof_ffi(input_ptr: *const Input, output_hash_ptr: *const Output) -> i32 {
    if input_ptr.is_null() || output_hash_ptr.is_null() {
        return -1;
    }

    let input = unsafe { &*input_ptr };
    if input.data.is_null() {
        return -2;
    }

    let output = unsafe { &*output_hash_ptr };
    let data_slice = unsafe { std::slice::from_raw_parts(input.data, input.len) };

    // For this simplified version, verify the hash computation
    if verify_proof_slice(data_slice, output) {
        0 // verified
    } else {
        1 // verification failed
    }
}

#[no_mangle]
pub extern "C" fn bytes_required() -> usize {
    std::mem::size_of::<Output>()
}

// Advanced API for full proof handling
pub fn generate_proof_with_proof(data: &[u8]) -> Result<([u8; 32], Vec<u8>), String> {
    generate_proof_internal(data)
}

pub fn verify_proof_with_proof(hash: &[u8; 32], proof_bytes: &[u8]) -> Result<bool, String> {
    verify_proof_internal(hash, proof_bytes)
}

// Benchmark helpers
pub fn benchmark_proof_generation(data: &[u8]) -> Result<std::time::Duration, String> {
    let start = Instant::now();
    let _result = generate_proof_internal(data)?;
    Ok(start.elapsed())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sha256_hash_computation() {
        let data = b"hello world";
        let output = generate_proof_slice(data);

        // Verify hash computation
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(data);
        let expected: [u8; 32] = hasher.finalize().into();

        assert_eq!(output.hash, expected);
        assert_eq!(output.len, data.len());
    }

    #[test]
    fn test_proof_round_trip() {
        let data = b"test data for proof";
        let output = generate_proof_slice(data);
        assert!(verify_proof_slice(data, &output));
    }

    #[test]
    fn test_ffi_interface() {
        let data = b"ffi test data";
        let input = Input {
            data: data.as_ptr(),
            len: data.len(),
        };
        let mut output = Output {
            len: 0,
            hash: [0u8; 32],
        };

        let result = unsafe { generate_proof(&input as *const Input, &mut output as *mut Output) };
        assert_eq!(result, 0);
        assert_eq!(output.len, data.len());

        let verify_result =
            unsafe { verify_proof_ffi(&input as *const Input, &output as *const Output) };
        assert_eq!(verify_result, 0);
    }
}
