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

  const showClaimButton = gameState.winner && gameState.winner === playerRole;
  const isGameOver = gameState.winner || gameState.draw;

  // Shared card style for consistency
  const cardStyle = {
    background: `linear-gradient(135deg, ${theme.surface} 0%, ${theme.background} 100%)`,
    borderRadius: isDesktopLayout ? '20px' : '16px',
    border: `1px solid ${theme.border}`,
    boxShadow: theme.shadow,
    width: isDesktopLayout ? '800px' : '95%',
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
    transition: 'all 0.3s ease'
  };

  // Shared button style for consistency
  const sharedButtonStyle = {
    padding: isDesktopLayout ? '16px 32px' : '12px 24px',
    borderRadius: '12px',
    border: 'none',
    fontSize: isDesktopLayout ? '16px' : '14px',
    fontWeight: '600' as const,
    cursor: 'pointer' as const,
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    minHeight: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    position: 'relative' as const,
    overflow: 'hidden' as const
  };

  // Get status info for display
  const getGameStatusInfo = () => {
    if (gameState.draw) {
      return { text: 'Draw Game', icon: '🤝', color: theme.accent };
    }
    if (gameState.winner) {
      const isWinner = gameState.winner === playerRole;
      return {
        text: isWinner ? 'You Won!' : 'You Lost',
        icon: isWinner ? '🎉' : '😞',
        color: isWinner ? theme.success : theme.error
      };
    }
    if (gameState.gameActive) {
      const isYourTurn = gameState.currentPlayer === playerRole;
      return {
        text: isYourTurn ? 'Your Turn' : 'Opponent\'s Turn',
        icon: isYourTurn ? '⏰' : '⏳',
        color: isYourTurn ? theme.primary : theme.textSecondary
      };
    }
    return { text: 'Game Over', icon: '🏁', color: theme.textSecondary };
  };

  const statusInfo = getGameStatusInfo();

  return (
    <div style={{ 
      padding: isDesktopLayout ? '2rem' : '1rem',
      paddingLeft: isDesktopLayout ? '2rem' : '1rem',
      paddingRight: isDesktopLayout ? '2rem' : '1rem',
      maxWidth: '100vw',
      overflowX: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* Enhanced Game Status Header */}
      <section style={{ 
        ...cardStyle,
        margin: isMobile ? '0 auto 1.5rem auto' : '0 auto 2rem auto',
        padding: isDesktopLayout ? '2rem' : '1.5rem',
        textAlign: 'center',
        background: `linear-gradient(135deg, ${statusInfo.color}12 0%, ${statusInfo.color}06 100%)`,
        border: `1px solid ${statusInfo.color}30`
      }}>
        {/* Status Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '1.5rem'
        }}>
          <span style={{ fontSize: isDesktopLayout ? '28px' : '24px' }}>{statusInfo.icon}</span>
          <h2 style={{ 
            margin: 0, 
            color: statusInfo.color,
            fontSize: isDesktopLayout ? '24px' : '20px',
            fontWeight: '700',
            letterSpacing: '-0.5px'
          }}>
            {statusInfo.text}
          </h2>
        </div>

        {/* Game Info Grid */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: isDesktopLayout ? '1.5rem' : '1rem'
        }}>
          <div style={{
            background: `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
            border: `1px solid ${theme.border}`,
            borderRadius: '12px',
            padding: isDesktopLayout ? '16px' : '12px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: isDesktopLayout ? '12px' : '10px',
              color: theme.textSecondary,
              fontWeight: '600',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Room
            </div>
            <div style={{
              fontSize: isDesktopLayout ? '14px' : '12px',
              color: theme.text,
              fontWeight: '600',
              fontFamily: 'monospace'
            }}>
              {roomId.length > 8 ? `${roomId.slice(0, 8)}...` : roomId}
            </div>
          </div>

          <div style={{
            background: `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
            border: `1px solid ${theme.border}`,
            borderRadius: '12px',
            padding: isDesktopLayout ? '16px' : '12px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: isDesktopLayout ? '12px' : '10px',
              color: theme.textSecondary,
              fontWeight: '600',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Stake
            </div>
            <div style={{
              fontSize: isDesktopLayout ? '14px' : '12px',
              color: theme.text,
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}>
              <span>💰</span>
              {betAmount} SOL
            </div>
          </div>

          <div style={{
            background: `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
            border: `1px solid ${theme.border}`,
            borderRadius: '12px',
            padding: isDesktopLayout ? '16px' : '12px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: isDesktopLayout ? '12px' : '10px',
              color: theme.textSecondary,
              fontWeight: '600',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Current Turn
            </div>
            <div style={{
              fontSize: isDesktopLayout ? '14px' : '12px',
              color: theme.text,
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}>
              <span>{gameState.currentPlayer === 'white' ? '♔' : '♚'}</span>
              {gameState.currentPlayer.charAt(0).toUpperCase() + gameState.currentPlayer.slice(1)}
            </div>
          </div>

          <div style={{
            background: `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
            border: `1px solid ${theme.border}`,
            borderRadius: '12px',
            padding: isDesktopLayout ? '16px' : '12px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: isDesktopLayout ? '12px' : '10px',
              color: theme.textSecondary,
              fontWeight: '600',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Moves
            </div>
            <div style={{
              fontSize: isDesktopLayout ? '14px' : '12px',
              color: theme.text,
              fontWeight: '600'
            }}>
              {gameState.moveHistory.length}
            </div>
          </div>
        </div>
      </section>

      {/* Main Game Area */}
      <div style={{ 
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isDesktopLayout ? '2rem' : '1.5rem',
        alignItems: isMobile ? 'center' : 'flex-start',
        justifyContent: 'center',
        width: isDesktopLayout ? '800px' : '95%',
        margin: '0 auto',
        marginBottom: isDesktopLayout ? '2rem' : '1.5rem'
      }}>
        
        {/* Chess Board Container */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flex: isMobile ? 'none' : '1',
          background: `linear-gradient(135deg, ${theme.surface} 0%, ${theme.background} 100%)`,
          borderRadius: isDesktopLayout ? '20px' : '16px',
          border: `1px solid ${theme.border}`,
          boxShadow: theme.shadow,
          padding: isDesktopLayout ? '1.5rem' : '1rem'
        }}>
          {/* Board Header */}
          <div style={{
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: isDesktopLayout ? '18px' : '16px',
              fontWeight: '600',
              color: theme.text,
              marginBottom: '4px'
            }}>
              Chess Board
            </h3>
            <div style={{
              fontSize: isDesktopLayout ? '12px' : '11px',
              color: theme.textSecondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}>
              <span>{playerRole === 'white' ? '♔' : '♚'}</span>
              Playing as {playerRole.charAt(0).toUpperCase() + playerRole.slice(1)}
            </div>
          </div>

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

        {/* Chat Box Container */}
        {onSendChatMessage && (
          <div style={{
            width: isMobile ? '100%' : '300px',
            height: isMobile ? '300px' : `${boardSize + 80}px`,
            minHeight: isMobile ? '300px' : `${boardSize + 80}px`,
            flex: isMobile ? 'none' : '0 0 300px',
            background: `linear-gradient(135deg, ${theme.surface} 0%, ${theme.background} 100%)`,
            borderRadius: isDesktopLayout ? '20px' : '16px',
            border: `1px solid ${theme.border}`,
            boxShadow: theme.shadow,
            overflow: 'hidden'
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
      
      {/* Enhanced Game Statistics */}
      <section style={{ 
        ...cardStyle,
        margin: isMobile ? '0 auto 1.5rem auto' : '0 auto 2rem auto',
        padding: isDesktopLayout ? '1.5rem' : '1rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '1rem'
        }}>
          <span style={{ fontSize: '16px' }}>📊</span>
          <h3 style={{ 
            margin: 0, 
            color: theme.text,
            fontSize: isDesktopLayout ? '18px' : '16px',
            fontWeight: '600'
          }}>Game Statistics</h3>
        </div>

        <div style={{ 
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: isDesktopLayout ? '1rem' : '0.75rem'
        }}>
          <div style={{
            textAlign: 'center',
            padding: isDesktopLayout ? '12px' : '8px',
            background: `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`
          }}>
            <div style={{
              fontSize: isDesktopLayout ? '11px' : '10px',
              color: theme.textSecondary,
              fontWeight: '600',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Total Moves
            </div>
            <div style={{
              fontSize: isDesktopLayout ? '16px' : '14px',
              color: theme.text,
              fontWeight: '700'
            }}>
              {gameState.moveHistory.length}
            </div>
          </div>

          <div style={{
            textAlign: 'center',
            padding: isDesktopLayout ? '12px' : '8px',
            background: `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`
          }}>
            <div style={{
              fontSize: isDesktopLayout ? '11px' : '10px',
              color: theme.textSecondary,
              fontWeight: '600',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              50-Move Rule
            </div>
            <div style={{
              fontSize: isDesktopLayout ? '16px' : '14px',
              color: theme.text,
              fontWeight: '700'
            }}>
              {gameState.halfmoveClock}/100
            </div>
          </div>

          <div style={{
            textAlign: 'center',
            padding: isDesktopLayout ? '12px' : '8px',
            background: `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`
          }}>
            <div style={{
              fontSize: isDesktopLayout ? '11px' : '10px',
              color: theme.textSecondary,
              fontWeight: '600',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Full Moves
            </div>
            <div style={{
              fontSize: isDesktopLayout ? '16px' : '14px',
              color: theme.text,
              fontWeight: '700'
            }}>
              {gameState.moveHistory.length === 0 ? 0 : gameState.fullmoveNumber}
            </div>
          </div>

          <div style={{
            textAlign: 'center',
            padding: isDesktopLayout ? '12px' : '8px',
            background: `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`
          }}>
            <div style={{
              fontSize: isDesktopLayout ? '11px' : '10px',
              color: theme.textSecondary,
              fontWeight: '600',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Castling
            </div>
            <div style={{
              fontSize: isDesktopLayout ? '16px' : '14px',
              color: theme.text,
              fontWeight: '700'
            }}>
              {gameState.castlingRights || 'None'}
            </div>
          </div>
        </div>
      </section>
      
      {/* Enhanced Action Buttons */}
      <div style={{ 
        display: 'flex',
        flexWrap: 'wrap',
        gap: isDesktopLayout ? '1rem' : '0.75rem',
        justifyContent: 'center',
        marginTop: isDesktopLayout ? '1rem' : '0.75rem'
      }}>
        {/* Claim Winnings Button */}
        {showClaimButton && (
          <button
            onClick={winningsClaimed ? undefined : onClaimWinnings}
            disabled={isLoading || winningsClaimed}
            style={{
              ...sharedButtonStyle,
              background: winningsClaimed 
                ? `linear-gradient(135deg, #4CAF50 0%, #45a049 100%)` 
                : (isLoading 
                    ? theme.border 
                    : `linear-gradient(135deg, ${theme.success} 0%, ${theme.success}dd 100%)`),
              color: 'white',
              cursor: (isLoading || winningsClaimed) ? 'not-allowed' : 'pointer',
              boxShadow: winningsClaimed 
                ? '0 6px 20px rgba(76, 175, 80, 0.3)' 
                : (isLoading 
                    ? 'none' 
                    : `0 6px 20px ${theme.success}40`),
              opacity: winningsClaimed ? 0.9 : 1
            }}
            onMouseEnter={(e) => {
              if (!isLoading && !winningsClaimed) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = `0 8px 25px ${theme.success}50`;
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading && !winningsClaimed) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 6px 20px ${theme.success}40`;
              }
            }}
          >
            {isLoading ? '⏳ Processing...' : 
             winningsClaimed ? '✅ Winnings Claimed!' : '💰 Claim Winnings'}
          </button>
        )}

        {/* Resign Button */}
        {gameState.gameActive && !isGameOver && onResignGame && (
          <button
            onClick={onResignGame}
            style={{
              ...sharedButtonStyle,
              background: `linear-gradient(135deg, ${theme.error} 0%, ${theme.error}dd 100%)`,
              color: 'white',
              boxShadow: `0 4px 12px ${theme.error}30`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = `0 6px 16px ${theme.error}40`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${theme.error}30`;
            }}
          >
            🏳️ Resign Game
          </button>
        )}

        {/* Back to Menu Button */}
        {onBackToMenu && !gameState.gameActive && (
          <button
            onClick={onBackToMenu}
            style={{
              ...sharedButtonStyle,
              background: `linear-gradient(135deg, ${theme.surface} 0%, ${theme.background} 100%)`,
              color: theme.text,
              border: `2px solid ${theme.border}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = theme.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
              e.currentTarget.style.borderColor = theme.border;
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