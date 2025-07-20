/**
 * Chess Board Component with Enhanced Visual Feedback
 * Displays an interactive chess board with legal move highlighting, animations, and improved UX
 */

import React, { useState, useEffect, useMemo } from 'react';
import ChessEngine from '../engine/chessEngine';
import type { GameState, Position } from '../types';

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
}

/**
 * Individual chess square component with enhanced styling
 */
const ChessSquare: React.FC<SquareProps> = ({
  square,
  piece,
  isLight,
  isSelected,
  isLegalMove,
  isInCheck,
  isLastMove,
  onClick,
  disabled = false
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getBackgroundColor = (): string => {
    if (isInCheck) return '#ff6b6b';
    if (isSelected) return '#ffd700';
    if (isLastMove) return '#ffeb3b';
    if (isLegalMove) return isHovered ? '#7cb342' : '#90EE90';
    if (isHovered) return isLight ? '#e8d5b5' : '#a67c53';
    return isLight ? '#f0d9b5' : '#b58863';
  };

  const getCursor = (): string => {
    if (disabled) return 'not-allowed';
    return 'pointer';
  };

  const getPieceStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
      transition: 'transform 0.2s ease',
      filter: disabled ? 'grayscale(50%)' : 'none',
    };

    if (isHovered && !disabled) {
      baseStyle.transform = 'scale(1.1)';
    }

    return baseStyle;
  };

  return (
    <div
      className={`chess-square ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''}`}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '60px',
        height: '60px',
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
      }}
      title={`${square}${piece ? ` - ${piece}` : ''}`}
      role="button"
      aria-label={`${square}${piece ? ` with ${piece}` : ' empty'}`}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span style={getPieceStyle()}>
        {piece}
      </span>
      
      {/* Legal move indicator for empty squares */}
      {isLegalMove && !piece && (
        <div 
          style={{
            position: 'absolute',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 128, 0, 0.6)',
            border: '2px solid rgba(0, 128, 0, 0.8)',
            animation: 'pulse 1.5s infinite',
          }} 
          aria-label="Legal move"
        />
      )}
      
      {/* Capture indicator for occupied squares */}
      {isLegalMove && piece && (
        <div 
          style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '15px',
            height: '15px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 0, 0, 0.6)',
            border: '2px solid rgba(255, 0, 0, 0.8)',
            animation: 'pulse 1.5s infinite',
          }}
          aria-label="Capture move"
        />
      )}

      {/* Square label for accessibility */}
      <span 
        style={{
          position: 'absolute',
          bottom: '2px',
          right: '2px',
          fontSize: '8px',
          color: isLight ? '#b58863' : '#f0d9b5',
          fontWeight: 'bold',
        }}
      >
        {square}
      </span>
    </div>
  );
};

/**
 * Chess Board Component with Move Hints
 * Displays a complete chess board with legal move highlighting
 */
export const ChessBoard: React.FC<ChessBoardProps> = React.memo(({ 
  position, 
  onSquareClick, 
  selectedSquare, 
  orientation = 'white', 
  gameState, 
  playerRole,
  disabled = false
}) => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = orientation === 'white' 
    ? ['8', '7', '6', '5', '4', '3', '2', '1'] 
    : ['1', '2', '3', '4', '5', '6', '7', '8'];
  
  // Get legal moves for selected piece
  const legalMoves = selectedSquare && gameState ? 
    ChessEngine.getLegalMoves(position, gameState.currentPlayer, gameState)
      .filter(move => move.from === selectedSquare)
      .map(move => move.to) : [];

  /**
   * Render all squares of the chess board
   */
  const renderBoard = (): React.ReactElement[] => {
    const squares: React.ReactElement[] = [];
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
                  const isLastMove = Boolean(gameState?.lastMove && gameState.lastMove.from === square && gameState.lastMove.to === square);
        
        squares.push(
          <ChessSquare
            key={square}
            square={square}
            piece={piece}
            isLight={isLight}
            isSelected={isSelected}
            isLegalMove={isLegalMove}
            isInCheck={isInCheck}
            isLastMove={isLastMove}
            onClick={() => onSquareClick(square)}
            disabled={disabled}
          />
        );
      }
    }
    
    return squares;
  };

  return (
    <div 
      style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(8, 60px)', 
        gridTemplateRows: 'repeat(8, 60px)',
        border: '4px solid #333',
        margin: '20px 0',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
      }}
      role="grid"
      aria-label={`Chess board, ${orientation} perspective`}
    >
      {renderBoard()}
    </div>
  );
};

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
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = props.orientation === 'white' 
    ? ['8', '7', '6', '5', '4', '3', '2', '1'] 
    : ['1', '2', '3', '4', '5', '6', '7', '8'];

  if (!showLabels) {
    return <ChessBoard {...props} />;
  }

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
        width: '488px' // 8 * 60px + 8px border
      }}>
        {files.map(file => (
          <span key={file} style={{ 
            fontSize: '12px', 
            fontWeight: 'bold',
            color: '#666',
            width: '60px',
            textAlign: 'center'
          }}>
            {file}
          </span>
        ))}
      </div>
      
      {/* Rank labels (1-8) */}
      <div style={{
        position: 'absolute',
        left: '-20px',
        top: '4px',
        height: '488px', // 8 * 60px + 8px border
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-around',
        alignItems: 'center'
      }}>
        {ranks.map(rank => (
          <span key={rank} style={{ 
            fontSize: '12px', 
            fontWeight: 'bold',
            color: '#666',
            height: '60px',
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