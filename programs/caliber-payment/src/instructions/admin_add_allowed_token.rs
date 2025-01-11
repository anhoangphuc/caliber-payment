use crate::errors::PaymentError;
use crate::states::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

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
    pub pyth_oracle: Box<Account<'info, PriceUpdateV2>>,
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

pub fn handler(ctx: Context<AdminAddAllowedToken>, feed_ix_hed: &str) -> Result<()> {
    let allowed_token_config = &mut ctx.accounts.allowed_token_config;
    let price_update = &ctx.accounts.pyth_oracle;
    let feed_id: [u8; 32] = get_feed_id_from_hex(feed_ix_hed)?;

    allowed_token_config.initialize(
        ctx.accounts.token.key(),
        ctx.accounts.pyth_oracle.key(),
        feed_id,
    )?;

    allowed_token_config.get_price(price_update)?;

    Ok(())
}
