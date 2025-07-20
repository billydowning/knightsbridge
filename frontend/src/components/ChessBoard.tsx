/**
 * Chess Board Component with Move Hints
 * Displays an interactive chess board with legal move highlighting and visual feedback
 */

import React from 'react';
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
}

interface SquareProps {
  square: string;
  piece: string;
  isLight: boolean;
  isSelected: boolean;
  isLegalMove: boolean;
  isInCheck: boolean;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Individual chess square component
 */
const ChessSquare: React.FC<SquareProps> = ({
  square,
  piece,
  isLight,
  isSelected,
  isLegalMove,
  isInCheck,
  onClick,
  disabled = false
}) => {
  const getBackgroundColor = (): string => {
    if (isInCheck) return '#ff6b6b';
    if (isSelected) return '#ffd700';
    if (isLegalMove) return '#90EE90';
    return isLight ? '#f0d9b5' : '#b58863';
  };

  const getCursor = (): string => {
    if (disabled) return 'not-allowed';
    return 'pointer';
  };

  return (
    <div
      className={`chess-square ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''}`}
      onClick={disabled ? undefined : onClick}
      style={{
        width: '60px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: getBackgroundColor(),
        cursor: getCursor(),
        fontSize: '2rem',
        border: '1px solid #999',
        transition: 'background-color 0.2s',
        position: 'relative',
        opacity: disabled ? 0.6 : 1,
        userSelect: 'none'
      }}
      title={`${square}${piece ? ` - ${piece}` : ''}`}
    >
      {piece}
      
      {/* Legal move indicator for empty squares */}
      {isLegalMove && !piece && (
        <div 
          style={{
            position: 'absolute',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 128, 0, 0.5)',
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
            backgroundColor: 'rgba(255, 0, 0, 0.7)',
          }}
          aria-label="Capture available"
        />
      )}
    </div>
  );
};

/**
 * Chess Board Component with Move Hints
 * Displays a complete chess board with legal move highlighting
 */
export const ChessBoard: React.FC<ChessBoardProps> = ({ 
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
        
        squares.push(
          <ChessSquare
            key={square}
            square={square}
            piece={piece}
            isLight={isLight}
            isSelected={isSelected}
            isLegalMove={isLegalMove}
            isInCheck={isInCheck}
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