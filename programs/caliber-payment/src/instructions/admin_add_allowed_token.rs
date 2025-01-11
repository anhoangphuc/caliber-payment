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

pub fn handler(ctx: Context<AdminAddAllowedToken>) -> Result<()> {
    let allowed_token_config = &mut ctx.accounts.allowed_token_config;
    let price_update = &ctx.accounts.pyth_oracle;
    let maximum_age = 1000000000000000000;
    let feed_id: [u8; 32] =
        get_feed_id_from_hex("0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d")?;
    let clock = Clock::get()?;
    let price = price_update.get_price_no_older_than(&clock, maximum_age, &feed_id)?;

    msg!("Price: {:?}", price);

    allowed_token_config.initialize(ctx.accounts.token.key(), ctx.accounts.pyth_oracle.key())?;

    Ok(())
}
