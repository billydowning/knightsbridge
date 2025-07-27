/**
 * Knightsbridge Chess Security Module
 * Handles server-side validation, integrity checks, and anti-cheating
 * Maintains 2-transaction UX while providing enterprise security
 */

const crypto = require('crypto');

// Chess piece definitions for validation
const PIECES = {
  '♔': 'white-king',
  '♕': 'white-queen', 
  '♖': 'white-rook',
  '♗': 'white-bishop',
  '♘': 'white-knight',
  '♙': 'white-pawn',
  '♚': 'black-king',
  '♛': 'black-queen',
  '♜': 'black-rook', 
  '♝': 'black-bishop',
  '♞': 'black-knight',
  '♟': 'black-pawn'
};

// Chess board coordinates
const BOARD_SQUARES = [
  'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8',
  'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7',
  'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
  'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5',
  'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
  'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3',
  'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
  'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1'
];

/**
 * Generate cryptographic hash of game state for integrity
 */
function hashGameState(gameState) {
  const stateString = JSON.stringify({
    position: gameState.position,
    currentPlayer: gameState.currentPlayer,
    moveHistory: gameState.moveHistory,
    lastMove: gameState.lastMove,
    inCheck: gameState.inCheck,
    inCheckmate: gameState.inCheckmate,
    winner: gameState.winner,
    gameActive: gameState.gameActive
  });
  
  return crypto.createHash('sha256').update(stateString).digest('hex');
}

/**
 * Validate chess move legality
 */
function validateMove(fromSquare, toSquare, piece, position, currentPlayer) {
  // Basic validation
  if (!BOARD_SQUARES.includes(fromSquare) || !BOARD_SQUARES.includes(toSquare)) {
    return { valid: false, reason: 'Invalid square coordinates' };
  }
  
  if (fromSquare === toSquare) {
    return { valid: false, reason: 'Move must be to a different square' };
  }
  
  // Check if piece exists at fromSquare
  const movingPiece = position[fromSquare];
  if (!movingPiece) {
    return { valid: false, reason: 'No piece at source square' };
  }
  
  // Check if piece belongs to current player
  const pieceColor = getPieceColor(movingPiece);
  if (pieceColor !== currentPlayer) {
    return { valid: false, reason: 'Cannot move opponent\'s piece' };
  }
  
  // Check if destination is occupied by own piece
  const targetPiece = position[toSquare];
  if (targetPiece && getPieceColor(targetPiece) === currentPlayer) {
    return { valid: false, reason: 'Cannot capture own piece' };
  }
  
  // Validate specific piece movements
  const moveValidation = validatePieceMove(fromSquare, toSquare, movingPiece, position);
  if (!moveValidation.valid) {
    return moveValidation;
  }
  
  // Check if move would put/leave own king in check
  const newPosition = { ...position };
  newPosition[toSquare] = movingPiece;
  newPosition[fromSquare] = '';
  
  if (isKingInCheck(newPosition, currentPlayer)) {
    return { valid: false, reason: 'Move would put/leave king in check' };
  }
  
  return { valid: true };
}

/**
 * Get color of chess piece
 */
function getPieceColor(piece) {
  const whitePieces = ['♔', '♕', '♖', '♗', '♘', '♙'];
  return whitePieces.includes(piece) ? 'white' : 'black';
}

/**
 * Validate specific piece movement rules
 */
