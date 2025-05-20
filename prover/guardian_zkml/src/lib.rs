mod circuit;

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
    circuit::Sha256Circuit { data }.prove()
}

pub fn verify_proof_slice(data: &[u8], output: &Output) -> bool {
    circuit::Sha256Circuit { data }.verify(output)
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

#[no_mangle]
pub extern "C" fn verify_proof(input_ptr: *const Input, output_ptr: *const Output) -> i32 {
    // SAFETY: caller must provide valid pointers
    if input_ptr.is_null() || output_ptr.is_null() {
        return -1;
    }
    let input = unsafe { &*input_ptr };
    if input.data.is_null() {
        return -1;
    }
    let data = unsafe { std::slice::from_raw_parts(input.data, input.len) };
    let output = unsafe { &*output_ptr };
    if verify_proof_slice(data, output) {
        0
    } else {
        1
    }
}

#[no_mangle]
pub extern "C" fn bytes_required() -> usize {
    std::mem::size_of::<Output>()
}
