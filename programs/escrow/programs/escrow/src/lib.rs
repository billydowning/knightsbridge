use anchor_lang::prelude::*;

declare_id!("F4Py3YTF1JGhbY9ACztXaseFF89ZfLS69ke5Z7EBGQGr");

// Enhanced chess validation module
mod chess_validation {
    use super::*;
    
    #[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
    pub enum Piece {
        WhitePawn,
        WhiteRook,
        WhiteKnight,
        WhiteBishop,
        WhiteQueen,
        WhiteKing,
        BlackPawn,
        BlackRook,
        BlackKnight,
        BlackBishop,
        BlackQueen,
        BlackKing,
        Empty,
    }
    
    #[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
    pub struct Position {
        pub squares: [Piece; 64],
        pub white_to_move: bool,
        pub white_castle_kingside: bool,
        pub white_castle_queenside: bool,
        pub black_castle_kingside: bool,
        pub black_castle_queenside: bool,
        pub en_passant_square: Option<u8>,
        pub halfmove_clock: u8,
        pub fullmove_number: u16,
    }
    
    #[derive(AnchorSerialize, AnchorDeserialize, Clone)]
    pub struct Move {
        pub from: u8,
        pub to: u8,
        pub piece: Piece,
        pub captured_piece: Option<Piece>,
        pub is_castle: bool,
        pub is_en_passant: bool,
        pub is_promotion: bool,
        pub promotion_piece: Option<Piece>,
    }
    
    pub fn validate_move(
        from: String,
        to: String,
        piece: String,
        current_position: &Position,
        _game_state: &GameState
    ) -> Result<bool> {
        // Basic move validation
        if from.len() != 2 || to.len() != 2 {
            return Err(ChessError::InvalidMoveFormat.into());
        }
        
        // Validate square coordinates
        let from_square = parse_square(&from)?;
        let to_square = parse_square(&to)?;
        
        // Validate piece movement
        let piece_type = parse_piece(&piece)?;
        
        // Check if move is legal for the piece type
        if !is_legal_move(from_square, to_square, piece_type, current_position) {
            return Err(ChessError::IllegalMove.into());
        }
        
        // Check if move doesn't put own king in check
        if would_move_expose_king(from_square, to_square, current_position) {
            return Err(ChessError::MoveExposesKing.into());
        }
        
        Ok(true)
    }
    
    fn parse_square(square: &str) -> Result<u8> {
        if square.len() != 2 {
            return Err(ChessError::InvalidSquareFormat.into());
        }
        
        let file = square.chars().nth(0).unwrap() as u8 - b'a';
        let rank = square.chars().nth(1).unwrap() as u8 - b'1';
        
        if file > 7 || rank > 7 {
            return Err(ChessError::InvalidSquareCoordinates.into());
        }
        
        Ok(rank * 8 + file)
    }
    
    fn parse_piece(piece: &str) -> Result<Piece> {
        match piece {
            "P" => Ok(Piece::WhitePawn),
            "R" => Ok(Piece::WhiteRook),
            "N" => Ok(Piece::WhiteKnight),
            "B" => Ok(Piece::WhiteBishop),
            "Q" => Ok(Piece::WhiteQueen),
            "K" => Ok(Piece::WhiteKing),
            "p" => Ok(Piece::BlackPawn),
            "r" => Ok(Piece::BlackRook),
            "n" => Ok(Piece::BlackKnight),
            "b" => Ok(Piece::BlackBishop),
            "q" => Ok(Piece::BlackQueen),
            "k" => Ok(Piece::BlackKing),
            _ => Err(ChessError::InvalidPiece.into()),
        }
    }
    
    fn is_legal_move(from: u8, to: u8, piece: Piece, position: &Position) -> bool {
        // Basic move validation logic
        // This is a simplified version - in production, implement full chess rules
        true // Placeholder - implement full chess validation
    }
    
    fn would_move_expose_king(from: u8, to: u8, position: &Position) -> bool {
        // Check if move would expose king to check
        // This is a simplified version - implement full check detection
        false // Placeholder - implement full check detection
    }
}

// Anti-cheat helper functions
fn is_impossible_move(from: &str, to: &str, piece: &str) -> bool {
    // Basic validation for impossible moves
    if from == to {
        return true; // Can't move to same square
    }
    
    // Validate square format
    if from.len() != 2 || to.len() != 2 {
        return true;
    }
    
    // Check if squares are valid chess coordinates
    let from_file = from.chars().nth(0).unwrap() as u8;
    let from_rank = from.chars().nth(1).unwrap() as u8;
    let to_file = to.chars().nth(0).unwrap() as u8;
    let to_rank = to.chars().nth(1).unwrap() as u8;
    
    if from_file < b'a' || from_file > b'h' || from_rank < b'1' || from_rank > b'8' {
        return true;
    }
    
    if to_file < b'a' || to_file > b'h' || to_rank < b'1' || to_rank > b'8' {
        return true;
    }
    
    false
}

