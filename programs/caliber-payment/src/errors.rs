use anchor_lang::prelude::*;

#[error_code]
pub enum PaymentError {
    #[msg("Invalid protocol fee rate")]
    InvalidProtocolFeeRate,
    #[msg("Invalid admin")]
    InvalidAdmin,
}
