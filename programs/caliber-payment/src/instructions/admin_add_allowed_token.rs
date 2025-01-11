use crate::errors::PaymentError;
use crate::states::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

#[derive(Accounts)]
pub struct AdminAddAllowedToken<'info> {
    #[account(
        mut,
        address = config.admin @ PaymentError::InvalidAdmin,
    )]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [Config::SEEDS.as_bytes()],
        bump,
    )]
    pub config: Account<'info, Config>,
    /// CHECK: Pyth oracle for the token
    #[account()]
    pub pyth_oracle: UncheckedAccount<'info>,
    #[account(
        init,
        payer = admin,
        space = AllowedTokenConfig::SPACE,
        seeds = [AllowedTokenConfig::SEEDS.as_bytes(), token.key().as_ref()],
        bump,
    )]
    pub allowed_token_config: Box<Account<'info, AllowedTokenConfig>>,
    pub token: Box<Account<'info, Mint>>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<AdminAddAllowedToken>) -> Result<()> {
    let allowed_token_config = &mut ctx.accounts.allowed_token_config;
    allowed_token_config.initialize(ctx.accounts.token.key(), ctx.accounts.pyth_oracle.key())?;

    Ok(())
}
