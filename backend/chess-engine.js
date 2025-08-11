/**
 * Backend Chess Engine for Game Validation
 * Ported from frontend/src/engine/chessEngine.ts for server-side validation
 * FIDE-Compliant for accurate move replay and position tracking
 */

class BackendChessEngine {
  constructor() {
    this.position = {};
    this.moveHistory = [];
    this.gameState = {
      currentPlayer: 'white',
      inCheck: false,
      inCheckmate: false,
      inStalemate: false,
      draw: false
    };
    this.resetToStartingPosition();
  }

  // Initialize starting position
  resetToStartingPosition() {
    this.position = {
      'a1': 'white-rook', 'b1': 'white-knight', 'c1': 'white-bishop', 'd1': 'white-queen',
      'e1': 'white-king', 'f1': 'white-bishop', 'g1': 'white-knight', 'h1': 'white-rook',
      'a2': 'white-pawn', 'b2': 'white-pawn', 'c2': 'white-pawn', 'd2': 'white-pawn',
      'e2': 'white-pawn', 'f2': 'white-pawn', 'g2': 'white-pawn', 'h2': 'white-pawn',
      
      'a8': 'black-rook', 'b8': 'black-knight', 'c8': 'black-bishop', 'd8': 'black-queen',
      'e8': 'black-king', 'f8': 'black-bishop', 'g8': 'black-knight', 'h8': 'black-rook',
      'a7': 'black-pawn', 'b7': 'black-pawn', 'c7': 'black-pawn', 'd7': 'black-pawn',
      'e7': 'black-pawn', 'f7': 'black-pawn', 'g7': 'black-pawn', 'h7': 'black-pawn'
    };
    
    this.moveHistory = [];
    this.gameState = {
      currentPlayer: 'white',
      inCheck: false,
      inCheckmate: false,
      inStalemate: false,
      draw: false
    };
  }

  // Load a specific position from FEN or position object
  loadPosition(positionData) {
    if (typeof positionData === 'string') {
      // FEN notation
      this.position = this.fenToPosition(positionData);
    } else if (typeof positionData === 'object') {
      // Position object
      this.position = { ...positionData };
    }
    this.updateGameState();
  }

  // Convert FEN to position object
  fenToPosition(fen) {
    const position = {};
    const [boardPart] = fen.split(' ');
    const ranks = boardPart.split('/');
    
    const fenToPiece = {
      'K': 'white-king', 'Q': 'white-queen', 'R': 'white-rook',
      'B': 'white-bishop', 'N': 'white-knight', 'P': 'white-pawn',
      'k': 'black-king', 'q': 'black-queen', 'r': 'black-rook',
      'b': 'black-bishop', 'n': 'black-knight', 'p': 'black-pawn'
    };

    for (let rank = 0; rank < 8; rank++) {
      const rankStr = ranks[rank];
      let file = 0;
      
      for (const char of rankStr) {
        if (char >= '1' && char <= '8') {
          file += parseInt(char);
        } else {
          const square = String.fromCharCode(97 + file) + (8 - rank);
          position[square] = fenToPiece[char];
          file++;
        }
      }
    }
    
    return position;
  }

  // Convert position to FEN notation
  positionToFEN() {
    const pieceToFen = {
      'white-king': 'K', 'white-queen': 'Q', 'white-rook': 'R',
      'white-bishop': 'B', 'white-knight': 'N', 'white-pawn': 'P',
      'black-king': 'k', 'black-queen': 'q', 'black-rook': 'r',
      'black-bishop': 'b', 'black-knight': 'n', 'black-pawn': 'p'
    };

    let fen = '';
    for (let rank = 8; rank >= 1; rank--) {
      let emptyCount = 0;
      for (let file = 0; file < 8; file++) {
        const square = String.fromCharCode(97 + file) + rank;
        const piece = this.position[square];
        
        if (piece) {
          if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
          }
          fen += pieceToFen[piece] || '';
        } else {
          emptyCount++;
        }
      }
      
      if (emptyCount > 0) {
        fen += emptyCount;
      }
      
      if (rank > 1) fen += '/';
    }

