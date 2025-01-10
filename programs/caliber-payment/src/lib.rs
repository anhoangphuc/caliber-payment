use anchor_lang::prelude::*;

declare_id!("FDeKt6Zc5KwmKHzEej3Cd7bhqxbw4pQoDikbY5roffye");

#[program]
pub mod caliber_payment {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
