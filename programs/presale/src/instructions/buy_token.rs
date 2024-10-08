use {
    anchor_lang::{prelude::*, system_program},
    anchor_spl::{
        token,
        associated_token,
    },
};

use solana_program::clock::Clock;

use crate::constants::PRESALE_VAULT;
use crate::state::PresaleInfo;
use crate::state::UserInfo;
use crate::constants::{PRESALE_SEED, USER_SEED};
use crate::errors::PresaleError;

pub fn buy_token(
    ctx: Context<BuyToken>,
    quote_amount_in_lamports: u64,
) -> Result<()> {
    
    let presale_info = &mut ctx.accounts.presale_info;
    let user_info = &mut ctx.accounts.user_info;
    let presale_vault = &mut ctx.accounts.presale_vault;
    let cur_timestamp = u64::try_from(Clock::get()?.unix_timestamp).unwrap();

    let token_amount = quote_amount_in_lamports
        .checked_div(presale_info.price_per_token)
        .ok_or(PresaleError::CalculationError)?;

    if presale_info.start_time > cur_timestamp * 1000 {
        return Err(PresaleError::PresaleNotStarted.into());
    }

    if presale_info.end_time < cur_timestamp * 1000 {
        return Err(PresaleError::PresaleEnded.into());
    }

    if presale_info.is_hard_capped == true {
        return Err(PresaleError::HardCapped.into())
    }

    if token_amount > presale_info.deposit_token_amount - presale_info.sold_token_amount {
        return Err(PresaleError::InsufficientFund.into())
    }

    if presale_info.max_token_amount_per_address < (user_info.buy_token_amount + token_amount) {
        return Err(PresaleError::ExceedsMaxTokenPerAddress.into())
    }

    if quote_amount_in_lamports > ctx.accounts.buyer.lamports() {
        return Err(PresaleError::InsufficientFund.into())
    }

    user_info.buy_time = cur_timestamp;
    user_info.buy_quote_amount_in_lamports = user_info.buy_quote_amount_in_lamports + quote_amount_in_lamports;
    user_info.buy_token_amount = user_info.buy_token_amount + token_amount;
    
    presale_info.sold_token_amount = presale_info.sold_token_amount + token_amount;
    
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: presale_vault.to_account_info(),
            }
        ),
        quote_amount_in_lamports
    )?;

    if presale_vault.get_lamports() > presale_info.softcap_amount {
        presale_info.is_soft_capped = true;
    }
    
    if presale_vault.get_lamports() > presale_info.hardcap_amount {
        presale_info.is_hard_capped = true;
    }

    Ok(())
}

#[derive(Accounts)]
pub struct BuyToken<'info> {
    #[account(
        mut,
        seeds = [PRESALE_SEED],
        bump
    )]
    pub presale_info: Box<Account<'info, PresaleInfo>>,

    /// CHECK: This is safe because we trust the authority to sign the transaction
    pub presale_authority: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + std::mem::size_of::<UserInfo>(),
        seeds = [USER_SEED, buyer.key().as_ref()],
        bump
    )]
    pub user_info: Box<Account<'info, UserInfo>>,

    /// CHECK: This is safe because we trust the authority to sign the transaction
    #[account(
        mut,
        seeds = [PRESALE_VAULT],
        bump
    )]
    pub presale_vault: AccountInfo<'info>,

    #[account(mut)]
    pub buyer: Signer<'info>,
    
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, token::Token>,
    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
}