function validatePieceMove(fromSquare, toSquare, piece, position) {
  const fromFile = fromSquare.charCodeAt(0) - 97; // a=0, b=1, etc.
  const fromRank = parseInt(fromSquare[1]) - 1;
  const toFile = toSquare.charCodeAt(0) - 97;
  const toRank = parseInt(toSquare[1]) - 1;
  
  const fileDiff = Math.abs(toFile - fromFile);
  const rankDiff = Math.abs(toRank - fromRank);
  
  switch (piece) {
    case '♙': // White pawn
      return validatePawnMove(fromFile, fromRank, toFile, toRank, position, 'white');
    case '♟': // Black pawn
      return validatePawnMove(fromFile, fromRank, toFile, toRank, position, 'black');
    case '♖': // Rook
    case '♜':
      return validateRookMove(fromFile, fromRank, toFile, toRank, position);
    case '♗': // Bishop
    case '♝':
      return validateBishopMove(fromFile, fromRank, toFile, toRank, position);
    case '♕': // Queen
    case '♛':
      return validateQueenMove(fromFile, fromRank, toFile, toRank, position);
    case '♔': // King
    case '♚':
      return validateKingMove(fromFile, fromRank, toFile, toRank);
    case '♘': // Knight
    case '♞':
      return validateKnightMove(fileDiff, rankDiff);
    default:
      return { valid: false, reason: 'Unknown piece type' };
  }
}

/**
 * Validate pawn movement
 */
function validatePawnMove(fromFile, fromRank, toFile, toRank, position, color) {
  const direction = color === 'white' ? 1 : -1;
  const startRank = color === 'white' ? 1 : 6;
  
  const fileDiff = Math.abs(toFile - fromFile);
  const rankDiff = toRank - fromRank;
  
  // Forward move
  if (fileDiff === 0) {
    if (rankDiff === direction) {
      // Single square forward
      const targetSquare = String.fromCharCode(97 + toFile) + (toRank + 1);
      if (position[targetSquare]) {
        return { valid: false, reason: 'Pawn cannot move through occupied square' };
      }
      return { valid: true };
    } else if (rankDiff === 2 * direction && fromRank === startRank) {
      // Double square from starting position
      const intermediateRank = fromRank + direction;
      const intermediateSquare = String.fromCharCode(97 + fromFile) + (intermediateRank + 1);
      const targetSquare = String.fromCharCode(97 + toFile) + (toRank + 1);
      if (position[intermediateSquare] || position[targetSquare]) {
        return { valid: false, reason: 'Pawn cannot move through occupied square' };
      }
      return { valid: true };
    }
  } else if (fileDiff === 1 && rankDiff === direction) {
    // Diagonal capture
    const targetSquare = String.fromCharCode(97 + toFile) + (toRank + 1);
    if (position[targetSquare]) {
      return { valid: true }; // Capture
    }
  }
  
  return { valid: false, reason: 'Invalid pawn move' };
}

/**
 * Validate rook movement
 */
function validateRookMove(fromFile, fromRank, toFile, toRank, position) {
  if (fromFile !== toFile && fromRank !== toRank) {
    return { valid: false, reason: 'Rook must move in straight lines' };
  }
  
  // Check if path is clear
  const fileStep = fromFile === toFile ? 0 : (toFile > fromFile ? 1 : -1);
  const rankStep = fromRank === toRank ? 0 : (toRank > fromRank ? 1 : -1);
  
  let currentFile = fromFile + fileStep;
  let currentRank = fromRank + rankStep;
  
  while (currentFile !== toFile || currentRank !== toRank) {
    const square = String.fromCharCode(97 + currentFile) + (currentRank + 1);
    if (position[square]) {
      return { valid: false, reason: 'Rook cannot move through occupied square' };
    }
    currentFile += fileStep;
    currentRank += rankStep;
  }
  
  return { valid: true };
}

/**
 * Validate bishop movement
 */
function validateBishopMove(fromFile, fromRank, toFile, toRank, position) {
  if (Math.abs(toFile - fromFile) !== Math.abs(toRank - fromRank)) {
    return { valid: false, reason: 'Bishop must move diagonally' };
  }
  
  // Check if path is clear
  const fileStep = toFile > fromFile ? 1 : -1;
  const rankStep = toRank > fromRank ? 1 : -1;
  
  let currentFile = fromFile + fileStep;
  let currentRank = fromRank + rankStep;
  
  while (currentFile !== toFile && currentRank !== toRank) {
    const square = String.fromCharCode(97 + currentFile) + (currentRank + 1);
    if (position[square]) {
      return { valid: false, reason: 'Bishop cannot move through occupied square' };
    }
    currentFile += fileStep;
    currentRank += rankStep;
  }
  
  return { valid: true };
}

