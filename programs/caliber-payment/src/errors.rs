use anchor_lang::prelude::*;

#[error_code]
#[derive(PartialEq)]
pub enum PaymentError {
    #[msg("Invalid protocol fee rate")]
    InvalidProtocolFeeRate,
    #[msg("Invalid admin")]
    InvalidAdmin,
    #[msg("Math overflow")]
    MathOverflow,
}
