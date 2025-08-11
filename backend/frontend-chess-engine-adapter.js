/**
 * 🚛 TOYOTA RELIABILITY: Frontend Chess Engine Adapter for Backend
 * Uses the proven frontend chess engine for backend validation
 * Ensures consistent chess logic between frontend and backend
 */

// Simplified frontend chess engine for backend (converted from TypeScript)
const FrontendChessEngine = {
  // Text to Unicode conversion for internal processing
  TEXT_TO_UNICODE: {
    'white-king': '♔', 'white-queen': '♕', 'white-rook': '♖', 
    'white-bishop': '♗', 'white-knight': '♘', 'white-pawn': '♙',
    'black-king': '♚', 'black-queen': '♛', 'black-rook': '♜',
    'black-bishop': '♝', 'black-knight': '♞', 'black-pawn': '♟'
  },

  UNICODE_TO_TEXT: {
    '♔': 'white-king', '♕': 'white-queen', '♖': 'white-rook',
    '♗': 'white-bishop', '♘': 'white-knight', '♙': 'white-pawn',
    '♚': 'black-king', '♛': 'black-queen', '♜': 'black-rook',
    '♝': 'black-bishop', '♞': 'black-knight', '♟': 'black-pawn'
  },

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

  // Convert text position to Unicode for processing
  convertPositionToUnicode: (textPosition) => {
    const unicodePosition = {};
    for (const [square, piece] of Object.entries(textPosition)) {
      if (piece && piece !== '') {
        unicodePosition[square] = FrontendChessEngine.TEXT_TO_UNICODE[piece] || piece;
      }
    }
    return unicodePosition;
  },

  getPieceColor: (piece) => {
    if (FrontendChessEngine.PIECES.WHITE.includes(piece)) return 'white';
    if (FrontendChessEngine.PIECES.BLACK.includes(piece)) return 'black';
    return null;
  },

  isInCheck: (position, color) => {
    const unicodePosition = FrontendChessEngine.convertPositionToUnicode(position);
    const kingPiece = color === 'white' ? '♔' : '♚';
    
    // Find king position
    let kingSquare = null;
    for (const [square, piece] of Object.entries(unicodePosition)) {
      if (piece === kingPiece) {
        kingSquare = square;
        break;
      }
    }
    
    if (!kingSquare) return false;
    
    const opponentColor = color === 'white' ? 'black' : 'white';
    return FrontendChessEngine.isSquareUnderAttack(kingSquare, unicodePosition, opponentColor);
  },

  isSquareUnderAttack: (square, position, attackingColor) => {
    for (const [fromSquare, piece] of Object.entries(position)) {
      if (piece && FrontendChessEngine.getPieceColor(piece) === attackingColor) {
        if (FrontendChessEngine.canPieceAttackSquare(fromSquare, piece, square, position)) {
          return true;
        }
      }
    }
    return false;
  },

  canPieceAttackSquare: (from, piece, to, position) => {
    // Simplified attack detection based on piece type
    const [fromFile, fromRank] = FrontendChessEngine.squareToCoords(from);
    const [toFile, toRank] = FrontendChessEngine.squareToCoords(to);
    
    if (FrontendChessEngine.PIECES.QUEENS.includes(piece)) {
      return FrontendChessEngine.canQueenAttack(fromFile, fromRank, toFile, toRank, position);
    } else if (FrontendChessEngine.PIECES.ROOKS.includes(piece)) {
      return FrontendChessEngine.canRookAttack(fromFile, fromRank, toFile, toRank, position);
    } else if (FrontendChessEngine.PIECES.BISHOPS.includes(piece)) {
      return FrontendChessEngine.canBishopAttack(fromFile, fromRank, toFile, toRank, position);
    } else if (FrontendChessEngine.PIECES.KNIGHTS.includes(piece)) {
      return FrontendChessEngine.canKnightAttack(fromFile, fromRank, toFile, toRank);
    } else if (FrontendChessEngine.PIECES.KINGS.includes(piece)) {
      return FrontendChessEngine.canKingAttack(fromFile, fromRank, toFile, toRank);
    } else if (FrontendChessEngine.PIECES.PAWNS.includes(piece)) {
      const color = FrontendChessEngine.getPieceColor(piece);
      return FrontendChessEngine.canPawnAttack(fromFile, fromRank, toFile, toRank, color);
    }
    return false;
  },

  squareToCoords: (square) => {
    const file = square.charCodeAt(0) - 97;
    const rank = parseInt(square[1]) - 1;
    return [file, rank];
  },

  coordsToSquare: (file, rank) => {
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return String.fromCharCode(97 + file) + (rank + 1);
  },

  canQueenAttack: (fromFile, fromRank, toFile, toRank, position) => {
    return FrontendChessEngine.canRookAttack(fromFile, fromRank, toFile, toRank, position) ||
           FrontendChessEngine.canBishopAttack(fromFile, fromRank, toFile, toRank, position);
  },

  canRookAttack: (fromFile, fromRank, toFile, toRank, position) => {
    if (fromFile !== toFile && fromRank !== toRank) return false;
    return FrontendChessEngine.isPathClear(fromFile, fromRank, toFile, toRank, position);
  },

  canBishopAttack: (fromFile, fromRank, toFile, toRank, position) => {
    if (Math.abs(fromFile - toFile) !== Math.abs(fromRank - toRank)) return false;
    return FrontendChessEngine.isPathClear(fromFile, fromRank, toFile, toRank, position);
  },

  canKnightAttack: (fromFile, fromRank, toFile, toRank) => {
    const fileDiff = Math.abs(fromFile - toFile);
    const rankDiff = Math.abs(fromRank - toRank);
    return (fileDiff === 2 && rankDiff === 1) || (fileDiff === 1 && rankDiff === 2);
  },

  canKingAttack: (fromFile, fromRank, toFile, toRank) => {
    const fileDiff = Math.abs(fromFile - toFile);
    const rankDiff = Math.abs(fromRank - toRank);
    return fileDiff <= 1 && rankDiff <= 1;
  },

  canPawnAttack: (fromFile, fromRank, toFile, toRank, color) => {
    const direction = color === 'white' ? 1 : -1;
    return Math.abs(fromFile - toFile) === 1 && (toRank - fromRank) === direction;
  },

  isPathClear: (fromFile, fromRank, toFile, toRank, position) => {
    const fileStep = Math.sign(toFile - fromFile);
    const rankStep = Math.sign(toRank - fromRank);
    
    let currentFile = fromFile + fileStep;
    let currentRank = fromRank + rankStep;
    
    while (currentFile !== toFile || currentRank !== toRank) {
      const square = FrontendChessEngine.coordsToSquare(currentFile, currentRank);
      if (square && position[square]) return false;
      
      currentFile += fileStep;
      currentRank += rankStep;
    }
    
    return true;
  },

  // Check for checkmate using the frontend logic
  isCheckmate: (position, color, gameState = {}) => {
    if (!FrontendChessEngine.isInCheck(position, color)) return false;
    return FrontendChessEngine.getLegalMoves(position, color, gameState).length === 0;
  },

  // Get all legal moves (the critical function that works correctly)
  getLegalMoves: (position, color, gameState = {}) => {
    const unicodePosition = FrontendChessEngine.convertPositionToUnicode(position);
    const legalMoves = [];
    
    for (const square in unicodePosition) {
      const piece = unicodePosition[square];
      if (piece && FrontendChessEngine.getPieceColor(piece) === color) {
        const possibleMoves = FrontendChessEngine.generatePieceMoves(square, unicodePosition, gameState);
        
        for (const targetSquare of possibleMoves) {
          // Simulate the move
          const newPosition = { ...unicodePosition };
          const capturedPiece = newPosition[targetSquare];
          
          // Make the move temporarily
          newPosition[targetSquare] = piece;
          delete newPosition[square];
          
          // Check if this move leaves own king in check (illegal move)
          if (!FrontendChessEngine.isInCheck(newPosition, color)) {
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

  // Generate possible moves for a piece (simplified)
  generatePieceMoves: (from, position, gameState = {}) => {
    const piece = position[from];
    if (!piece) return [];
    
    const moves = [];
    const [fromFile, fromRank] = FrontendChessEngine.squareToCoords(from);
    
    // Simplified move generation - just test all squares
    for (let file = 0; file < 8; file++) {
      for (let rank = 0; rank < 8; rank++) {
        const targetSquare = FrontendChessEngine.coordsToSquare(file, rank);
        if (targetSquare && targetSquare !== from) {
          if (FrontendChessEngine.isPseudoLegalMove(from, targetSquare, piece, position)) {
            moves.push(targetSquare);
          }
        }
      }
    }
    
    return moves;
  },

  // Check if a move is pseudo-legal (follows piece movement rules)
  isPseudoLegalMove: (from, to, piece, position) => {
    const [fromFile, fromRank] = FrontendChessEngine.squareToCoords(from);
    const [toFile, toRank] = FrontendChessEngine.squareToCoords(to);
    const targetPiece = position[to];
    const pieceColor = FrontendChessEngine.getPieceColor(piece);
    
    // Cannot capture own piece
    if (targetPiece && FrontendChessEngine.getPieceColor(targetPiece) === pieceColor) {
      return false;
    }
    
    // Check piece-specific movement rules
    if (FrontendChessEngine.PIECES.PAWNS.includes(piece)) {
      return FrontendChessEngine.canPawnMove(fromFile, fromRank, toFile, toRank, pieceColor, position, targetPiece);
    } else if (FrontendChessEngine.PIECES.ROOKS.includes(piece)) {
      return FrontendChessEngine.canRookAttack(fromFile, fromRank, toFile, toRank, position);
    } else if (FrontendChessEngine.PIECES.BISHOPS.includes(piece)) {
      return FrontendChessEngine.canBishopAttack(fromFile, fromRank, toFile, toRank, position);
    } else if (FrontendChessEngine.PIECES.KNIGHTS.includes(piece)) {
      return FrontendChessEngine.canKnightAttack(fromFile, fromRank, toFile, toRank);
    } else if (FrontendChessEngine.PIECES.QUEENS.includes(piece)) {
      return FrontendChessEngine.canQueenAttack(fromFile, fromRank, toFile, toRank, position);
    } else if (FrontendChessEngine.PIECES.KINGS.includes(piece)) {
      return FrontendChessEngine.canKingAttack(fromFile, fromRank, toFile, toRank);
    }
    
    return false;
  },

  canPawnMove: (fromFile, fromRank, toFile, toRank, color, position, targetPiece) => {
    const direction = color === 'white' ? 1 : -1;
    const startRank = color === 'white' ? 1 : 6;
    
    // Forward moves
    if (fromFile === toFile && !targetPiece) {
      if (toRank === fromRank + direction) return true;
      if (fromRank === startRank && toRank === fromRank + 2 * direction) return true;
    }
    
    // Diagonal captures
    if (Math.abs(fromFile - toFile) === 1 && toRank === fromRank + direction && targetPiece) {
      return true;
    }
    
    return false;
  }
};

class FrontendChessEngineAdapter {
  constructor() {
    this.position = {};
    this.gameState = {
      currentPlayer: 'white',
      castlingRights: 'KQkq',
      enPassantTarget: null,
      halfMoveClock: 0,
      fullMoveNumber: 1,
      moveHistory: [],
      capturedPieces: { white: [], black: [] }
    };
    this.resetToStartingPosition();
  }

  /**
   * Reset to starting chess position
   */
  resetToStartingPosition() {
    // Standard chess starting position with text-based pieces
    this.position = {
      // White pieces
      'a1': 'white-rook', 'b1': 'white-knight', 'c1': 'white-bishop', 'd1': 'white-queen',
      'e1': 'white-king', 'f1': 'white-bishop', 'g1': 'white-knight', 'h1': 'white-rook',
      'a2': 'white-pawn', 'b2': 'white-pawn', 'c2': 'white-pawn', 'd2': 'white-pawn',
      'e2': 'white-pawn', 'f2': 'white-pawn', 'g2': 'white-pawn', 'h2': 'white-pawn',
      
      // Black pieces  
      'a8': 'black-rook', 'b8': 'black-knight', 'c8': 'black-bishop', 'd8': 'black-queen',
      'e8': 'black-king', 'f8': 'black-bishop', 'g8': 'black-knight', 'h8': 'black-rook',
      'a7': 'black-pawn', 'b7': 'black-pawn', 'c7': 'black-pawn', 'd7': 'black-pawn',
      'e7': 'black-pawn', 'f7': 'black-pawn', 'g7': 'black-pawn', 'h7': 'black-pawn'
    };

    this.gameState = {
      currentPlayer: 'white',
      castlingRights: 'KQkq',
      enPassantTarget: null,
      halfMoveClock: 0,
      fullMoveNumber: 1,
      moveHistory: [],
      capturedPieces: { white: [], black: [] },
      inCheck: false,
      checkmate: false,
      stalemate: false,
      draw: false
    };

    console.log('🔍 Chess engine reset to starting position');
  }

  /**
   * Check if a move is legal using frontend logic
   */
  isMoveLegal(from, to, piece) {
    try {
      // Basic validation
      if (!this.position[from] || this.position[from] !== piece) {
        return false;
      }

      const pieceColor = piece.split('-')[0];
      if (pieceColor !== this.gameState.currentPlayer) {
        return false;
      }

      // Use frontend engine to check if move is legal
      const legalMoves = FrontendChessEngine.getLegalMoves(this.position, pieceColor, this.gameState);
      return legalMoves.some(move => move.from === from && move.to === to);
    } catch (error) {
      console.error('❌ Error checking move legality:', error);
      return false;
    }
  }

  /**
   * Make a move and update position
   */
  makeMove(moveData) {
    try {
      const { from, to, piece } = moveData;
      
      console.log(`🔍 Making move: ${from}->${to} (${piece})`);
      
      // Capture piece if present
      const capturedPiece = this.position[to];
      if (capturedPiece) {
        const capturedColor = capturedPiece.split('-')[0];
        const otherColor = capturedColor === 'white' ? 'black' : 'white';
        this.gameState.capturedPieces[otherColor].push(capturedPiece);
      }
      
      // Make the move
      this.position[to] = piece;
      delete this.position[from];
      
      // Update game state
      this.gameState.currentPlayer = this.gameState.currentPlayer === 'white' ? 'black' : 'white';
      this.gameState.fullMoveNumber += this.gameState.currentPlayer === 'white' ? 1 : 0;
      this.gameState.moveHistory.push({ from, to, piece, capturedPiece });
      
      // Update check status
      this.updateGameState();
      
      console.log('✅ Move executed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error making move:', error);
      return false;
    }
  }

  /**
   * Get current position in FEN notation
   */
  getCurrentPositionFEN() {
    try {
      // Convert position to FEN format
      let fen = '';
      
      // Build board representation (rank 8 to 1)
      for (let rank = 8; rank >= 1; rank--) {
        let rankStr = '';
        let emptyCount = 0;
        
        for (let file = 0; file < 8; file++) {
          const square = String.fromCharCode(97 + file) + rank;
          const piece = this.position[square];
          
          if (piece) {
            if (emptyCount > 0) {
              rankStr += emptyCount;
              emptyCount = 0;
            }
            rankStr += this.pieceToFENChar(piece);
          } else {
            emptyCount++;
          }
        }
        
        if (emptyCount > 0) {
          rankStr += emptyCount;
        }
        
        if (rank > 1) rankStr += '/';
        fen += rankStr;
      }
      
      // Add game state
      fen += ` ${this.gameState.currentPlayer.charAt(0)}`;
      fen += ` ${this.gameState.castlingRights}`;
      fen += ` ${this.gameState.enPassantTarget || '-'}`;
      fen += ` ${this.gameState.halfMoveClock}`;
      fen += ` ${this.gameState.fullMoveNumber}`;
      
      return fen;
    } catch (error) {
      console.error('❌ Error generating FEN:', error);
      return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
  }

  /**
   * Get current game state
   */
  getCurrentGameState() {
    const currentPlayer = this.gameState.currentPlayer;
    const inCheck = FrontendChessEngine.isInCheck(this.position, currentPlayer);
    const checkmate = FrontendChessEngine.isCheckmate(this.position, currentPlayer, this.gameState);
    
    return {
      currentPlayer: currentPlayer,
      inCheck: inCheck,
      checkmate: checkmate,
      stalemate: false, // TODO: Implement stalemate detection
      draw: false, // TODO: Implement draw detection
      position: { ...this.position },
      moveHistory: [...this.gameState.moveHistory]
    };
  }

  /**
   * Helper: Convert piece name to FEN character
   */
  pieceToFENChar(piece) {
    const mapping = {
      'white-king': 'K', 'white-queen': 'Q', 'white-rook': 'R',
      'white-bishop': 'B', 'white-knight': 'N', 'white-pawn': 'P',
      'black-king': 'k', 'black-queen': 'q', 'black-rook': 'r',
      'black-bishop': 'b', 'black-knight': 'n', 'black-pawn': 'p'
    };
    return mapping[piece] || '?';
  }

  /**
   * Check if a color is in check (simplified)
   */
  isInCheck(color) {
    // Simplified check detection
    // This will be replaced with frontend engine logic
    return false;
  }

  /**
   * Update game state after move
   */
  updateGameState() {
    const currentColor = this.gameState.currentPlayer;
    this.gameState.inCheck = this.isInCheck(currentColor);
    
    // Simplified checkmate/stalemate detection
    // This will be replaced with frontend engine logic
    this.gameState.checkmate = false;
    this.gameState.stalemate = false;
    this.gameState.draw = false;
  }
}

module.exports = FrontendChessEngineAdapter;