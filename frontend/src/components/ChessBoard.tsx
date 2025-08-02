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

// Custom SVG-based chess pieces for 100% consistency
const ChessPieceSVG: React.FC<{ piece: string; size: number; color: string; isHovered?: boolean; disabled?: boolean }> = ({ piece, size, color, isHovered = false, disabled = false }) => {
  const getPieceType = (piece: string) => {
    if (piece.includes('king')) return 'king';
    if (piece.includes('queen')) return 'queen';
    if (piece.includes('rook')) return 'rook';
    if (piece.includes('bishop')) return 'bishop';
    if (piece.includes('knight')) return 'knight';
    if (piece.includes('pawn')) return 'pawn';
    return 'pawn';
  };

  const isWhite = piece.includes('white');
  const pieceType = getPieceType(piece);
  const fillColor = isWhite ? '#ffffff' : '#1a1a1a';
  const strokeColor = isWhite ? '#1a1a1a' : '#ffffff';

  // Detailed, recognizable SVG paths for each piece type
  const getPiecePath = () => {
    switch (pieceType) {
      case 'king':
        return "M12 2L13 3L14 2L14 4L16 4L16 6L15 6L15 8L14 8L14 10L15 10L15 12L16 12L16 20L8 20L8 12L9 12L9 10L10 10L10 8L9 8L9 6L8 6L8 4L10 4L10 2L11 3L12 2ZM11 4L13 4L13 6L11 6L11 4Z";
      case 'queen':
        return "M6 4L7 2L8 4L9 2L10 4L11 2L12 4L13 2L14 4L15 2L16 4L17 2L18 4L16 6L15 6L15 8L14 8L14 10L15 10L15 12L16 12L16 20L8 20L8 12L9 12L9 10L10 10L10 8L9 8L9 6L8 6L6 4Z";
      case 'rook':
        return "M7 4L7 2L9 2L9 4L11 4L11 2L13 2L13 4L15 4L15 2L17 2L17 4L17 6L16 6L16 8L15 8L15 10L16 10L16 12L17 12L17 20L7 20L7 12L8 12L8 10L9 10L9 8L8 8L8 6L7 6L7 4Z";
      case 'bishop':
        return "M12 2C13 3 14 4 15 6C16 7 16 8 15 9L15 10L16 10L16 12L17 12L17 20L7 20L7 12L8 12L8 10L9 10L9 9C8 8 8 7 9 6C10 4 11 3 12 2ZM11 6L13 6L13 8L11 8L11 6Z";
      case 'knight':
        return "M8 4C9 3 10 2 12 2C13 2 14 3 15 4C16 5 16 6 15 7L16 8L16 10L17 10L17 12L18 12L18 20L6 20L6 12L7 12L7 10L8 10L8 8L9 8C8 7 8 6 8 5L8 4ZM10 6L12 6L12 8L10 8L10 6Z";
      case 'pawn':
        return "M12 4C13 4 14 5 14 6C14 7 13 8 12 8C11 8 10 7 10 6C10 5 11 4 12 4ZM10 10L14 10L15 12L16 12L16 20L8 20L8 12L9 12L10 10Z";
      default:
        return "M12 4C13 4 14 5 14 6C14 7 13 8 12 8C11 8 10 7 10 6C10 5 11 4 12 4ZM10 10L14 10L15 12L16 12L16 20L8 20L8 12L9 12L10 10Z";
    }
  };

  const getFilter = () => {
    if (disabled) return 'grayscale(70%) opacity(0.6)';
    if (isHovered) {
      return isWhite 
        ? 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.6)) brightness(1.1)' 
        : 'drop-shadow(0 0 6px rgba(0, 0, 0, 0.6)) brightness(1.2)';
    }
    return isWhite 
      ? 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.3))' 
      : 'drop-shadow(0 0 3px rgba(0, 0, 0, 0.4))';
  };

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      style={{ 
        display: 'block',
        filter: getFilter(),
        transform: isHovered && !disabled ? 'scale(1.12)' : 'scale(1)',
        transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      }}
    >
      <defs>
        <filter id={`shadow-${isWhite ? 'white' : 'black'}-${isHovered ? 'hover' : 'normal'}`}>
          <feDropShadow 
            dx="1" 
            dy="1" 
            stdDeviation={isHovered ? "2" : "1"} 
            floodColor={strokeColor} 
            floodOpacity={isHovered ? "1" : "0.8"}
          />
        </filter>
      </defs>
      <path
        d={getPiecePath()}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="0.5"
        strokeLinejoin="round"
        filter={`url(#shadow-${isWhite ? 'white' : 'black'}-${isHovered ? 'hover' : 'normal'})`}
      />
    </svg>
  );
};

