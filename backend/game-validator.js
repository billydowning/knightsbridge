/**
 * 🚛 TOYOTA RELIABILITY: Post-Game Validation Engine
 * Comprehensive validation system for financial security before escrow payouts
 */

const crypto = require('crypto');
const FrontendChessEngineAdapter = require('./frontend-chess-engine-adapter');

class GameValidator {
  constructor(pool, chessEngine = null) {
    this.pool = pool;
    // Use the frontend chess engine adapter for reliable validation
    this.chessEngine = new FrontendChessEngineAdapter();
    this.version = '1.1'; // Updated to use frontend engine
  }

  /**
   * Main validation entry point - validates entire completed game
   */
  async validateGame(gameId) {
    console.log(`🔍 Starting comprehensive validation for game: ${gameId}`);
    
    try {
      // Get game data
      const gameData = await this.getGameData(gameId);
      if (!gameData) {
        throw new Error('Game not found');
      }

      if (gameData.game_state !== 'finished') {
        throw new Error('Can only validate finished games');
      }

      // Run all validation checks
      const validationResults = {
        gameId,
        timestamp: new Date().toISOString(),
        overallStatus: 'pending',
        overallScore: 0,
        validations: {}
      };

      // 1. Move Replay Validation
      console.log('🔄 Running move replay validation...');
      validationResults.validations.moveReplay = await this.validateMoveReplay(gameId, gameData);

      // 2. Financial Security Validation  
      console.log('💰 Running financial security validation...');
      validationResults.validations.financialSecurity = await this.validateFinancialSecurity(gameId, gameData);

      // 3. Anti-Cheat Analysis
      console.log('🛡️ Running anti-cheat analysis...');
      validationResults.validations.antiCheat = await this.validateAntiCheat(gameId, gameData);

      // 4. Timing Validation
      console.log('⏱️ Running timing validation...');
      validationResults.validations.timing = await this.validateTiming(gameId, gameData);

      // 5. Position Integrity Check
      console.log('♟️ Running position integrity check...');
      validationResults.validations.positionIntegrity = await this.validatePositionIntegrity(gameId, gameData);

      // Calculate overall validation result
      validationResults.overallStatus = this.calculateOverallStatus(validationResults.validations);
      validationResults.overallScore = this.calculateOverallScore(validationResults.validations);

      // Store validation results
      await this.storeValidationResults(gameId, validationResults);

      console.log(`✅ Validation complete for game ${gameId}: ${validationResults.overallStatus} (${validationResults.overallScore}/100)`);
      return validationResults;

    } catch (error) {
      console.error(`❌ Validation failed for game ${gameId}:`, error);
      
      // Store failed validation
      await this.storeValidationError(gameId, error.message);
      
      return {
        gameId,
        timestamp: new Date().toISOString(),
        overallStatus: 'failed',
        overallScore: 0,
        error: error.message
      };
    }
  }

  /**
   * Validate game by replaying all moves from start
   */
  async validateMoveReplay(gameId, gameData) {
    const moves = await this.getGameMoves(gameId);
    console.log(`🔍 Retrieved ${moves.length} moves for replay validation:`, moves);
    
    const validation = {
      type: 'move_replay',
      status: 'passed',
      score: 100,
      details: {
        totalMoves: moves.length,
        invalidMoves: [],
        finalPosition: null,
        expectedWinner: null
      }
    };

    try {
      // Initialize chess engine with starting position
      this.chessEngine.resetToStartingPosition();
      let moveCount = 0;

      // Replay each move
      for (const move of moves) {
        moveCount++;
        
        const moveData = {
          from: move.from_square,
          to: move.to_square,
          piece: move.piece
        };

        // Validate move is legal
        const isLegal = this.chessEngine.isMoveLegal(moveData.from, moveData.to, moveData.piece);
        
        if (!isLegal) {
          validation.details.invalidMoves.push({
            moveNumber: move.move_number,
            move: moveData,
            player: move.player,
            reason: 'Illegal move'
          });
          validation.status = 'failed';
          validation.score = Math.max(0, validation.score - 20);
        } else {
          // Apply the move
          this.chessEngine.makeMove(moveData);
        }

        // Store per-move validation
        await this.storeMoveValidation(gameId, move.move_number, {
          isLegal,
          positionBefore: move.position_before || null,
          positionAfter: this.chessEngine.getCurrentPositionFEN(),
          timeUsed: move.time_spent || 0,
          validationDetails: { moveData, isLegal }
        });
      }

      // Check final game state
      const currentState = this.chessEngine.getCurrentGameState();
      validation.details.finalPosition = this.chessEngine.getCurrentPositionFEN();
      
      // Determine expected winner based on final position
      if (currentState.checkmate) {
        validation.details.expectedWinner = currentState.currentPlayer === 'white' ? 'black' : 'white';
      } else if (currentState.stalemate || currentState.draw) {
        validation.details.expectedWinner = 'draw';
      }

      // Compare with recorded winner
      if (validation.details.expectedWinner !== gameData.winner) {
        validation.status = 'warning';
        validation.score = Math.max(50, validation.score - 30);
        validation.details.winnerMismatch = {
          recorded: gameData.winner,
          expected: validation.details.expectedWinner
        };
      }

    } catch (error) {
      validation.status = 'failed';
      validation.score = 0;
      validation.details.error = error.message;
    }

    return validation;
  }

