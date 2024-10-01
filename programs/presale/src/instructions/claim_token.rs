use {
    anchor_lang::prelude::*,
    anchor_spl::{
        token,
        associated_token,
    },
};

use crate::errors::PresaleError;
use crate::state::{PresaleInfo, UserInfo};
use crate::constants::{PRESALE_SEED, USER_SEED};

pub fn claim_token(
    ctx: Context<ClaimToken>, 
    bump: u8
) -> Result<()> {

    let presale_info = &mut ctx.accounts.presale_info;

    let cur_timestamp = u64::try_from(Clock::get()?.unix_timestamp).unwrap();

    if presale_info.end_time > cur_timestamp * 1000 {
        return Err(PresaleError::PresaleNotEnded.into());
    }

    let user_info = &mut ctx.accounts.user_info;
    let claim_amount = user_info.buy_token_amount;

    if claim_amount == 0 {
        return Err(PresaleError::NoTokensToClaim.into());
    }

    if presale_info.deposit_token_amount - presale_info.sold_token_amount < claim_amount {
        return Err(PresaleError::InsufficientPresaleTokens.into());
    }

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.presale_presale_token_associated_token_account.to_account_info(),
                to: ctx.accounts.buyer_presale_token_associated_token_account.to_account_info(),
                authority: ctx.accounts.presale_info.to_account_info(),
            },
            &[&[PRESALE_SEED, &[bump]][..]],
        ),
        claim_amount,
    )?;

    user_info.buy_token_amount = 0;
    user_info.claim_time = cur_timestamp;

    Ok(())
}

#[derive(Accounts)]
pub struct ClaimToken<'info> {
    #[account(mut)]
    pub presale_token_mint_account: Box<Account<'info, token::Mint>>,
    
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = presale_token_mint_account,
        associated_token::authority = buyer,
    )]
    pub buyer_presale_token_associated_token_account: Box<Account<'info, token::TokenAccount>>,
    
    #[account(
        mut,
        associated_token::mint = presale_token_mint_account,
        associated_token::authority = presale_info,
    )]
    pub presale_presale_token_associated_token_account: Box<Account<'info, token::TokenAccount>>,

    #[account(
        mut,
        seeds = [USER_SEED, buyer.key().as_ref()],
        bump
    )]
    pub user_info: Box<Account<'info, UserInfo>>,

    #[account(
        mut,
        seeds = [PRESALE_SEED],
        bump
    )]
    pub presale_info: Box<Account<'info, PresaleInfo>>,
    
    pub presale_authority: SystemAccount<'info>,
    
    #[account(mut)]
    pub buyer: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, token::Token>,
    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
}
