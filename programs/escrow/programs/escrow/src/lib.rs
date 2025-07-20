use anchor_lang::prelude::*;

declare_id!("F4Py3YTF1JGhbY9ACztXaseFF89ZfLS69ke5Z7EBGQGr");

#[program]
pub mod chess_escrow {
    use super::*;

    /// Initialize a new chess game escrow
    pub fn initialize_game(
        ctx: Context<InitializeGame>, 
        room_id: String,
        stake_amount: u64,
        time_limit_seconds: i64
    ) -> Result<()> {
        require!(room_id.len() <= 32, ChessError::RoomIdTooLong);
        require!(stake_amount > 0, ChessError::InvalidStakeAmount);
        require!(time_limit_seconds > 0, ChessError::InvalidTimeLimit);

        let game_escrow = &mut ctx.accounts.game_escrow;
        let clock = Clock::get()?;
        
        game_escrow.room_id = room_id;
        game_escrow.player_white = *ctx.accounts.player.key;
        game_escrow.player_black = Pubkey::default(); // Will be set when second player joins
        game_escrow.stake_amount = stake_amount;
        game_escrow.total_deposited = 0;
        game_escrow.game_state = GameState::WaitingForPlayers;
        game_escrow.winner = GameWinner::None;
        game_escrow.created_at = clock.unix_timestamp;
        game_escrow.started_at = 0;
        game_escrow.finished_at = 0;
        game_escrow.time_limit_seconds = time_limit_seconds;
        game_escrow.fee_collector = *ctx.accounts.fee_collector.key;
        game_escrow.white_deposited = false;
        game_escrow.black_deposited = false;
        game_escrow.move_count = 0;
        game_escrow.last_move_time = 0;
        
        emit!(GameCreated {
            room_id: game_escrow.room_id.clone(),
            player_white: game_escrow.player_white,
            stake_amount,
            created_at: clock.unix_timestamp,
        });
        
        Ok(())
    }

    /// Second player joins the game
    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let game_escrow = &mut ctx.accounts.game_escrow;
        let clock = Clock::get()?;
        
        require!(
            game_escrow.game_state == GameState::WaitingForPlayers,
            ChessError::GameNotWaitingForPlayers
        );
        require!(
            game_escrow.player_white != *ctx.accounts.player.key,
            ChessError::CannotPlayAgainstSelf
        );
        
        game_escrow.player_black = *ctx.accounts.player.key;
        game_escrow.game_state = GameState::WaitingForDeposits;
        
        emit!(PlayerJoined {
            room_id: game_escrow.room_id.clone(),
            player_black: game_escrow.player_black,
            joined_at: clock.unix_timestamp,
        });
        
