use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

use crate::math::{Decimal, TryDiv};

#[account]
pub struct AllowedTokenConfig {
    pub token: Pubkey,
    pub pyth_oracle: Pubkey,
    pub pyth_feed_id: [u8; 32],
    pub enabled: bool,
    pub _reserved: [u128; 8],
}

impl AllowedTokenConfig {
    pub const SEEDS: &'static str = "ALLOWED_TOKEN";
    pub const SPACE: usize = 8 + 32 * 2 + 32 + 1 + 16 * 8;

    pub fn initialize(
        &mut self,
        token: Pubkey,
        pyth_oracle: Pubkey,
        pyth_feed_id: [u8; 32],
    ) -> Result<()> {
        self.token = token;
        self.pyth_oracle = pyth_oracle;
        self.pyth_feed_id = pyth_feed_id;
        self.enabled = true;
        Ok(())
    }

    pub fn update_enabled_status(&mut self, enabled: bool) -> Result<()> {
        self.enabled = enabled;
        Ok(())
    }

    pub fn update_oracle(&mut self, pyth_oracle: Pubkey, pyth_feed_id: [u8; 32]) -> Result<()> {
        self.pyth_oracle = pyth_oracle;
        self.pyth_feed_id = pyth_feed_id;
        Ok(())
    }

    pub fn get_price(&self, price_update: &PriceUpdateV2) -> Result<Decimal> {
        let clock = Clock::get()?;
        let maximum_age = 1000000000000000000;
        let price =
            price_update.get_price_no_older_than(&clock, maximum_age, &self.pyth_feed_id)?;
        let expo = 10_u64.pow(-price.exponent as u32);
        let resolved_price = Decimal::from(price.price as u64).try_div(Decimal::from(expo))?;
        Ok(resolved_price)
    }
}
