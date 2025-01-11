use anchor_lang::prelude::*;

use crate::errors::*;
use crate::math::{Decimal, TryDiv, PRICE_SCALER};
use crate::CreateOrderParams;

#[account]
pub struct Order {
    pub user: Pubkey,
    pub created_at: u64,
    pub expired_at: u64,
    pub token_x_mint: Pubkey,
    pub min_x_price: u64,
    pub max_x_price: u64,
    pub token_y_mint: Pubkey,
    pub min_y_price: u64,
    pub max_y_price: u64,
}

impl Order {
    pub const SPACE: usize = 8 + 32 + 8 * 2 + (32 + 8 * 2) * 2;

    pub fn initialize(
        &mut self,
        user: Pubkey,
        param: &CreateOrderParams,
        token_x_mint: Pubkey,
        token_y_mint: Pubkey,
    ) -> Result<()> {
        require!(token_x_mint != token_y_mint, PaymentError::InvalidTokenPair);
        require!(
            param.min_x_price <= param.max_x_price,
            PaymentError::InvalidPriceRange
        );
        require!(
            param.min_y_price <= param.max_y_price,
            PaymentError::InvalidPriceRange
        );

        let now = Clock::get()?.unix_timestamp as u64;
        self.user = user;
        self.created_at = now;
        self.expired_at = now + param.validity_duration;
        self.token_x_mint = token_x_mint;
        self.min_x_price = param.min_x_price;
        self.max_x_price = param.max_x_price;
        self.token_y_mint = token_y_mint;
        self.min_y_price = param.min_y_price;
        self.max_y_price = param.max_y_price;

        Ok(())
    }

    pub fn is_expired(&self) -> Result<bool> {
        let now = Clock::get()?.unix_timestamp as u64;
        Ok(now > self.expired_at)
    }

    pub fn price_in_range(&self, token_x_price: Decimal, token_y_price: Decimal) -> Result<bool> {
        let price_scaler = Decimal::from(PRICE_SCALER);
        let min_x_price = Decimal::from(self.min_x_price).try_div(price_scaler)?;
        let max_x_price = Decimal::from(self.max_x_price).try_div(price_scaler)?;
        let min_y_price = Decimal::from(self.min_y_price).try_div(price_scaler)?;
        let max_y_price = Decimal::from(self.max_y_price).try_div(price_scaler)?;

        Ok(token_x_price >= min_x_price
            && token_x_price <= max_x_price
            && token_y_price >= min_y_price
            && token_y_price <= max_y_price)
    }
}
