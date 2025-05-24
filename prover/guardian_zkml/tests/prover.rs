use guardian_zkml::{
    bytes_required, generate_proof, generate_proof_slice, verify_proof_ffi, verify_proof_slice,
    Input, Output,
};
use hex;
use sha2::{Digest, Sha256};

#[test]
fn test_proof_round_trip() {
    let data = b"hello world";
    let out = generate_proof_slice(data);
    assert_eq!(out.len, data.len());
    let mut hasher = Sha256::new();
    hasher.update(data);
    let expected = hasher.finalize();
    assert_eq!(out.hash.as_slice(), expected.as_slice());
    assert!(verify_proof_slice(data, &out));
}

#[test]
fn test_generate_proof_ffi() {
    let data = b"ffi test";
    let input = Input {
        data: data.as_ptr(),
        len: data.len(),
    };
    let mut output = Output {
        len: 0,
        hash: [0u8; 32],
    };
    let ret = unsafe { generate_proof(&input as *const Input, &mut output as *mut Output) };
    assert_eq!(ret, 0);
    assert_eq!(output.len, data.len());
    let mut hasher = Sha256::new();
    hasher.update(data);
    let expected = hasher.finalize();
    assert_eq!(output.hash.as_slice(), expected.as_slice());
    assert!(verify_proof_slice(data, &output));

    // test FFI verification
    let verify_ret = unsafe { verify_proof_ffi(&input as *const Input, &output as *const Output) };
    assert_eq!(verify_ret, 0);

    // ensure bytes_required matches Output size
    assert_eq!(bytes_required(), std::mem::size_of::<Output>());
}

#[test]
fn test_empty_input() {
    let data = b"";
    let out = generate_proof_slice(data);
    assert_eq!(out.len, 0);

    // Verify against known SHA256 of empty string
    let expected_hash =
        hex::decode("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855").unwrap();
    assert_eq!(out.hash.as_slice(), expected_hash.as_slice());
    assert!(verify_proof_slice(data, &out));
}

#[test]
fn test_various_input_sizes() {
    let test_cases = vec![
        b"a".to_vec(),
        b"hello".to_vec(),
        b"hello world".to_vec(),
        vec![42u8; 64],  // One block
        vec![42u8; 128], // Two blocks
    ];

    for data in test_cases {
        let out = generate_proof_slice(&data);
        assert_eq!(out.len, data.len());

        // Verify hash computation
        let mut hasher = Sha256::new();
        hasher.update(&data);
        let expected = hasher.finalize();
        assert_eq!(out.hash.as_slice(), expected.as_slice());

        assert!(verify_proof_slice(&data, &out));
    }
}
