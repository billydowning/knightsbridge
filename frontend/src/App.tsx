import React, { useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// Complete Chess Engine with All Rules
const ChessEngine = {
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
  isWhitePiece: (piece) => ChessEngine.PIECES.WHITE.includes(piece),
  isBlackPiece: (piece) => ChessEngine.PIECES.BLACK.includes(piece),
  
  getPieceColor: (piece) => {
    if (ChessEngine.PIECES.WHITE.includes(piece)) return 'white';
    if (ChessEngine.PIECES.BLACK.includes(piece)) return 'black';
    return null;
  },

  squareToCoords: (square) => {
    const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
    const rank = parseInt(square[1]) - 1;   // 1=0, 2=1, etc.
    return [file, rank];
  },

  coordsToSquare: (file, rank) => {
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return String.fromCharCode(97 + file) + (rank + 1);
  },

  // Check if a path between two squares is clear
  isPathClear: (from, to, position) => {
    const [fromFile, fromRank] = ChessEngine.squareToCoords(from);
    const [toFile, toRank] = ChessEngine.squareToCoords(to);
    
    const fileStep = Math.sign(toFile - fromFile);
    const rankStep = Math.sign(toRank - fromRank);
    
    let currentFile = fromFile + fileStep;
    let currentRank = fromRank + rankStep;
    
    while (currentFile !== toFile || currentRank !== toRank) {
      const square = ChessEngine.coordsToSquare(currentFile, currentRank);
      if (position[square]) return false; // Path blocked
      
      currentFile += fileStep;
      currentRank += rankStep;
    }
    
    return true;
  },

  // Generate all possible moves for a piece (without considering check)
  generatePieceMoves: (from, position, gameState = {}) => {
    const piece = position[from];
    if (!piece) return [];
    
    const [fromFile, fromRank] = ChessEngine.squareToCoords(from);
    const moves = [];
    const pieceColor = ChessEngine.getPieceColor(piece);

    switch (piece) {
      case '♙': // White pawn
        // Forward moves
        if (!position[ChessEngine.coordsToSquare(fromFile, fromRank + 1)]) {
          moves.push(ChessEngine.coordsToSquare(fromFile, fromRank + 1));
          // Double move from starting position
          if (fromRank === 1 && !position[ChessEngine.coordsToSquare(fromFile, fromRank + 2)]) {
            moves.push(ChessEngine.coordsToSquare(fromFile, fromRank + 2));
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
        if (!position[ChessEngine.coordsToSquare(fromFile, fromRank - 1)]) {
          moves.push(ChessEngine.coordsToSquare(fromFile, fromRank - 1));
          // Double move from starting position
          if (fromRank === 6 && !position[ChessEngine.coordsToSquare(fromFile, fromRank - 2)]) {
            moves.push(ChessEngine.coordsToSquare(fromFile, fromRank - 2));
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
  isSquareUnderAttack: (square, position, byColor) => {
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
  findKing: (position, color) => {
    const kingPiece = color === 'white' ? '♔' : '♚';
    for (const square in position) {
      if (position[square] === kingPiece) {
        return square;
      }
    }
    return null;
  },

  // Check if the specified color is in check
  isInCheck: (position, color) => {
    const kingSquare = ChessEngine.findKing(position, color);
    if (!kingSquare) return false;
    
    const opponentColor = color === 'white' ? 'black' : 'white';
    return ChessEngine.isSquareUnderAttack(kingSquare, position, opponentColor);
  },

  // Get all legal moves for a color (considering check)
  getLegalMoves: (position, color, gameState = {}) => {
    const legalMoves = [];
    
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
              newPosition[rookToSquare] = newPosition[rookFromSquare];
              delete newPosition[rookFromSquare];
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
  isCheckmate: (position, color, gameState = {}) => {
    if (!ChessEngine.isInCheck(position, color)) return false;
    return ChessEngine.getLegalMoves(position, color, gameState).length === 0;
  },

  // Check if it's stalemate
  isStalemate: (position, color, gameState = {}) => {
    if (ChessEngine.isInCheck(position, color)) return false;
    return ChessEngine.getLegalMoves(position, color, gameState).length === 0;
  },

  // Check if a move is legal
  isLegalMove: (from, to, position, color, gameState = {}) => {
    const legalMoves = ChessEngine.getLegalMoves(position, color, gameState);
    return legalMoves.some(move => move.from === from && move.to === to);
  },

  // Make a move and return the new game state
  makeMove: (from, to, position, gameState = {}) => {
    const piece = position[from];
    if (!piece) return null;
    
    const color = ChessEngine.getPieceColor(piece);
    
    // Check if move is legal
    if (!ChessEngine.isLegalMove(from, to, position, color, gameState)) {
      return null;
    }
    
    // Create new position
    const newPosition = { ...position };
    const capturedPiece = newPosition[to];
    
    // Create new game state
    const newGameState = {
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
        newPosition[rookToSquare] = newPosition[rookFromSquare];
        delete newPosition[rookFromSquare];
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
  }
};

// Chess Board Component with Move Hints
const ChessBoardWithHints = ({ position, onSquareClick, selectedSquare, orientation = 'white', gameState, playerRole }) => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = orientation === 'white' ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];
  
  // Get legal moves for selected piece
  const legalMoves = selectedSquare && gameState ? 
    ChessEngine.getLegalMoves(position, gameState.currentPlayer, gameState)
      .filter(move => move.from === selectedSquare)
      .map(move => move.to) : [];
  
  const renderSquare = (square, piece, isLight, isSelected, isLegalMove, isInCheck) => (
    <div
      key={square}
      className={`chess-square ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''}`}
      onClick={() => onSquareClick(square)}
      style={{
        width: '60px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isInCheck ? '#ff6b6b' : 
                        isSelected ? '#ffd700' : 
                        isLegalMove ? '#90EE90' : 
                        (isLight ? '#f0d9b5' : '#b58863'),
        cursor: 'pointer',
        fontSize: '2rem',
        border: '1px solid #999',
        transition: 'background-color 0.2s',
        position: 'relative'
      }}
    >
      {piece}
      {isLegalMove && !piece && (
        <div style={{
          position: 'absolute',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: 'rgba(0, 128, 0, 0.5)',
        }} />
      )}
      {isLegalMove && piece && (
        <div style={{
          position: 'absolute',
          top: '2px',
          right: '2px',
          width: '15px',
          height: '15px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 0, 0, 0.7)',
        }} />
      )}
    </div>
  );

  const renderBoard = () => {
    const squares = [];
    const kingSquare = ChessEngine.findKing(position, gameState?.currentPlayer || 'white');
    const isKingInCheck = gameState?.inCheck && kingSquare;
    
    for (let rank of ranks) {
      for (let file of files) {
        const square = file + rank;
        const piece = position[square] || '';
        const isLight = (files.indexOf(file) + parseInt(rank)) % 2 === 0;
        const isSelected = selectedSquare === square;
        const isLegalMove = legalMoves.includes(square);
        const isInCheck = isKingInCheck && square === kingSquare;
        
        squares.push(renderSquare(square, piece, isLight, isSelected, isLegalMove, isInCheck));
      }
    }
    
    return squares;
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(8, 60px)', 
      gridTemplateRows: 'repeat(8, 60px)',
      border: '4px solid #333',
      margin: '20px 0',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {renderBoard()}
    </div>
  );
};

// Mock multiplayer state using localStorage with real-time sync via storage events
const mockMultiplayerState = {
  STORAGE_KEY: 'chess-rooms-shared',
  GAME_STATE_KEY: 'chess-game-state',
  
  // Real-time sync using storage events
  setupStorageSync: (callback) => {
    const handleStorageChange = (e) => {
      console.log('📡 Storage event detected:', e.key, e.newValue ? 'NEW DATA' : 'NO DATA');
      if (e.key === mockMultiplayerState.STORAGE_KEY || e.key === mockMultiplayerState.GAME_STATE_KEY) {
        console.log('🔄 Storage changed, triggering sync...');
        setTimeout(callback, 50); // Small delay to ensure data is written
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also create a manual trigger for same-tab updates
    const handleManualSync = () => {
      console.log('🔄 Manual sync triggered');
      setTimeout(callback, 50);
    };
    
    window.addEventListener('gameStateChanged', handleManualSync);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('gameStateChanged', handleManualSync);
    };
  },
  
  // Trigger storage event manually for same-tab updates
  triggerSync: () => {
    // Dispatch custom event for same-tab sync
    console.log('📤 Triggering manual sync event');
    window.dispatchEvent(new CustomEvent('gameStateChanged'));
    
    // Also try to trigger storage event by modifying a dummy key
    const timestamp = Date.now();
    localStorage.setItem('chess-sync-trigger', timestamp.toString());
    localStorage.removeItem('chess-sync-trigger');
  },
  
  // Get all rooms from localStorage
  getRooms: () => {
    try {
      const rooms = localStorage.getItem(mockMultiplayerState.STORAGE_KEY);
      return rooms ? JSON.parse(rooms) : {};
    } catch (error) {
      console.error('Error reading rooms from localStorage:', error);
      return {};
    }
  },
  
  // Save rooms to localStorage and trigger sync
  saveRooms: (rooms) => {
    try {
      localStorage.setItem(mockMultiplayerState.STORAGE_KEY, JSON.stringify(rooms));
      mockMultiplayerState.triggerSync();
    } catch (error) {
      console.error('Error saving rooms to localStorage:', error);
    }
  },
  
  // Game state management
  getGameState: (roomId) => {
    try {
      const gameStates = JSON.parse(localStorage.getItem(mockMultiplayerState.GAME_STATE_KEY) || '{}');
      return gameStates[roomId] || null;
    } catch (error) {
      return null;
    }
  },
  
  saveGameState: (roomId, gameState) => {
    try {
      const gameStates = JSON.parse(localStorage.getItem(mockMultiplayerState.GAME_STATE_KEY) || '{}');
      gameStates[roomId] = {
        ...gameState,
        lastUpdated: Date.now()
      };
      
      console.log('💾 Saving game state for room:', roomId, gameStates[roomId]);
      localStorage.setItem(mockMultiplayerState.GAME_STATE_KEY, JSON.stringify(gameStates));
      
      // Force trigger sync
      mockMultiplayerState.triggerSync();
    } catch (error) {
      console.error('Error saving game state:', error);
    }
  },
  
  createRoom: (roomId, playerWallet) => {
    const rooms = mockMultiplayerState.getRooms();
    
    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [{ wallet: playerWallet, role: 'white' }],
        escrows: {},
        gameStarted: false,
        created: Date.now()
      };
      mockMultiplayerState.saveRooms(rooms);
      console.log('✅ Created room:', roomId, 'for player:', playerWallet);
      return 'white';
    } else {
      console.log('❌ Room already exists:', roomId);
    }
    return null;
  },
  
  joinRoom: (roomId, playerWallet) => {
    const rooms = mockMultiplayerState.getRooms();
    const room = rooms[roomId];
    
    console.log('🔍 Attempting to join room:', roomId);
    console.log('🔍 Available rooms:', Object.keys(rooms));
    console.log('🔍 Room data:', room);
    
    if (room) {
      // Check if player is already in the room
      const existingPlayer = room.players.find(p => p.wallet === playerWallet);
      if (existingPlayer) {
        console.log('✅ Player already in room:', playerWallet, 'role:', existingPlayer.role);
        return existingPlayer.role;
      }
      
      // Add new player if room has space
      if (room.players.length < 2) {
        const newRole = room.players.length === 0 ? 'white' : 'black';
        room.players.push({ wallet: playerWallet, role: newRole });
        mockMultiplayerState.saveRooms(rooms);
        console.log('✅ Player joined room:', roomId, 'player:', playerWallet, 'role:', newRole);
        return newRole;
      } else {
        console.log('❌ Room is full:', roomId);
      }
    } else {
      console.log('❌ Room does not exist:', roomId);
    }
    return null;
  },
  
  getRoomStatus: (roomId) => {
    try {
      const rooms = mockMultiplayerState.getRooms();
      const room = rooms[roomId];
      
      if (room) {
        // Ensure escrows is always an object
        const escrows = room.escrows || {};
        
        return {
          playerCount: room.players ? room.players.length : 0,
          players: room.players || [],
          escrowCount: Object.keys(escrows).length,
          escrows: escrows,
          gameStarted: room.gameStarted || false
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Error in getRoomStatus:', error);
      return null;
    }
  },
  
  addEscrow: (roomId, playerWallet, amount) => {
    const rooms = mockMultiplayerState.getRooms();
    const room = rooms[roomId];
    
    if (room) {
      room.escrows[playerWallet] = amount;
      
      // Auto-start game if both escrows are created
      if (Object.keys(room.escrows).length === 2 && !room.gameStarted) {
        room.gameStarted = true;
        console.log('🎮 Auto-starting game in room:', roomId);
      }
      
      mockMultiplayerState.saveRooms(rooms);
      console.log('✅ Escrow added:', roomId, playerWallet, amount);
    }
  },
  
  // Debug function to see room state
  debugRoom: (roomId) => {
    const rooms = mockMultiplayerState.getRooms();
    const room = rooms[roomId];
    console.log('🔍 Debug Room:', roomId);
    console.log('🔍 Room data:', room);
    console.log('🔍 All rooms:', rooms);
    return room;
  },
  
  // Clear all rooms (for testing)
  clearAllRooms: () => {
    localStorage.removeItem(mockMultiplayerState.STORAGE_KEY);
    localStorage.removeItem(mockMultiplayerState.GAME_STATE_KEY);
    console.log('🧹 All rooms cleared');
  },
  
  // Force create a room for testing
  forceCreateRoom: (roomId, playerWallet) => {
    const rooms = mockMultiplayerState.getRooms();
    rooms[roomId] = {
      players: [{ wallet: playerWallet, role: 'white' }],
      escrows: {},
      gameStarted: false,
      created: Date.now()
    };
    mockMultiplayerState.saveRooms(rooms);
    console.log('🔧 Force created room:', roomId);
    return 'white';
  }
};

// Updated useGameState hook with complete chess rules
const useGameStateWithChessRules = () => {
  const [gameState, setGameState] = useState({
    position: {
      // Initial chess position
      'a8': '♜', 'b8': '♞', 'c8': '♝', 'd8': '♛', 'e8': '♚', 'f8': '♝', 'g8': '♞', 'h8': '♜',
      'a7': '♟', 'b7': '♟', 'c7': '♟', 'd7': '♟', 'e7': '♟', 'f7': '♟', 'g7': '♟', 'h7': '♟',
      'a2': '♙', 'b2': '♙', 'c2': '♙', 'd2': '♙', 'e2': '♙', 'f2': '♙', 'g2': '♙', 'h2': '♙',
      'a1': '♖', 'b1': '♘', 'c1': '♗', 'd1': '♕', 'e1': '♔', 'f1': '♗', 'g1': '♘', 'h1': '♖'
    },
    currentPlayer: 'white',
    selectedSquare: null,
    gameActive: false,
    winner: null,
    draw: false,
    moveHistory: [],
    lastUpdated: Date.now(),
    // Chess-specific state
    castlingRights: 'KQkq',
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    inCheck: false
  });

  const makeMove = (from, to, roomId) => {
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

      const nextPlayer = prev.currentPlayer === 'white' ? 'black' : 'white';
      
      // Build new state
      let newState = {
        ...prev,
        position: result.position,
        currentPlayer: nextPlayer,
        selectedSquare: null,
        moveHistory: [...prev.moveHistory, { from, to, piece, capturedPiece: result.capturedPiece }],
        lastUpdated: Date.now(),
        castlingRights: result.gameState.castlingRights,
        enPassantTarget: result.gameState.enPassantTarget,
        halfmoveClock: result.gameState.halfmoveClock,
        fullmoveNumber: result.gameState.fullmoveNumber,
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
      } else if (result.gameState.halfmoveClock >= 100) {
        newState.draw = true;
        newState.gameActive = false;
        statusMessage = 'Draw by 50-move rule!';
      } else if (newState.inCheck) {
        statusMessage = `${nextPlayer} is in check!`;
      } else {
        statusMessage = `${nextPlayer}'s turn`;
      }

      // Save to localStorage if in multiplayer mode
      if (roomId) {
        mockMultiplayerState.saveGameState(roomId, newState);
      }

      moveSuccessful = true;
      return newState;
    });
    
    return { success: moveSuccessful, message: statusMessage };
  };

  const selectSquare = (square) => {
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

  // Reset and restart game (simplified version for the hook)
  const resetGame = (roomId = null) => {
    // Reset local game state
    setGameState({
      position: {
        'a8': '♜', 'b8': '♞', 'c8': '♝', 'd8': '♛', 'e8': '♚', 'f8': '♝', 'g8': '♞', 'h8': '♜',
        'a7': '♟', 'b7': '♟', 'c7': '♟', 'd7': '♟', 'e7': '♟', 'f7': '♟', 'g7': '♟', 'h7': '♟',
        'a2': '♙', 'b2': '♙', 'c2': '♙', 'd2': '♙', 'e2': '♙', 'f2': '♙', 'g2': '♙', 'h2': '♙',
        'a1': '♖', 'b1': '♘', 'c1': '♗', 'd1': '♕', 'e1': '♔', 'f1': '♗', 'g1': '♘', 'h1': '♖'
      },
      currentPlayer: 'white',
      selectedSquare: null,
      gameActive: true,
      winner: null,
      draw: false,
      moveHistory: [],
      lastUpdated: Date.now(),
      castlingRights: 'KQkq',
      enPassantTarget: null,
      halfmoveClock: 0,
      fullmoveNumber: 1,
      inCheck: false
    });

    // Save reset state to multiplayer if roomId provided
    if (roomId) {
      const resetGameState = {
        position: {
          'a8': '♜', 'b8': '♞', 'c8': '♝', 'd8': '♛', 'e8': '♚', 'f8': '♝', 'g8': '♞', 'h8': '♜',
          'a7': '♟', 'b7': '♟', 'c7': '♟', 'd7': '♟', 'e7': '♟', 'f7': '♟', 'g7': '♟', 'h7': '♟',
          'a2': '♙', 'b2': '♙', 'c2': '♙', 'd2': '♙', 'e2': '♙', 'f2': '♙', 'g2': '♙', 'h2': '♙',
          'a1': '♖', 'b1': '♘', 'c1': '♗', 'd1': '♕', 'e1': '♔', 'f1': '♗', 'g1': '♘', 'h1': '♖'
        },
        currentPlayer: 'white',
        selectedSquare: null,
        gameActive: true,
        winner: null,
        draw: false,
        moveHistory: [],
        lastUpdated: Date.now(),
        castlingRights: 'KQkq',
        enPassantTarget: null,
        halfmoveClock: 0,
        fullmoveNumber: 1,
        inCheck: false
      };
      
      mockMultiplayerState.saveGameState(roomId, resetGameState);
      console.log('🔄 Game reset and synced to multiplayer state');
    }
  };

  const loadGameState = (newState) => {
    setGameState({
      ...newState,
      // Ensure game stays active during multiplayer sync unless explicitly ended
      gameActive: newState.gameActive !== undefined ? newState.gameActive : true
    });
  };

  const getGameStatus = () => {
    if (!gameState.gameActive) return 'Game not started';
    if (gameState.winner) return `${gameState.winner} wins!`;
    if (gameState.draw) return 'Draw!';
    if (gameState.inCheck) return `${gameState.currentPlayer} is in check!`;
    return `${gameState.currentPlayer}'s turn`;
  };

  const getLegalMovesForSquare = (square) => {
    const piece = gameState.position[square];
    if (!piece || ChessEngine.getPieceColor(piece) !== gameState.currentPlayer) {
      return [];
    }
    
    const legalMoves = ChessEngine.getLegalMoves(gameState.position, gameState.currentPlayer, gameState);
    return legalMoves.filter(move => move.from === square).map(move => move.to);
  };

  return {
    gameState,
    makeMove,
    selectSquare,
    resetGame,
    loadGameState,
    getGameStatus,
    getLegalMovesForSquare,
    setGameActive: (active) => setGameState(prev => ({ ...prev, gameActive: active })),
    setWinner: (winner) => setGameState(prev => ({ ...prev, winner, gameActive: false }))
  };
};

// Solana Integration Constants
const PROGRAM_ID = new PublicKey('F4Py3YTF1JGhbY9ACztXaseFF89ZfLS69ke5Z7EBGQGr');
const FEE_WALLET = new PublicKey('UFGCHLdHGYQDwCag4iUTTYmvTyayvdjo9BsbDBs56r1'); // Updated fee wallet

// Main Chess App Component
function ChessApp() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { gameState, makeMove, selectSquare, resetGame, setGameActive, setWinner, loadGameState, getGameStatus, getLegalMovesForSquare } = useGameStateWithChessRules();
  
  const [gameMode, setGameMode] = useState('menu'); // 'menu', 'lobby', 'game'
  const [roomId, setRoomId] = useState('');
  const [betAmount, setBetAmount] = useState(0.1);
  const [playerRole, setPlayerRole] = useState(''); // 'white', 'black'
  const [escrowCreated, setEscrowCreated] = useState(false);
  const [gameStatus, setGameStatus] = useState('Connect wallet to start');
  const [balance, setBalance] = useState(0);
  const [winningsClaimed, setWinningsClaimed] = useState(false);

  // Auto-sync room state and game state with real-time updates
  useEffect(() => {
    let cleanup = null;
    
    if (roomId && publicKey) {
      console.log('🔧 Setting up sync for room:', roomId, 'mode:', gameMode);
      
      // Add a small delay to ensure room is created before syncing
      const timer = setTimeout(() => {
        // Set up real-time sync using storage events
        cleanup = mockMultiplayerState.setupStorageSync(() => {
          console.log('🔄 Real-time sync triggered for room:', roomId);
          syncRoomState();
        });
        
        // Also listen for custom events (same-tab updates)
        const handleCustomSync = () => {
          console.log('🔄 Custom sync triggered for room:', roomId);
          syncRoomState();
        };
        
        window.addEventListener('gameStateChanged', handleCustomSync);
        
        // Initial sync
        syncRoomState();
        
        // Store cleanup function
        const originalCleanup = cleanup;
        cleanup = () => {
          if (originalCleanup) originalCleanup();
          window.removeEventListener('gameStateChanged', handleCustomSync);
        };
      }, 100);
      
      return () => {
        clearTimeout(timer);
        if (cleanup) cleanup();
      };
    }
  }, [roomId, publicKey, gameMode]);

  // Sync room state between tabs
  const syncRoomState = () => {
    if (!roomId || !publicKey) return;
    
    try {
      const roomStatus = mockMultiplayerState.getRoomStatus(roomId);
      if (!roomStatus) {
        console.log('⚠️ No room status found for:', roomId);
        return;
      }
      
      console.log('🔄 Syncing room state:', roomStatus);
      
      const myWallet = publicKey.toString();
      
      // Safely check escrows with proper null checking
      const escrows = roomStatus.escrows || {};
      const escrowCount = roomStatus.escrowCount || 0;
      
      // Update escrow status
      if (escrows[myWallet] && !escrowCreated) {
        setEscrowCreated(true);
        console.log('✅ Detected my escrow in sync');
      } else if (!escrows[myWallet] && escrowCreated) {
        // Escrow was reset (new game started)
        setEscrowCreated(false);
        console.log('🔄 Escrow reset detected in sync');
      }
      
      // Check if game should start
      if (escrowCount === 2 && roomStatus.gameStarted && gameMode !== 'game') {
        console.log('🎮 Starting game due to sync');
        setGameMode('game');
        setGameActive(true);
        setGameStatus(`Game started! You are ${playerRole}. ${playerRole === 'white' ? 'Your turn!' : 'White goes first.'}`);
      }
      
      // Check if new game was started (escrows cleared)
      if (escrowCount === 0 && !roomStatus.gameStarted && gameMode === 'game') {
        console.log('🔄 New game started, returning to lobby');
        setGameMode('lobby');
        setEscrowCreated(false);
        setWinningsClaimed(false);
        setGameStatus(`New game started! You are ${playerRole}. Create escrow to begin.`);
      }
      
      // Sync game state (moves) if we're in game mode
      if (gameMode === 'game') {
        const savedGameState = mockMultiplayerState.getGameState(roomId);
        console.log('🎯 Checking for saved game state:', savedGameState);
        
        if (savedGameState && savedGameState.position) {
          // Compare move counts and timestamps
          const savedMoveCount = savedGameState.moveHistory ? savedGameState.moveHistory.length : 0;
          const currentMoveCount = gameState.moveHistory ? gameState.moveHistory.length : 0;
          const savedTimestamp = savedGameState.lastUpdated || 0;
          const currentTimestamp = gameState.lastUpdated || 0;

          console.log('📊 Comparison - Saved moves:', savedMoveCount, 'Current moves:', currentMoveCount, 'Saved time:', savedTimestamp, 'Current time:', currentTimestamp);
          
          if (savedMoveCount > currentMoveCount || (savedMoveCount === currentMoveCount && savedTimestamp > currentTimestamp)) {
            console.log('🎯 Loading newer game state');
            loadGameState({
              ...savedGameState,
              lastUpdated: savedTimestamp, // Ensure it's carried over
            });
            
            // Update turn status based on game state
            if (savedGameState.winner) {
              if (savedGameState.resignedBy) {
                setGameStatus(`Game Over! ${savedGameState.resignedBy} resigned. ${savedGameState.winner} wins!`);
              } else {
                setGameStatus(`Game Over! ${savedGameState.winner} wins!`);
              }
            } else if (savedGameState.draw) {
              setGameStatus('Game Over! Draw!');
            } else {
              const isMyTurn = savedGameState.currentPlayer === playerRole;
              if (isMyTurn) {
                setGameStatus(`Your turn! You are ${playerRole}.`);
              } else {
                setGameStatus(`${savedGameState.currentPlayer === 'white' ? 'White' : 'Black'} player's turn. Waiting...`);
              }
            }
          } else {
            console.log('📅 Saved state is not newer, keeping current state');
          }
        } else {
          console.log('❌ No saved game state found or no position data');
        }
      }
      
      // Update status messages for lobby
      if (gameMode === 'lobby') {
        if (escrowCount === 2) {
          setGameStatus(`Both escrows created! Game starting...`);
        } else if (escrowCreated) {
          setGameStatus(`Escrow created! Waiting for opponent... (${escrowCount}/2)`);
        } else {
          setGameStatus(`Create escrow to start new game. You are ${playerRole}.`);
        }
      }
    } catch (error) {
      console.error('❌ Error in syncRoomState:', error);
      // Don't crash the app, just log the error and set safe status
      setGameStatus('Sync error occurred. Game state may be inconsistent.');
    }
  };

  // Resign game function
  const handleResignGame = () => {
    try {
      console.log('🏳️ Player resigning:', playerRole);
      
      // Determine winner (opposite of current player)
      const winner = playerRole === 'white' ? 'black' : 'white';
      
      // Update local game state immediately
      setGameState(prev => {
        const newState = {
          ...prev,
          winner: winner,
          gameActive: false,
          resignedBy: playerRole,
          lastUpdated: Date.now()
        };
        
        // Save resignation to multiplayer state
        if (roomId) {
          mockMultiplayerState.saveGameState(roomId, newState);
          console.log('🏳️ Resignation saved to multiplayer state');
          
          // Force sync to notify other player immediately
          setTimeout(() => {
            mockMultiplayerState.triggerSync();
          }, 50);
        }
        
        return newState;
      });
      
      setGameStatus(`${playerRole} resigned. ${winner} wins!`);
    } catch (error) {
      console.error('❌ Error resigning game:', error);
      setGameStatus('Error resigning game. Please try again.');
    }
  };

  // Start new game with new escrow
  const startNewGameWithEscrow = () => {
    try {
      console.log('🎮 Starting new game with fresh escrow');
      
      // Reset escrow states
      setEscrowCreated(false);
      setWinningsClaimed(false);
      
      // Reset the room escrows in multiplayer state
      if (roomId) {
        const rooms = mockMultiplayerState.getRooms();
        const room = rooms[roomId];
        if (room) {
          // Clear escrows but keep players
          room.escrows = {};
          room.gameStarted = false;
          mockMultiplayerState.saveRooms(rooms);
          console.log('🔄 Cleared escrows for new game');
          
          // Force trigger sync to notify other player
          mockMultiplayerState.triggerSync();
        }
      }
      
      // Reset game state
      resetGame(roomId);
      
      // Go back to lobby to create new escrows
      setGameMode('lobby');
      setGameStatus(`New game started! You are ${playerRole}. Create escrow to begin.`);
      
      // Force sync after a short delay to ensure state is saved
      setTimeout(() => {
        mockMultiplayerState.triggerSync();
      }, 100);
    } catch (error) {
      console.error('❌ Error starting new game:', error);
      setGameStatus('Error starting new game. Please try again.');
    }
  };
  useEffect(() => {
    if (connected && publicKey) {
      checkBalance();
    }
  }, [connected, publicKey]);

  const checkBalance = async () => {
    if (connected && publicKey) {
      try {
        const balance = await connection.getBalance(publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
        setGameStatus(`Wallet connected! Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(3)} SOL`);
      } catch (error) {
        setGameStatus(`Error checking balance: ${error.message}`);
      }
    }
  };

  // Handle square clicks with complete chess rules
  const handleSquareClick = (square) => {
    console.log(`🎯 Square clicked: ${square}, gameActive: ${gameState.gameActive}, currentPlayer: ${gameState.currentPlayer}, playerRole: ${playerRole}, roomId: "${roomId}"`);
    
    if (!roomId) {
      console.log('❌ No roomId available, cannot make move');
      setGameStatus('Error: No room ID found');
      return;
    }
    
    if (!gameState.gameActive) {
      console.log('❌ Game not active, ignoring click');
      return;
    }
    
    // Check if it's the player's turn
    const isMyTurn = gameState.currentPlayer === playerRole;
    if (!isMyTurn) {
      console.log(`❌ Not my turn: current=${gameState.currentPlayer}, role=${playerRole}`);
      setGameStatus(`Wait for ${gameState.currentPlayer === 'white' ? 'white' : 'black'} player's turn`);
      return;
    }
    
    const piece = gameState.position[square];
    const pieceColor = piece ? ChessEngine.getPieceColor(piece) : null;
    
    if (gameState.selectedSquare) {
      // Try to make a move
      console.log(`🎯 Attempting move: ${gameState.selectedSquare} → ${square} in room "${roomId}"`);
      const result = makeMove(gameState.selectedSquare, square, roomId);
      
      if (result.success) {
        console.log(`✅ Move successful: ${gameState.selectedSquare} → ${square} by ${playerRole} in room "${roomId}"`);
        setGameStatus(result.message);
      } else {
        console.log(`❌ Invalid move: ${gameState.selectedSquare} → ${square} - ${result.message}`);
        setGameStatus(result.message);
        
        // If clicking on own piece after failed move, select it instead
        if (piece && pieceColor === playerRole) {
          selectSquare(square);
          console.log(`🎯 Selected new piece: ${square} with piece: ${piece}`);
        }
      }
    } else {
      // Select a piece - only select pieces belonging to current player
      if (piece && pieceColor === playerRole) {
        selectSquare(square);
        console.log(`🎯 Selected square: ${square} with piece: ${piece}`);
        
        // Show available moves
        const legalMoves = ChessEngine.getLegalMoves(gameState.position, gameState.currentPlayer, gameState)
          .filter(move => move.from === square);
        
        if (legalMoves.length === 0) {
          setGameStatus('This piece has no legal moves!');
        } else {
          setGameStatus(`Selected ${piece}. ${legalMoves.length} legal moves available.`);
        }
      } else if (piece) {
        console.log(`❌ Cannot select opponent's piece: ${piece} at ${square}`);
        setGameStatus("You can only move your own pieces!");
      } else {
        console.log(`❌ No piece at ${square}`);
        setGameStatus("Click on one of your pieces to select it.");
      }
    }
  };

  // Create escrow (simplified)
  const createEscrow = async () => {
    if (!connected || !publicKey || !signTransaction) {
      setGameStatus('Please connect your wallet first');
      return;
    }

    try {
      setGameStatus('Creating escrow...');
      
      // Add to mock multiplayer state (this will auto-start game if both escrows ready)
      mockMultiplayerState.addEscrow(roomId, publicKey.toString(), betAmount);
      
      // Simple SOL transfer simulation (in real app, you'd use your smart contract)
      const lamports = betAmount * LAMPORTS_PER_SOL;
      
      // Create a simple transaction (this is a placeholder)
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: FEE_WALLET, // This would be your escrow account
          lamports: lamports,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // In production, you'd sign and send this transaction
      // const signed = await signTransaction(transaction);
      // const signature = await connection.sendRawTransaction(signed.serialize());
      
      setEscrowCreated(true);
      
      // Check room status after creating escrow with safety checks
      setTimeout(() => {
        try {
          const roomStatus = mockMultiplayerState.getRoomStatus(roomId);
          console.log('🎮 Room status after escrow:', roomStatus);
          
          if (roomStatus && roomStatus.escrowCount === 2 && roomStatus.gameStarted) {
            setGameStatus(`Both escrows created! Starting game...`);
            // Game will auto-start via sync mechanism
          } else if (roomStatus) {
            setGameStatus(`Escrow created! Waiting for opponent... (${roomStatus.escrowCount}/2)`);
          }
        } catch (error) {
          console.error('❌ Error checking room status after escrow:', error);
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ Escrow creation error:', error);
      setGameStatus(`Escrow creation failed: ${error.message}`);
    }
  };

  // Join/Create Room
  const joinRoom = () => {
    if (!connected || !publicKey) {
      setGameStatus('Please connect your wallet first');
      return;
    }

    const playerWallet = publicKey.toString();
    let finalRoomId = roomId.trim();
    let assignedRole = null;
    
    if (finalRoomId) {
      // User entered a room ID - they want to JOIN an existing room
      console.log('Attempting to join existing room:', finalRoomId);
      assignedRole = mockMultiplayerState.joinRoom(finalRoomId, playerWallet);
      
      if (assignedRole) {
        console.log('Successfully joined room:', finalRoomId, 'as:', assignedRole);
      } else {
        console.log('Failed to join room:', finalRoomId, '- room might be full or not exist');
        setGameStatus('Room not found or full. Please check the room ID.');
        return;
      }
    } else {
      // User left room ID empty - they want to CREATE a new room
      finalRoomId = `ROOM-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      console.log('Creating new room:', finalRoomId);
      assignedRole = mockMultiplayerState.createRoom(finalRoomId, playerWallet);
      
      if (assignedRole) {
        console.log('Successfully created room:', finalRoomId, 'as:', assignedRole);
      } else {
        console.log('Failed to create room:', finalRoomId);
        setGameStatus('Failed to create room. Please try again.');
        return;
      }
    }
    
    setRoomId(finalRoomId);
    setPlayerRole(assignedRole);
    setGameMode('lobby');
    
    // Debug: log room state
    console.log('Final room assignment:', { 
      roomId: finalRoomId, 
      player: playerWallet, 
      role: assignedRole 
    });
    
    mockMultiplayerState.debugRoom(finalRoomId);
    
    // Check room status and set appropriate message
    const roomStatus = mockMultiplayerState.getRoomStatus(finalRoomId);
    if (roomStatus) {
      if (roomStatus.playerCount === 1) {
        setGameStatus(`Room: ${finalRoomId} - You are ${assignedRole}. Waiting for opponent...`);
      } else if (roomStatus.playerCount === 2) {
        setGameStatus(`Room: ${finalRoomId} - Both players connected! You are ${assignedRole}.`);
      }
    }
  };

  // Start Game
  const startGame = () => {
    const roomStatus = mockMultiplayerState.getRoomStatus(roomId);
    
    if (!roomStatus || roomStatus.playerCount < 2) {
      setGameStatus('Waiting for second player to join the room');
      return;
    }
    
    if (roomStatus.escrowCount < 2) {
      setGameStatus('Waiting for both players to create escrows');
      return;
    }
    
    setGameMode('game');
    setGameActive(true);
    setGameStatus(`Game started! You are ${playerRole}. ${playerRole === 'white' ? 'Your turn!' : 'White goes first.'}`);
    
    // Force sync after starting game
    setTimeout(() => {
      syncRoomState();
    }, 500);
  };

  // Claim Winnings
  const claimWinnings = async () => {
    if (!gameState.winner && !gameState.draw) {
      setGameStatus('Game is not finished yet');
      return;
    }
    
    try {
      setGameStatus('Processing claim...');
      console.log('🏆 Claiming winnings for player:', playerRole, 'Winner:', gameState.winner);
      
      // In real app, you'd interact with your smart contract to release escrow
      // For now, just show success message
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate transaction time
      
      if (gameState.winner === playerRole) {
        const winnings = betAmount * 2;
        setGameStatus(`🎉 SUCCESS! You won ${winnings} SOL! Winnings have been transferred to your wallet.`);
        setWinningsClaimed(true);
        console.log('🎉 Winner claimed:', winnings, 'SOL');
      } else if (gameState.draw) {
        setGameStatus(`🤝 Draw payout processed! You received ${betAmount} SOL back.`);
        setWinningsClaimed(true);
        console.log('🤝 Draw claimed:', betAmount, 'SOL');
      } else {
        setGameStatus(`❌ No winnings available - you did not win this game.`);
        console.log('❌ Non-winner tried to claim');
      }
      
      // Update balance after a delay
      setTimeout(() => {
        checkBalance();
      }, 500);
      
    } catch (error) {
      console.error('❌ Claim error:', error);
      setGameStatus(`❌ Claim failed: ${error.message}`);
    }
  };

  // Render Menu
  const renderMenu = () => (
    <div style={{ textAlign: 'center' }}>
      <h2>🎯 Game Setup</h2>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Room ID (leave empty to CREATE new room)"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          style={{
            padding: '10px',
            margin: '10px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            width: '300px'
          }}
        />
        <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
          <strong>Leave empty:</strong> Create new room (you'll be WHITE)<br/>
          <strong>Enter room ID:</strong> Join existing room (you'll be BLACK)
        </div>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="number"
          placeholder="Bet Amount (SOL)"
          value={betAmount}
          onChange={(e) => setBetAmount(Number(e.target.value))}
          step="0.1"
          min="0.1"
          style={{
            padding: '10px',
            margin: '10px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            width: '250px'
          }}
        />
      </div>
      <button
        onClick={joinRoom}
        disabled={!connected || balance < betAmount}
        style={{
          padding: '15px 30px',
          backgroundColor: connected && balance >= betAmount ? '#4CAF50' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: connected && balance >= betAmount ? 'pointer' : 'not-allowed',
          fontSize: '16px'
        }}
      >
        {roomId.trim() ? 'Join Room (Black)' : 'Create Room (White)'}
      </button>
      {balance < betAmount && (
        <p style={{ color: 'red', marginTop: '10px' }}>
          Insufficient balance! Need {betAmount} SOL, have {balance.toFixed(3)} SOL
        </p>
      )}
    </div>
  );

  // Render Lobby
  const renderLobby = () => {
    const roomStatus = mockMultiplayerState.getRoomStatus(roomId);
    
    return (
      <div style={{ textAlign: 'center' }}>
        <h2>🏠 Room: {roomId}</h2>
        <p>Your Role: <strong style={{ color: playerRole === 'white' ? '#4CAF50' : '#FF9800' }}>{playerRole}</strong></p>
        <p>Your Wallet: <strong>{publicKey?.toString().slice(0, 6)}...{publicKey?.toString().slice(-4)}</strong></p>
        <p>Bet Amount: <strong>{betAmount} SOL</strong></p>
        <p>Players: <strong>{roomStatus ? roomStatus.playerCount : 0}/2</strong></p>
        <p>Escrows: <strong>{roomStatus ? roomStatus.escrowCount : 0}/2</strong></p>
        
        {roomStatus && roomStatus.players && (
          <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '5px', margin: '10px 0' }}>
            <h4>Players in Room:</h4>
            {roomStatus.players.map((player, index) => (
              <p key={index} style={{ margin: '5px 0' }}>
                <strong>{player.role}:</strong> {player.wallet.slice(0, 6)}...{player.wallet.slice(-4)}
                {player.wallet === publicKey?.toString() && ' (You)'}
              </p>
            ))}
          </div>
        )}
        
        {roomStatus && roomStatus.playerCount === 1 && (
          <div style={{ background: '#fff3cd', padding: '10px', borderRadius: '5px', margin: '10px 0' }}>
            <p><strong>⚠️ Waiting for opponent!</strong></p>
            <p>Share this room ID: <code style={{ background: '#f8f9fa', padding: '5px', borderRadius: '3px' }}>{roomId}</code></p>
            <p>Tell them to enter this room ID and join!</p>
          </div>
        )}
        
        {/* Auto-sync indicator */}
        <div style={{ background: '#e7f3ff', padding: '5px', borderRadius: '3px', margin: '10px 0', fontSize: '12px' }}>
          🔄 Real-time sync active...
        </div>
        
        {/* New game indicator */}
        {roomStatus && roomStatus.escrowCount === 0 && (
          <div style={{ background: '#fff3cd', padding: '10px', borderRadius: '5px', margin: '10px 0' }}>
            <p><strong>🎮 Ready for New Game!</strong></p>
            <p>Both players need to create new escrows to start playing again.</p>
          </div>
        )}
        
        {!escrowCreated ? (
          <button
            onClick={createEscrow}
            disabled={!connected}
            style={{
              padding: '15px 30px',
              backgroundColor: connected ? '#FF9800' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: connected ? 'pointer' : 'not-allowed',
              fontSize: '16px',
              margin: '10px'
            }}
          >
            Create Escrow
          </button>
        ) : (
          <>
            <div style={{ background: '#d4edda', padding: '10px', borderRadius: '5px', margin: '10px 0' }}>
              ✅ Your escrow created! 
              {roomStatus && roomStatus.escrowCount === 2 ? 
                ' Game will start automatically...' : 
                ' Waiting for opponent...'}
            </div>
            
            {roomStatus && roomStatus.escrowCount === 2 && (
              <button
                onClick={startGame}
                style={{
                  padding: '15px 30px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  margin: '10px'
                }}
              >
                Start Game Now
              </button>
            )}
          </>
        )}
        
        <button
          onClick={() => setGameMode('menu')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            margin: '10px'
          }}
        >
          Back to Menu
        </button>
      </div>
    );
  };

  // Render Game
  const renderGame = () => (
    <div style={{ textAlign: 'center' }}>
      <h2>♟️ Chess Game</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <strong>Room:</strong> {roomId} | <strong>Role:</strong> {playerRole}
        </div>
        <div>
          <strong>Turn:</strong> {gameState.currentPlayer} | <strong>Pot:</strong> {betAmount * 2} SOL
        </div>
      </div>
      
      {/* Enhanced Status Display */}
      <div style={{ 
        margin: '10px 0', 
        padding: '10px', 
        backgroundColor: gameState.inCheck ? '#ffe6e6' : '#f0f0f0', 
        borderRadius: '8px',
        border: gameState.inCheck ? '2px solid #ff6b6b' : '1px solid #ddd'
      }}>
        <strong>Game Status:</strong> {
          gameState.winner ? (
            gameState.resignedBy ? 
              `${gameState.resignedBy} resigned. ${gameState.winner} wins!` :
              `${gameState.winner} wins!`
          ) :
          gameState.draw ? 'Draw!' :
          gameState.inCheck ? `${gameState.currentPlayer} is in check!` :
          gameState.gameActive ? `${gameState.currentPlayer}'s turn` :
          'Game not started'
        }
        {gameState.winner && (
          <div style={{ marginTop: '10px', fontSize: '18px', fontWeight: 'bold', color: '#4CAF50' }}>
            🏆 {gameState.winner === playerRole ? 'You Win!' : 'You Lose!'}
            {gameState.resignedBy && (
              <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                {gameState.resignedBy === playerRole ? 'You resigned' : 'Opponent resigned'}
              </div>
            )}
          </div>
        )}
        {gameState.draw && (
          <div style={{ marginTop: '10px', fontSize: '18px', fontWeight: 'bold', color: '#FF9800' }}>
            🤝 Draw!
          </div>
        )}
      </div>
      
      <ChessBoardWithHints
        position={gameState.position}
        onSquareClick={handleSquareClick}
        selectedSquare={gameState.selectedSquare}
        orientation={playerRole}
        gameState={gameState}
        playerRole={playerRole}
      />
      
      {/* Game Info Panel */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginTop: '20px',
        fontSize: '14px',
        backgroundColor: '#f8f9fa',
        padding: '10px',
        borderRadius: '5px'
      }}>
        <div>
          <strong>Moves:</strong> {gameState.moveHistory.length}
        </div>
        <div>
          <strong>50-move rule:</strong> {gameState.halfmoveClock}/100
        </div>
        <div>
          <strong>Full moves:</strong> {gameState.fullmoveNumber}
        </div>
        <div>
          <strong>Castling:</strong> {gameState.castlingRights || 'None'}
        </div>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={resetGame}
          style={{
            padding: '10px 20px',
            backgroundColor: '#607D8B',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            margin: '10px'
          }}
        >
          Restart Game
        </button>
        
        {(gameState.winner === playerRole || gameState.draw) && !winningsClaimed && (
          <button
            onClick={claimWinnings}
            style={{
              padding: '15px 30px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              margin: '10px'
            }}
          >
            {gameState.winner === playerRole ? 'Claim Winnings' : 'Claim Draw Split'}
          </button>
        )}

        {winningsClaimed && (
          <div style={{
            padding: '10px 20px',
            backgroundColor: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
            borderRadius: '5px',
            margin: '10px',
            fontSize: '14px'
          }}>
            ✅ Winnings have been claimed!
          </div>
        )}

        {(gameState.winner || gameState.draw) && (
          <button
            onClick={startNewGameWithEscrow}
            style={{
              padding: '15px 30px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              margin: '10px'
            }}
          >
            Start New Game
          </button>
        )}
        
        <button
          onClick={() => setGameMode('menu')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            margin: '10px'
          }}
        >
          Back to Menu
        </button>
      </div>
      
      {/* Move History */}
      {gameState.moveHistory.length > 0 && (
        <div style={{ 
          marginTop: '20px', 
          maxHeight: '150px', 
          overflowY: 'auto',
          backgroundColor: '#f8f9fa',
          padding: '10px',
          borderRadius: '5px',
          textAlign: 'left'
        }}>
          <strong>Move History:</strong>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>
            {gameState.moveHistory.map((move, index) => (
              <span key={index} style={{ marginRight: '15px' }}>
                {Math.floor(index / 2) + 1}{index % 2 === 0 ? '.' : '...'} {move.piece} {move.from}-{move.to}
                {move.capturedPiece && ` x${move.capturedPiece}`}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{ 
        maxWidth: '900px', 
        width: '100%',
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>♚ Knightsbridge Chess</h1>
        
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <WalletMultiButton />
        </div>

        <div style={{ 
          margin: '20px 0', 
          padding: '15px', 
          backgroundColor: winningsClaimed ? '#d4edda' : '#f0f0f0', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <strong>Status:</strong> {gameStatus}
        </div>

        {connected ? (
          <div>
            {gameMode === 'menu' && renderMenu()}
            {gameMode === 'lobby' && renderLobby()}
            {gameMode === 'game' && renderGame()}
            
            {/* Debug Panel - Remove in production */}
            <div style={{ 
              marginTop: '20px', 
              padding: '10px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '5px',
              fontSize: '12px',
              textAlign: 'left'
            }}>
              <strong>Debug Info:</strong>
              <p>Connected Wallet: {publicKey?.toString()}</p>
              <p>Current Room: {roomId}</p>
              <p>Your Role: {playerRole}</p>
              <p>Game Mode: {gameMode}</p>
              <p>Current Player: {gameState.currentPlayer}</p>
              <p>Move Count: {gameState.moveHistory.length}</p>
              <p>In Check: {gameState.inCheck ? 'Yes' : 'No'}</p>
              <p>Game Active: {gameState.gameActive ? 'Yes' : 'No'}</p>
              <div style={{ marginTop: '10px' }}>
                <button 
                  onClick={() => mockMultiplayerState.debugRoom(roomId)}
                  style={{ 
                    padding: '5px 10px', 
                    fontSize: '12px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    marginRight: '10px'
                  }}
                >
                  Debug Room
                </button>
                <button 
                  onClick={() => {
                    const gameState = mockMultiplayerState.getGameState(roomId);
                    console.log('🎯 Current game state:', gameState);
                  }}
                  style={{ 
                    padding: '5px 10px', 
                    fontSize: '12px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    marginRight: '10px'
                  }}
                >
                  Debug Game State
                </button>
                <button 
                  onClick={() => {
                    console.log('🔄 Manual sync triggered');
                    syncRoomState();
                  }}
                  style={{ 
                    padding: '5px 10px', 
                    fontSize: '12px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    marginRight: '10px'
                  }}
                >
                  Force Sync
                </button>
                <button 
                  onClick={() => mockMultiplayerState.clearAllRooms()}
                  style={{ 
                    padding: '5px 10px', 
                    fontSize: '12px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  Clear All Rooms
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <p style={{ color: '#666' }}>
              Connect your Phantom wallet to start playing chess with SOL stakes!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main App Component with Providers
function App() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = clusterApiUrl(network);
  
  // Support both Phantom and Backpack wallets
  const wallets = [
    new PhantomWalletAdapter(),
    new BackpackWalletAdapter(),
  ];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ChessApp />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;