        Ok(())
    }

    /// Player deposits their stake
    pub fn deposit_stake(ctx: Context<DepositStake>) -> Result<()> {
        let game_escrow = &mut ctx.accounts.game_escrow;
        let player_key = *ctx.accounts.player.key;
        
        require!(
            game_escrow.game_state == GameState::WaitingForDeposits ||
            game_escrow.game_state == GameState::WaitingForPlayers,
            ChessError::InvalidGameStateForDeposit
        );
        
        require!(
            player_key == game_escrow.player_white || player_key == game_escrow.player_black,
            ChessError::UnauthorizedPlayer
        );

        // Check if this player has already deposited
        let is_white = player_key == game_escrow.player_white;
        if is_white {
            require!(!game_escrow.white_deposited, ChessError::AlreadyDeposited);
        } else {
            require!(!game_escrow.black_deposited, ChessError::AlreadyDeposited);
        }

        // Transfer stake to vault
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.player.to_account_info(),
                    to: ctx.accounts.game_vault.to_account_info(),
                },
            ),
            game_escrow.stake_amount,
        )?;

        // Update deposit status
        if is_white {
            game_escrow.white_deposited = true;
        } else {
            game_escrow.black_deposited = true;
        }
        
        game_escrow.total_deposited += game_escrow.stake_amount;

        // Start game if both players have deposited
        if game_escrow.white_deposited && game_escrow.black_deposited {
            let clock = Clock::get()?;
            game_escrow.game_state = GameState::InProgress;
            game_escrow.started_at = clock.unix_timestamp;
            game_escrow.last_move_time = clock.unix_timestamp;
            
            emit!(GameStarted {
                room_id: game_escrow.room_id.clone(),
                started_at: clock.unix_timestamp,
            });
        }

        emit!(StakeDeposited {
            room_id: game_escrow.room_id.clone(),
            player: player_key,
            amount: game_escrow.stake_amount,
        });

        Ok(())
    }

    /// Record a move (for anti-cheat and timing)
    pub fn record_move(
        ctx: Context<RecordMove>,
        move_notation: String,
        game_position_hash: [u8; 32]
    ) -> Result<()> {
        let game_escrow = &mut ctx.accounts.game_escrow;
        let player_key = *ctx.accounts.player.key;
        let clock = Clock::get()?;
        
        require!(
            game_escrow.game_state == GameState::InProgress,
            ChessError::GameNotInProgress
        );
        
        require!(
            player_key == game_escrow.player_white || player_key == game_escrow.player_black,
            ChessError::UnauthorizedPlayer
        );

        require!(move_notation.len() <= 10, ChessError::MoveNotationTooLong);

        // Check time limit
        let time_elapsed = clock.unix_timestamp - game_escrow.last_move_time;
        require!(
            time_elapsed <= game_escrow.time_limit_seconds,
            ChessError::MoveTimeExceeded
        );

        game_escrow.move_count += 1;
        game_escrow.last_move_time = clock.unix_timestamp;

        emit!(MoveRecorded {
            room_id: game_escrow.room_id.clone(),
            player: player_key,
            move_count: game_escrow.move_count,
            move_notation,
            position_hash: game_position_hash,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Declare game result and distribute funds
    pub fn declare_result(
        ctx: Context<DeclareResult>, 
        winner: GameWinner,
        reason: GameEndReason
    ) -> Result<()> {
        let clock = Clock::get()?;
        let finished_at = clock.unix_timestamp;
        let room_id: String;
        {
            let game_escrow = &mut ctx.accounts.game_escrow;
            
            require!(
                game_escrow.game_state == GameState::InProgress,
                ChessError::GameNotInProgress
            );

            // Only players can declare results
            let declarer = *ctx.accounts.player.key;
            require!(
                declarer == game_escrow.player_white || declarer == game_escrow.player_black,
                ChessError::UnauthorizedPlayer
            );

            // Validate winner declaration
            match winner {
                GameWinner::White => {
                    require!(
                        reason == GameEndReason::Resignation && declarer == game_escrow.player_black ||
                        reason == GameEndReason::Timeout && declarer == game_escrow.player_white,
                        ChessError::InvalidWinnerDeclaration
                    );
                },
                GameWinner::Black => {
                    require!(
                        reason == GameEndReason::Resignation && declarer == game_escrow.player_white ||
                        reason == GameEndReason::Timeout && declarer == game_escrow.player_black,
                        ChessError::InvalidWinnerDeclaration
                    );
                },
                GameWinner::Draw => {
                    // Both players must agree to a draw, or it's a timeout
                    require!(
                        reason == GameEndReason::Agreement || reason == GameEndReason::Stalemate,
                        ChessError::InvalidDrawDeclaration
                    );
                },
                GameWinner::None => return Err(ChessError::InvalidWinnerDeclaration.into()),
            }

            game_escrow.winner = winner.clone();
            game_escrow.game_state = GameState::Finished;
            game_escrow.finished_at = finished_at;
            room_id = game_escrow.room_id.clone();
        }

        // Distribute funds
        ctx.accounts.distribute_funds(winner.clone(), ctx.bumps.game_vault)?;

        emit!(GameFinished {
            room_id,
            winner,
            reason,
            finished_at,
        });

        Ok(())
    }

    /// Handle timeout (can be called by anyone after time limit exceeded)
    pub fn handle_timeout(ctx: Context<HandleTimeout>) -> Result<()> {
        let clock = Clock::get()?;
        let finished_at = clock.unix_timestamp;
        let room_id: String;
        let winner: GameWinner;
        {
            let game_escrow = &mut ctx.accounts.game_escrow;
        
            require!(
                game_escrow.game_state == GameState::InProgress,
                ChessError::GameNotInProgress
            );

            let time_elapsed = clock.unix_timestamp - game_escrow.last_move_time;
            require!(
                time_elapsed > game_escrow.time_limit_seconds,
                ChessError::TimeNotExceeded
            );

            // Determine winner based on whose turn it is (simplified)
            // In a real implementation, you'd track whose turn it is
            winner = if game_escrow.move_count % 2 == 0 {
                GameWinner::Black // White's turn, so Black wins on timeout
            } else {
                GameWinner::White // Black's turn, so White wins on timeout
            };

            game_escrow.winner = winner.clone();
            game_escrow.game_state = GameState::Finished;
            game_escrow.finished_at = finished_at;
            room_id = game_escrow.room_id.clone();
        }

        ctx.accounts.distribute_funds(winner.clone(), ctx.bumps.game_vault)?;

        emit!(GameFinished {
            room_id,
            winner,
            reason: GameEndReason::Timeout,
            finished_at,
        });

        Ok(())
    }

    /// Cancel game (only if not started or both players agree)
    pub fn cancel_game(ctx: Context<CancelGame>) -> Result<()> {
        let game_escrow = &mut ctx.accounts.game_escrow;
        
        require!(
            game_escrow.game_state == GameState::WaitingForPlayers ||
            game_escrow.game_state == GameState::WaitingForDeposits,
            ChessError::CannotCancelStartedGame
        );

        let player_key = *ctx.accounts.player.key;
        require!(
            player_key == game_escrow.player_white || player_key == game_escrow.player_black,
            ChessError::UnauthorizedPlayer
        );

        // Refund any deposited stakes
        let vault_balance = ctx.accounts.game_vault.lamports();
        if vault_balance > 0 {
            // Refund logic here
            let game_key = game_escrow.key();
            let vault_bump = ctx.bumps.game_vault;
            let bump_bytes = [vault_bump];
            
            let seeds = &[
                b"vault".as_ref(),
                game_key.as_ref(),
                bump_bytes.as_ref(),
            ];
            let signer_seeds = &[&seeds[..]];

            // Refund white player if they deposited
            if game_escrow.white_deposited {
                anchor_lang::system_program::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.system_program.to_account_info(),
                        anchor_lang::system_program::Transfer {
                            from: ctx.accounts.game_vault.to_account_info(),
                            to: ctx.accounts.player_white.to_account_info(),
                        },
                        signer_seeds,
                    ),
                    game_escrow.stake_amount,
                )?;
            }

            // Refund black player if they deposited
            if game_escrow.black_deposited {
                anchor_lang::system_program::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.system_program.to_account_info(),
                        anchor_lang::system_program::Transfer {
                            from: ctx.accounts.game_vault.to_account_info(),
                            to: ctx.accounts.player_black.to_account_info(),
                        },
                        signer_seeds,
                    ),
                    game_escrow.stake_amount,
                )?;
            }
        }

        game_escrow.game_state = GameState::Cancelled;

        emit!(GameCancelled {
            room_id: game_escrow.room_id.clone(),
            cancelled_by: player_key,
        });

        Ok(())
    }
}

