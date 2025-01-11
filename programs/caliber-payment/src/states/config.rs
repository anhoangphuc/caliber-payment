use anchor_lang::prelude::*;

use crate::constants::BPS_BASE;
use crate::errors::PaymentError;

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub fee_recipient: Pubkey,
    // bps points, 10000 = 100%
    pub protocol_fee_rate: u16,
    pub _reserved: [u128; 8],
}

impl Config {
    pub const SEEDS: &'static str = "CONFIG";
    pub const SPACE: usize = 8 + 32 * 2 + 2 + 16 * 8;

    pub fn initialize(
        &mut self,
        admin: Pubkey,
        fee_recipient: Pubkey,
        protocol_fee_rate: u16,
    ) -> Result<()> {
        require!(
            protocol_fee_rate <= BPS_BASE,
            PaymentError::InvalidProtocolFeeRate
        );
        self.admin = admin;
        self.fee_recipient = fee_recipient;
        self.protocol_fee_rate = protocol_fee_rate;
        Ok(())
    }
}
