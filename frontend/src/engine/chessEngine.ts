/**
 * Complete Chess Engine with All Rules
 * Handles all chess logic including piece movement, check/checkmate, castling, en passant, etc.
 */

import type { GameState, Move, Position, MoveResult } from '../types/chess';

// Re-export types for convenience
export type { GameState, Move, Position, MoveResult } from '../types/chess';

// Chess Engine implementation
export const ChessEngine = {
  // Piece definitions
  PIECES: {
    WHITE: ['♔', '♕', '♖', '♗', '♘', '♙'],
    BLACK: ['♚', '♛', '♜', '♝', '♞', '♟'],
    KINGS: ['♔', '♚'],
    QUEENS: ['♕', '♛'],
    ROOKS: ['♖', '♜'],
    BISHOPS: ['♗', '♝'],
    KNIGHTS: ['♘', '♞'],
    PAWNS: ['♙', '♟']
  },

  // Helper functions
  isWhitePiece: (piece: string): boolean => ChessEngine.PIECES.WHITE.includes(piece),
  isBlackPiece: (piece: string): boolean => ChessEngine.PIECES.BLACK.includes(piece),
  
  getPieceColor: (piece: string): 'white' | 'black' | null => {
    if (ChessEngine.PIECES.WHITE.includes(piece)) return 'white';
    if (ChessEngine.PIECES.BLACK.includes(piece)) return 'black';
    return null;
  },

  squareToCoords: (square: string): [number, number] => {
    const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
    const rank = parseInt(square[1]) - 1;   // 1=0, 2=1, etc.
    return [file, rank];
  },

  coordsToSquare: (file: number, rank: number): string | null => {
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return String.fromCharCode(97 + file) + (rank + 1);
  },

  // Check if a path between two squares is clear
  isPathClear: (from: string, to: string, position: Position): boolean => {
    const [fromFile, fromRank] = ChessEngine.squareToCoords(from);
    const [toFile, toRank] = ChessEngine.squareToCoords(to);
    
    const fileStep = Math.sign(toFile - fromFile);
    const rankStep = Math.sign(toRank - fromRank);
    
    let currentFile = fromFile + fileStep;
    let currentRank = fromRank + rankStep;
    
    while (currentFile !== toFile || currentRank !== toRank) {
      const square = ChessEngine.coordsToSquare(currentFile, currentRank);
      if (position[square!]) return false; // Path blocked
      
      currentFile += fileStep;
      currentRank += rankStep;
    }
    
    return true;
  },

  // Generate all possible moves for a piece (without considering check)
  generatePieceMoves: (from: string, position: Position, gameState: Partial<GameState> = {}): string[] => {
    const piece = position[from];
    if (!piece) return [];
    
    const [fromFile, fromRank] = ChessEngine.squareToCoords(from);
    const moves: string[] = [];
    const pieceColor = ChessEngine.getPieceColor(piece);

    switch (piece) {
      case '♙': // White pawn
        // Forward moves
        const whiteSquareAhead = ChessEngine.coordsToSquare(fromFile, fromRank + 1);
        if (whiteSquareAhead && !position[whiteSquareAhead]) {
          moves.push(whiteSquareAhead);
          // Double move from starting position
          if (fromRank === 1) {
            const whiteTwoAhead = ChessEngine.coordsToSquare(fromFile, fromRank + 2);
            if (whiteTwoAhead && !position[whiteTwoAhead]) {
              moves.push(whiteTwoAhead);
            }
          }
        }
        // Captures
        for (const fileOffset of [-1, 1]) {
          const captureSquare = ChessEngine.coordsToSquare(fromFile + fileOffset, fromRank + 1);
          if (captureSquare && position[captureSquare] && ChessEngine.isBlackPiece(position[captureSquare])) {
            moves.push(captureSquare);
          }
          // En passant
          if (gameState.enPassantTarget === captureSquare) {
            moves.push(captureSquare);
          }
        }
        break;

      case '♟': // Black pawn
        // Forward moves
        const blackSquareAhead = ChessEngine.coordsToSquare(fromFile, fromRank - 1);
        if (blackSquareAhead && !position[blackSquareAhead]) {
          moves.push(blackSquareAhead);
          // Double move from starting position
          if (fromRank === 6) {
            const blackTwoAhead = ChessEngine.coordsToSquare(fromFile, fromRank - 2);
            if (blackTwoAhead && !position[blackTwoAhead]) {
              moves.push(blackTwoAhead);
            }
          }
        }
        // Captures
        for (const fileOffset of [-1, 1]) {
          const captureSquare = ChessEngine.coordsToSquare(fromFile + fileOffset, fromRank - 1);
          if (captureSquare && position[captureSquare] && ChessEngine.isWhitePiece(position[captureSquare])) {
            moves.push(captureSquare);
          }
          // En passant
          if (gameState.enPassantTarget === captureSquare) {
            moves.push(captureSquare);
          }
        }
        break;

      case '♖': case '♜': // Rook
        // Horizontal and vertical moves
        for (const [fileStep, rankStep] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          for (let i = 1; i < 8; i++) {
            const targetSquare = ChessEngine.coordsToSquare(fromFile + i * fileStep, fromRank + i * rankStep);
            if (!targetSquare) break;
            
            const targetPiece = position[targetSquare];
            if (!targetPiece) {
              moves.push(targetSquare);
            } else {
              if (ChessEngine.getPieceColor(targetPiece) !== pieceColor) {
                moves.push(targetSquare);
              }
              break;
            }
          }
        }
        break;

      case '♗': case '♝': // Bishop
        // Diagonal moves
        for (const [fileStep, rankStep] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          for (let i = 1; i < 8; i++) {
            const targetSquare = ChessEngine.coordsToSquare(fromFile + i * fileStep, fromRank + i * rankStep);
            if (!targetSquare) break;
            
            const targetPiece = position[targetSquare];
            if (!targetPiece) {
              moves.push(targetSquare);
            } else {
              if (ChessEngine.getPieceColor(targetPiece) !== pieceColor) {
                moves.push(targetSquare);
              }
              break;
            }
          }
        }
        break;

      case '♕': case '♛': // Queen (combination of rook and bishop)
        // All 8 directions
        for (const [fileStep, rankStep] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          for (let i = 1; i < 8; i++) {
            const targetSquare = ChessEngine.coordsToSquare(fromFile + i * fileStep, fromRank + i * rankStep);
            if (!targetSquare) break;
            
            const targetPiece = position[targetSquare];
            if (!targetPiece) {
              moves.push(targetSquare);
            } else {
              if (ChessEngine.getPieceColor(targetPiece) !== pieceColor) {
                moves.push(targetSquare);
              }
              break;
            }
          }
        }
        break;

      case '♘': case '♞': // Knight
        const knightMoves = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [fileOffset, rankOffset] of knightMoves) {
          const targetSquare = ChessEngine.coordsToSquare(fromFile + fileOffset, fromRank + rankOffset);
          if (targetSquare) {
            const targetPiece = position[targetSquare];
            if (!targetPiece || ChessEngine.getPieceColor(targetPiece) !== pieceColor) {
              moves.push(targetSquare);
            }
          }
        }
        break;

      case '♔': case '♚': // King
        // Regular king moves
        for (const [fileOffset, rankOffset] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
          const targetSquare = ChessEngine.coordsToSquare(fromFile + fileOffset, fromRank + rankOffset);
          if (targetSquare) {
            const targetPiece = position[targetSquare];
            if (!targetPiece || ChessEngine.getPieceColor(targetPiece) !== pieceColor) {
              moves.push(targetSquare);
            }
          }
        }
        
        // Castling
        if (gameState.castlingRights) {
          const rank = pieceColor === 'white' ? 0 : 7;
          const kingside = pieceColor === 'white' ? 'K' : 'k';
          const queenside = pieceColor === 'white' ? 'Q' : 'q';
          
          // Kingside castling
          if (gameState.castlingRights.includes(kingside) &&
              !position['f' + (rank + 1)] && !position['g' + (rank + 1)] &&
              !ChessEngine.isSquareUnderAttack('e' + (rank + 1), position, pieceColor === 'white' ? 'black' : 'white') &&
              !ChessEngine.isSquareUnderAttack('f' + (rank + 1), position, pieceColor === 'white' ? 'black' : 'white') &&
              !ChessEngine.isSquareUnderAttack('g' + (rank + 1), position, pieceColor === 'white' ? 'black' : 'white')) {
            moves.push('g' + (rank + 1));
          }
          
          // Queenside castling
          if (gameState.castlingRights.includes(queenside) &&
              !position['d' + (rank + 1)] && !position['c' + (rank + 1)] && !position['b' + (rank + 1)] &&
              !ChessEngine.isSquareUnderAttack('e' + (rank + 1), position, pieceColor === 'white' ? 'black' : 'white') &&
              !ChessEngine.isSquareUnderAttack('d' + (rank + 1), position, pieceColor === 'white' ? 'black' : 'white') &&
              !ChessEngine.isSquareUnderAttack('c' + (rank + 1), position, pieceColor === 'white' ? 'black' : 'white')) {
            moves.push('c' + (rank + 1));
          }
        }
        break;
    }

    return moves.filter(square => square !== null);
  },

  // Check if a square is under attack by the specified color
  isSquareUnderAttack: (square: string, position: Position, byColor: 'white' | 'black'): boolean => {
    for (const fromSquare in position) {
      const piece = position[fromSquare];
      if (piece && ChessEngine.getPieceColor(piece) === byColor) {
        const moves = ChessEngine.generatePieceMoves(fromSquare, position, {});
        if (moves.includes(square)) {
          return true;
        }
      }
    }
    return false;
  },

  // Find the king of the specified color
  findKing: (position: Position, color: 'white' | 'black'): string | null => {
    const kingPiece = color === 'white' ? '♔' : '♚';
    for (const square in position) {
      if (position[square] === kingPiece) {
        return square;
      }
    }
    return null;
  },

  // Check if the specified color is in check
  isInCheck: (position: Position, color: 'white' | 'black'): boolean => {
    const kingSquare = ChessEngine.findKing(position, color);
    if (!kingSquare) return false;
    
    const opponentColor = color === 'white' ? 'black' : 'white';
    return ChessEngine.isSquareUnderAttack(kingSquare, position, opponentColor);
  },

  // Get all legal moves for a color (considering check)
  getLegalMoves: (position: Position, color: 'white' | 'black', gameState: Partial<GameState> = {}): Move[] => {
    const legalMoves: Move[] = [];
    
    for (const square in position) {
      const piece = position[square];
      if (piece && ChessEngine.getPieceColor(piece) === color) {
        const possibleMoves = ChessEngine.generatePieceMoves(square, position, gameState);
        
        for (const targetSquare of possibleMoves) {
          // Simulate the move
          const newPosition = { ...position };
          const capturedPiece = newPosition[targetSquare];
          
          // Handle special moves
          if (ChessEngine.PIECES.KINGS.includes(piece)) {
            // Castling
            const [fromFile, fromRank] = ChessEngine.squareToCoords(square);
            const [toFile, toRank] = ChessEngine.squareToCoords(targetSquare);
            
            if (Math.abs(toFile - fromFile) === 2) {
              // This is castling
              const rookFromFile = toFile > fromFile ? 7 : 0;
              const rookToFile = toFile > fromFile ? 5 : 3;
              const rookFromSquare = ChessEngine.coordsToSquare(rookFromFile, fromRank);
              const rookToSquare = ChessEngine.coordsToSquare(rookToFile, fromRank);
              
              newPosition[targetSquare] = piece;
              delete newPosition[square];
              if (rookFromSquare && rookToSquare) {
                newPosition[rookToSquare] = newPosition[rookFromSquare];
                delete newPosition[rookFromSquare];
              }
            } else {
              newPosition[targetSquare] = piece;
              delete newPosition[square];
            }
          } else if (ChessEngine.PIECES.PAWNS.includes(piece) && targetSquare === gameState.enPassantTarget) {
            // En passant capture
            newPosition[targetSquare] = piece;
            delete newPosition[square];
            // Remove the captured pawn
            const capturedPawnSquare = targetSquare[0] + (color === 'white' ? '5' : '4');
            delete newPosition[capturedPawnSquare];
          } else {
            // Regular move
            newPosition[targetSquare] = piece;
            delete newPosition[square];
          }
          
          // Check if this move leaves own king in check
          if (!ChessEngine.isInCheck(newPosition, color)) {
            legalMoves.push({
              from: square,
              to: targetSquare,
              piece: piece,
              capturedPiece: capturedPiece
            });
          }
        }
      }
    }
    
    return legalMoves;
  },

  // Check if it's checkmate
  isCheckmate: (position: Position, color: 'white' | 'black', gameState: Partial<GameState> = {}): boolean => {
    if (!ChessEngine.isInCheck(position, color)) return false;
    return ChessEngine.getLegalMoves(position, color, gameState).length === 0;
  },

  // Check if it's stalemate
  isStalemate: (position: Position, color: 'white' | 'black', gameState: Partial<GameState> = {}): boolean => {
    if (ChessEngine.isInCheck(position, color)) return false;
    return ChessEngine.getLegalMoves(position, color, gameState).length === 0;
  },

  // Check if a move is legal
  isLegalMove: (from: string, to: string, position: Position, color: 'white' | 'black', gameState: Partial<GameState> = {}): boolean => {
    const legalMoves = ChessEngine.getLegalMoves(position, color, gameState);
    return legalMoves.some(move => move.from === from && move.to === to);
  },

  // Make a move and return the new game state
  makeMove: (from: string, to: string, position: Position, gameState: Partial<GameState> = {}): MoveResult | null => {
    const piece = position[from];
    if (!piece) return null;
    
    const color = ChessEngine.getPieceColor(piece);
    if (!color) return null;
    
    // Check if move is legal
    if (!ChessEngine.isLegalMove(from, to, position, color, gameState)) {
      return null;
    }
    
    // Create new position
    const newPosition = { ...position };
    const capturedPiece = newPosition[to];
    
    // Create new game state
    const newGameState: Partial<GameState> = {
      ...gameState,
      halfmoveClock: (gameState.halfmoveClock || 0) + 1,
      fullmoveNumber: (gameState.fullmoveNumber || 1) + (color === 'black' ? 1 : 0),
      enPassantTarget: null,
      lastMove: { from, to, piece }
    };
    
    // Reset halfmove clock on capture or pawn move
    if (capturedPiece || ChessEngine.PIECES.PAWNS.includes(piece)) {
      newGameState.halfmoveClock = 0;
    }
    
    // Handle special moves
    if (ChessEngine.PIECES.KINGS.includes(piece)) {
      // Update castling rights
      if (color === 'white') {
        newGameState.castlingRights = (gameState.castlingRights || 'KQkq').replace(/[KQ]/g, '');
      } else {
        newGameState.castlingRights = (gameState.castlingRights || 'KQkq').replace(/[kq]/g, '');
      }
      
      // Check for castling
      const [fromFile, fromRank] = ChessEngine.squareToCoords(from);
      const [toFile, toRank] = ChessEngine.squareToCoords(to);
      
      if (Math.abs(toFile - fromFile) === 2) {
        // This is castling
        const rookFromFile = toFile > fromFile ? 7 : 0;
        const rookToFile = toFile > fromFile ? 5 : 3;
        const rookFromSquare = ChessEngine.coordsToSquare(rookFromFile, fromRank);
        const rookToSquare = ChessEngine.coordsToSquare(rookToFile, fromRank);
        
        newPosition[to] = piece;
        delete newPosition[from];
        if (rookFromSquare && rookToSquare) {
          newPosition[rookToSquare] = newPosition[rookFromSquare];
          delete newPosition[rookFromSquare];
        }
      } else {
        newPosition[to] = piece;
        delete newPosition[from];
      }
    } else if (ChessEngine.PIECES.ROOKS.includes(piece)) {
      // Update castling rights if rook moves
      if (from === 'a1') newGameState.castlingRights = (gameState.castlingRights || 'KQkq').replace('Q', '');
      if (from === 'h1') newGameState.castlingRights = (gameState.castlingRights || 'KQkq').replace('K', '');
      if (from === 'a8') newGameState.castlingRights = (gameState.castlingRights || 'KQkq').replace('q', '');
      if (from === 'h8') newGameState.castlingRights = (gameState.castlingRights || 'KQkq').replace('k', '');
      
      newPosition[to] = piece;
      delete newPosition[from];
    } else if (ChessEngine.PIECES.PAWNS.includes(piece)) {
      const [fromFile, fromRank] = ChessEngine.squareToCoords(from);
      const [toFile, toRank] = ChessEngine.squareToCoords(to);
      
      // Check for en passant
      if (to === gameState.enPassantTarget) {
        // En passant capture
        const capturedPawnSquare = to[0] + (color === 'white' ? '5' : '4');
        delete newPosition[capturedPawnSquare];
      }
      
      // Check for double pawn move (sets en passant target)
      if (Math.abs(toRank - fromRank) === 2) {
        newGameState.enPassantTarget = ChessEngine.coordsToSquare(fromFile, (fromRank + toRank) / 2);
      }
      
      // Check for pawn promotion
      if ((color === 'white' && toRank === 7) || (color === 'black' && toRank === 0)) {
        // For now, auto-promote to queen (in a real game, this should be a choice)
        newPosition[to] = color === 'white' ? '♕' : '♛';
      } else {
        newPosition[to] = piece;
      }
      delete newPosition[from];
    } else {
      // Regular move
      newPosition[to] = piece;
      delete newPosition[from];
    }
    
    // Check for rook capture (affects castling)
    if (to === 'a1') newGameState.castlingRights = (gameState.castlingRights || 'KQkq').replace('Q', '');
    if (to === 'h1') newGameState.castlingRights = (gameState.castlingRights || 'KQkq').replace('K', '');
    if (to === 'a8') newGameState.castlingRights = (gameState.castlingRights || 'KQkq').replace('q', '');
    if (to === 'h8') newGameState.castlingRights = (gameState.castlingRights || 'KQkq').replace('k', '');
    
    return {
      position: newPosition,
      gameState: newGameState,
      capturedPiece
    };
  },

  // Get initial chess position
  getInitialPosition: (): Position => ({
    'a8': '♜', 'b8': '♞', 'c8': '♝', 'd8': '♛', 'e8': '♚', 'f8': '♝', 'g8': '♞', 'h8': '♜',
    'a7': '♟', 'b7': '♟', 'c7': '♟', 'd7': '♟', 'e7': '♟', 'f7': '♟', 'g7': '♟', 'h7': '♟',
    'a2': '♙', 'b2': '♙', 'c2': '♙', 'd2': '♙', 'e2': '♙', 'f2': '♙', 'g2': '♙', 'h2': '♙',
    'a1': '♖', 'b1': '♘', 'c1': '♗', 'd1': '♕', 'e1': '♔', 'f1': '♗', 'g1': '♘', 'h1': '♖'
  }),

  // Get initial game state
  getInitialGameState: (): GameState => ({
    currentPlayer: 'white' as const,
    selectedSquare: null,
    gameActive: false,
    winner: null,
    draw: false,
    moveHistory: [],
    lastUpdated: Date.now(),
    castlingRights: 'KQkq',
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    inCheck: false
  })
};

// Default export
export default ChessEngine;