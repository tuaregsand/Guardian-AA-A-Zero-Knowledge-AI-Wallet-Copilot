mod circuit;

use crate::circuit::MyCircuit;
use halo2_proofs::pasta::Fp;
use std::path::Path;
use std::process::Command;
use sha2::{Digest, Sha256};
use serde::Serialize;
use serde_json;

const SETTINGS_PATH: &str = "settings.json";
const SRS_PATH: &str = "kzg.srs";
const PK_PATH: &str = "circuit.pk";
const VK_PATH: &str = "circuit.vk";
const PROOF_PATH: &str = "proof.bin";
const WITNESS_PATH: &str = "witness.json";

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

fn compute_sha256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().into()
}

fn setup_keys_if_needed(data_len_for_circuit: usize) -> Result<(), String> {
    if !Path::new(PK_PATH).exists() || !Path::new(VK_PATH).exists() || !Path::new(SETTINGS_PATH).exists() {
        println!("Performing one-time setup for keys and settings...");

        let dummy_data = vec![0u8; data_len_for_circuit];
        let circuit = MyCircuit::<Fp> {
            data: dummy_data,
            _marker: std::marker::PhantomData,
        };

        println!("Key setup: PK, VK, and settings files must be pre-generated using EZKL tools for MyCircuit.");
        println!("Please ensure '{}', '{}', and '{}' exist and '{}' is available.", PK_PATH, VK_PATH, SETTINGS_PATH, SRS_PATH);
        if !Path::new(SRS_PATH).exists() { return Err(format!("SRS file missing: {}", SRS_PATH)); }
    }
    Ok(())
}

#[derive(Serialize)]
struct PublicInputsEzkl {
    instances: Vec<Vec<String>>,
}

pub fn generate_proof_ezkl(data_to_hash: &[u8]) -> Result<([u8; 32], Vec<u8>), String> {
    setup_keys_if_needed(data_to_hash.len()).map_err(|e| format!("Setup error: {}", e))?;

    let hash_output = compute_sha256(data_to_hash);

    let public_inputs_for_ezkl: Vec<String> = hash_output.iter().map(|byte| format!("{}", byte)).collect();
    let witness_data = PublicInputsEzkl {
        instances: vec![public_inputs_for_ezkl],
    };
    let witness_json = serde_json::to_string(&witness_data).map_err(|e| e.to_string())?;
    std::fs::write(WITNESS_PATH, witness_json).map_err(|e| e.to_string())?;

    let _circuit = MyCircuit::<Fp> {
        data: data_to_hash.to_vec(),
        _marker: std::marker::PhantomData,
    };

    println!("Attempting to generate proof using EZKL CLI (conceptual)...");
    let output = Command::new("ezkl")
        .args([
            "prove",
            "--data", WITNESS_PATH,
            "--pk-path", PK_PATH,
            "--proof-path", PROOF_PATH,
            "--srs-path", SRS_PATH,
            "--settings-path", SETTINGS_PATH,
        ])
        .output()
        .map_err(|e| format!("Failed to execute ezkl prove: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "ezkl prove failed: {}\nStdout: {}\nStderr: {}",
            output.status,
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let proof_bytes = std::fs::read(PROOF_PATH).map_err(|e| e.to_string())?;
    Ok((hash_output, proof_bytes))
}

pub fn verify_proof_ezkl(
    _original_data_len: usize,
    hash_to_verify: &[u8; 32],
    proof_bytes: &[u8],
) -> Result<bool, String> {
    std::fs::write(PROOF_PATH, proof_bytes).map_err(|e| e.to_string())?;

    let public_inputs_for_ezkl: Vec<String> = hash_to_verify.iter().map(|byte| format!("{}", byte)).collect();
    let inputs_ezkl = PublicInputsEzkl {
        instances: vec![public_inputs_for_ezkl],
    };
    let inputs_json = serde_json::to_string(&inputs_ezkl).map_err(|e| e.to_string())?;
    std::fs::write(WITNESS_PATH, inputs_json).map_err(|e| e.to_string())?;

    println!("Attempting to verify proof using EZKL CLI (conceptual)...");
    let output = Command::new("ezkl")
        .args([
            "verify",
            "--proof-path", PROOF_PATH,
            "--settings-path", SETTINGS_PATH,
            "--vk-path", VK_PATH,
            "--srs-path", SRS_PATH,
        ])
        .output()
        .map_err(|e| format!("Failed to execute ezkl verify: {}", e))?;

    if !output.status.success() {
        eprintln!(
            "ezkl verify command finished with non-zero status: {}\nStdout: {}\nStderr: {}",
            output.status,
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
        return Ok(false);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    if stdout.contains("VERIFIED") {
        Ok(true)
    } else {
        println!("Verification failed based on EZKL output. Stdout: {}", stdout);
        Ok(false)
    }
}

/// Convenience helper for tests to generate a proof from a byte slice.
/// Returns the `Output` containing the original length and SHA256 hash.
pub fn generate_proof_slice(data: &[u8]) -> Output {
    match generate_proof_ezkl(data) {
        Ok((hash, _proof)) => Output { len: data.len(), hash },
        Err(e) => panic!("Error generating proof: {}", e),
    }
}

/// Convenience helper for tests to verify a proof previously generated with
/// `generate_proof_slice`. Proof bytes are read from `PROOF_PATH`.
pub fn verify_proof_slice(data: &[u8], out: &Output) -> bool {
    match std::fs::read(PROOF_PATH) {
        Ok(proof_bytes) => match verify_proof_ezkl(data.len(), &out.hash, &proof_bytes) {
            Ok(valid) => valid,
            Err(e) => {
                eprintln!("Error verifying proof: {}", e);
                false
            }
        },
        Err(e) => {
            eprintln!("Failed to read proof file {}: {}", PROOF_PATH, e);
            false
        }
    }
}

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

    match generate_proof_ezkl(data_slice) {
        Ok((hash_array, _proof_bytes)) => {
    unsafe {
                (*output_ptr).len = input.len;
                (*output_ptr).hash = hash_array;
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
pub extern "C" fn verify_proof(input_ptr: *const Input, output_hash_ptr: *const Output) -> i32 {
    if input_ptr.is_null() || output_hash_ptr.is_null() {
        return -1;
    }
    let input = unsafe { &*input_ptr };
    if input.data.is_null() {
        return -2;
    }
    let expected_output = unsafe { &*output_hash_ptr };

    match std::fs::read(PROOF_PATH) {
        Ok(proof_bytes) => {
            match verify_proof_ezkl(input.len, &expected_output.hash, &proof_bytes) {
                Ok(true) => 0,
                Ok(false) => 1,
                Err(e) => {
                    eprintln!("Error verifying proof: {}", e);
                    -3
                }
            }
        }
        Err(e) => {
            eprintln!("Failed to read proof file {}: {}", PROOF_PATH, e);
            -4
        }
    }
}

#[no_mangle]
pub extern "C" fn bytes_required() -> usize {
    std::mem::size_of::<Output>()
}
