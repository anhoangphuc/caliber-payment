use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{
    close_account, transfer, CloseAccount, Mint, Token, TokenAccount, Transfer,
};

use crate::errors::PaymentError;
use crate::states::*;

#[derive(Accounts)]
pub struct UserFinishOrder<'info> {
    #[account(
        mut,
        address = order.user @ PaymentError::InvalidOrderAuthority,
    )]
    pub user: Signer<'info>,
    #[account()]
    pub order: Box<Account<'info, Order>>,
    /// CHECK: An authority PDA for the order
    #[account(
        seeds = [OrderAuthority::SEEDS.as_bytes(), order.key().as_ref()],
        bump,
    )]
    pub order_authority: AccountInfo<'info>,
    #[account(
        address = order.token_x_mint @ PaymentError::UnsupportedToken,
    )]
    pub token_x: Box<Account<'info, Mint>>,
    #[account(
        address = order.token_y_mint @ PaymentError::UnsupportedToken,
    )]
    pub token_y: Box<Account<'info, Mint>>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = token_x,
        associated_token::authority = user,
    )]
    pub user_token_x_account: Box<Account<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = token_y,
        associated_token::authority = user,
    )]
    pub user_token_y_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        associated_token::mint = token_x,
        associated_token::authority = order_authority,
    )]
    pub order_token_x_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        associated_token::mint = token_y,
        associated_token::authority = order_authority,
    )]
    pub order_token_y_account: Box<Account<'info, TokenAccount>>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<UserFinishOrder>) -> Result<()> {
    let order = &ctx.accounts.order;
    let order_authority = &ctx.accounts.order_authority;
    let token_program = &ctx.accounts.token_program;
    let order_key = order.key();
    let order_authority_seeds: &[&[&[u8]]] = &[&[
        OrderAuthority::SEEDS.as_bytes(),
        order_key.as_ref(),
        &[ctx.bumps.order_authority],
    ]];

    msg!("Transfer x");
    let transfer_x_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.order_token_x_account.to_account_info(),
            to: ctx.accounts.user_token_x_account.to_account_info(),
            authority: order_authority.to_account_info(),
        },
        order_authority_seeds,
    );
    let x_amount = ctx.accounts.order_token_x_account.amount;

    transfer(transfer_x_ctx, x_amount)?;

    msg!("Transfer y");
    let transfer_y_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.order_token_y_account.to_account_info(),
            to: ctx.accounts.user_token_y_account.to_account_info(),
            authority: order_authority.to_account_info(),
        },
        order_authority_seeds,
    );
    let y_amount = ctx.accounts.order_token_y_account.amount;

    transfer(transfer_y_ctx, y_amount)?;
    msg!("Finish transferring");

    msg!("Close x");
    let close_x_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.order_token_x_account.to_account_info(),
            destination: ctx.accounts.user.to_account_info(),
            authority: order_authority.to_account_info(),
        },
        order_authority_seeds,
    );
    close_account(close_x_ctx)?;

    msg!("Close y");
    let close_y_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.order_token_y_account.to_account_info(),
            destination: ctx.accounts.user.to_account_info(),
            authority: order_authority.to_account_info(),
        },
        order_authority_seeds,
    );
    close_account(close_y_ctx)?;

    msg!("Finish closing");

    Ok(())
}
