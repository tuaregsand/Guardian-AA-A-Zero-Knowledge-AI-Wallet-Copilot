use guardian_zkml::{generate_proof_slice, verify_proof, Output, Input, generate_proof};
use sha2::{Sha256, Digest};

#[test]
fn test_proof_round_trip() {
    let data = b"hello world";
    let out = generate_proof_slice(data);
    assert_eq!(out.len, data.len());
    let mut hasher = Sha256::new();
    hasher.update(data);
    let expected = hasher.finalize();
    assert_eq!(out.hash.as_slice(), expected.as_slice());
    assert!(verify_proof(data, &out));
}

#[test]
fn test_generate_proof_ffi() {
    let data = b"ffi test";
    let input = Input { data: data.as_ptr(), len: data.len() };
    let mut output = Output { len: 0, hash: [0u8; 32] };
    let ret = unsafe { generate_proof(&input as *const Input, &mut output as *mut Output) };
    assert_eq!(ret, 0);
    assert_eq!(output.len, data.len());
    let mut hasher = Sha256::new();
    hasher.update(data);
    let expected = hasher.finalize();
    assert_eq!(output.hash.as_slice(), expected.as_slice());
    assert!(verify_proof(data, &output));
}