// Helper functions moved outside the #[program] module
impl<'info> DeclareResult<'info> {
    pub fn distribute_funds(&self, winner: GameWinner, vault_bump: u8) -> Result<()> {
        let game_escrow = &self.game_escrow;
        let vault_balance = self.game_vault.lamports();
        
        if vault_balance == 0 {
            return Ok(());
        }

        // Calculate 1% fee
        let fee_amount = vault_balance
            .checked_mul(1)
            .and_then(|x| x.checked_div(100))
            .unwrap_or(0);

        let remaining_amount = vault_balance.checked_sub(fee_amount).unwrap_or(0);

        let game_key = game_escrow.key();
        let bump_bytes = [vault_bump];
        
        let seeds = &[
            b"vault".as_ref(),
            game_key.as_ref(),
            bump_bytes.as_ref(),
        ];
        let signer_seeds = &[&seeds[..]];

        // Transfer fee to fee collector
        if fee_amount > 0 {
            anchor_lang::system_program::transfer(
                CpiContext::new_with_signer(
                    self.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: self.game_vault.to_account_info(),
                        to: self.fee_collector.to_account_info(),
                    },
                    signer_seeds,
                ),
                fee_amount,
            )?;
        }

        // Distribute remaining amount based on winner
        match winner {
            GameWinner::White => {
                if remaining_amount > 0 {
                    anchor_lang::system_program::transfer(
                        CpiContext::new_with_signer(
                            self.system_program.to_account_info(),
                            anchor_lang::system_program::Transfer {
                                from: self.game_vault.to_account_info(),
                                to: self.player_white.to_account_info(),
                            },
                            signer_seeds,
                        ),
                        remaining_amount,
                    )?;
                }
            },
            GameWinner::Black => {
                if remaining_amount > 0 {
                    anchor_lang::system_program::transfer(
                        CpiContext::new_with_signer(
                            self.system_program.to_account_info(),
                            anchor_lang::system_program::Transfer {
                                from: self.game_vault.to_account_info(),
                                to: self.player_black.to_account_info(),
                            },
                            signer_seeds,
                        ),
                        remaining_amount,
                    )?;
                }
            },
            GameWinner::Draw => {
                // Split the remaining amount equally
                let half_amount = remaining_amount / 2;
                
                if half_amount > 0 {
                    // Transfer to white player
                    anchor_lang::system_program::transfer(
                        CpiContext::new_with_signer(
                            self.system_program.to_account_info(),
                            anchor_lang::system_program::Transfer {
                                from: self.game_vault.to_account_info(),
                                to: self.player_white.to_account_info(),
                            },
                            signer_seeds,
                        ),
                        half_amount,
                    )?;

                    // Transfer to black player
                    anchor_lang::system_program::transfer(
                        CpiContext::new_with_signer(
                            self.system_program.to_account_info(),
                            anchor_lang::system_program::Transfer {
                                from: self.game_vault.to_account_info(),
                                to: self.player_black.to_account_info(),
                            },
                            signer_seeds,
                        ),
                        half_amount,
                    )?;
                }
            },
            GameWinner::None => {
                return Err(ChessError::InvalidWinnerDeclaration.into());
            }
        }