  /**
   * Validate financial aspects of the game
   */
  async validateFinancialSecurity(gameId, gameData) {
    const validation = {
      type: 'financial_security',
      status: 'passed',
      score: 100,
      details: {
        stakeAmount: gameData.stake_amount,
        platformFee: gameData.platform_fee,
        winner: gameData.winner,
        gameResult: gameData.game_result,
        escrowChecks: []
      }
    };

    try {
      // Validate stake amount is reasonable
      if (gameData.stake_amount < 0 || gameData.stake_amount > 100) {
        validation.status = 'warning';
        validation.score -= 10;
        validation.details.escrowChecks.push('Unusual stake amount');
      }

      // Validate platform fee calculation
      const expectedFee = gameData.stake_amount * 0.02; // 2% platform fee
      if (Math.abs(gameData.platform_fee - expectedFee) > 0.001) {
        validation.status = 'warning';
        validation.score -= 15;
        validation.details.escrowChecks.push('Platform fee mismatch');
      }

      // Validate winner determination rules
      const validResults = ['checkmate', 'resignation', 'timeout', 'stalemate', 'agreement', 'abandoned'];
      if (!validResults.includes(gameData.game_result)) {
        validation.status = 'failed';
        validation.score = 0;
        validation.details.escrowChecks.push('Invalid game result');
      }

      // Check for draw conditions
      if (gameData.game_result === 'stalemate' || gameData.game_result === 'agreement') {
        if (gameData.winner !== 'draw' && gameData.winner !== null) {
          validation.status = 'failed';
          validation.score = 0;
          validation.details.escrowChecks.push('Draw game should not have winner');
        }
      }

      // Check for abandoned games
      if (gameData.game_result === 'abandoned') {
        if (gameData.winner !== null) {
          validation.status = 'failed';
          validation.score = 0;
          validation.details.escrowChecks.push('Abandoned game should not have winner');
        }
      }

    } catch (error) {
      validation.status = 'failed';
      validation.score = 0;
      validation.details.error = error.message;
    }

    return validation;
  }

  /**
   * Anti-cheat analysis based on move patterns and timing
   */
  async validateAntiCheat(gameId, gameData) {
    const validation = {
      type: 'anti_cheat',
      status: 'passed',
      score: 100,
      details: {
        flags: [],
        suspiciousMoves: [],
        timeAnalysis: {},
        overallRisk: 'low'
      }
    };

    try {
      const moves = await this.getGameMoves(gameId);
      
      // Analyze move timing patterns
      const timings = moves.filter(m => m.time_spent).map(m => m.time_spent);
      if (timings.length > 0) {
        const avgTime = timings.reduce((a, b) => a + b) / timings.length;
        const veryFastMoves = timings.filter(t => t < 100).length; // Under 100ms
        
        validation.details.timeAnalysis = {
          averageTime: avgTime,
          veryFastMoves,
          fastMovePercentage: (veryFastMoves / timings.length) * 100
        };

        // Flag if too many very fast moves
        if (validation.details.timeAnalysis.fastMovePercentage > 30) {
          validation.details.flags.push('high_fast_move_rate');
          validation.score -= 20;
          validation.status = 'warning';
        }
      }

      // Check for suspicious patterns
      if (moves.length > 10) {
        // Look for alternating very fast/slow patterns (bot-like)
        let alternatingPattern = 0;
        for (let i = 1; i < Math.min(20, moves.length); i++) {
          const current = moves[i].time_spent || 1000;
          const previous = moves[i-1].time_spent || 1000;
          
          if ((current < 200 && previous > 2000) || (current > 2000 && previous < 200)) {
            alternatingPattern++;
          }
        }

        if (alternatingPattern > 5) {
          validation.details.flags.push('alternating_time_pattern');
          validation.score -= 25;
          validation.status = 'warning';
        }
      }

      // Determine overall risk level
      if (validation.details.flags.length === 0) {
        validation.details.overallRisk = 'low';
      } else if (validation.details.flags.length <= 2) {
        validation.details.overallRisk = 'medium';
      } else {
        validation.details.overallRisk = 'high';
        validation.status = 'warning';
      }

    } catch (error) {
      validation.status = 'failed';
      validation.score = 0;
      validation.details.error = error.message;
    }

    return validation;
  }

