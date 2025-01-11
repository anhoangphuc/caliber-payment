use anchor_lang::prelude::*;

mod instructions;
mod states;

use instructions::*;

declare_id!("FDeKt6Zc5KwmKHzEej3Cd7bhqxbw4pQoDikbY5roffye");

#[program]
pub mod caliber_payment {
    use super::*;

    pub fn admin_initialize(ctx: Context<AdminInitialize>, protocol_fee_rate: u16) -> Result<()> {
        admin_initialize::handler(ctx, protocol_fee_rate)
    }
}