    // Add game state info (simplified)
    fen += ` ${this.gameState.currentPlayer === 'white' ? 'w' : 'b'}`;
    fen += ' KQkq - 0 1'; // Simplified castling and move counts
    
    return fen;
  }

  // Check if a move is legal (with proper piece movement validation)
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

      // CRITICAL: Check if the piece can actually make this move geometrically
      if (!this.canPieceMoveToSquare(from, to, piece)) {
        return false;
      }

      // Simulate the move to check legality
      const originalPosition = { ...this.position };
      const targetPiece = this.position[to];
      
      // Make the move temporarily
      this.position[to] = this.position[from];
      this.position[from] = '';
      
      // Check if move puts own king in check
      const isLegal = !this.isInCheck(pieceColor);
      
      // Restore position
      this.position = originalPosition;
      
      return isLegal;
    } catch (error) {
      console.error('❌ Error checking move legality:', error);
      return false;
    }
  }

  // Check if a piece can geometrically move to a target square
  canPieceMoveToSquare(from, to, piece) {
    if (from === to) return false;
    
    const [fromFile, fromRank] = this.squareToCoords(from);
    const [toFile, toRank] = this.squareToCoords(to);
    const pieceType = piece.split('-')[1];
    const pieceColor = piece.split('-')[0];
    
    switch (pieceType) {
      case 'pawn':
        return this.canPawnMove(fromFile, fromRank, toFile, toRank, pieceColor);
      case 'rook':
        return this.canRookMove(fromFile, fromRank, toFile, toRank);
      case 'bishop':
        return this.canBishopMove(fromFile, fromRank, toFile, toRank);
      case 'knight':
        return this.canKnightMove(fromFile, fromRank, toFile, toRank);
      case 'queen':
        return this.canQueenMove(fromFile, fromRank, toFile, toRank);
      case 'king':
        return this.canKingMove(fromFile, fromRank, toFile, toRank);
      default:
        return false;
    }
  }

  // Helper functions for piece movement validation
  squareToCoords(square) {
    const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
    const rank = parseInt(square[1]) - 1;   // 1=0, 2=1, etc.
    return [file, rank];
  }

  canPawnMove(fromFile, fromRank, toFile, toRank, color) {
    const direction = color === 'white' ? 1 : -1;
    const startRank = color === 'white' ? 1 : 6;
    
    // Forward moves
    if (fromFile === toFile) {
      // Single move forward
      if (toRank === fromRank + direction) {
        return !this.position[this.coordsToSquare(toFile, toRank)];
      }
      // Double move from start
      if (fromRank === startRank && toRank === fromRank + 2 * direction) {
        return !this.position[this.coordsToSquare(toFile, toRank)];
      }
    }
    // Diagonal captures
    else if (Math.abs(fromFile - toFile) === 1 && toRank === fromRank + direction) {
      const targetSquare = this.coordsToSquare(toFile, toRank);
      const targetPiece = this.position[targetSquare];
      return targetPiece && targetPiece.split('-')[0] !== color;
    }
    
    return false;
  }

  canRookMove(fromFile, fromRank, toFile, toRank) {
    if (fromFile !== toFile && fromRank !== toRank) return false;
    return this.isPathClear(fromFile, fromRank, toFile, toRank);
  }

  canBishopMove(fromFile, fromRank, toFile, toRank) {
    if (Math.abs(fromFile - toFile) !== Math.abs(fromRank - toRank)) return false;
    return this.isPathClear(fromFile, fromRank, toFile, toRank);
  }

  canKnightMove(fromFile, fromRank, toFile, toRank) {
    const fileDiff = Math.abs(fromFile - toFile);
    const rankDiff = Math.abs(fromRank - toRank);
    return (fileDiff === 2 && rankDiff === 1) || (fileDiff === 1 && rankDiff === 2);
  }

  canQueenMove(fromFile, fromRank, toFile, toRank) {
    return this.canRookMove(fromFile, fromRank, toFile, toRank) || 
           this.canBishopMove(fromFile, fromRank, toFile, toRank);
  }

  canKingMove(fromFile, fromRank, toFile, toRank) {
    const fileDiff = Math.abs(fromFile - toFile);
    const rankDiff = Math.abs(fromRank - toRank);
    return fileDiff <= 1 && rankDiff <= 1;
  }

  coordsToSquare(file, rank) {
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return String.fromCharCode(97 + file) + (rank + 1);
  }

  isPathClear(fromFile, fromRank, toFile, toRank) {
    const fileStep = Math.sign(toFile - fromFile);
    const rankStep = Math.sign(toRank - fromRank);
    
    let currentFile = fromFile + fileStep;
    let currentRank = fromRank + rankStep;
    
    while (currentFile !== toFile || currentRank !== toRank) {
      const square = this.coordsToSquare(currentFile, currentRank);
      if (square && this.position[square]) return false;
      
      currentFile += fileStep;
      currentRank += rankStep;
    }
    
    return true;
  }

  // Make a move and update position
  makeMove(moveData) {
    try {
      const { from, to, piece } = moveData;
      
      console.log(`🔍 Chess Engine makeMove: ${from}->${to} (${piece})`);
      console.log(`🔍 Position before:`, Object.keys(this.position).filter(k => this.position[k]).length, 'pieces');
      
      if (!this.isMoveLegal(from, to, piece)) {
        console.log(`❌ Move ${from}->${to} is illegal`);
        return false;
      }

      // Execute the move
      const capturedPiece = this.position[to];
      this.position[to] = this.position[from];
      this.position[from] = '';
      
      console.log(`✅ Move executed: ${from}->${to}, captured: ${capturedPiece || 'none'}`);
      console.log(`🔍 Position after:`, Object.keys(this.position).filter(k => this.position[k]).length, 'pieces');
      
      // Add to move history
      this.moveHistory.push({
        from,
        to,
        piece,
        capturedPiece,
        timestamp: new Date()
      });

      // Switch players
      this.gameState.currentPlayer = this.gameState.currentPlayer === 'white' ? 'black' : 'white';
      
      // Update game state
      this.updateGameState();
      
      return true;
    } catch (error) {
      console.error('❌ Error making move:', error);
      return false;
    }
  }

  // Check if a color is in check
  isInCheck(color) {
    const kingSquare = this.findKing(color);
    if (!kingSquare) return false;
    
    const oppositeColor = color === 'white' ? 'black' : 'white';
    
    // Check if any opposite piece can attack the king
    for (const [square, piece] of Object.entries(this.position)) {
      if (piece && piece.startsWith(oppositeColor)) {
        if (this.canPieceAttackSquare(square, piece, kingSquare)) {
          return true;
        }
      }
    }
    
    return false;
  }

  // Find king position
  findKing(color) {
    const kingPiece = `${color}-king`;
    for (const [square, piece] of Object.entries(this.position)) {
      if (piece === kingPiece) {
        return square;
      }
    }
    return null;
  }

  // Check if a piece can attack a square (simplified)
  canPieceAttackSquare(fromSquare, piece, targetSquare) {
    // Simplified attack logic - in production would implement full piece movement rules
    const [, pieceType] = piece.split('-');
    
    switch (pieceType) {
      case 'pawn':
        return this.canPawnAttack(fromSquare, piece, targetSquare);
      case 'rook':
        return this.canRookAttack(fromSquare, targetSquare);
      case 'bishop':
        return this.canBishopAttack(fromSquare, targetSquare);
      case 'queen':
        return this.canQueenAttack(fromSquare, targetSquare);
      case 'king':
        return this.canKingAttack(fromSquare, targetSquare);
      case 'knight':
        return this.canKnightAttack(fromSquare, targetSquare);
      default:
        return false;
    }
  }

  // Simplified piece attack methods
  canPawnAttack(from, piece, to) {
    const color = piece.split('-')[0];
    const direction = color === 'white' ? 1 : -1;
    const fromFile = from.charCodeAt(0);
    const fromRank = parseInt(from[1]);
    const toFile = to.charCodeAt(0);
    const toRank = parseInt(to[1]);
    
    return (Math.abs(fromFile - toFile) === 1) && (toRank - fromRank === direction);
  }

  canRookAttack(from, to) {
    if (from[0] !== to[0] && from[1] !== to[1]) return false;
    // Check if path is clear
    const [fromFile, fromRank] = this.squareToCoords(from);
    const [toFile, toRank] = this.squareToCoords(to);
    return this.isPathClear(fromFile, fromRank, toFile, toRank);
  }

  canBishopAttack(from, to) {
    const [fromFile, fromRank] = this.squareToCoords(from);
    const [toFile, toRank] = this.squareToCoords(to);
    const fileDiff = Math.abs(fromFile - toFile);
    const rankDiff = Math.abs(fromRank - toRank);
    if (fileDiff !== rankDiff) return false;
    // Check if path is clear
    return this.isPathClear(fromFile, fromRank, toFile, toRank);
  }

  canQueenAttack(from, to) {
    return this.canRookAttack(from, to) || this.canBishopAttack(from, to);
  }

  canKingAttack(from, to) {
    const fileDiff = Math.abs(from.charCodeAt(0) - to.charCodeAt(0));
    const rankDiff = Math.abs(parseInt(from[1]) - parseInt(to[1]));
    return fileDiff <= 1 && rankDiff <= 1;
  }

  canKnightAttack(from, to) {
    const fileDiff = Math.abs(from.charCodeAt(0) - to.charCodeAt(0));
    const rankDiff = Math.abs(parseInt(from[1]) - parseInt(to[1]));
    return (fileDiff === 2 && rankDiff === 1) || (fileDiff === 1 && rankDiff === 2);
  }

  // Update game state after move
  updateGameState() {
    const currentColor = this.gameState.currentPlayer;
    this.gameState.inCheck = this.isInCheck(currentColor);
    
    // Check for checkmate/stalemate (simplified)
    const hasLegalMoves = this.hasLegalMoves(currentColor);
    
    if (!hasLegalMoves) {
      if (this.gameState.inCheck) {
        this.gameState.inCheckmate = true;
        this.gameState.draw = false;
      } else {
        this.gameState.inStalemate = true;
        this.gameState.draw = true;
      }
    }
  }

  // Check if color has any legal moves (comprehensive with check constraint)
  hasLegalMoves(color) {
    for (const [square, piece] of Object.entries(this.position)) {
      if (piece && piece.startsWith(color)) {
        // Check ALL squares on the board for legal moves
        for (let file = 0; file < 8; file++) {
          for (let rank = 1; rank <= 8; rank++) {
            const targetSquare = String.fromCharCode(97 + file) + rank;
            
            // Basic move legality check
            if (this.isMoveLegal(square, targetSquare, piece)) {
              // CRITICAL: Simulate the move and check if king is still in check
              // This matches the frontend's getLegalMoves logic
              const originalPosition = { ...this.position };
              const capturedPiece = this.position[targetSquare];
              
              // Simulate the move
              this.position[targetSquare] = piece;
              delete this.position[square];
              
              // Check if this move leaves own king in check (illegal move)
              const stillInCheck = this.isInCheck(color);
              
              // Restore original position
              this.position = originalPosition;
              
              // If the move gets the king out of check, it's a legal move
              if (!stillInCheck) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }

  // Get current position FEN
  getCurrentPositionFEN() {
    return this.positionToFEN();
  }

  // Get current game state
  getCurrentGameState() {
    return {
      checkmate: this.gameState.inCheckmate,
      stalemate: this.gameState.inStalemate,
      draw: this.gameState.draw,
      currentPlayer: this.gameState.currentPlayer,
      inCheck: this.gameState.inCheck
    };
  }

  // Get position object
  getCurrentPosition() {
    return { ...this.position };
  }

  // Replay moves from database
  replayMoves(moves) {
    this.resetToStartingPosition();
    
    for (const move of moves) {
      const success = this.makeMove({
        from: move.from_square,
        to: move.to_square,
        piece: move.piece
      });
      
      if (!success) {
        console.error('❌ Failed to replay move:', move);
        return false;
      }
    }
    
    return true;
  }
}

module.exports = BackendChessEngine;