/**
 * 🚛 TOYOTA RELIABILITY: Payout Validation System
 * Ensures financial security before releasing escrow funds
 */

const GameValidator = require('./game-validator');

class PayoutValidator {
  constructor(pool, chessEngine) {
    this.pool = pool;
    this.gameValidator = new GameValidator(pool, chessEngine);
  }

  /**
   * Main payout validation - called before releasing escrow funds
   */
  async validatePayout(gameId, escrowAccount) {
    console.log(`💰 Starting payout validation for game: ${gameId}`);
    
    try {
      // Get game data
      const gameData = await this.getGameData(gameId);
      if (!gameData) {
        throw new Error('Game not found');
      }

      // Check if game is finished
      if (gameData.game_state !== 'finished') {
        return this.createPayoutRejection(gameId, 'game_not_finished', 'Game must be finished before payout');
      }

      // Check if payout already processed
      const existingPayout = await this.getExistingPayout(gameId);
      if (existingPayout && existingPayout.validation_status === 'approved') {
        return {
          approved: true,
          reason: 'already_processed',
          payoutId: existingPayout.id,
          existingTx: existingPayout.payout_tx_id
        };
      }

      // Run comprehensive game validation
      console.log('🔍 Running comprehensive game validation...');
      const gameValidation = await this.gameValidator.validateGame(gameId);
      
      if (gameValidation.overallStatus === 'failed') {
        return this.createPayoutRejection(
          gameId, 
          'game_validation_failed', 
          'Game validation failed - payout blocked for security',
          { validationResults: gameValidation }
        );
      }

      // Check if game is ready for payout
      const payoutReadiness = await this.gameValidator.isGameReadyForPayout(gameId);
      if (!payoutReadiness.ready) {
        return this.createPayoutRejection(
          gameId,
          'validation_incomplete',
          'Game validation incomplete or failed',
          { readinessCheck: payoutReadiness }
        );
      }

      // Calculate payout amounts
      const payoutCalculation = this.calculatePayoutAmounts(gameData);
      
      // Create payout validation record
      const payoutValidation = await this.createPayoutValidation(
        gameId,
        escrowAccount,
        payoutCalculation,
        gameValidation,
        payoutReadiness
      );

      // Determine if human review is required
      const requiresReview = this.requiresHumanReview(gameValidation, payoutCalculation);
      
      if (requiresReview) {
        console.log('👨‍💼 Payout flagged for human review');
        await this.flagForHumanReview(payoutValidation.id, requiresReview.reasons);
        
        return {
          approved: false,
          reason: 'human_review_required',
          payoutId: payoutValidation.id,
          reviewReasons: requiresReview.reasons,
          estimatedReviewTime: '24-48 hours'
        };
      }

      // Auto-approve payout
      console.log('✅ Auto-approving payout - all validations passed');
      await this.approvePayout(payoutValidation.id, 'system_auto_approval');
      
      return {
        approved: true,
        reason: 'validation_passed',
        payoutId: payoutValidation.id,
        winnerWallet: payoutCalculation.winnerWallet,
        winnerAmount: payoutCalculation.winnerAmount,
        platformFee: payoutCalculation.platformFee,
        validationScore: payoutReadiness.score
      };

    } catch (error) {
      console.error(`❌ Payout validation failed for game ${gameId}:`, error);
      
      await this.createPayoutValidation(gameId, escrowAccount, null, null, null, {
        status: 'rejected',
        error: error.message
      });

      return {
        approved: false,
        reason: 'validation_error',
        error: error.message
      };
    }
  }

  /**
   * Calculate correct payout amounts based on game result
   */
  calculatePayoutAmounts(gameData) {
    const stakeAmount = parseFloat(gameData.stake_amount);
    const platformFeeRate = 0.02; // 2% platform fee
    const totalPot = stakeAmount * 2; // Both players' stakes
    const platformFee = totalPot * platformFeeRate;
    const netPot = totalPot - platformFee;

    let calculation = {
      stakeAmount,
      totalPot,
      platformFee,
      netPot,
      winner: gameData.winner,
      gameResult: gameData.game_result,
      payouts: {}
    };

    switch (gameData.game_result) {
      case 'checkmate':
      case 'resignation':
      case 'timeout':
        // Winner takes all (minus platform fee)
        if (gameData.winner === 'white') {
          calculation.winnerWallet = gameData.player_white_wallet;
          calculation.winnerAmount = netPot;
          calculation.payouts[gameData.player_white_wallet] = netPot;
          calculation.payouts[gameData.player_black_wallet] = 0;
        } else if (gameData.winner === 'black') {
          calculation.winnerWallet = gameData.player_black_wallet;
          calculation.winnerAmount = netPot;
          calculation.payouts[gameData.player_white_wallet] = 0;
          calculation.payouts[gameData.player_black_wallet] = netPot;
        } else {
          throw new Error('Decisive game result must have a winner');
        }
        break;

      case 'stalemate':
      case 'agreement':
        // Draw - split pot equally (minus platform fee)
        const drawAmount = netPot / 2;
        calculation.winnerWallet = null;
        calculation.winnerAmount = null;
        calculation.payouts[gameData.player_white_wallet] = drawAmount;
        calculation.payouts[gameData.player_black_wallet] = drawAmount;
        calculation.drawAmount = drawAmount;
        break;

      case 'abandoned':
        // Abandoned game - return stakes (no platform fee for abandoned games)
        calculation.platformFee = 0;
        calculation.winnerWallet = null;
        calculation.winnerAmount = null;
        calculation.payouts[gameData.player_white_wallet] = stakeAmount;
        calculation.payouts[gameData.player_black_wallet] = stakeAmount;
        calculation.refundAmount = stakeAmount;
        break;

      default:
        throw new Error(`Unknown game result: ${gameData.game_result}`);
    }

    return calculation;
  }

