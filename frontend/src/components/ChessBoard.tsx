/**
 * Chess Board Component with Enhanced Visual Feedback
 * Displays an interactive chess board with legal move highlighting, animations, and improved UX
 */

import React, { useMemo, useCallback } from 'react';
import { ChessEngine } from '../engine/chessEngine';
import { useChessOptimizations } from '../hooks/useChessOptimizations';
import { useRenderPerformance } from '../utils/performance';
import { useChessBoardConfig } from '../utils/responsive';
import type { GameState, Position } from '../types';

// Convert piece text strings to Unicode symbols
const convertPieceToUnicode = (piece: string): string => {
  const pieceMap: { [key: string]: string } = {
    'white-king': '♔',
    'white-queen': '♕',
    'white-rook': '♖',
    'white-bishop': '♗',
    'white-knight': '♘',
    'white-pawn': '♙',
    'black-king': '♚',
    'black-queen': '♛',
    'black-rook': '♜',
    'black-bishop': '♝',
    'black-knight': '♞',
    'black-pawn': '♟'
  };
  
  return pieceMap[piece] || piece; // Return original if not found
};

export interface ChessBoardProps {
  position: Position;
  onSquareClick: (square: string) => void;
  selectedSquare: string | null;
  orientation?: 'white' | 'black';
  gameState: GameState;
  playerRole: string;
  disabled?: boolean;
  lastMove?: { from: string; to: string } | null;
}

interface SquareProps {
  square: string;
  piece: string;
  isLight: boolean;
  isSelected: boolean;
  isLegalMove: boolean;
  isInCheck: boolean;
  isLastMove: boolean;
  onClick: () => void;
  disabled?: boolean;
  squareSize: number;
  fontSize: string;
}

/**
 * Individual chess square component with enhanced styling
 */
const ChessSquare: React.FC<SquareProps> = React.memo(({
  square,
  piece,
  isLight,
  isSelected,
  isLegalMove,
  isInCheck,
  isLastMove,
  onClick,
  disabled = false,
  squareSize,
  fontSize
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const getBackgroundColor = useCallback((): string => {
    if (isInCheck) return '#ff6b6b';
    if (isSelected) return '#ffd700';
    if (isLastMove) return '#ffeb3b';
    if (isLegalMove) return isHovered ? '#7cb342' : '#90EE90';
    if (isHovered) return isLight ? '#e8d5b5' : '#a67c53';
    return isLight ? '#f0d9b5' : '#b58863';
  }, [isInCheck, isSelected, isLastMove, isLegalMove, isHovered, isLight]);

  const getCursor = useCallback((): string => {
    if (disabled) return 'not-allowed';
    return 'pointer';
  }, [disabled]);

  const getPieceStyle = useCallback((): React.CSSProperties => {
    // Convert piece to Unicode first if needed
    const unicodePiece = convertPieceToUnicode(piece);
    
    // Determine if piece is white or black
    const isWhitePiece = ['♔', '♕', '♖', '♗', '♘', '♙'].includes(unicodePiece);
    const isBlackPiece = ['♚', '♛', '♜', '♝', '♞', '♟'].includes(unicodePiece);
    
    // Calculate piece size as 60% of square size to prevent overflow
    const pieceSize = Math.floor(squareSize * 0.6);
    
    const baseStyle: React.CSSProperties = {
      fontSize: `${pieceSize}px`,
      fontWeight: 'bold',
      textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
      transition: 'transform 0.2s ease',
      filter: disabled ? 'grayscale(50%)' : 'none',
      lineHeight: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%'
    };

    // Apply color based on piece type
    if (isWhitePiece) {
      baseStyle.color = '#f8f8f8'; // Off-white for better visibility
      baseStyle.textShadow = '2px 2px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8)'; // Strong dark shadow and outline
    } else if (isBlackPiece) {
      baseStyle.color = '#1a1a1a'; // Dark gray instead of pure black
      baseStyle.textShadow = '2px 2px 4px rgba(255,255,255,0.4), 0 0 2px rgba(255,255,255,0.6)'; // Light shadow and outline
    }

    if (isHovered && !disabled) {
      baseStyle.transform = 'scale(1.1)';
    }

    return baseStyle;
  }, [isHovered, disabled, piece, squareSize]);

  // Calculate indicator size based on square size
  const indicatorSize = Math.max(8, squareSize * 0.3);

  return (
    <div
      className={`chess-square ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''}`}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: `${squareSize}px`,
        height: `${squareSize}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: getBackgroundColor(),
        cursor: getCursor(),
        border: '1px solid #999',
        transition: 'all 0.2s ease',
        position: 'relative',
        opacity: disabled ? 0.6 : 1,
        userSelect: 'none',
        boxShadow: isSelected ? 'inset 0 0 10px rgba(255, 215, 0, 0.5)' : 'none',
        padding: '2px',
        boxSizing: 'border-box'
      }}
      title={`${square}${piece ? ` - ${piece}` : ''}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`${square}${piece ? ` - ${piece}` : ' - empty square'}`}
      aria-pressed={isSelected}
    >
      {piece && (
        <span style={getPieceStyle()}>
          {convertPieceToUnicode(piece)}
        </span>
      )}
      {isLegalMove && !piece && (
        <div
          style={{
            width: `${indicatorSize}px`,
            height: `${indicatorSize}px`,
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 255, 0, 0.5)',
            border: `2px solid rgba(0, 255, 0, 0.8)`,
          }}
        />
      )}
    </div>
  );
});

