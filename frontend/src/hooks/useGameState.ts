/**
 * Custom hook for managing chess game state with complete chess rules
 * Handles game logic, move validation, state updates, and multiplayer synchronization
 */

import { useState } from 'react';
import ChessEngine from '../engine/chessEngine';
import type { GameState, Move } from '../types/chess';
import { databaseMultiplayerState } from '../services/databaseMultiplayerState';
import { useSolanaWallet } from './useSolanaWallet';
import { generatePositionHash, generateMoveNotation, validateMoveNotation } from '../utils/blockchainUtils';

export interface MoveResult {
  success: boolean;
  message: string;
}

export interface GameStateHook {
  gameState: GameState;
  makeMove: (from: string, to: string, roomId?: string) => Promise<MoveResult>;
  selectSquare: (square: string) => void;
  resetGame: (roomId?: string | null) => void;
  loadGameState: (newState: GameState) => void;
  getGameStatus: () => string;
  getLegalMovesForSquare: (square: string) => string[];
  setGameActive: (active: boolean) => void;
  setWinner: (winner: 'white' | 'black' | null) => void;
  resignGame: (resigningPlayer: 'white' | 'black', roomId?: string) => void;
}

/**
 * Custom hook for chess game state management with complete chess rules
 */
export const useGameState = (): GameStateHook => {
  const [gameState, setGameState] = useState<GameState>({
    ...ChessEngine.getInitialGameState(),
    position: ChessEngine.getInitialPosition()
  });

  // Get Solana wallet functions
  const { recordMove: recordMoveOnChain } = useSolanaWallet();

    /**
   * Make a move on the chess board
   * @param from - Source square (e.g., "e2")
   * @param to - Target square (e.g., "e4")
   * @param roomId - Optional room ID for multiplayer sync
   * @returns Object with success status and message
   */
  const makeMove = async (from: string, to: string, roomId?: string): Promise<MoveResult> => {
    let moveSuccessful = false;
    let statusMessage = '';
    let moveData: { 
      piece: string; 
      capturedPiece?: string; 
      position: any; 
      isCheck: boolean; 
      isCheckmate: boolean;
      isEnPassant: boolean;
      isCastle: boolean;
      isPromotion: boolean;
    } | null = null;
    
    setGameState((prev) => {
      const piece = prev.position[from];
      if (!piece) {
        statusMessage = 'No piece selected';
        return prev;
      }

      const pieceColor = ChessEngine.getPieceColor(piece);
      if (pieceColor !== prev.currentPlayer) {
        statusMessage = 'Not your piece';
        return prev;
      }

      // CRITICAL: If player is in check, they can only make moves that get out of check
      if (ChessEngine.isInCheck(prev.position, prev.currentPlayer)) {
        const legalMoves = ChessEngine.getLegalMoves(prev.position, prev.currentPlayer, prev);
        const isLegalMove = legalMoves.some(move => move.from === from && move.to === to);
        
        if (!isLegalMove) {
          statusMessage = 'You must get out of check!';
          return prev;
        }
      } else {
        // Normal move validation
        if (!ChessEngine.isLegalMove(from, to, prev.position, prev.currentPlayer, prev)) {
          statusMessage = 'Illegal move';
          return prev;
        }
      }

      // Make the move using the chess engine
      console.log('🔍 About to call ChessEngine.makeMove with gameState:', prev);
      const result = ChessEngine.makeMove(from, to, prev.position, prev);
      if (!result) {
        console.log('❌ ChessEngine.makeMove returned null');
        statusMessage = 'Invalid move';
        return prev;
      }
      console.log('✅ ChessEngine.makeMove result:', result);

      const nextPlayer: 'white' | 'black' = prev.currentPlayer === 'white' ? 'black' : 'white';
      const isCheck = ChessEngine.isInCheck(result.position, nextPlayer);
      const isCheckmate = ChessEngine.isCheckmate(result.position, nextPlayer, result.gameState);
      
      // Detect en passant move
      const isEnPassant = ChessEngine.PIECES.PAWNS.includes(piece) && 
                         to === prev.enPassantTarget && 
                         prev.enPassantTarget !== null;
      
      // Debug en passant detection
      if (ChessEngine.PIECES.PAWNS.includes(piece)) {
        console.log('🔍 Pawn move debug:', {
          from,
          to,
          piece,
          enPassantTarget: prev.enPassantTarget,
          isEnPassant,
          moveIsToEnPassantTarget: to === prev.enPassantTarget
        });
      }
      
      // Detect castling move
      const isCastle = ChessEngine.PIECES.KINGS.includes(piece) && 
                      Math.abs(ChessEngine.squareToCoords(from)[0] - ChessEngine.squareToCoords(to)[0]) === 2;
      
      // Detect promotion (pawn reaching end rank)
      const isPromotion = ChessEngine.PIECES.PAWNS.includes(piece) && 
                         ((prev.currentPlayer === 'white' && to[1] === '8') || 
                          (prev.currentPlayer === 'black' && to[1] === '1'));
      
      // Store move data for blockchain recording
      moveData = {
        piece,
        capturedPiece: result.capturedPiece,
        position: result.position,
        isCheck,
        isCheckmate,
        isEnPassant,
        isCastle,
        isPromotion
      };
      
      // Build new state
      console.log('🔍 Building new game state. En passant target from result:', result.gameState.enPassantTarget);
      const newState: GameState = {
        ...prev,
        position: result.position,
        currentPlayer: nextPlayer,
        selectedSquare: null,
        moveHistory: [...prev.moveHistory, { 
          from, 
          to, 
          piece, 
          capturedPiece: result.capturedPiece,
          isEnPassant,
          isCastle,
          isPromotion 
        }],
        lastUpdated: Date.now(),
        castlingRights: result.gameState.castlingRights || 'KQkq',
        enPassantTarget: result.gameState.enPassantTarget || null,
        halfmoveClock: result.gameState.halfmoveClock || 0,
        fullmoveNumber: result.gameState.fullmoveNumber || 1,
        inCheck: isCheck,
        lastMove: { from, to }
      };
      
      console.log('🔍 New game state built. En passant target:', newState.enPassantTarget);

      // Check for game end conditions
      if (isCheckmate) {
        newState.winner = prev.currentPlayer;
        newState.gameActive = false;
        statusMessage = `Checkmate! ${prev.currentPlayer} wins!`;
      } else if (ChessEngine.isStalemate(result.position, nextPlayer, result.gameState)) {
        newState.draw = true;
        newState.gameActive = false;
        statusMessage = 'Stalemate! Draw!';
      } else if ((result.gameState.halfmoveClock || 0) >= 100) {
        newState.draw = true;
        newState.gameActive = false;
        statusMessage = 'Draw by 50-move rule!';
      } else if (isCheck) {
        statusMessage = `${nextPlayer} is in check!`;
      } else {
        statusMessage = `${nextPlayer}'s turn`;
      }

      // Save to multiplayer state if in multiplayer mode
      if (roomId) {
        databaseMultiplayerState.saveGameState(roomId, newState);
      }

      moveSuccessful = true;
      return newState;
    });

    // Record move on blockchain if in multiplayer mode with roomId
    if (moveSuccessful && roomId && moveData) {
      try {
        // Generate proper move notation
        const moveNotation = generateMoveNotation(
          from,
          to,
          moveData.piece,
          moveData.capturedPiece,
          moveData.isCheck,
          moveData.isCheckmate
        );
        
        // Validate move notation length
        if (!validateMoveNotation(moveNotation)) {
          console.warn('⚠️ Move notation too long for blockchain');
          statusMessage += ' (notation too long)';
        } else {
          // Generate position hash
          const positionHash = generatePositionHash(moveData.position);
          
          // Record move on blockchain with full move details
          const blockchainSuccess = await recordMoveOnChain(
            roomId, 
            moveNotation, 
            positionHash,
            from,
            to,
            moveData.piece,
            moveData.capturedPiece,
            1000, // timeSpent - default 1 second
            moveData.isCheck,
            moveData.isCheckmate,
            moveData.isCastle,
            moveData.isEnPassant,
            moveData.isPromotion
          );
          if (!blockchainSuccess) {
            statusMessage += ' (blockchain sync failed)';
          }
        }
      } catch (error) {
        console.error('❌ Error recording move on blockchain:', error);
        statusMessage += ' (blockchain error)';
      }
    }
    
    return { success: moveSuccessful, message: statusMessage };
  };

  /**
   * Select or deselect a square on the chess board
   * @param square - Square to select (e.g., "e2")
   */
  const selectSquare = (square: string): void => {
    setGameState(prev => {
      const piece = prev.position[square];
      
      // If clicking on own piece, select it
      if (piece && ChessEngine.getPieceColor(piece) === prev.currentPlayer) {
        return {
          ...prev,
          selectedSquare: prev.selectedSquare === square ? null : square
        };
      }
      
      // If a square is already selected and clicking empty/opponent square, try to move
      if (prev.selectedSquare && prev.selectedSquare !== square) {
        // This will be handled by the move logic in handleSquareClick
        return prev;
      }
      
      // Deselect if clicking same square or invalid square
      return {
        ...prev,
        selectedSquare: null
      };
    });
  };

  /**
   * Reset the game to initial state
   * @param roomId - Optional room ID for multiplayer sync
   */
  const resetGame = (roomId?: string | null): void => {
    // Reset local game state
    const initialState: GameState = {
      ...ChessEngine.getInitialGameState(),
      position: ChessEngine.getInitialPosition(),
      gameActive: true
    };

    setGameState(initialState);

    // Save reset state to multiplayer if roomId provided
    if (roomId) {
      databaseMultiplayerState.saveGameState(roomId, initialState);
    }
  };

  /**
   * Load a game state (used for multiplayer synchronization)
   * @param newState - New game state to load
   */
  const loadGameState = (newState: GameState): void => {
    setGameState({
      ...newState,
      // Ensure game stays active during multiplayer sync unless explicitly ended
      gameActive: newState.gameActive !== undefined ? newState.gameActive : true
    });
  };

  /**
   * Get current game status as a human-readable string
   * @returns Status message
   */
  const getGameStatus = (): string => {
    if (!gameState.gameActive) return 'Game not started';
    if (gameState.winner) return `${gameState.winner} wins!`;
    if (gameState.draw) return 'Draw!';
    if (gameState.inCheck) return `${gameState.currentPlayer} is in check!`;
    return `${gameState.currentPlayer}'s turn`;
  };

  /**
   * Get legal moves for a specific square
   * @param square - Square to get moves for (e.g., "e2")
   * @returns Array of legal target squares
   */
  const getLegalMovesForSquare = (square: string): string[] => {
    const piece = gameState.position[square];
    if (!piece || ChessEngine.getPieceColor(piece) !== gameState.currentPlayer) {
      return [];
    }
    
    const legalMoves = ChessEngine.getLegalMoves(gameState.position, gameState.currentPlayer, gameState);
    return legalMoves.filter(move => move.from === square).map(move => move.to);
  };

  // Get all legal moves for the current position
  const getAllLegalMoves = (): string[] => {
    if (!gameState.gameActive) return [];
    const moves = ChessEngine.getLegalMoves(gameState.position, gameState.currentPlayer, gameState);
    return moves.map(move => move.to);
  };

  /**
   * Set game active status
   * @param active - Whether the game is active
   */
  const setGameActive = (active: boolean): void => {
    setGameState(prev => ({ ...prev, gameActive: active }));
  };

  /**
   * Set the winner of the game
   * @param winner - Winner color or null for no winner
   */
  const setWinner = (winner: 'white' | 'black' | null): void => {
    setGameState(prev => ({ ...prev, winner, gameActive: false }));
  };

  /**
   * Declare game result on blockchain
   * @param roomId - Room ID for blockchain integration
   * @param winner - Winner of the game
   * @param reason - Reason for game end
   */
  const declareGameResult = async (roomId: string, winner: 'white' | 'black' | null, reason: string): Promise<boolean> => {
    try {
      const { declareResult } = useSolanaWallet();
      
      if (!declareResult) {
        console.warn('⚠️ Declare result function not available');
        return false;
      }

      const result = await declareResult(roomId, winner, reason);
      return true;
    } catch (error) {
      console.error('❌ Error declaring game result on blockchain:', error);
      return false;
    }
  };



  /**
   * Resign the game (forfeit)
   * @param resigningPlayer - Color of the player who is resigning
   * @param roomId - Optional room ID for multiplayer sync
   */
  const resignGame = (resigningPlayer: 'white' | 'black', roomId?: string): void => {
    const winner: 'white' | 'black' = resigningPlayer === 'white' ? 'black' : 'white';
    
    setGameState(prev => ({
      ...prev,
      winner,
      gameActive: false,
      lastUpdated: Date.now()
    }));

    // Save resignation to multiplayer state if roomId provided
    if (roomId) {
      // Get current state and update it
      const updatedState = {
        ...gameState,
        winner,
        gameActive: false,
        lastUpdated: Date.now()
      };
      databaseMultiplayerState.saveGameState(roomId, updatedState);
  
    }
  };

  return {
    gameState,
    makeMove,
    selectSquare,
    resetGame,
    loadGameState,
    getGameStatus,
    getLegalMovesForSquare,
    setGameActive,
    setWinner,
    resignGame
  };
};

export default useGameState;