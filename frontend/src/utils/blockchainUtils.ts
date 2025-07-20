/**
 * Blockchain Utilities
 * Helper functions for Solana blockchain integration
 */

import { createHash } from 'crypto';
import type { Position } from '../types/chess';

/**
 * Generate a hash of the current chess position
 * @param position - Current chess position
 * @returns Position hash as Uint8Array
 */
export const generatePositionHash = (position: Position): Uint8Array => {
  // Convert position to string representation
  const positionString = Object.entries(position)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([square, piece]) => `${square}:${piece}`)
    .join('|');
  
  // Create SHA-256 hash
  const hash = createHash('sha256');
  hash.update(positionString);
  
  // Convert to Uint8Array
  const hashBuffer = hash.digest();
  return new Uint8Array(hashBuffer);
};

/**
 * Generate move notation in standard chess format
 * @param from - Source square
 * @param to - Target square
 * @param piece - Piece being moved
 * @param capturedPiece - Piece being captured (if any)
 * @param isCheck - Whether move results in check
 * @param isCheckmate - Whether move results in checkmate
 * @returns Standard chess notation
 */
export const generateMoveNotation = (
  from: string,
  to: string,
  piece: string,
  capturedPiece?: string,
  isCheck: boolean = false,
  isCheckmate: boolean = false
): string => {
  let notation = '';
  
  // Add piece letter (except for pawns)
  if (piece !== 'P' && piece !== 'p') {
    notation += piece.toUpperCase();
  }
  
  // Add source square for disambiguation
  notation += from;
  
  // Add capture symbol
  if (capturedPiece) {
    if (piece === 'P' || piece === 'p') {
      notation += from.charAt(0) + 'x';
    } else {
      notation += 'x';
    }
  }
  
  // Add destination square
  notation += to;
  
  // Add check/checkmate symbols
  if (isCheckmate) {
    notation += '#';
  } else if (isCheck) {
    notation += '+';
  }
  
  return notation;
};

/**
 * Validate move notation length for blockchain
 * @param notation - Move notation to validate
 * @returns Whether notation is valid for blockchain
 */
export const validateMoveNotation = (notation: string): boolean => {
  return notation.length <= 10; // Smart contract limit
};

/**
 * Create a unique game identifier
 * @param roomId - Room ID
 * @param player1 - First player wallet
 * @param player2 - Second player wallet
 * @returns Unique game identifier
 */
export const createGameIdentifier = (
  roomId: string,
  player1: string,
  player2: string
): string => {
  const sortedPlayers = [player1, player2].sort();
  return `${roomId}-${sortedPlayers[0]}-${sortedPlayers[1]}`;
};

/**
 * Parse blockchain error messages
 * @param error - Blockchain error
 * @returns User-friendly error message
 */
export const parseBlockchainError = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.error?.errorCode?.code) {
    const code = error.error.errorCode.code;
    switch (code) {
      case 'RoomIdTooLong':
        return 'Room ID is too long (max 32 characters)';
      case 'InvalidStakeAmount':
        return 'Invalid stake amount';
      case 'AlreadyDeposited':
        return 'You have already deposited for this game';
      case 'GameNotWaitingForPlayers':
        return 'Game is not waiting for players';
      case 'CannotPlayAgainstSelf':
        return 'Cannot play against yourself';
      case 'UnauthorizedPlayer':
        return 'You are not authorized to make this move';
      case 'GameNotInProgress':
        return 'Game is not in progress';
      case 'MoveNotationTooLong':
        return 'Move notation is too long';
      case 'MoveTimeExceeded':
        return 'Move time exceeded';
      default:
        return `Blockchain error: ${code}`;
    }
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'An unknown blockchain error occurred';
};

/**
 * Calculate transaction fee estimate
 * @param operation - Operation type
 * @returns Estimated fee in SOL
 */
export const estimateTransactionFee = (operation: 'move' | 'escrow' | 'claim'): number => {
  const baseFee = 0.000005; // Base transaction fee
  const operationMultiplier = {
    move: 1,
    escrow: 2,
    claim: 1.5
  };
  
  return baseFee * operationMultiplier[operation];
};

/**
 * Validate wallet address format
 * @param address - Wallet address to validate
 * @returns Whether address is valid
 */
export const validateWalletAddress = (address: string): boolean => {
  // Basic Solana address validation
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
};

/**
 * Format SOL amount for display
 * @param lamports - Amount in lamports
 * @returns Formatted SOL amount
 */
export const formatSOLAmount = (lamports: number): string => {
  const sol = lamports / 1e9;
  return sol.toFixed(4);
};

/**
 * Convert SOL to lamports
 * @param sol - Amount in SOL
 * @returns Amount in lamports
 */
export const solToLamports = (sol: number): number => {
  return Math.floor(sol * 1e9);
};

/**
 * Convert lamports to SOL
 * @param lamports - Amount in lamports
 * @returns Amount in SOL
 */
export const lamportsToSol = (lamports: number): number => {
  return lamports / 1e9;
}; 