ChessSquare.displayName = 'ChessSquare';

/**
 * Main chess board component with performance optimizations
 */
export const ChessBoard: React.FC<ChessBoardProps> = React.memo(({
  position,
  onSquareClick,
  selectedSquare,
  orientation = 'white',
  gameState,
  playerRole,
  disabled = false,
  lastMove
}) => {
  // Performance monitoring
  useRenderPerformance('ChessBoard');

  // Chess optimizations
  const { validateMove, getLegalMovesForSquare } = useChessOptimizations(gameState);

  // Responsive configuration
  const { boardSize, squareSize, fontSize } = useChessBoardConfig();

  // Memoize the board squares to prevent unnecessary re-renders
  const boardSquares = useMemo(() => {
    const squares = [];
    const files = orientation === 'white' 
      ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
      : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
    const ranks = orientation === 'white' 
      ? ['8', '7', '6', '5', '4', '3', '2', '1'] 
      : ['1', '2', '3', '4', '5', '6', '7', '8'];
    
    for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
      const rank = ranks[rankIndex];
      for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
        const file = files[fileIndex];
        const square = `${file}${rank}`;
        const piece = position[square];
        
        // Determine square color
        const isLightSquare = (fileIndex + rankIndex) % 2 === 0;
        
        // Determine if square is selected, legal move, or last move
        const isSelected = selectedSquare === square;
        const isLegalMove = getLegalMovesForSquare(selectedSquare || '').some(move => move.to === square);
        const isLastMove = lastMove ? (lastMove.from === square || lastMove.to === square) : false;
        const isInCheck = gameState.inCheck && ChessEngine.isKing(piece);
        
        squares.push({
          square,
          piece,
          isLight: isLightSquare,
          isSelected,
          isLegalMove,
          isInCheck,
          isLastMove
        });
      }
    }
    return squares;
  }, [position, selectedSquare, orientation, lastMove, gameState.inCheck, getLegalMovesForSquare]);

  // Memoize click handler to prevent unnecessary re-renders
  const handleSquareClick = useCallback((square: string) => {
    if (!disabled) {
      onSquareClick(square);
    }
  }, [onSquareClick, disabled]);

  const renderBoard = useCallback((): React.ReactElement[] => {
    return boardSquares.map(({ square, piece, isLight, isSelected, isLegalMove, isInCheck, isLastMove }) => (
      <ChessSquare
        key={square}
        square={square}
        piece={piece}
        isLight={isLight}
        isSelected={isSelected}
        isLegalMove={isLegalMove}
        isInCheck={isInCheck}
        isLastMove={isLastMove}
        onClick={() => handleSquareClick(square)}
        disabled={disabled}
        squareSize={squareSize}
        fontSize={fontSize}
      />
    ));
  }, [boardSquares, handleSquareClick, disabled, squareSize, fontSize]);

  return (
    <div
      className="chess-board"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        width: `${boardSize}px`,
        height: `${boardSize}px`,
        border: '3px solid #333',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        backgroundColor: '#333',
        maxWidth: '100%',
        maxHeight: '100%'
      }}
      role="grid"
      aria-label="Chess board"
    >
      {renderBoard()}
    </div>
  );
});

ChessBoard.displayName = 'ChessBoard';

/**
 * Board with rank and file labels
 */
export interface LabeledChessBoardProps extends ChessBoardProps {
  showLabels?: boolean;
}

export const LabeledChessBoard: React.FC<LabeledChessBoardProps> = ({
  showLabels = true,
  ...props
}) => {
  const { boardSize, squareSize } = useChessBoardConfig();
  
  const files = props.orientation === 'white' 
    ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
  const ranks = props.orientation === 'white' 
    ? ['8', '7', '6', '5', '4', '3', '2', '1'] 
    : ['1', '2', '3', '4', '5', '6', '7', '8'];

  if (!showLabels) {
    return <ChessBoard {...props} />;
  }

  const labelFontSize = Math.max(10, squareSize * 0.2);
  const labelOffset = Math.max(15, squareSize * 0.25);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <ChessBoard {...props} />
      
      {/* File labels (a-h) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        marginTop: '5px',
        paddingLeft: '4px',
        paddingRight: '4px',
        width: `${boardSize + 8}px` // board size + border
      }}>
        {files.map(file => (
          <span key={file} style={{ 
            fontSize: `${labelFontSize}px`, 
            fontWeight: 'bold',
            color: '#666',
            width: `${squareSize}px`,
            textAlign: 'center'
          }}>
            {file}
          </span>
        ))}
      </div>
      
      {/* Rank labels (1-8) */}
      <div style={{
        position: 'absolute',
        left: `-${labelOffset}px`,
        top: '4px',
        height: `${boardSize + 8}px`, // board size + border
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-around',
        alignItems: 'center'
      }}>
        {ranks.map(rank => (
          <span key={rank} style={{ 
            fontSize: `${labelFontSize}px`, 
            fontWeight: 'bold',
            color: '#666',
            height: `${squareSize}px`,
            display: 'flex',
            alignItems: 'center'
          }}>
            {rank}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ChessBoard;