/**
 * Game Reconnection Service
 * Handles robust reconnection to active games from game history
 */

import { ChessEngine } from '../engine/chessEngine';

interface ReconnectionGameState {
  roomId: string;
  gameId: string;
  userColor: 'white' | 'black';
  playerRole: 'white' | 'black';
  betAmount: number;
  timeLimit: number;
  
  gameActive: boolean;
  currentPlayer: 'white' | 'black';
  winner?: string;
  inCheck: boolean;
  checkmate: boolean;
  draw: boolean;
  
  position: string; // FEN string
  moveHistory: Array<{
    move_number: number;
    player: 'white' | 'black';
    from_square: string;
    to_square: string;
    piece: string;
    captured_piece?: string;
    move_notation: string;
    time_spent?: number;
    is_check?: boolean;
    is_checkmate?: boolean;
    is_castle?: boolean;
    is_en_passant?: boolean;
    is_promotion?: boolean;
    promotion_piece?: string;
    created_at: string;
  }>;
  lastMove?: {
    from: string;
    to: string;
    piece: string;
    capturedPiece?: string;
  };
  
  whiteTimeRemaining: number;
  blackTimeRemaining: number;
  timerLastSync: number;
  
  roomStatus: string;
  createdAt: string;
  startedAt?: string;
}

interface ReconnectionResult {
  success: boolean;
  gameState?: ReconnectionGameState;
  playerRole?: string;
  error?: string;
  code?: string;
}

class GameReconnectionService {
  private baseUrl: string;

  constructor() {
    // Always use production backend
    this.baseUrl = 'https://knightsbridge-app-35xls.ondigitalocean.app/api';
  }