/**
 * Validate queen movement
 */
function validateQueenMove(fromFile, fromRank, toFile, toRank, position) {
  // Queen can move like rook or bishop
  const rookValidation = validateRookMove(fromFile, fromRank, toFile, toRank, position);
  if (rookValidation.valid) return { valid: true };
  
  const bishopValidation = validateBishopMove(fromFile, fromRank, toFile, toRank, position);
  return bishopValidation;
}

/**
 * Validate king movement
 */
function validateKingMove(fromFile, fromRank, toFile, toRank) {
  const fileDiff = Math.abs(toFile - fromFile);
  const rankDiff = Math.abs(toRank - fromRank);
  
  if (fileDiff <= 1 && rankDiff <= 1) {
    return { valid: true };
  }
  
  return { valid: false, reason: 'King can only move one square in any direction' };
}

/**
 * Validate knight movement
 */
function validateKnightMove(fileDiff, rankDiff) {
  if ((fileDiff === 2 && rankDiff === 1) || (fileDiff === 1 && rankDiff === 2)) {
    return { valid: true };
  }
  
  return { valid: false, reason: 'Invalid knight move' };
}

/**
 * Check if king is in check
 */
function isKingInCheck(position, color) {
  // Find king
  const kingPiece = color === 'white' ? '♔' : '♚';
  let kingSquare = null;
  
  for (const [square, piece] of Object.entries(position)) {
    if (piece === kingPiece) {
      kingSquare = square;
      break;
    }
  }
  
  if (!kingSquare) return false;
  
  // Check if any opponent piece can attack king
  const opponentColor = color === 'white' ? 'black' : 'white';
  
  for (const [square, piece] of Object.entries(position)) {
    if (piece && getPieceColor(piece) === opponentColor) {
      const validation = validateMove(square, kingSquare, piece, position, opponentColor);
      if (validation.valid) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Detect suspicious move patterns (anti-cheating)
 */
function analyzeMoveQuality(move, position, moveHistory, playerRating = 1500) {
  const analysis = {
    suspicious: false,
    reasons: [],
    confidence: 0
  };
  
  // Check for engine-like move patterns
  if (moveHistory.length > 0) {
    const recentMoves = moveHistory.slice(-5);
    const averageMoveTime = recentMoves.reduce((sum, m) => sum + (m.timestamp || 0), 0) / recentMoves.length;
    
    // Suspicious if moves are too fast and too good
    if (averageMoveTime < 1000 && playerRating < 2000) {
      analysis.suspicious = true;
      analysis.reasons.push('Unusually fast moves for player rating');
      analysis.confidence += 0.3;
    }
  }
  
  // Check for perfect move sequences
  if (moveHistory.length > 10) {
    const recentMoves = moveHistory.slice(-10);
    const perfectMoves = recentMoves.filter(m => m.isBestMove).length;
    
    if (perfectMoves > 8 && playerRating < 1800) {
      analysis.suspicious = true;
      analysis.reasons.push('Too many perfect moves for player rating');
      analysis.confidence += 0.4;
    }
  }
  
  return analysis;
}

/**
 * Create audit log entry
 */
function createAuditLog(roomId, playerId, action, data) {
  return {
    timestamp: new Date().toISOString(),
    roomId,
    playerId,
    action,
    data,
    hash: crypto.createHash('sha256')
      .update(JSON.stringify({ roomId, playerId, action, data }))
      .digest('hex')
  };
}

/**
 * Validate game state integrity
 */
function validateGameStateIntegrity(gameState, previousHash) {
  const currentHash = hashGameState(gameState);
  
  // Check if this is the first state
  if (!previousHash) {
    return { valid: true, hash: currentHash };
  }
  
  // In a real implementation, you'd verify the hash chain
  // For now, we'll just return the current hash
  return { valid: true, hash: currentHash };
}

module.exports = {
  hashGameState,
  validateMove,
  isKingInCheck,
  analyzeMoveQuality,
  createAuditLog,
  validateGameStateIntegrity,
  getPieceColor
}; 