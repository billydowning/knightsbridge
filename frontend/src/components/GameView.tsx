/**
 * Game View Component
 * Main chess game interface with board, status, and game controls
 */

import React from 'react';
import { ChessBoard } from './ChessBoard';
import { ChatBox, type ChatMessage } from './ChatBox';
import { useTheme } from '../App';
import { useTextSizes, useIsMobile, useChessBoardConfig, useIsDesktopLayout } from '../utils/responsive';
import type { GameState } from '../types';

export interface GameViewProps {
  roomId: string;
  playerRole: string;
  gameState: GameState;
  onSquareClick: (square: string) => void;
  onSendChatMessage?: (message: string) => void;
  chatMessages: ChatMessage[];
  onResignGame?: () => void;
  onClaimWinnings?: () => void;
  onStartNewGame?: () => void;
  onBackToMenu?: () => void;
  winningsClaimed: boolean;
  isLoading: boolean;
  betAmount: number;
}

export const GameView: React.FC<GameViewProps> = ({
  roomId,
  playerRole,
  gameState,
  onSquareClick,
  onSendChatMessage,
  chatMessages,
  onResignGame,
  onClaimWinnings,
  onStartNewGame,
  onBackToMenu,
  winningsClaimed,
  isLoading,
  betAmount
}) => {
  const { theme } = useTheme();
  const textSizes = useTextSizes();
  const isMobile = useIsMobile();
  const { boardSize } = useChessBoardConfig();
  const isDesktopLayout = useIsDesktopLayout();

  const canClaimWinnings = gameState.winner && gameState.winner === playerRole && !winningsClaimed;
  const isGameOver = gameState.winner || gameState.draw;

  return (
    <div style={{ 
      padding: isMobile ? '10px' : '20px',
      maxWidth: '100vw',
      overflow: 'hidden'
    }}>
      {/* Game Header */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: isMobile ? '15px' : '20px',
        backgroundColor: theme.surface,
        padding: isMobile ? '15px' : '20px',
        borderRadius: '8px',
        border: `1px solid ${theme.border}`,
        width: isDesktopLayout ? '800px' : '95%',
        margin: isDesktopLayout ? '0 auto 20px auto' : '0 auto 15px auto'
      }}>
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: isMobile ? '8px' : '15px',
          fontSize: textSizes.body
        }}>
          <div style={{ textAlign: 'center', color: theme.text }}>
            <strong>Room:</strong><br/>
            {roomId}
          </div>
          <div style={{ textAlign: 'center', color: theme.text }}>
            <strong>Bet:</strong><br/>
            {betAmount} SOL
          </div>
          <div style={{ textAlign: 'center', color: theme.text }}>
            <strong>Turn:</strong><br/>
            {gameState.currentPlayer.charAt(0).toUpperCase() + gameState.currentPlayer.slice(1)}
          </div>
          <div style={{ textAlign: 'center', color: theme.text }}>
            <strong>Status:</strong><br/>
            {gameState.draw 
              ? 'Draw'
              : gameState.winner 
                ? `${gameState.winner.charAt(0).toUpperCase() + gameState.winner.slice(1)} Wins! 🎉`
                : gameState.gameActive ? 'Active' : 'Game Over'
            }
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div style={{ 
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '15px' : '20px',
        alignItems: isMobile ? 'center' : 'flex-start',
        justifyContent: 'center',
        width: isDesktopLayout ? '800px' : '95%',
        margin: '0 auto'
      }}>
        
        {/* Chess Board */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flex: isMobile ? 'none' : '1'
        }}>
          <ChessBoard
            position={gameState.position}
            onSquareClick={onSquareClick}
            selectedSquare={gameState.selectedSquare}
            orientation={playerRole === 'white' ? 'white' : 'black'}
            gameState={gameState}
            playerRole={playerRole}
            disabled={!gameState.gameActive || isLoading}
          />
        </div>

        {/* Chat Box */}
        {onSendChatMessage && (
          <div style={{
            width: isMobile ? '100%' : '300px',
            height: isMobile ? '200px' : `${boardSize}px`,
            minHeight: isMobile ? '200px' : `${boardSize}px`,
            flex: isMobile ? 'none' : '0 0 300px'
          }}>
            <ChatBox
              roomId={roomId}
              playerRole={playerRole}
              messages={chatMessages}
              onSendMessage={onSendChatMessage}
            />
          </div>
        )}
      </div>
      
      {/* Game Info Panel */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: isMobile ? '10px' : '15px',
        marginTop: isMobile ? '15px' : '20px',
        fontSize: textSizes.body,
        backgroundColor: theme.surface,
        padding: isMobile ? '12px' : '15px',
        borderRadius: '8px',
        color: theme.text,
        width: isDesktopLayout ? '800px' : '95%',
        margin: `${isMobile ? '15px' : '20px'} auto`
      }}>
        <div style={{ textAlign: 'center', color: theme.text }}>
          <strong>Moves</strong><br/>
          {gameState.moveHistory.length}
        </div>
        <div style={{ textAlign: 'center', color: theme.text }}>
          <strong>50-move rule</strong><br/>
          {gameState.halfmoveClock}/100
        </div>
        <div style={{ textAlign: 'center', color: theme.text }}>
          <strong>Full moves</strong><br/>
          {gameState.moveHistory.length === 0 ? 0 : gameState.fullmoveNumber}
        </div>
        <div style={{ textAlign: 'center', color: theme.text }}>
          <strong>Castling</strong><br/>
          {gameState.castlingRights || 'None'}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div style={{ 
        marginTop: isMobile ? '20px' : '30px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: isMobile ? '8px' : '12px',
        justifyContent: 'center'
      }}>
        {/* Claim Winnings Button */}
        {canClaimWinnings && (
          <button
            onClick={onClaimWinnings}
            disabled={isLoading}
            style={{
              padding: isMobile ? '10px 20px' : '12px 24px',
              backgroundColor: isLoading ? theme.border : theme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: textSizes.body,
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            {isLoading ? '⏳ Processing...' : '💰 Claim Winnings'}
          </button>
        )}

        {/* Resign Button */}
        {gameState.gameActive && !isGameOver && onResignGame && (
          <button
            onClick={onResignGame}
            style={{
              padding: isMobile ? '10px 20px' : '12px 24px',
              backgroundColor: theme.accent,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: textSizes.body,
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            🏳️ Resign
          </button>
        )}

        {/* New Game Button */}
        {isGameOver && onStartNewGame && (
          <button
            onClick={onStartNewGame}
            style={{
              padding: isMobile ? '10px 20px' : '12px 24px',
              backgroundColor: theme.secondary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: textSizes.body,
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            🎮 New Game
          </button>
        )}

        {/* Back to Menu Button */}
        {onBackToMenu && !gameState.gameActive && (
          <button
            onClick={onBackToMenu}
            style={{
              padding: isMobile ? '10px 20px' : '12px 24px',
              backgroundColor: theme.surface,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: textSizes.body,
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            ← Back to Menu
          </button>
        )}
      </div>
    </div>
  );
};

export default GameView;