        Ok(())
    }
}

impl<'info> HandleTimeout<'info> {
    pub fn distribute_funds(&self, winner: GameWinner, vault_bump: u8) -> Result<()> {
        let game_escrow = &self.game_escrow;
        let vault_balance = self.game_vault.lamports();
        
        if vault_balance == 0 {
            return Ok(());
        }

        // Calculate 1% fee
        let fee_amount = vault_balance
            .checked_mul(1)
            .and_then(|x| x.checked_div(100))
            .unwrap_or(0);

        let remaining_amount = vault_balance.checked_sub(fee_amount).unwrap_or(0);

        let game_key = game_escrow.key();
        let bump_bytes = [vault_bump];
        
        let seeds = &[
            b"vault".as_ref(),
            game_key.as_ref(),
            bump_bytes.as_ref(),
        ];
        let signer_seeds = &[&seeds[..]];

        // Transfer fee to fee collector
        if fee_amount > 0 {
            anchor_lang::system_program::transfer(
                CpiContext::new_with_signer(
                    self.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: self.game_vault.to_account_info(),
                        to: self.fee_collector.to_account_info(),
                    },
                    signer_seeds,
                ),
                fee_amount,
            )?;
        }

        // Transfer remaining amount to winner
        match winner {
            GameWinner::White => {
                if remaining_amount > 0 {
                    anchor_lang::system_program::transfer(
                        CpiContext::new_with_signer(
                            self.system_program.to_account_info(),
                            anchor_lang::system_program::Transfer {
                                from: self.game_vault.to_account_info(),
                                to: self.player_white.to_account_info(),
                            },
                            signer_seeds,
                        ),
                        remaining_amount,
                    )?;
                }
            },
            GameWinner::Black => {
                if remaining_amount > 0 {
                    anchor_lang::system_program::transfer(
                        CpiContext::new_with_signer(
                            self.system_program.to_account_info(),
                            anchor_lang::system_program::Transfer {
                                from: self.game_vault.to_account_info(),
                                to: self.player_black.to_account_info(),
                            },
                            signer_seeds,
                        ),
                        remaining_amount,
                    )?;
                }
            },
            _ => return Err(ChessError::InvalidWinnerDeclaration.into()),
        }

