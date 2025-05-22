use serde::Serialize;
use serde_json;
use std::fs::File;
use std::io::Write;
use std::path::Path;

#[derive(Serialize, Debug)]
struct AbiInputOutput {
    name: String,
    #[serde(rename = "type")]
    type_info: String,
    description: String,
}

#[derive(Serialize, Debug)]
struct Abi {
    #[serde(rename = "circuitName")]
    circuit_name: String,
    description: String,
    #[serde(rename = "publicInputs")]
    public_inputs: Vec<AbiInputOutput>,
    #[serde(rename = "privateInputs")]
    private_inputs: Vec<AbiInputOutput>,
}

fn main() -> std::io::Result<()> {
    let mut public_inputs = Vec::new();
    for i in 0..32 {
        public_inputs.push(AbiInputOutput {
            name: format!("hash_byte_{}", i),
            type_info: "byte".to_string(),
            description: format!("The {}st/nd/rd/th byte of the 32-byte SHA256 hash output.", i + 1),
        });
    }

    let private_inputs = vec![AbiInputOutput {
        name: "preimage_data".to_string(),
        type_info: "bytes".to_string(),
        description: "The data to be hashed. The Halo2 circuit (MyCircuit) is responsible for correct padding and processing of this data. The length can vary up to the circuit\'s capacity.".to_string(),
    }];

    let abi = Abi {
        circuit_name: "Sha256GuardianCircuit".to_string(),
        description: "A Halo2 circuit that proves the computation of a SHA256 hash. The public inputs are the 32 bytes of the resulting hash.".to_string(),
        public_inputs,
        private_inputs,
    };

    let abi_json = serde_json::to_string_pretty(&abi)?;

    // Determine the path relative to the crate root.
    // This assumes the binary will be run from the crate root (e.g. `cargo run --bin generate-abi`)
    // or that the working directory is the crate root.
    let output_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("abi.json");
    
    println!("Generating ABI at: {:?}", output_path);

    let mut file = File::create(&output_path)?;
    file.write_all(abi_json.as_bytes())?;

    println!("Successfully generated abi.json");
    Ok(())
} 