use crate::errors::PaymentError;
use crate::states::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

#[derive(Accounts)]
pub struct AdminUpdateEnabledStatus<'info> {
    #[account(
        mut,
        address = config.admin @ PaymentError::InvalidAdmin,
    )]
    pub admin: Signer<'info>,
    #[account(
        seeds = [Config::SEEDS.as_bytes()],
        bump,
    )]
    pub config: Box<Account<'info, Config>>,
    #[account(
        mut,
        seeds = [AllowedTokenConfig::SEEDS.as_bytes(), token.key().as_ref()],
        bump,
    )]
    pub allowed_token_config: Box<Account<'info, AllowedTokenConfig>>,
    pub token: Box<Account<'info, Mint>>,
}

pub fn handler(ctx: Context<AdminUpdateEnabledStatus>, enabled: bool) -> Result<()> {
    let allowed_token_config = &mut ctx.accounts.allowed_token_config;
    allowed_token_config.update_enabled_status(enabled)?;
    Ok(())
}
