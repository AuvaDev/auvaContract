use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct PresaleInfo {
    pub token_mint_address: Pubkey,
    pub softcap_amount: u64,
    pub hardcap_amount: u64,
    pub deposit_token_amount: u64,
    pub sold_token_amount: u64,
    pub start_time: u64,
    pub end_time: u64,
    pub max_token_amount_per_address: u64,
    pub price_per_token: u64,
    pub is_live: bool,
    pub authority: Pubkey,
    pub is_soft_capped: bool,
    pub is_hard_capped: bool,
}
