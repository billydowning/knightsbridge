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
    // Imperial blue color scheme - elegant and sophisticated
    if (isInCheck) return '#e74c3c'; // Rich red for check
    if (isSelected) return '#f1c40f'; // Bright gold for selection
    if (isLastMove) return '#e67e22'; // Warm orange for last move
    if (isLegalMove) return isHovered ? '#27ae60' : '#52c41a'; // Rich greens for legal moves
    if (isHovered) return isLight ? '#ecf0f1' : '#2c3e50'; // Light hover colors
    
    // Imperial blue chess board colors - sophisticated and royal (always visible)
    return isLight ? '#ffffff' : '#2c3e50'; // Pure white and imperial blue
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
    
    // Calculate piece size as 70% of square size for larger, more visible pieces
    const pieceSize = Math.floor(squareSize * 0.7);
    
    const baseStyle: React.CSSProperties = {
      fontSize: `${pieceSize}px`,
      fontWeight: '900', // Extra bold for more presence
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth easing
      filter: disabled ? 'grayscale(50%)' : 'none',
      lineHeight: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      fontFamily: '"Segoe UI Symbol", "Noto Chess", "Chess Cases", serif', // Better chess fonts
      transform: isHovered && !disabled ? 'scale(1.05)' : 'scale(1)', // Subtle hover animation
      cursor: disabled ? 'not-allowed' : 'pointer'
    };

    // Apply refined styling based on piece type
    if (isWhitePiece) {
      baseStyle.color = '#ffffff'; // Pure white
      baseStyle.textShadow = `
        3px 3px 6px rgba(0,0,0,0.8),
        0 0 3px rgba(0,0,0,0.9),
        1px 1px 0 rgba(0,0,0,0.6),
        -1px -1px 0 rgba(0,0,0,0.6)
      `; // Multi-layered shadow for depth
      baseStyle.filter = disabled ? 'grayscale(50%)' : 'drop-shadow(2px 2px 4px rgba(0,0,0,0.4))';
    } else if (isBlackPiece) {
      baseStyle.color = '#2c3e50'; // Imperial blue to match board theme
      baseStyle.textShadow = `
        2px 2px 4px rgba(255,255,255,0.6),
        0 0 3px rgba(255,255,255,0.8),
        1px 1px 0 rgba(255,255,255,0.4),
        -1px -1px 0 rgba(255,255,255,0.4)
      `; // Strong white outline for visibility
      baseStyle.filter = disabled ? 'grayscale(50%)' : 'drop-shadow(2px 2px 4px rgba(255,255,255,0.3))';
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
        background: getBackgroundColor(), // Use solid color for better visibility
        cursor: getCursor(),
        border: isSelected ? '2px solid #f1c40f' : '1px solid rgba(52, 73, 94, 0.3)',
        borderRadius: '2px', // Subtle rounded corners
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        opacity: disabled ? 0.6 : 1,
        userSelect: 'none',
        boxShadow: isSelected 
          ? 'inset 0 0 15px rgba(241, 196, 15, 0.6), 0 0 10px rgba(241, 196, 15, 0.3)' 
          : isHovered 
            ? 'inset 0 2px 4px rgba(0,0,0,0.1), 0 2px 8px rgba(52, 73, 94, 0.15)'
            : 'inset 0 1px 2px rgba(52, 73, 94, 0.05)',
        padding: '1px',
        boxSizing: 'border-box',
        // Add very subtle texture overlay (minimal interference with base colors)
        backgroundImage: isLight 
          ? 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 70%)'
          : 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 70%)',
        transform: isSelected ? 'scale(1.02)' : 'scale(1)'
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
            background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
            border: '2px solid rgba(46, 204, 113, 0.8)',
            boxShadow: '0 2px 8px rgba(46, 204, 113, 0.3), inset 0 1px 2px rgba(255,255,255,0.3)',
            transition: 'all 0.2s ease',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)',
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