  /**
   * Validate timing constraints were respected
   */
  async validateTiming(gameId, gameData) {
    const validation = {
      type: 'timing',
      status: 'passed',
      score: 100,
      details: {
        timeControl: gameData.time_control,
        timeLimit: gameData.time_limit,
        gameStarted: gameData.started_at,
        gameFinished: gameData.finished_at,
        totalDuration: null,
        issues: []
      }
    };

    try {
      // Calculate total game duration
      if (gameData.started_at && gameData.finished_at) {
        const duration = new Date(gameData.finished_at) - new Date(gameData.started_at);
        validation.details.totalDuration = Math.floor(duration / 1000); // seconds

        // Check if game duration is reasonable for time control
        const timeLimit = gameData.time_limit || 600; // Default 10 minutes
        const maxReasonableDuration = timeLimit * 4; // Allow 4x time limit for reasonable game

        if (validation.details.totalDuration > maxReasonableDuration) {
          validation.details.issues.push('game_duration_excessive');
          validation.score -= 10;
          validation.status = 'warning';
        }

        // Check for impossibly short games (unless resignation)
        if (validation.details.totalDuration < 10 && gameData.game_result !== 'resignation') {
          validation.details.issues.push('game_duration_too_short');
          validation.score -= 20;
          validation.status = 'warning';
        }
      }

      // Validate timeout scenarios
      if (gameData.game_result === 'timeout') {
        // Should have a winner unless it was inactivity abandonment
        if (!gameData.winner && gameData.game_result !== 'abandoned') {
          validation.details.issues.push('timeout_without_winner');
          validation.score -= 30;
          validation.status = 'failed';
        }
      }

    } catch (error) {
      validation.status = 'failed';
      validation.score = 0;
      validation.details.error = error.message;
    }

    return validation;
  }

