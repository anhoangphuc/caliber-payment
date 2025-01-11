use anchor_lang::prelude::*;

use crate::states::*;

#[derive(Accounts)]
pub struct AdminInitialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = FeeRecipient::SPACE,
        seeds = [FeeRecipient::SEEDS.as_bytes()],
        bump,
    )]
    pub fee_recipient: Box<Account<'info, FeeRecipient>>,
    #[account(
        init,
        payer = admin,
        space = Config::SPACE,
        seeds = [Config::SEEDS.as_bytes()],
        bump,
    )]
    pub config: Box<Account<'info, Config>>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<AdminInitialize>, protocol_fee_rate: u16) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.initialize(
        ctx.accounts.admin.key(),
        ctx.accounts.fee_recipient.key(),
        protocol_fee_rate,
    )?;
    Ok(())
}
