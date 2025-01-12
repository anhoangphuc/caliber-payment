use anchor_lang::prelude::*;

#[event]
pub struct CreateOrderEvent {
    pub order: Pubkey,
    pub user: Pubkey,
    pub token_x: Pubkey,
    pub token_y: Pubkey,
    pub amount_x: u64,
    pub created_at: u64,
}
