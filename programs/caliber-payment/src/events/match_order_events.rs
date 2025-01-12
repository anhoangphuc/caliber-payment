use anchor_lang::prelude::*;

#[event]
pub struct MatchOrderEvent {
    pub order: Pubkey,
    pub match_user: Pubkey,
    pub amount_x: u64,
    pub amount_y: u64,
    pub remain_x: u64,
    pub matched_at: u64,
}