// Fallback Unicode function for compatibility
const convertPieceToUnicode = (piece: string): string => {
  const pieceMap: { [key: string]: string } = {
    'white-king': '\u2654',
    'white-queen': '\u2655',
    'white-rook': '\u2656',
    'white-bishop': '\u2657',
    'white-knight': '\u2658',
    'white-pawn': '\u2659',
    'black-king': '\u265A',
    'black-queen': '\u265B',
    'black-rook': '\u265C',
    'black-bishop': '\u265D',
    'black-knight': '\u265E',
    'black-pawn': '\u265F'
  };
  
  return pieceMap[piece] || piece;
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
    // Enhanced color scheme for better visual appeal and contrast
    if (isInCheck) return '#e74c3c'; // Bright red for check
    if (isSelected) return '#f39c12'; // Rich golden orange for selection
    if (isLastMove) return '#e67e22'; // Warm orange for last move
    if (isLegalMove) return isHovered ? '#27ae60' : '#2ecc71'; // Vibrant greens for legal moves
    if (isHovered) return isLight ? '#f8f9fa' : '#34495e'; // Subtle hover colors
    
    // Elegant chess board colors with improved contrast
    return isLight ? '#f7f7f7' : '#34495e'; // Light cream and slate blue
  }, [isInCheck, isSelected, isLastMove, isLegalMove, isHovered, isLight]);

  const getCursor = useCallback((): string => {
    if (disabled) return 'not-allowed';
    return 'pointer';
  }, [disabled]);

  const getPieceStyle = useCallback((): React.CSSProperties => {
    // Simplified styling for SVG container
    return {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      cursor: disabled ? 'not-allowed' : 'pointer',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none'
    };
  }, [disabled]);

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
        background: getBackgroundColor(), // Use solid color for better visibility
        cursor: getCursor(),
        border: isSelected 
          ? '2px solid #f39c12' 
          : isLastMove 
            ? '2px solid #e67e22' 
            : isInCheck 
              ? '2px solid #e74c3c'
              : '1px solid rgba(52, 73, 148, 0.2)',
        borderRadius: '3px', // Slightly more rounded corners
        transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        position: 'relative',
        opacity: disabled ? 0.6 : 1,
        userSelect: 'none',
        boxShadow: isSelected 
          ? 'inset 0 0 0 1px rgba(243, 156, 18, 0.3), 0 4px 12px rgba(243, 156, 18, 0.4)' 
          : isLastMove
            ? 'inset 0 0 0 1px rgba(230, 126, 34, 0.3), 0 2px 8px rgba(230, 126, 34, 0.3)'
            : isInCheck
              ? 'inset 0 0 0 1px rgba(231, 76, 60, 0.4), 0 4px 12px rgba(231, 76, 60, 0.5)'
              : isLegalMove
                ? 'inset 0 0 0 1px rgba(46, 204, 113, 0.4), 0 2px 6px rgba(46, 204, 113, 0.3)'
                : isHovered 
                  ? 'inset 0 2px 4px rgba(0,0,0,0.15), 0 4px 8px rgba(52, 73, 148, 0.2)'
                  : 'inset 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(52, 73, 148, 0.1)',
        padding: '2px',
        boxSizing: 'border-box',
        // Enhanced texture overlay for depth
        backgroundImage: isLight 
          ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, transparent 100%)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, transparent 100%)',
        transform: isSelected ? 'scale(1.03)' : 'scale(1)'
      }}
      title={`${square}${piece ? ` - ${piece}` : ''}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`${square}${piece ? ` - ${piece}` : ' - empty square'}`}
      aria-pressed={isSelected}
    >
      {piece && (
        <div style={getPieceStyle()}>
          <ChessPieceSVG 
            piece={piece} 
            size={Math.floor(squareSize * 0.75)} 
            color={piece.includes('white') ? '#ffffff' : '#1a1a1a'}
            isHovered={isHovered}
            disabled={disabled}
          />
        </div>
      )}
      {isLegalMove && !piece && (
        <div
          style={{
            width: `${indicatorSize}px`,
            height: `${indicatorSize}px`,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
            border: '2px solid rgba(46, 204, 113, 0.9)',
            boxShadow: '0 3px 10px rgba(46, 204, 113, 0.4), inset 0 1px 3px rgba(255,255,255,0.4)',
            transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            transform: isHovered ? 'scale(1.2)' : 'scale(1)',
            opacity: isHovered ? 0.9 : 0.8,
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
        border: '4px solid #2c3e50', // Imperial blue border
        borderRadius: '12px', // More rounded corners
        overflow: 'hidden',
        boxShadow: `
          0 8px 32px rgba(44, 62, 80, 0.3),
          0 4px 16px rgba(44, 62, 80, 0.2),
          inset 0 2px 4px rgba(255,255,255,0.1)
        `, // Multi-layered shadow for depth
        background: `
          linear-gradient(145deg, #34495e 0%, #2c3e50 100%),
          radial-gradient(circle at 25% 25%, rgba(255,255,255,0.08) 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(52, 73, 94, 0.1) 0%, transparent 50%),
          url('/griffin-watermark.svg?v=1')
        `, // Imperial blue gradient with texture and subtle griffin watermark
        backgroundSize: 'cover, 100% 100%, 100% 100%, 40% 40%', // Gradient covers all, textures full size, watermark smaller and subtle
        backgroundPosition: 'center, center, center, center', // All centered
        backgroundRepeat: 'no-repeat, no-repeat, no-repeat, no-repeat', // No repeating
        maxWidth: '100%',
        maxHeight: '100%',
        position: 'relative'
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