use sha2::{Digest, Sha256};
use crate::Output;

pub struct Sha256Circuit<'a> {
    pub data: &'a [u8],
}

impl<'a> Sha256Circuit<'a> {
    pub fn prove(&self) -> Output {
        let mut hasher = Sha256::new();
        hasher.update(self.data);
        let hash = hasher.finalize();
        Output {
            len: self.data.len(),
            hash: hash.into(),
        }
    }

    pub fn verify(&self, output: &Output) -> bool {
        let expected = self.prove();
        expected.len == output.len && expected.hash == output.hash
    }
}
