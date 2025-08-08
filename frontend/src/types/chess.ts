/**
 * Chess Game Types
 * Centralized type definitions for the chess game
 */

export interface Move {
  from: string;
  to: string;
  piece: string;
  capturedPiece?: string;
  isEnPassant?: boolean;
  isCastle?: boolean;
  isPromotion?: boolean;
}

export interface Position {
  [square: string]: string;
}

export interface GameState {
  position: Position;
  currentPlayer: 'white' | 'black';
  selectedSquare: string | null;
  gameActive: boolean;
  winner: 'white' | 'black' | 'draw' | null;
  draw: boolean;
  moveHistory: Move[];
  lastUpdated: number;
  castlingRights: string;
  enPassantTarget: string | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  inCheck: boolean;
  inCheckmate: boolean;
  lastMove?: { from: string; to: string } | null;
  canClaimFiftyMoveRule?: boolean;
  
  // Timer synchronization (hybrid approach)
  whiteTimeRemaining?: number;
  blackTimeRemaining?: number;
  timerLastSync?: number; // timestamp when timers were last synced
}

export interface MoveResult {
  position: Position;
  gameState: Partial<GameState>;
  capturedPiece?: string;
}

// Player and room types
export interface PlayerRole {
  role: 'white' | 'black';
  wallet: string;
}

export interface Room {
  players: PlayerRole[];
  escrows: { [wallet: string]: number };
  gameStarted: boolean;
  created: number;
}

export interface RoomStatus {
  playerCount: number;
  players: PlayerRole[];
  escrowCount: number;
  confirmedDepositsCount: number; // NEW: Track confirmed deposits separately
  escrows: { [wallet: string]: number };
  gameStarted: boolean;
  stakeAmount?: number; // NEW: Bet amount set by room creator
}

export interface RoomsData {
  [roomId: string]: Room;
}

export interface GameStatesData {
  [roomId: string]: GameState & { lastUpdated: number };
}