  /**
   * Validate position integrity and checksums
   */
  async validatePositionIntegrity(gameId, gameData) {
    const validation = {
      type: 'position_integrity',
      status: 'passed',
      score: 100,
      details: {
        finalPositionFEN: gameData.final_position,
        positionChecks: [],
        pgnValidation: null
      }
    };

    try {
      // Validate FEN format if provided
      if (gameData.final_position) {
        const fenRegex = /^([rnbqkpRNBQKP1-8]+\/){7}[rnbqkpRNBQKP1-8]+ [bw] [-KQkq]+ [-a-h3-6]+ \d+ \d+$/;
        if (!fenRegex.test(gameData.final_position)) {
          validation.details.positionChecks.push('invalid_fen_format');
          validation.score -= 20;
          validation.status = 'warning';
        }
      }

      // Validate PGN if provided
      if (gameData.pgn) {
        // Basic PGN validation (contains move notation)
        const pgnMoveRegex = /[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](=[NBRQ])?[\+#]?/;
        if (!pgnMoveRegex.test(gameData.pgn)) {
          validation.details.positionChecks.push('invalid_pgn_format');
          validation.score -= 15;
          validation.status = 'warning';
        }
        validation.details.pgnValidation = 'basic_format_check_passed';
      }

      // Check move count consistency
      const moves = await this.getGameMoves(gameId);
      if (gameData.move_count !== moves.length) {
        validation.details.positionChecks.push('move_count_mismatch');
        validation.score -= 10;
        validation.status = 'warning';
      }

    } catch (error) {
      validation.status = 'failed';
      validation.score = 0;
      validation.details.error = error.message;
    }

    return validation;
  }

  /**
   * Helper methods
   */
  
  async getGameData(gameId) {
    const result = await this.pool.query('SELECT * FROM games WHERE id = $1', [gameId]);
    return result.rows[0];
  }

  async getGameMoves(gameId) {
    console.log(`🔍 getGameMoves called with gameId: ${gameId}`);
    const result = await this.pool.query(
      'SELECT * FROM game_moves WHERE game_id = $1 ORDER BY move_number ASC',
      [gameId]
    );
    console.log(`🔍 getGameMoves query result: ${result.rows.length} rows found`);
    if (result.rows.length > 0) {
      console.log(`🔍 First move:`, result.rows[0]);
    }
    return result.rows;
  }

  calculateOverallStatus(validations) {
    const statuses = Object.values(validations).map(v => v.status);
    
    if (statuses.includes('failed')) return 'failed';
    if (statuses.includes('warning')) return 'warning';
    return 'passed';
  }

  calculateOverallScore(validations) {
    const scores = Object.values(validations).map(v => v.score);
    return Math.round(scores.reduce((a, b) => a + b) / scores.length);
  }

  async storeValidationResults(gameId, results) {
    // Store overall validation results
    for (const [key, validation] of Object.entries(results.validations)) {
      await this.pool.query(`
        INSERT INTO game_validations (game_id, validation_type, status, score, details, validator_version)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (game_id, validation_type) 
        DO UPDATE SET 
          status = EXCLUDED.status,
          score = EXCLUDED.score,
          details = EXCLUDED.details,
          validated_at = NOW()
      `, [gameId, validation.type, validation.status, validation.score, JSON.stringify(validation.details), this.version]);
    }
  }

  async storeMoveValidation(gameId, moveNumber, validation) {
    await this.pool.query(`
      INSERT INTO move_validations (game_id, move_number, is_legal, position_after, time_used, validation_details)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (game_id, move_number)
      DO UPDATE SET
        is_legal = EXCLUDED.is_legal,
        position_after = EXCLUDED.position_after,
        time_used = EXCLUDED.time_used,
        validation_details = EXCLUDED.validation_details,
        validated_at = NOW()
    `, [
      gameId, 
      moveNumber, 
      validation.isLegal, 
      validation.positionAfter, 
      validation.timeUsed,
      JSON.stringify(validation.validationDetails)
    ]);
  }

  async storeValidationError(gameId, errorMessage) {
    await this.pool.query(`
      INSERT INTO game_validations (game_id, validation_type, status, score, error_message, validator_version)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (game_id, validation_type) 
      DO UPDATE SET 
        status = EXCLUDED.status,
        score = EXCLUDED.score,
        error_message = EXCLUDED.error_message,
        validated_at = NOW()
    `, [gameId, 'system_error', 'failed', 0, errorMessage, this.version]);
  }

  /**
   * Check if game is ready for payout based on validation results
   */
  async isGameReadyForPayout(gameId) {
    const result = await this.pool.query(`
      SELECT validation_type, status, score 
      FROM game_validations 
      WHERE game_id = $1
    `, [gameId]);

    const validations = result.rows;
    
    // All validations must be present and passed/warning (not failed)
    const requiredValidations = ['move_replay', 'financial_security', 'anti_cheat', 'timing', 'position_integrity'];
    const failedValidations = validations.filter(v => v.status === 'failed');
    const missingValidations = requiredValidations.filter(
      req => !validations.find(v => v.validation_type === req)
    );

    if (failedValidations.length > 0 || missingValidations.length > 0) {
      return {
        ready: false,
        reason: 'validation_failed',
        failedValidations: failedValidations.map(v => v.validation_type),
        missingValidations
      };
    }

    // Calculate overall score
    const avgScore = validations.reduce((sum, v) => sum + v.score, 0) / validations.length;
    
    // Require minimum 70% confidence for payout
    if (avgScore < 70) {
      return {
        ready: false,
        reason: 'low_confidence_score',
        score: avgScore
      };
    }

    return {
      ready: true,
      score: avgScore,
      validations: validations.length
    };
  }
}

module.exports = GameValidator;