        Ok(())
    }
}

// Account Structs
#[derive(Accounts)]
#[instruction(room_id: String)]
pub struct InitializeGame<'info> {
    #[account(
        init, 
        payer = player, 
        space = 8 + GameEscrow::INIT_SPACE,
        seeds = [b"game", room_id.as_bytes()],
        bump
    )]
    pub game_escrow: Account<'info, GameEscrow>,
    #[account(mut)]
    pub player: Signer<'info>,
    /// CHECK: Fee collector can be any account
    pub fee_collector: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub game_escrow: Account<'info, GameEscrow>,
    #[account(mut)]
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct DepositStake<'info> {
    #[account(mut)]
    pub game_escrow: Account<'info, GameEscrow>,
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vault", game_escrow.key().as_ref()],
        bump
    )]
    pub game_vault: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordMove<'info> {
    #[account(mut)]
    pub game_escrow: Account<'info, GameEscrow>,
    #[account(mut)]
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeclareResult<'info> {
    #[account(mut)]
    pub game_escrow: Account<'info, GameEscrow>,
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vault", game_escrow.key().as_ref()],
        bump
    )]
    pub game_vault: SystemAccount<'info>,
    #[account(
        mut,
        address = game_escrow.player_white
    )]
    /// CHECK: White player address validated against game escrow
    pub player_white: UncheckedAccount<'info>,
    #[account(
        mut,
        address = game_escrow.player_black
    )]
    /// CHECK: Black player address validated against game escrow
    pub player_black: UncheckedAccount<'info>,
    #[account(
        mut,
        address = game_escrow.fee_collector
    )]
    /// CHECK: Fee collector address validated against game escrow
    pub fee_collector: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct HandleTimeout<'info> {
    #[account(mut)]
    pub game_escrow: Account<'info, GameEscrow>,
    #[account(
        mut,
        seeds = [b"vault", game_escrow.key().as_ref()],
        bump
    )]
    pub game_vault: SystemAccount<'info>,
    #[account(
        mut,
        address = game_escrow.player_white
    )]
    /// CHECK: White player address validated against game escrow
    pub player_white: UncheckedAccount<'info>,
    #[account(
        mut,
        address = game_escrow.player_black
    )]
    /// CHECK: Black player address validated against game escrow
    pub player_black: UncheckedAccount<'info>,
    #[account(
        mut,
        address = game_escrow.fee_collector
    )]
    /// CHECK: Fee collector address validated against game escrow
    pub fee_collector: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelGame<'info> {
    #[account(mut)]
    pub game_escrow: Account<'info, GameEscrow>,
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vault", game_escrow.key().as_ref()],
        bump
    )]
    pub game_vault: SystemAccount<'info>,
    #[account(
        mut,
        address = game_escrow.player_white
    )]
    /// CHECK: White player address validated against game escrow
    pub player_white: UncheckedAccount<'info>,
    #[account(
        mut,
        address = game_escrow.player_black
    )]
    /// CHECK: Black player address validated against game escrow
    pub player_black: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

