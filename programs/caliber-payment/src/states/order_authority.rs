use anchor_lang::prelude::*;

#[account]
pub struct OrderAuthority {}

impl OrderAuthority {
    pub const SEEDS: &'static str = "ORDER_AUTHORITY";
    pub const SPACE: usize = 8;
}
