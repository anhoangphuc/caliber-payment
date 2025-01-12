use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

use crate::errors::*;
use crate::states::*;

#[derive(Accounts)]
pub struct AdminClaimFee<'info> {
    #[account(
        mut,
        address = config.admin @ PaymentError::InvalidAdmin
    )]
    pub admin: Signer<'info>,
    #[account(
        seeds = [Config::SEEDS.as_bytes()],
        bump,
    )]
    pub config: Box<Account<'info, Config>>,
    #[account(
        seeds = [FeeRecipient::SEEDS.as_bytes()],
        bump,
    )]
    pub fee_recipient: Box<Account<'info, FeeRecipient>>,
    #[account()]
    pub allowed_token: Box<Account<'info, Mint>>,
    #[account(
        mut,
        associated_token::mint = allowed_token,
        associated_token::authority = fee_recipient,
    )]
    pub fee_recipient_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = allowed_token,
        associated_token::authority = admin,
    )]
    pub admin_token_account: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<AdminClaimFee>) -> Result<()> {
    msg!("Admin claim fee");
    let fee_recipient_token_account = &ctx.accounts.fee_recipient_token_account;
    let admin_token_account = &ctx.accounts.admin_token_account;

    let amount = fee_recipient_token_account.amount;

    let fee_recipient_seeds: &[&[&[u8]]] =
        &[&[FeeRecipient::SEEDS.as_bytes(), &[ctx.bumps.fee_recipient]]];

    let claim_fee_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: fee_recipient_token_account.to_account_info(),
            to: admin_token_account.to_account_info(),
            authority: ctx.accounts.fee_recipient.to_account_info(),
        },
        fee_recipient_seeds,
    );

    transfer(claim_fee_ctx, amount)?;

    Ok(())
}