// Data Structures
#[account]
pub struct GameEscrow {
    pub room_id: String,                    // 4 + 32 = 36 bytes
    pub player_white: Pubkey,              // 32 bytes
    pub player_black: Pubkey,              // 32 bytes
    pub stake_amount: u64,                 // 8 bytes
    pub total_deposited: u64,              // 8 bytes
    pub game_state: GameState,             // 1 byte
    pub winner: GameWinner,                // 1 byte
    pub created_at: i64,                   // 8 bytes
    pub started_at: i64,                   // 8 bytes
    pub finished_at: i64,                  // 8 bytes
    pub time_limit_seconds: i64,           // 8 bytes
    pub fee_collector: Pubkey,             // 32 bytes
    pub white_deposited: bool,             // 1 byte
    pub black_deposited: bool,             // 1 byte
    pub move_count: u32,                   // 4 bytes
    pub last_move_time: i64,               // 8 bytes
}

impl GameEscrow {
    pub const INIT_SPACE: usize = 36 + 32 + 32 + 8 + 8 + 1 + 1 + 8 + 8 + 8 + 8 + 32 + 1 + 1 + 4 + 8; // 196 bytes
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum GameState {
    WaitingForPlayers,
    WaitingForDeposits,
    InProgress,
    Finished,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum GameWinner {
    None,
    White,
    Black,
    Draw,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum GameEndReason {
    Checkmate,
    Resignation,
    Timeout,
    Agreement,
    Stalemate,
    Abandonment,
}

// Events
#[event]
pub struct GameCreated {
    pub room_id: String,
    pub player_white: Pubkey,
    pub stake_amount: u64,
    pub created_at: i64,
}

#[event]
pub struct PlayerJoined {
    pub room_id: String,
    pub player_black: Pubkey,
    pub joined_at: i64,
}

#[event]
pub struct StakeDeposited {
    pub room_id: String,
    pub player: Pubkey,
    pub amount: u64,
}

#[event]
pub struct GameStarted {
    pub room_id: String,
    pub started_at: i64,
}

#[event]
pub struct MoveRecorded {
    pub room_id: String,
    pub player: Pubkey,
    pub move_count: u32,
    pub move_notation: String,
    pub position_hash: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct GameFinished {
    pub room_id: String,
    pub winner: GameWinner,
    pub reason: GameEndReason,
    pub finished_at: i64,
}

#[event]
pub struct GameCancelled {
    pub room_id: String,
    pub cancelled_by: Pubkey,
}

// Error Codes
#[error_code]
pub enum ChessError {
    #[msg("Room ID too long (max 32 characters)")]
    RoomIdTooLong,
    #[msg("Invalid stake amount")]
    InvalidStakeAmount,
    #[msg("Invalid time limit")]
    InvalidTimeLimit,
    #[msg("Game is not waiting for players")]
    GameNotWaitingForPlayers,
    #[msg("Cannot play against yourself")]
    CannotPlayAgainstSelf,
    #[msg("Invalid game state for deposit")]
    InvalidGameStateForDeposit,
    #[msg("Unauthorized player")]
    UnauthorizedPlayer,
    #[msg("Player has already deposited")]
    AlreadyDeposited,
    #[msg("Game is not in progress")]
    GameNotInProgress,
    #[msg("Move notation too long")]
    MoveNotationTooLong,
    #[msg("Move time exceeded")]
    MoveTimeExceeded,
    #[msg("Invalid winner declaration")]
    InvalidWinnerDeclaration,
    #[msg("Invalid draw declaration")]
    InvalidDrawDeclaration,
    #[msg("Cannot cancel a started game")]
    CannotCancelStartedGame,
    #[msg("Time limit not exceeded")]
    TimeNotExceeded,
}