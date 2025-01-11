use anchor_lang::prelude::*;

use crate::errors::*;
use crate::states::*;

#[derive(Accounts)]
#[instruction(params: CreateOrderParams)]
pub struct UserCreateOrder<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(init, payer = user, space = Order::SPACE)]
    pub order: Box<Account<'info, Order>>,
    #[account(
        seeds = [AllowedTokenConfig::SEEDS.as_bytes(), params.token_x_mint.as_ref()],
        bump,
        constraint = token_x_config.token == params.token_x_mint @ PaymentError::UnsupportedToken,
    )]
    pub token_x_config: Box<Account<'info, AllowedTokenConfig>>,
    #[account(
        seeds = [AllowedTokenConfig::SEEDS.as_bytes(), params.token_y_mint.as_ref()],
        bump,
        constraint = token_y_config.token == params.token_y_mint @ PaymentError::UnsupportedToken,
    )]
    pub token_y_config: Box<Account<'info, AllowedTokenConfig>>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateOrderParams {
    pub token_x_mint: Pubkey,
    pub token_y_mint: Pubkey,
    pub min_x_price: u64,
    pub max_x_price: u64,
    pub min_y_price: u64,
    pub max_y_price: u64,
    pub validity_duration: u64,
}

pub fn handler(ctx: Context<UserCreateOrder>, params: CreateOrderParams) -> Result<()> {
    let order = &mut ctx.accounts.order;
    order.initialize(ctx.accounts.user.key(), &params)?;

    Ok(())
}
