use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod twitchtrap {
    use super::*;

    pub fn start_game_session(
        ctx: Context<StartGameSession>,
        wager_amount: u64,
    ) -> Result<()> {
        // Split Ratios: 10% Dev, 20% Buyback Flywheel, 70% Jackpot Pool
        let dev_cut = wager_amount * 10 / 100;
        let buyback_cut = wager_amount * 20 / 100;
        let jackpot_cut = wager_amount - dev_cut - buyback_cut;

        // 1. Dev Wallet Share
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.player.to_account_info(),
                    to: ctx.accounts.dev_wallet.to_account_info(),
                },
            ),
            dev_cut,
        )?;

        // 2. Pump.fun Buyback Vault PDA
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.player.to_account_info(),
                    to: ctx.accounts.buyback_vault.to_account_info(),
                },
            ),
            buyback_cut,
        )?;

        // 3. Jackpot Pool PDA
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.player.to_account_info(),
                    to: ctx.accounts.jackpot_vault.to_account_info(),
                },
            ),
            jackpot_cut,
        )?;

        // Initialize session state for off-chain anti-cheat tracking
        let session = &mut ctx.accounts.game_session;
        session.player = ctx.accounts.player.key();
        session.wager_amount = wager_amount;
        session.is_active = true;
        session.start_timestamp = Clock::get()?.unix_timestamp;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct StartGameSession<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        init,
        payer = player,
        space = 8 + 32 + 8 + 1 + 8,
        seeds = [b"session", player.key().as_ref()],
        bump
    )]
    pub game_session: Account<'info, GameSession>,

    /// CHECK: Direct Dev Wallet target address
    #[account(mut)]
    pub dev_wallet: AccountInfo<'info>,

    /// CHECK: PDA accumulating Pump.fun buyback liquidity
    #[account(mut, seeds = [b"buyback_vault"], bump)]
    pub buyback_vault: AccountInfo<'info>,

    /// CHECK: PDA accumulating the arcade jackpot
    #[account(mut, seeds = [b"jackpot_vault"], bump)]
    pub jackpot_vault: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct GameSession {
    pub player: Pubkey,
    pub wager_amount: u64,
    pub is_active: bool,
    pub start_timestamp: i64,
}