use sha2::{Digest, Sha256};

#[repr(C)]
pub struct Input {
    pub data: *const u8,
    pub len: usize,
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct Output {
    pub len: usize,
    pub hash: [u8; 32],
}

pub fn generate_proof_slice(data: &[u8]) -> Output {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let hash = hasher.finalize();
    Output { len: data.len(), hash: hash.into() }
}

pub fn verify_proof(data: &[u8], output: &Output) -> bool {
    let expected = generate_proof_slice(data);
    expected.len == output.len && expected.hash == output.hash
}

#[no_mangle]
pub extern "C" fn generate_proof(input_ptr: *const Input, output_ptr: *mut Output) -> i32 {
    // SAFETY: caller must provide valid pointers
    if input_ptr.is_null() || output_ptr.is_null() {
        return -1;
    }
    let input = unsafe { &*input_ptr };
    if input.data.is_null() {
        return -1;
    }
    let data = unsafe { std::slice::from_raw_parts(input.data, input.len) };
    let out = generate_proof_slice(data);
    unsafe {
        *output_ptr = out;
    }
    0
}
