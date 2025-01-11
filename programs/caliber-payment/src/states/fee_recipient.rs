use anchor_lang::prelude::*;

#[account]
pub struct FeeRecipient {
    pub _reserved: [u128; 8],
}

impl FeeRecipient {
    pub const SEEDS: &'static str = "FEE_RECIPIENT";
    pub const SPACE: usize = 8 + 16 * 8;
}
