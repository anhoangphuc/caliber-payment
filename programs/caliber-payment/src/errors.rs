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
    #[msg("Invalid oracle config")]
    InvalidOracleConfig,
    #[msg("Order expired")]
    OrderExpired,
    #[msg("Out of price range")]
    OutOfPriceRange,
    #[msg("No token x amount")]
    NoTokenXAmount,
}
