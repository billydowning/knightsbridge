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
  onTimeoutGame?: (timedOutPlayer: 'white' | 'black') => void;
  onClaimWinnings?: () => void;
  onBackToMenu?: () => void;
  winningsClaimed: boolean;
  isLoading: boolean;
  betAmount: number;
  timeLimit: number;
  onTimerUpdate?: (whiteTime: number, blackTime: number) => void; // For timer sync
}

export const GameView: React.FC<GameViewProps> = ({
  roomId,
  playerRole,
  gameState,
  onSquareClick,
  onSendChatMessage,
  chatMessages,
  onResignGame,
  onTimeoutGame,
  onClaimWinnings,
  onBackToMenu,
  winningsClaimed,
  isLoading,
  betAmount,
  timeLimit,
  onTimerUpdate
}) => {
  const { theme } = useTheme();
  const textSizes = useTextSizes();
  const isMobile = useIsMobile();
  const { boardSize } = useChessBoardConfig();
  const isDesktopLayout = useIsDesktopLayout();

  const showClaimButton = gameState.winner && gameState.winner === playerRole;
  const isGameOver = gameState.winner || gameState.draw;

  // Timer logic - hybrid approach with sync
  const [whiteTimeRemaining, setWhiteTimeRemaining] = React.useState(timeLimit);
  const [blackTimeRemaining, setBlackTimeRemaining] = React.useState(timeLimit);
  const [timeoutTriggered, setTimeoutTriggered] = React.useState(false);
  const [lastTimerSync, setLastTimerSync] = React.useState(Date.now());
  
  // Debug: Log when timeLimit prop changes


  // HYBRID TIMER SYNC: Initialize and restore timers from game state
  React.useEffect(() => {
    // Restore timers from game state if available (for reconnection and move sync)
    if (gameState?.whiteTimeRemaining !== undefined && gameState?.blackTimeRemaining !== undefined) {
      const syncedWhiteTime = gameState.whiteTimeRemaining;
      const syncedBlackTime = gameState.blackTimeRemaining;
      const syncTimestamp = gameState.timerLastSync || Date.now();
      
      // Apply drift correction if timers were synced recently
      const timeSinceSync = (Date.now() - syncTimestamp) / 1000;
      if (timeSinceSync < 60) { // Only correct if sync was within last minute
        console.log('🕐 Syncing timers from game state:', { 
          white: syncedWhiteTime, 
          black: syncedBlackTime,
          drift: Math.floor(timeSinceSync) 
        });
        
        // Apply gentle drift correction for the current player
        if (gameState.currentPlayer === 'white' && gameState.gameActive) {
          setWhiteTimeRemaining(Math.max(0, syncedWhiteTime - Math.floor(timeSinceSync)));
          setBlackTimeRemaining(syncedBlackTime);
        } else if (gameState.currentPlayer === 'black' && gameState.gameActive) {
          setWhiteTimeRemaining(syncedWhiteTime);
          setBlackTimeRemaining(Math.max(0, syncedBlackTime - Math.floor(timeSinceSync)));
        } else {
          // Game not active, use exact synced values
          setWhiteTimeRemaining(syncedWhiteTime);
          setBlackTimeRemaining(syncedBlackTime);
        }
        setLastTimerSync(Date.now());
      }
    } else if (timeLimit > 0) {
      // Initialize with default time limit for new games
      console.log('🕐 Initializing timers with default time limit:', timeLimit);
      setWhiteTimeRemaining(timeLimit);
      setBlackTimeRemaining(timeLimit);
      setLastTimerSync(Date.now());
    }
    
    if (gameState.gameActive && !isGameOver) {
      setTimeoutTriggered(false); // Reset timeout flag when game starts
    }
  }, [gameState?.whiteTimeRemaining, gameState?.blackTimeRemaining, gameState?.timerLastSync, gameState?.currentPlayer, gameState?.gameActive, isGameOver, timeLimit]);

  // HYBRID TIMER SYNC: Notify parent of timer changes for move synchronization
  React.useEffect(() => {
    if (onTimerUpdate && gameState.gameActive) {
      onTimerUpdate(whiteTimeRemaining, blackTimeRemaining);
    }
  }, [whiteTimeRemaining, blackTimeRemaining, gameState.gameActive, onTimerUpdate]);

  // Handle timeout - declare the opponent as winner
  const handleTimeout = React.useCallback((timedOutPlayer: 'white' | 'black') => {
    if (timeoutTriggered || isGameOver) return; // Prevent multiple calls
    
    setTimeoutTriggered(true);
    
    // Trigger timeout handler which will declare the correct winner (opposite of timed-out player)
    if (onTimeoutGame) {
      // Small delay to ensure the timer shows 0:00 first
      setTimeout(() => {
        onTimeoutGame(timedOutPlayer);
      }, 100);
    }
  }, [timeoutTriggered, isGameOver, onTimeoutGame]);

  // Countdown timer for current player only
  React.useEffect(() => {
    if (!gameState.gameActive || isGameOver) return;

    const interval = setInterval(() => {
      if (gameState.currentPlayer === 'white') {
        setWhiteTimeRemaining((prevTime) => {
          const newTime = Math.max(0, prevTime - 1);
          
          // Auto-timeout if time runs out
          if (newTime === 0 && !timeoutTriggered) {
            handleTimeout('white');
          }
          
          return newTime;
        });
      } else if (gameState.currentPlayer === 'black') {
        setBlackTimeRemaining((prevTime) => {
          const newTime = Math.max(0, prevTime - 1);
          
          // Auto-timeout if time runs out  
          if (newTime === 0 && !timeoutTriggered) {
            handleTimeout('black');
          }
          
          return newTime;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState.gameActive, gameState.currentPlayer, isGameOver, handleTimeout, timeoutTriggered]);

  // Format time display (mm:ss)
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

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
              {gameState.moveHistory?.length || Math.max(0, (gameState.fullmoveNumber - 1) * 2 + (gameState.currentPlayer === 'black' ? 1 : 0))}
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
          height: isMobile ? 'auto' : `${boardSize + 140}px`,
          minHeight: isMobile ? 'auto' : `${boardSize + 140}px`,
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
            height: isMobile ? '300px' : `${boardSize + 140}px`,
            minHeight: isMobile ? '300px' : `${boardSize + 140}px`,
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
              {gameState.moveHistory?.length || Math.max(0, (gameState.fullmoveNumber - 1) * 2 + (gameState.currentPlayer === 'black' ? 1 : 0))}
            </div>
          </div>

          <div style={{
            textAlign: 'center',
            padding: isDesktopLayout ? '12px' : '8px',
            background: gameState.halfmoveClock >= 80 
              ? `linear-gradient(135deg, ${theme.warning}15 0%, ${theme.warning}25 100%)`
              : `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
            borderRadius: '8px',
            border: gameState.halfmoveClock >= 80 
              ? `1px solid ${theme.warning}60`
              : `1px solid ${theme.border}`,
            position: 'relative',
            cursor: gameState.canClaimFiftyMoveRule ? 'pointer' : 'default',
            transition: 'all 0.3s ease'
          }}>
            <div style={{
              fontSize: isDesktopLayout ? '11px' : '10px',
              color: theme.textSecondary,
              fontWeight: '600',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}>
              <span>⏳</span>
              <span>50-Move Rule</span>
              {gameState.canClaimFiftyMoveRule && (
                <span style={{ color: theme.success, fontSize: '12px' }}>✓</span>
              )}
            </div>
            <div style={{
              fontSize: isDesktopLayout ? '16px' : '14px',
              color: gameState.halfmoveClock >= 100 ? theme.success :
                     gameState.halfmoveClock >= 80 ? theme.warning :
                     gameState.halfmoveClock >= 60 ? theme.textSecondary : theme.text,
              fontWeight: '700',
              fontFamily: 'monospace'
            }}>
              {gameState.halfmoveClock || 0}/100
            </div>
            {gameState.canClaimFiftyMoveRule && (
              <div style={{
                fontSize: isDesktopLayout ? '8px' : '7px',
                color: theme.success,
                fontWeight: '600',
                marginTop: '2px',
                textTransform: 'uppercase'
              }}>
                Draw Available
              </div>
            )}
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
              {gameState.fullmoveNumber || 1}
            </div>
          </div>

          {/* Player Timers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: isDesktopLayout ? '8px' : '6px'
          }}>
            {/* White Player Timer */}
            <div style={{
              textAlign: 'center',
              padding: isDesktopLayout ? '12px 8px' : '10px 6px',
              background: gameState.currentPlayer === 'white' 
                ? `linear-gradient(135deg, ${theme.primary}15 0%, ${theme.primary}25 100%)`
                : `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
              borderRadius: '8px',
              border: gameState.currentPlayer === 'white' 
                ? `2px solid ${theme.primary}60`
                : `1px solid ${theme.border}`,
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                fontSize: isDesktopLayout ? '10px' : '9px',
                color: theme.textSecondary,
                fontWeight: '600',
                marginBottom: '2px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px'
              }}>
                <span>♔</span>
                <span>{playerRole === 'white' ? 'YOU' : 'OPP'}</span>
              </div>
              <div style={{
                fontSize: isDesktopLayout ? '16px' : '14px',
                color: whiteTimeRemaining < 60 ? theme.error : 
                      whiteTimeRemaining < 300 ? theme.warning : theme.text,
                fontWeight: '700',
                fontFamily: 'monospace'
              }}>
                {formatTime(whiteTimeRemaining)}
              </div>
            </div>

            {/* Black Player Timer */}
            <div style={{
              textAlign: 'center',
              padding: isDesktopLayout ? '12px 8px' : '10px 6px',
              background: gameState.currentPlayer === 'black' 
                ? `linear-gradient(135deg, ${theme.primary}15 0%, ${theme.primary}25 100%)`
                : `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
              borderRadius: '8px',
              border: gameState.currentPlayer === 'black' 
                ? `2px solid ${theme.primary}60`
                : `1px solid ${theme.border}`,
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                fontSize: isDesktopLayout ? '10px' : '9px',
                color: theme.textSecondary,
                fontWeight: '600',
                marginBottom: '2px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px'
              }}>
                <span>♚</span>
                <span>{playerRole === 'black' ? 'YOU' : 'OPP'}</span>
              </div>
              <div style={{
                fontSize: isDesktopLayout ? '16px' : '14px',
                color: blackTimeRemaining < 60 ? theme.error : 
                      blackTimeRemaining < 300 ? theme.warning : theme.text,
                fontWeight: '700',
                fontFamily: 'monospace'
              }}>
                {formatTime(blackTimeRemaining)}
              </div>
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

        {/* Claim Draw Button (50-Move Rule) */}
        {gameState.canClaimFiftyMoveRule && gameState.gameActive && !isGameOver && (
          <button
            onClick={() => {
              // In a real implementation, this would trigger the draw claim
      
              if (onResignGame) {
                // For now, treat as a draw - in production you'd have a specific draw handler
                onResignGame();
              }
            }}
            style={{
              ...sharedButtonStyle,
              background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent}dd 100%)`,
              color: 'white',
              boxShadow: `0 4px 12px ${theme.accent}30`,
              border: `2px solid ${theme.accent}60`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = `0 6px 16px ${theme.accent}40`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${theme.accent}30`;
            }}
          >
            🤝 Claim Draw (50-Move Rule)
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