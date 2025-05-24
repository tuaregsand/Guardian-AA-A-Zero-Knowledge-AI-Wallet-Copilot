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
    #[serde(rename = "byteOffset")]
    byte_offset: usize,
    constraints: Option<String>,
}

#[derive(Serialize, Debug)]
struct CircuitMetadata {
    #[serde(rename = "circuitSize")]
    circuit_size: String,
    #[serde(rename = "constraintCount")]
    constraint_count: String,
    #[serde(rename = "performanceTarget")]
    performance_target: String,
}

#[derive(Serialize, Debug)]
struct Abi {
    #[serde(rename = "circuitName")]
    circuit_name: String,
    version: String,
    description: String,
    #[serde(rename = "publicInputs")]
    public_inputs: Vec<AbiInputOutput>,
    #[serde(rename = "privateInputs")]
    private_inputs: Vec<AbiInputOutput>,
    metadata: CircuitMetadata,
    #[serde(rename = "securityProperties")]
    security_properties: Vec<String>,
}

fn main() -> std::io::Result<()> {
    // Public inputs: 32 bytes of SHA256 hash output
    let mut public_inputs = Vec::new();
    for i in 0..32 {
        public_inputs.push(AbiInputOutput {
            name: format!("hash_byte_{}", i),
            type_info: "field_element".to_string(),
            description: format!("Byte {} of the 32-byte SHA256 hash output (big-endian format). Each byte is represented as a field element in the range [0, 255].", i),
            byte_offset: i,
            constraints: Some("0 ≤ value ≤ 255".to_string()),
        });
    }

    let private_inputs = vec![AbiInputOutput {
        name: "preimage_data".to_string(),
        type_info: "bytes".to_string(),
        description: "The input data to be hashed. This can be any sequence of bytes. The circuit automatically handles SHA256 padding according to RFC 6234. Maximum supported input size depends on circuit parameters (k=14 supports up to ~8KB of input data).".to_string(),
        byte_offset: 0,
        constraints: Some("Variable length byte array, automatically padded to 512-bit blocks".to_string()),
    }];

    let metadata = CircuitMetadata {
        circuit_size: "2^14 = 16,384 rows".to_string(),
        constraint_count: "~50,000 constraints".to_string(),
        performance_target: "< 500ms proof generation on modern hardware".to_string(),
    };

    let security_properties = vec![
        "Zero-knowledge: The proof reveals only the SHA256 hash, not the input data".to_string(),
        "Soundness: Invalid proofs are rejected with negligible probability".to_string(),
        "Completeness: Valid computations always produce acceptable proofs".to_string(),
        "SHA256 compliance: Implements the full SHA256 algorithm per RFC 6234".to_string(),
        "Proper padding: Handles message padding correctly for any input length".to_string(),
    ];

    let abi = Abi {
        circuit_name: "Guardian-AA SHA256 Circuit".to_string(),
        version: "1.0.0".to_string(),
        description: "A Halo2 zero-knowledge circuit that proves the correct computation of a SHA256 hash. The circuit takes arbitrary input data, applies proper SHA256 padding, and computes the hash using the standard SHA256 algorithm. The public outputs are the 32 bytes of the resulting hash, each represented as a field element. This circuit is optimized for performance with a target of sub-500ms proof generation.".to_string(),
        public_inputs,
        private_inputs,
        metadata,
        security_properties,
    };

    let abi_json = serde_json::to_string_pretty(&abi)?;

    // Determine the path relative to the crate root
    let output_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("abi.json");
    
    println!("Generating comprehensive ABI documentation at: {:?}", output_path);

    let mut file = File::create(&output_path)?;
    file.write_all(abi_json.as_bytes())?;

    println!("Successfully generated abi.json with detailed circuit specification");
    println!("Public inputs: 32 field elements (one per hash byte)");
    println!("Private inputs: Variable-length byte array");
    println!("Performance target: < 500ms proof generation");
    
    Ok(())
} 