use anchor_lang::prelude::*;

#[account]
pub struct AllowedTokenConfig {
    pub token: Pubkey,
    pub pyth_oracle: Pubkey,
    pub enabled: bool,
    pub _reserved: [u128; 8],
}

impl AllowedTokenConfig {
    pub const SEEDS: &'static str = "ALLOWED_TOKEN";
    pub const SPACE: usize = 8 + 32 + 32 + 1 + 16 * 8;

    pub fn initialize(&mut self, token: Pubkey, pyth_oracle: Pubkey) -> Result<()> {
        self.token = token;
        // TODO: validate pyth oracle
        self.pyth_oracle = pyth_oracle;
        self.enabled = true;
        Ok(())
    }

    pub fn update_enabled_status(&mut self, enabled: bool) -> Result<()> {
        self.enabled = enabled;
        Ok(())
    }

    pub fn update_oracle(&mut self, pyth_oracle: Pubkey) -> Result<()> {
        self.pyth_oracle = pyth_oracle;
        Ok(())
    }
}
