use anchor_lang::prelude::*;

mod constants;
mod errors;
mod instructions;
mod math;
mod states;

use instructions::*;

declare_id!("FDeKt6Zc5KwmKHzEej3Cd7bhqxbw4pQoDikbY5roffye");

#[program]
pub mod caliber_payment {
    use super::*;

    pub fn admin_initialize(ctx: Context<AdminInitialize>, protocol_fee_rate: u16) -> Result<()> {
        admin::admin_initialize::handler(ctx, protocol_fee_rate)
    }

    pub fn admin_add_allowed_token(
        ctx: Context<AdminAddAllowedToken>,
        feed_id_hex: String,
    ) -> Result<()> {
        admin::admin_add_allowed_token::handler(ctx, &feed_id_hex)
    }

    pub fn admin_update_allowed_token_enabled_status(
        ctx: Context<AdminUpdateEnabledStatus>,
        enabled: bool,
    ) -> Result<()> {
        admin::admin_update_enabled_status::handler(ctx, enabled)
    }

    pub fn admin_update_allowed_token_oracle(
        ctx: Context<AdminUpdateOracle>,
        feed_id_hex: String,
    ) -> Result<()> {
        admin::admin_update_oracle::handler(ctx, &feed_id_hex)
    }
}
