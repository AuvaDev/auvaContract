use anchor_lang::prelude::*;

use crate::state::PresaleInfo;
use crate::constants::PRESALE_SEED;

pub fn start_presale(
    ctx: Context<StartPresale>,
    start_time: u64,
    end_time: u64
) -> Result<()> {

    let presale = &mut ctx.accounts.presale_info;

    presale.is_live = true;
    presale.start_time = start_time;
    presale.end_time = end_time;

    Ok(())
}

#[derive(Accounts)]
pub struct StartPresale<'info> {
    #[account(
        mut,
        seeds = [PRESALE_SEED],
        bump
    )]
    pub presale_info: Box<Account<'info, PresaleInfo>>,

    #[account(mut)]
    pub authority: Signer<'info>,
}
