use crate::errors::*;
use anchor_lang::{prelude::*, system_program};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, mint_to, Mint, MintTo, Token, TokenAccount, Transfer},
};

pub fn buy(ctx: Context<Buy>, amount: u64, is_native: bool) -> Result<()> {
    if ctx.accounts.stable_account.amount < amount && !is_native {
        return err!(SaleErrors::Insufficient);
    }

    if ctx.accounts.buyer.lamports() < amount && is_native {
        return err!(SaleErrors::Insufficient);
    }

    if !is_native { 
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.stable_account.to_account_info(),
                    to: ctx.accounts.treasury_stable_account.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            amount,
        )?;
    
        mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
            ),
            amount,
        )?;
    } else {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            amount,
        )?;

        mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
            ),
            amount * 120 / 1000,
        )?;
    }
    
    
    Ok(())
}
#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut)]
    pub mint: Box<Account<'info, Mint>>,

    pub stable_mint: Box<Account<'info, Mint>>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = buyer,
    )]
    pub token_account: Box<Account<'info, TokenAccount>>,

    ///CHECK: token account for buyer
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = stable_mint,
        associated_token::authority = buyer,
    )]
    pub stable_account: Box<Account<'info, TokenAccount>>,

    ///CHECK:account for mint_authority
    #[account(mut)]
    pub mint_authority: UncheckedAccount<'info>,

    ///CHECK:account for treasury
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,

    ///CHECK: stable token account for treasury
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = stable_mint,
        associated_token::authority = treasury,
    )]
    pub treasury_stable_account: Box<Account<'info, TokenAccount>>,

    /// Solana ecosystem accounts
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