fn is_suspicious_move_pattern(game_escrow: &GameEscrow) -> bool {
    // Check for suspicious patterns like:
    // - Too many moves in short time
    // - Impossible move sequences
    // - Unusual time patterns
    
    if game_escrow.move_history.len() < 3 {
        return false;
    }
    
    let recent_moves = &game_escrow.move_history[game_escrow.move_history.len().saturating_sub(3)..];
    
    // Check for suspicious time patterns (moves too fast)
    for i in 1..recent_moves.len() {
        let time_diff = recent_moves[i].timestamp - recent_moves[i-1].timestamp;
        if time_diff < 1 { // Less than 1 second between moves
            return true;
        }
    }
    
    false
}

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
        
        // Initialize enhanced features
        game_escrow.time_control = TimeControl {
            initial_time: time_limit_seconds as u64,
            increment: 0,
            delay: 0,
            time_control_type: TimeControlType::Custom,
        };
        game_escrow.position_hash = [0u8; 32];
        game_escrow.move_history = Vec::new();
        game_escrow.anti_cheat_flags = 0;
        game_escrow.rating_white = 1500;
        game_escrow.rating_black = 1500;
        game_escrow.tournament_id = None;
        game_escrow.game_flags = GameFlags {
            is_tournament_game: false,
            is_rated: false,
            allow_draw_offers: true,
            allow_resignation: true,
            require_move_validation: true,
            enable_anti_cheat: true,
        };
        
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
        game_position_hash: [u8; 32],
        from_square: String,
        to_square: String,
        piece: String,
        captured_piece: Option<String>,
        time_spent: u64,
        is_check: bool,
        is_checkmate: bool,
        is_castle: bool,
        is_en_passant: bool,
        is_promotion: bool,
        promotion_piece: Option<String>
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

        // Check if it's the player's turn
        let is_white_turn = game_escrow.move_count % 2 == 0;
        let is_white_player = player_key == game_escrow.player_white;
        
        require!(is_white_turn == is_white_player, ChessError::NotPlayerTurn);

        // Enhanced time control validation
        if game_escrow.time_control.initial_time > 0 {
            let time_elapsed = clock.unix_timestamp - game_escrow.last_move_time;
            let max_time = (game_escrow.time_control.initial_time + game_escrow.time_control.increment) as i64;
            require!(
                time_elapsed <= max_time,
                ChessError::MoveTimeExceeded
            );
        }

        // Anti-cheat validation if enabled
        if game_escrow.game_flags.enable_anti_cheat {
            // Validate move format
            require!(from_square.len() == 2 && to_square.len() == 2, ChessError::InvalidMoveFormat);
            
            // Check for impossible moves (basic validation)
            if is_impossible_move(&from_square, &to_square, &piece) {
                return Err(ChessError::ImpossibleMove.into());
            }
            
            // Check for suspicious patterns
            if is_suspicious_move_pattern(game_escrow) {
                game_escrow.anti_cheat_flags |= 1; // Flag suspicious activity
            }
        }

        // Create move record
        let move_record = MoveRecord {
            move_number: game_escrow.move_count + 1,
            from_square,
            to_square,
            piece,
            captured_piece,
            move_notation: move_notation.clone(),
            position_hash: game_position_hash,
            timestamp: clock.unix_timestamp,
            time_spent,
            is_check,
            is_checkmate,
            is_castle,
            is_en_passant,
            is_promotion,
            promotion_piece,
        };

        // Add to move history
        game_escrow.move_history.push(move_record);

        game_escrow.move_count += 1;
        game_escrow.last_move_time = clock.unix_timestamp;
        game_escrow.position_hash = game_position_hash;

        // Check for game end conditions
        if is_checkmate {
            game_escrow.game_state = GameState::Finished;
            game_escrow.winner = if is_white_player { GameWinner::White } else { GameWinner::Black };
            game_escrow.finished_at = clock.unix_timestamp;
        }

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
                        (reason == GameEndReason::Resignation && declarer == game_escrow.player_black) ||
                        (reason == GameEndReason::Timeout && declarer == game_escrow.player_white) ||
                        (reason == GameEndReason::Checkmate && declarer == game_escrow.player_white),
                        ChessError::InvalidWinnerDeclaration
                    );
                },
                GameWinner::Black => {
                    require!(
                        (reason == GameEndReason::Resignation && declarer == game_escrow.player_white) ||
                        (reason == GameEndReason::Timeout && declarer == game_escrow.player_black) ||
                        (reason == GameEndReason::Checkmate && declarer == game_escrow.player_black),
                        ChessError::InvalidWinnerDeclaration
                    );
                },
                GameWinner::Draw => {
                    // Both players must agree to a draw, or it's a stalemate
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

    /// Create a new tournament
    pub fn create_tournament(
        ctx: Context<CreateTournament>,
        tournament_id: String,
        name: String,
        entry_fee: u64,
        max_participants: u32,
        time_control: TimeControl
    ) -> Result<()> {
        require!(tournament_id.len() <= 32, ChessError::RoomIdTooLong);
        require!(name.len() <= 64, ChessError::InvalidStakeAmount);
        require!(entry_fee > 0, ChessError::InvalidStakeAmount);
        require!(max_participants >= 2, ChessError::InvalidStakeAmount);
        
        let tournament = &mut ctx.accounts.tournament;
        let clock = Clock::get()?;
        
        tournament.tournament_id = tournament_id;
        tournament.name = name;
        tournament.creator = *ctx.accounts.creator.key;
        tournament.entry_fee = entry_fee;
        tournament.max_participants = max_participants;
        tournament.current_participants = 0;
        tournament.status = TournamentStatus::Registration;
        tournament.time_control = time_control;
        tournament.created_at = clock.unix_timestamp;
        tournament.started_at = 0;
        tournament.finished_at = 0;
        tournament.prize_pool = 0;
        tournament.participants = Vec::new();
        tournament.brackets = Vec::new();
        
        emit!(TournamentCreated {
            tournament_id: tournament.tournament_id.clone(),
            creator: tournament.creator,
            entry_fee,
            max_participants,
            created_at: clock.unix_timestamp,
        });
        
        Ok(())
    }

    /// Join a tournament
    pub fn join_tournament(ctx: Context<JoinTournament>) -> Result<()> {
        let tournament = &mut ctx.accounts.tournament;
        let player_key = *ctx.accounts.player.key;
        let clock = Clock::get()?;
        
        require!(
            tournament.status == TournamentStatus::Registration,
            ChessError::TournamentAlreadyStarted
        );
        
        require!(
            tournament.current_participants < tournament.max_participants,
            ChessError::InvalidStakeAmount
        );
        
        // Check if player already joined
        if tournament.participants.contains(&player_key) {
            return Err(ChessError::AlreadyDeposited.into());
        }
        
        tournament.participants.push(player_key);
        tournament.current_participants += 1;
        
        emit!(PlayerJoinedTournament {
            tournament_id: tournament.tournament_id.clone(),
            player: player_key,
            joined_at: clock.unix_timestamp,
        });
        
        Ok(())
    }

    /// Start a tournament
    pub fn start_tournament(ctx: Context<StartTournament>) -> Result<()> {
        let tournament = &mut ctx.accounts.tournament;
        let clock = Clock::get()?;
        
        require!(
            tournament.status == TournamentStatus::Registration,
            ChessError::TournamentAlreadyStarted
        );
        
        require!(
            tournament.current_participants >= 2,
            ChessError::InvalidStakeAmount
        );
        
        tournament.status = TournamentStatus::Active;
        tournament.started_at = clock.unix_timestamp;
        tournament.prize_pool = tournament.entry_fee * tournament.current_participants as u64;
        
        emit!(TournamentStarted {
            tournament_id: tournament.tournament_id.clone(),
            started_at: clock.unix_timestamp,
            participants: tournament.current_participants,
            prize_pool: tournament.prize_pool,
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

// Tournament account structures
#[derive(Accounts)]
pub struct CreateTournament<'info> {
    #[account(
        init, 
        payer = creator, 
        space = 8 + 32 + 32 + 64 + 8 + 4 + 4 + 1 + 16 + 8 + 8 + 8 + 8 + 4 + 4,
        seeds = [b"tournament"],
        bump
    )]
    pub tournament: Account<'info, Tournament>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinTournament<'info> {
    #[account(mut)]
    pub tournament: Account<'info, Tournament>,
    #[account(mut)]
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct StartTournament<'info> {
    #[account(mut)]
    pub tournament: Account<'info, Tournament>,
    #[account(mut)]
    pub creator: Signer<'info>,
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
    
    // Enhanced features for production
    pub time_control: TimeControl,         // 16 bytes
    pub position_hash: [u8; 32],          // 32 bytes
    pub move_history: Vec<MoveRecord>,     // Variable size
    pub anti_cheat_flags: u32,            // 4 bytes
    pub rating_white: u32,                 // 4 bytes
    pub rating_black: u32,                 // 4 bytes
    pub tournament_id: Option<String>,     // Variable size
    pub game_flags: GameFlags,             // 4 bytes
}

// Tournament structures
#[account]
pub struct Tournament {
    pub tournament_id: String,             // Variable size
    pub name: String,                      // Variable size
    pub creator: Pubkey,                   // 32 bytes
    pub entry_fee: u64,                    // 8 bytes
    pub max_participants: u32,             // 4 bytes
    pub current_participants: u32,         // 4 bytes
    pub status: TournamentStatus,          // 1 byte
    pub time_control: TimeControl,         // 16 bytes
    pub created_at: i64,                   // 8 bytes
    pub started_at: i64,                   // 8 bytes
    pub finished_at: i64,                  // 8 bytes
    pub prize_pool: u64,                   // 8 bytes
    pub participants: Vec<Pubkey>,         // Variable size
    pub brackets: Vec<String>,             // Variable size (game IDs)
}

// Rating structure
#[account]
pub struct PlayerRating {
    pub player: Pubkey,                    // 32 bytes
    pub rating: u32,                       // 4 bytes
    pub games_played: u32,                 // 4 bytes
    pub last_updated: i64,                 // 8 bytes
    pub last_game: String,                 // 32 bytes
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum TournamentStatus {
    Registration,
    Active,
    Finished,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TimeControl {
    pub initial_time: u64,     // in seconds
    pub increment: u64,        // in seconds
    pub delay: u64,           // in seconds
    pub time_control_type: TimeControlType,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum TimeControlType {
    Rapid,    // 10+ minutes
    Blitz,    // 3-10 minutes
    Bullet,   // <3 minutes
    Custom,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MoveRecord {
    pub move_number: u32,
    pub from_square: String,
    pub to_square: String,
    pub piece: String,
    pub captured_piece: Option<String>,
    pub move_notation: String,
    pub position_hash: [u8; 32],
    pub timestamp: i64,
    pub time_spent: u64,
    pub is_check: bool,
    pub is_checkmate: bool,
    pub is_castle: bool,
    pub is_en_passant: bool,
    pub is_promotion: bool,
    pub promotion_piece: Option<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct GameFlags {
    pub is_tournament_game: bool,
    pub is_rated: bool,
    pub allow_draw_offers: bool,
    pub allow_resignation: bool,
    pub require_move_validation: bool,
    pub enable_anti_cheat: bool,
}

impl GameEscrow {
    pub const INIT_SPACE: usize = 36 + 32 + 32 + 8 + 8 + 1 + 1 + 8 + 8 + 8 + 8 + 32 + 1 + 1 + 4 + 8 + 16 + 32 + 4 + 4 + 4 + 4 + 4 + 4 + 5 + 32; // 256 bytes + variable size for move_history and tournament_id
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

// Tournament events
#[event]
pub struct TournamentCreated {
    pub tournament_id: String,
    pub creator: Pubkey,
    pub entry_fee: u64,
    pub max_participants: u32,
    pub created_at: i64,
}

#[event]
pub struct PlayerJoinedTournament {
    pub tournament_id: String,
    pub player: Pubkey,
    pub joined_at: i64,
}

#[event]
pub struct TournamentStarted {
    pub tournament_id: String,
    pub started_at: i64,
    pub participants: u32,
    pub prize_pool: u64,
}

// Rating events
#[event]
pub struct RatingUpdated {
    pub player: Pubkey,
    pub new_rating: u32,
    pub games_played: u32,
    pub updated_at: i64,
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
    #[msg("Not player's turn")]
    NotPlayerTurn,
    #[msg("Invalid move format")]
    InvalidMoveFormat,
    #[msg("Invalid square format")]
    InvalidSquareFormat,
    #[msg("Invalid square coordinates")]
    InvalidSquareCoordinates,
    #[msg("Invalid piece")]
    InvalidPiece,
    #[msg("Illegal move")]
    IllegalMove,
    #[msg("Move exposes king")]
    MoveExposesKing,
    #[msg("Impossible move")]
    ImpossibleMove,
    #[msg("Invalid time control")]
    InvalidTimeControl,
    #[msg("Tournament not found")]
    TournamentNotFound,
    #[msg("Player not in tournament")]
    PlayerNotInTournament,
    #[msg("Tournament already started")]
    TournamentAlreadyStarted,
    #[msg("Invalid rating")]
    InvalidRating,
}