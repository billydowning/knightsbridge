/**
 * Chess Game Types
 * Centralized type definitions for the chess game
 */

export interface Move {
  from: string;
  to: string;
  piece: string;
  capturedPiece?: string;
}

export interface Position {
  [square: string]: string;
}

export interface GameState {
  position: Position;
  currentPlayer: 'white' | 'black';
  selectedSquare: string | null;
  gameActive: boolean;
  winner: 'white' | 'black' | null;
  draw: boolean;
  moveHistory: Move[];
  lastUpdated: number;
  castlingRights: string;
  enPassantTarget: string | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  inCheck: boolean;
  lastMove?: { from: string; to: string } | null;
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
  escrows: { [wallet: string]: number };
  gameStarted: boolean;
}

export interface RoomsData {
  [roomId: string]: Room;
}

export interface GameStatesData {
  [roomId: string]: GameState & { lastUpdated: number };
}