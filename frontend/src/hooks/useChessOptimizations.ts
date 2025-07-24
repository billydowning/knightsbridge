import React, { useMemo, useCallback, useRef } from 'react';
import { ChessEngine } from '../engine/chessEngine';
import type { GameState, Position } from '../types';

/**
 * Custom hook for chess-specific performance optimizations
 */
export const useChessOptimizations = (gameState: GameState | null) => {
  const lastMoveRef = useRef<{ from: string; to: string } | null>(null);

  // Memoize legal moves to prevent recalculation on every render
  const legalMoves = useMemo(() => {
    if (!gameState || !gameState.gameActive || !gameState.currentPlayer) {
      return [];
    }
    
    return ChessEngine.getLegalMoves(
      gameState.position, 
      gameState.currentPlayer, 
      gameState
    );
  }, [gameState?.position, gameState?.currentPlayer, gameState?.gameActive, gameState]);

  // Memoize check status
  const isInCheck = useMemo(() => {
    if (!gameState || !gameState.currentPlayer) return false;
    return ChessEngine.isInCheck(gameState.position, gameState.currentPlayer);
  }, [gameState?.position, gameState?.currentPlayer]);

  // Memoize checkmate status
  const isCheckmate = useMemo(() => {
    if (!gameState || !gameState.currentPlayer) return false;
    return ChessEngine.isCheckmate(gameState.position, gameState.currentPlayer, gameState);
  }, [gameState?.position, gameState?.currentPlayer, gameState]);

  // Memoize stalemate status
  const isStalemate = useMemo(() => {
    if (!gameState || !gameState.currentPlayer) return false;
    return ChessEngine.isStalemate(gameState.position, gameState.currentPlayer, gameState);
  }, [gameState?.position, gameState?.currentPlayer, gameState]);

  // Optimized move validation
  const validateMove = useCallback((from: string, to: string): boolean => {
    return legalMoves.some(move => move.from === from && move.to === to);
  }, [legalMoves]);

  // Optimized piece selection
  const getLegalMovesForSquare = useCallback((square: string) => {
    return legalMoves.filter(move => move.from === square);
  }, [legalMoves]);

  // Track move changes for animations
  const hasMoveChanged = useMemo(() => {
    if (!gameState) return false;
    const currentMove = gameState.lastMove;
    const hasChanged = !lastMoveRef.current || 
      lastMoveRef.current.from !== currentMove?.from || 
      lastMoveRef.current.to !== currentMove?.to;
    
    if (hasChanged) {
      lastMoveRef.current = currentMove || null;
    }
    
    return hasChanged;
  }, [gameState?.lastMove]);

  // Memoize game status
  const gameStatus = useMemo(() => {
    if (isCheckmate) {
      return 'checkmate';
    }
    if (isStalemate) {
      return 'stalemate';
    }
    if (isInCheck) {
      return 'check';
    }
    return 'normal';
  }, [isCheckmate, isStalemate, isInCheck]);

  return {
    legalMoves,
    isInCheck,
    isCheckmate,
    isStalemate,
    validateMove,
    getLegalMovesForSquare,
    hasMoveChanged,
    gameStatus
  };
};

/**
 * Hook for debouncing expensive operations
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook for throttling frequent operations
 */
export const useThrottle = <T>(value: T, limit: number): T => {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastRan = React.useRef(Date.now());

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}; 