  /**
   * 🔄 Attempt to reconnect to a specific game
   */
  async reconnectToGame(roomId: string, walletAddress: string): Promise<ReconnectionResult> {
    try {
      console.log('🔄 Attempting game reconnection:', { roomId, walletAddress });
      
      // Step 1: Get complete game state from backend
      const response = await fetch(
        `${this.baseUrl}/games/${roomId}/reconnect/${walletAddress}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Reconnection request failed:', response.status, errorData);
        
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          code: errorData.code || 'RECONNECTION_FAILED'
        };
      }
      
      const data = await response.json();
      
      if (!data.success || !data.gameState) {
        console.error('❌ Invalid reconnection response:', data);
        return {
          success: false,
          error: data.error || 'Invalid game state received',
          code: data.code || 'INVALID_RESPONSE'
        };
      }
      
      const gameState = data.gameState as ReconnectionGameState;
      
      // Step 2: Validate the game state
      const validation = this.validateGameState(gameState, walletAddress);
      if (!validation.valid) {
        console.error('❌ Game state validation failed:', validation.error);
        return {
          success: false,
          error: validation.error,
          code: 'VALIDATION_FAILED'
        };
      }
      
      // Step 3: Reconstruct chess position from move history
      const reconstructedState = await this.reconstructChessPosition(gameState);
      if (!reconstructedState.success) {
        console.error('❌ Failed to reconstruct chess position:', reconstructedState.error);
        return {
          success: false,
          error: reconstructedState.error,
          code: 'POSITION_RECONSTRUCTION_FAILED'
        };
      }
      
      // Step 4: Update game state with reconstructed position
      gameState.position = reconstructedState.position!;
      
      console.log('✅ Game reconnection successful!');
      console.log(`🎯 Player: ${gameState.userColor}, Current: ${gameState.currentPlayer}, Moves: ${gameState.moveHistory.length}`);
      
      return {
        success: true,
        gameState,
        playerRole: gameState.userColor
      };
      
    } catch (error) {
      console.error('❌ Game reconnection error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown reconnection error',
        code: 'RECONNECTION_ERROR'
      };
    }
  }

  /**
   * 🔍 Validate the received game state
   */
  private validateGameState(gameState: ReconnectionGameState, walletAddress: string): { valid: boolean; error?: string } {
    // Check required fields
    if (!gameState.roomId || !gameState.userColor || !gameState.playerRole || !gameState.currentPlayer) {
      return { valid: false, error: 'Missing required game state fields (roomId, userColor, playerRole, or currentPlayer)' };
    }
    
    // Validate user role
    if (!['white', 'black'].includes(gameState.userColor)) {
      return { valid: false, error: 'Invalid user color' };
    }
    
    // Check if game is still active
    if (!gameState.gameActive) {
      return { valid: false, error: 'Game is no longer active' };
    }
    
    // Validate move history format
    if (!Array.isArray(gameState.moveHistory)) {
      return { valid: false, error: 'Invalid move history format' };
    }
    
    // Check for reasonable move count (prevent corrupted data)
    if (gameState.moveHistory.length > 500) {
      return { valid: false, error: 'Move history too long - possible data corruption' };
    }
    
    return { valid: true };
  }

  /**
   * ♟️ Reconstruct the exact chess position from move history
   */
  private async reconstructChessPosition(gameState: ReconnectionGameState): Promise<{ success: boolean; position?: string; error?: string }> {
    try {
      // Start with standard starting position
      let currentPosition = ChessEngine.getInitialPosition();
      let currentGameState = {
        currentPlayer: 'white' as 'white' | 'black',
        castlingRights: { K: true, Q: true, k: true, q: true },
        enPassantTarget: null,
        halfmoveClock: 0,
        fullmoveNumber: 1,
        moveHistory: []
      };
      
      console.log(`🔄 Reconstructing position from ${gameState.moveHistory.length} moves...`);
      
      // Replay each move to build the exact position
      for (const move of gameState.moveHistory) {
        const fromSquare = move.from_square;
        const toSquare = move.to_square;
        const piece = currentPosition[fromSquare];
        
        if (!piece) {
          console.warn(`⚠️ Warning: No piece found at ${fromSquare} for move ${move.move_number}`);
          continue;
        }
        
        // Validate the move is legal in current position
        const legalMoves = ChessEngine.getLegalMoves(currentPosition, currentGameState.currentPlayer, currentGameState);
        const isLegal = legalMoves.some(legalMove => 
          legalMove.from === fromSquare && legalMove.to === toSquare
        );
        
        if (!isLegal) {
          console.warn(`⚠️ Warning: Move ${fromSquare}-${toSquare} appears illegal in current position`);
          // Continue anyway - trust the database move history
        }
        
        // Apply the move
        const moveResult = ChessEngine.makeMove(currentPosition, fromSquare, toSquare, currentGameState);
        if (moveResult.success) {
          currentPosition = moveResult.newPosition;
          currentGameState = moveResult.newGameState;
          
          console.log(`✅ Applied move ${move.move_number}: ${fromSquare}-${toSquare} (${move.piece})`);
        } else {
          console.warn(`⚠️ Failed to apply move ${move.move_number}: ${fromSquare}-${toSquare}`, moveResult.error);
          // Continue with best effort reconstruction
        }
      }
      
      // Convert to FEN string
      const fenPosition = ChessEngine.positionToFEN(currentPosition, currentGameState);
      
      console.log('✅ Position reconstruction complete!');
      console.log(`🎯 Final FEN: ${fenPosition}`);
      
      return {
        success: true,
        position: fenPosition
      };
      
    } catch (error) {
      console.error('❌ Error reconstructing chess position:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Position reconstruction failed'
      };
    }
  }

  /**
   * 🔄 Convert database moves to frontend format
   */
  convertDatabaseMovesToFrontendFormat(dbMoves: ReconnectionGameState['moveHistory']) {
    return dbMoves.map(move => ({
      from: move.from_square,
      to: move.to_square,
      piece: move.piece,
      capturedPiece: move.captured_piece || undefined,
      moveNumber: move.move_number,
      player: move.player,
      notation: move.move_notation,
      timeSpent: move.time_spent || 0,
      isCheck: move.is_check || false,
      isCheckmate: move.is_checkmate || false,
      isCastle: move.is_castle || false,
      isEnPassant: move.is_en_passant || false,
      isPromotion: move.is_promotion || false,
      promotionPiece: move.promotion_piece || undefined,
      timestamp: new Date(move.created_at)
    }));
  }
}

// Export singleton instance
export const gameReconnectionService = new GameReconnectionService();
export default gameReconnectionService;