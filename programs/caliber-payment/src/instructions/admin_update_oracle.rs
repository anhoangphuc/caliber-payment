use crate::errors::PaymentError;
use crate::states::*;
use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

#[derive(Accounts)]
pub struct AdminUpdateOracle<'info> {
    #[account(
        address = config.admin @ PaymentError::InvalidAdmin,
    )]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [Config::SEEDS.as_bytes()],
        bump,
    )]
    pub config: Box<Account<'info, Config>>,
    #[account(
        mut,
        seeds = [AllowedTokenConfig::SEEDS.as_bytes(), allowed_token_config.token.as_ref()],
        bump,
    )]
    pub allowed_token_config: Box<Account<'info, AllowedTokenConfig>>,
    /// CHECK: Pyth oracle for the token
    #[account()]
    pub pyth_oracle: Box<Account<'info, PriceUpdateV2>>,
}

pub fn handler(ctx: Context<AdminUpdateOracle>) -> Result<()> {
    let allowed_token_config = &mut ctx.accounts.allowed_token_config;
    allowed_token_config.update_oracle(ctx.accounts.pyth_oracle.key())?;
    Ok(())
}
