use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

use crate::errors::PaymentError;
use crate::math::{Decimal, TryDiv, TryMul};
use crate::states::*;

#[derive(Accounts)]
pub struct UserMatchOrder<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = token_x,
        associated_token::authority = user,
    )]
    pub user_token_x_account: Box<Account<'info, TokenAccount>>,
    #[account(
        seeds = [Config::SEEDS.as_bytes()],
        bump,
    )]
    pub config: Box<Account<'info, Config>>,
    /// CHECK: Fee recipient
    #[account(
        address = config.fee_recipient @ PaymentError::InvalidFeeRecipient,
    )]
    pub fee_recipient: AccountInfo<'info>,
    #[account(
        mut,
        associated_token::mint = token_y,
        associated_token::authority = fee_recipient,
    )]
    pub fee_recipient_token_y_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        associated_token::mint = token_y,
        associated_token::authority = user,
    )]
    pub user_token_y_account: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub order: Box<Account<'info, Order>>,
    /// CHECK: An authority PDA for the order
    #[account(
        seeds = [OrderAuthority::SEEDS.as_bytes(), order.key().as_ref()],
        bump,
    )]
    pub order_authority: AccountInfo<'info>,
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
    #[account(
        address = order.token_x_mint @ PaymentError::UnsupportedToken,
    )]
    pub token_x: Box<Account<'info, Mint>>,
    #[account(
        seeds = [AllowedTokenConfig::SEEDS.as_bytes(), token_x.key().as_ref()],
        bump,
        constraint = token_x_config.token == token_x.key() @ PaymentError::UnsupportedToken,
    )]
    pub token_x_config: Box<Account<'info, AllowedTokenConfig>>,
    #[account(
        address = token_x_config.pyth_oracle @ PaymentError::InvalidOracleConfig,
    )]
    pub token_x_pyth_oracle: Box<Account<'info, PriceUpdateV2>>,
    #[account(
        address = order.token_y_mint @ PaymentError::UnsupportedToken,
    )]
    pub token_y: Box<Account<'info, Mint>>,
    #[account(
        seeds = [AllowedTokenConfig::SEEDS.as_bytes(), token_y.key().as_ref()],
        bump,
        constraint = token_y_config.token == token_y.key() @ PaymentError::UnsupportedToken,
    )]
    pub token_y_config: Box<Account<'info, AllowedTokenConfig>>,
    #[account(
        address = token_y_config.pyth_oracle @ PaymentError::InvalidOracleConfig,
    )]
    pub token_y_pyth_oracle: Box<Account<'info, PriceUpdateV2>>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<UserMatchOrder>, y_amount: u64) -> Result<()> {
    let token_x = &ctx.accounts.token_x;
    let token_x_config = &ctx.accounts.token_x_config;
    let token_y = &ctx.accounts.token_y;
    let token_y_config = &ctx.accounts.token_y_config;
    let order_token_x_account = &ctx.accounts.order_token_x_account;
    let order = &mut ctx.accounts.order;
    let order_key = order.key();

    let x_amount = order_token_x_account.amount;
    require!(x_amount > 0, PaymentError::NoTokenXAmount);
    require!(!order.is_expired()?, PaymentError::OrderExpired);

    let token_x_price = token_x_config.get_price(&ctx.accounts.token_x_pyth_oracle)?;
    let token_y_price = token_y_config.get_price(&ctx.accounts.token_y_pyth_oracle)?;

    require!(
        order.price_in_range(token_x_price, token_y_price)?,
        PaymentError::OutOfPriceRange
    );

    let y_amount_calculated = get_y_amount_from_x_amount(
        x_amount,
        token_x_price,
        token_x.decimals,
        token_y_price,
        token_y.decimals,
    )?;
    let x_amount_calculated = get_y_amount_from_x_amount(
        y_amount,
        token_y_price,
        token_y.decimals,
        token_x_price,
        token_x.decimals,
    )?;

    // Partial match, get full from user, and partial from order
    let order_authority_seeds: &[&[&[u8]]] = &[&[
        OrderAuthority::SEEDS.as_bytes(),
        order_key.as_ref(),
        &[ctx.bumps.order_authority],
    ]];

    let mut y_transferred = 0;
    if x_amount_calculated <= x_amount {
        msg!("Partial match");
        let transfer_x_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.order_token_x_account.to_account_info(),
                to: ctx.accounts.user_token_x_account.to_account_info(),
                authority: ctx.accounts.order_authority.to_account_info(),
            },
            order_authority_seeds,
        );
        transfer(transfer_x_ctx, x_amount_calculated)?;

        let transfer_y_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_y_account.to_account_info(),
                to: ctx.accounts.order_token_y_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        transfer(transfer_y_ctx, y_amount)?;
        y_transferred = y_amount;
    } else if y_amount_calculated <= y_amount {
        // Full match, get partial from user, and full from order
        msg!("Full match");
        let transfer_x_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.order_token_x_account.to_account_info(),
                to: ctx.accounts.user_token_x_account.to_account_info(),
                authority: ctx.accounts.order_authority.to_account_info(),
            },
            order_authority_seeds,
        );
        transfer(transfer_x_ctx, x_amount)?;

        let transfer_y_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_y_account.to_account_info(),
                to: ctx.accounts.order_token_y_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        transfer(transfer_y_ctx, y_amount_calculated)?;
        y_transferred = y_amount_calculated;
    } else {
        msg!("No match, something went wrong");
    }

    let protocol_fee = ctx.accounts.config.get_protocol_fee(y_transferred);
    let transfer_fee_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_token_y_account.to_account_info(),
            to: ctx.accounts.fee_recipient_token_y_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    transfer(transfer_fee_ctx, protocol_fee)?;
    Ok(())
}

fn get_y_amount_from_x_amount(
    x_amount: u64,
    token_x_price: Decimal,
    token_x_decimals: u8,
    token_y_price: Decimal,
    token_y_decimals: u8,
) -> Result<u64> {
    let x_ui_amount =
        Decimal::from(x_amount).try_div(Decimal::from((10u64).pow(token_x_decimals as u32)))?;
    let total_value = x_ui_amount.try_mul(token_x_price)?;
    let y_ui_amount = total_value.try_div(token_y_price)?;
    let y_amount = y_ui_amount
        .try_mul((10u64).pow(token_y_decimals as u32))?
        .try_floor_u64()?;
    msg!("x_ui_amount: {}", x_ui_amount);
    msg!("total_value: {}", total_value);
    msg!("y_ui_amount: {}", y_ui_amount);
    msg!("y_amount: {}", y_amount);
    Ok(y_amount)
}
