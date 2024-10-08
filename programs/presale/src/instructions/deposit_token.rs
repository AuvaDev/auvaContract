use anchor_lang::system_program;

use {
    anchor_lang::prelude::*,
    anchor_spl::{associated_token, token},
};

use crate::constants::{PRESALE_SEED, PRESALE_VAULT, RENT_MINIMUM};
use crate::state::PresaleInfo;

pub fn deposit_token(ctx: Context<DepositToken>, amount: u64) -> Result<()> {
    let presale_info = &mut ctx.accounts.presale_info;

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.from_associated_token_account.to_account_info(),
                to: ctx.accounts.to_associated_token_account.to_account_info(),
                authority: ctx.accounts.admin.to_account_info(),
            },
        ),
        amount,
    )?;

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.admin.to_account_info(),
                to: ctx.accounts.presale_vault.to_account_info(),
            },
        ),
        RENT_MINIMUM,
    )?;

    presale_info.deposit_token_amount = presale_info.deposit_token_amount + amount;

    Ok(())
}

#[derive(Accounts)]
pub struct DepositToken<'info> {
    #[account(mut)]
    pub mint_account: Account<'info, token::Mint>,

    #[account(
        mut,
        associated_token::mint = mint_account,
        associated_token::authority = admin,
    )]
    pub from_associated_token_account: Account<'info, token::TokenAccount>,

    #[account(
        init,
        payer = admin,
        associated_token::mint = mint_account,
        associated_token::authority = presale_info,
    )]
    pub to_associated_token_account: Account<'info, token::TokenAccount>,

    /// CHECK
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [PRESALE_VAULT],
        bump,
        space = 0
    )]
    pub presale_vault: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [PRESALE_SEED],
        bump
    )]
    pub presale_info: Box<Account<'info, PresaleInfo>>,

    /// CHECK
    #[account(mut)]
    pub payer: AccountInfo<'info>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, token::Token>,
    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
}
