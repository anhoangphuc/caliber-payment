use anchor_lang::prelude::*;

#[event]
pub struct FinishOrderEvent {
    pub order: Pubkey,
    pub x_amount: u64,
    pub y_amount: u64,
    pub finished_at: u64,
}
