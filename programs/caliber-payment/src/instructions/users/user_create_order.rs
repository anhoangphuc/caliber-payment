use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

use crate::errors::*;
use crate::events::*;
use crate::states::*;

#[derive(Accounts)]
pub struct UserCreateOrder<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(init, payer = user, space = Order::SPACE)]
    pub order: Box<Account<'info, Order>>,
    /// CHECK: An authority PDA for the order
    #[account(
        init,
        payer = user,
        space = OrderAuthority::SPACE,
        seeds = [OrderAuthority::SEEDS.as_bytes(), order.key().as_ref()],
        bump,
    )]
    pub order_authority: AccountInfo<'info>,
    #[account()]
    pub token_x: Box<Account<'info, Mint>>,
    #[account(
        constraint = token_x.key() != token_y.key() @ PaymentError::InvalidTokenPair,
    )]
    pub token_y: Box<Account<'info, Mint>>,
    #[account(
        mut,
        associated_token::mint = token_x,
        associated_token::authority = user,
    )]
    pub user_token_x_account: Box<Account<'info, TokenAccount>>,
    #[account(
        init,
        payer = user,
        associated_token::mint = token_x,
        associated_token::authority = order_authority,
    )]
    pub order_token_x_account: Box<Account<'info, TokenAccount>>,
    #[account(
        init,
        payer = user,
        associated_token::mint = token_y,
        associated_token::authority = order_authority,
    )]
    pub order_token_y_account: Box<Account<'info, TokenAccount>>,
    #[account(
        seeds = [AllowedTokenConfig::SEEDS.as_bytes(), token_x.key().as_ref()],
        bump,
        constraint = token_x_config.token == token_x.key() @ PaymentError::UnsupportedToken,
    )]
    pub token_x_config: Box<Account<'info, AllowedTokenConfig>>,
    #[account(
        seeds = [AllowedTokenConfig::SEEDS.as_bytes(), token_y.key().as_ref()],
        bump,
        constraint = token_y_config.token == token_y.key() @ PaymentError::UnsupportedToken,
    )]
    pub token_y_config: Box<Account<'info, AllowedTokenConfig>>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug)]
pub struct CreateOrderParams {
    pub min_x_price: u64,
    pub max_x_price: u64,
    pub min_y_price: u64,
    pub max_y_price: u64,
    pub validity_duration: u64,
    pub amount: u64,
}

pub fn handler(ctx: Context<UserCreateOrder>, params: CreateOrderParams) -> Result<()> {
    let order = &mut ctx.accounts.order;
    let token_x_mint = ctx.accounts.token_x.key();
    let token_y_mint = ctx.accounts.token_y.key();
    order.initialize(ctx.accounts.user.key(), &params, token_x_mint, token_y_mint)?;
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_token_x_account.to_account_info(),
            to: ctx.accounts.order_token_x_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );

    transfer(transfer_ctx, params.amount)?;

    emit!(CreateOrderEvent {
        order: order.key(),
        user: ctx.accounts.user.key(),
        token_x: token_x_mint,
        token_y: token_y_mint,
        amount_x: params.amount,
        created_at: Clock::get()?.unix_timestamp as u64,
    });

    Ok(())
}
