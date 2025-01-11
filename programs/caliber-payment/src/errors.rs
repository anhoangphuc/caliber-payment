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
    #[msg("Invalid token pair")]
    InvalidTokenPair,
    #[msg("Unsupported token")]
    UnsupportedToken,
    #[msg("Invalid price range")]
    InvalidPriceRange,
}