  /**
   * Check if payout requires human review
   */
  requiresHumanReview(gameValidation, payoutCalculation) {
    const reasons = [];

    // High stakes require review
    if (payoutCalculation.totalPot > 10) { // More than 10 SOL
      reasons.push('high_stakes_game');
    }

    // Low validation confidence requires review
    if (gameValidation.overallScore < 85) {
      reasons.push('low_validation_confidence');
    }

    // Any failed validations require review
    const hasWarnings = Object.values(gameValidation.validations || {})
      .some(v => v.status === 'warning');
    if (hasWarnings) {
      reasons.push('validation_warnings');
    }

    // Anti-cheat flags require review
    const antiCheat = gameValidation.validations?.antiCheat;
    if (antiCheat && antiCheat.details.overallRisk === 'high') {
      reasons.push('anti_cheat_high_risk');
    }

    // Very short or very long games require review
    const timing = gameValidation.validations?.timing;
    if (timing && timing.details.issues.length > 0) {
      reasons.push('timing_anomalies');
    }

    return reasons.length > 0 ? { required: true, reasons } : { required: false };
  }

  /**
   * Create payout validation record
   */
  async createPayoutValidation(gameId, escrowAccount, payoutCalculation, gameValidation, payoutReadiness, override = {}) {
    const status = override.status || 'pending';
    const score = payoutReadiness?.score || 0;
    
    const riskFactors = {
      validationScore: score,
      gameValidation: gameValidation?.overallStatus,
      antiCheatRisk: gameValidation?.validations?.antiCheat?.details?.overallRisk,
      payoutAmount: payoutCalculation?.winnerAmount || payoutCalculation?.drawAmount,
      gameResult: payoutCalculation?.gameResult
    };

    const result = await this.pool.query(`
      INSERT INTO payout_validations (
        game_id, escrow_account, winner_wallet, stake_amount, platform_fee,
        validation_status, validation_score, risk_factors
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      gameId,
      escrowAccount,
      payoutCalculation?.winnerWallet,
      payoutCalculation?.stakeAmount || 0,
      payoutCalculation?.platformFee || 0,
      status,
      score,
      JSON.stringify(riskFactors)
    ]);

    return { id: result.rows[0].id, ...riskFactors };
  }

  /**
   * Helper methods
   */

  async getGameData(gameId) {
    const result = await this.pool.query('SELECT * FROM games WHERE id = $1', [gameId]);
    return result.rows[0];
  }

  async getExistingPayout(gameId) {
    const result = await this.pool.query(
      'SELECT * FROM payout_validations WHERE game_id = $1',
      [gameId]
    );
    return result.rows[0];
  }

  createPayoutRejection(gameId, reason, message, details = {}) {
    return {
      approved: false,
      reason,
      message,
      gameId,
      details
    };
  }

  async flagForHumanReview(payoutId, reasons) {
    await this.pool.query(`
      UPDATE payout_validations 
      SET human_review_required = true,
          risk_factors = jsonb_set(risk_factors, '{review_reasons}', $2)
      WHERE id = $1
    `, [payoutId, JSON.stringify(reasons)]);
  }

  async approvePayout(payoutId, approvedBy) {
    await this.pool.query(`
      UPDATE payout_validations 
      SET validation_status = 'approved',
          approved_by = $2,
          approved_at = NOW()
      WHERE id = $1
    `, [payoutId, approvedBy]);
  }

  async recordPayoutTransaction(payoutId, transactionId) {
    await this.pool.query(`
      UPDATE payout_validations 
      SET payout_tx_id = $2
      WHERE id = $1
    `, [payoutId, transactionId]);
  }

  /**
   * Get payout status for a game
   */
  async getPayoutStatus(gameId) {
    const result = await this.pool.query(`
      SELECT pv.*, gv.validation_type, gv.status as validation_status, gv.score
      FROM payout_validations pv
      LEFT JOIN game_validations gv ON pv.game_id = gv.game_id
      WHERE pv.game_id = $1
      ORDER BY gv.validated_at DESC
    `, [gameId]);

    if (result.rows.length === 0) {
      return { status: 'not_validated', validations: [] };
    }

    const payout = result.rows[0];
    const validations = result.rows.map(row => ({
      type: row.validation_type,
      status: row.validation_status,
      score: row.score
    }));

    return {
      status: payout.validation_status,
      payoutId: payout.id,
      escrowAccount: payout.escrow_account,
      winnerWallet: payout.winner_wallet,
      stakeAmount: payout.stake_amount,
      platformFee: payout.platform_fee,
      validationScore: payout.validation_score,
      humanReviewRequired: payout.human_review_required,
      approvedBy: payout.approved_by,
      approvedAt: payout.approved_at,
      payoutTxId: payout.payout_tx_id,
      riskFactors: payout.risk_factors,
      validations
    };
  }
}

module.exports = PayoutValidator;