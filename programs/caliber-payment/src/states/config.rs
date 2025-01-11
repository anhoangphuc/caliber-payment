use anchor_lang::prelude::*;

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
        self.admin = admin;
        self.fee_recipient = fee_recipient;
        // TODO: validate protocol fee rate
        self.protocol_fee_rate = protocol_fee_rate;
        Ok(())
    }
}
