use anchor_lang::prelude::*;

#[error_code]
pub enum SaleErrors {
    #[msg("Insufficient funds!")]
    Insufficient,
}
