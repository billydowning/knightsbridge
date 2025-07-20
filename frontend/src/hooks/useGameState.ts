/**
 * Custom hook for managing chess game state with complete chess rules
 * Handles game logic, move validation, state updates, and multiplayer synchronization
 */

import { useState } from 'react';
import ChessEngine from '../engine/chessEngine';
import type { GameState, Move } from '../types/chess';
import multiplayerState from '../services/multiplayerState';

export interface MoveResult {
  success: boolean;
  message: string;
}

export interface GameStateHook {
  gameState: GameState;
  makeMove: (from: string, to: string, roomId?: string) => MoveResult;
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
    position: ChessEngine.getInitialPosition(),
    ...ChessEngine.getInitialGameState()
  });

  /**
   * Make a move on the chess board
   * @param from - Source square (e.g., "e2")
   * @param to - Target square (e.g., "e4")
   * @param roomId - Optional room ID for multiplayer sync
   * @returns Object with success status and message
   */
  const makeMove = (from: string, to: string, roomId?: string): MoveResult => {
    let moveSuccessful = false;
    let statusMessage = '';
    
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
      const result = ChessEngine.makeMove(from, to, prev.position, prev);
      if (!result) {
        statusMessage = 'Invalid move';
        return prev;
      }

      const nextPlayer: 'white' | 'black' = prev.currentPlayer === 'white' ? 'black' : 'white';
      
      // Build new state
      const newState: GameState = {
        ...prev,
        position: result.position,
        currentPlayer: nextPlayer,
        selectedSquare: null,
        moveHistory: [...prev.moveHistory, { 
          from, 
          to, 
          piece, 
          capturedPiece: result.capturedPiece 
        }],
        lastUpdated: Date.now(),
        castlingRights: result.gameState.castlingRights || 'KQkq',
        enPassantTarget: result.gameState.enPassantTarget || null,
        halfmoveClock: result.gameState.halfmoveClock || 0,
        fullmoveNumber: result.gameState.fullmoveNumber || 1,
        inCheck: ChessEngine.isInCheck(result.position, nextPlayer)
      };

      // Check for game end conditions
      if (ChessEngine.isCheckmate(result.position, nextPlayer, result.gameState)) {
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
      } else if (newState.inCheck) {
        statusMessage = `${nextPlayer} is in check!`;
      } else {
        statusMessage = `${nextPlayer}'s turn`;
      }

      // Save to multiplayer state if in multiplayer mode
      if (roomId) {
        multiplayerState.saveGameState(roomId, newState);
      }

      moveSuccessful = true;
      return newState;
    });
    
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
      position: ChessEngine.getInitialPosition(),
      ...ChessEngine.getInitialGameState(),
      gameActive: true
    };

    setGameState(initialState);

    // Save reset state to multiplayer if roomId provided
    if (roomId) {
      multiplayerState.saveGameState(roomId, initialState);
      console.log('🔄 Game reset and synced to multiplayer state');
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
   * Resign the game (forfeit)
   * @param resigningPlayer - Color of the player who is resigning
   * @param roomId - Optional room ID for multiplayer sync
   */
  const resignGame = (resigningPlayer: 'white' | 'black', roomId?: string): void => {
    const winner = resigningPlayer === 'white' ? 'black' : 'white';
    
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
      multiplayerState.saveGameState(roomId, updatedState);
      console.log(`🏳️ Player ${resigningPlayer} resigned. ${winner} wins by resignation.`);
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