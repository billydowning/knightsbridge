/**
 * Lobby View Component
 * Room management screen showing players, escrows, and game start options
 */

import React, { useRef, useEffect, useState } from 'react';
import { useTheme } from '../App';
import { useContainerWidth, useTextSizes, useIsMobile, useIsDesktopLayout } from '../utils/responsive';
import type { RoomStatus } from '../types';

export interface LobbyViewProps {
  roomId: string;
  playerRole: string;
  playerWallet: string;
  betAmount: number;
  roomStatus: any;
  escrowCreated: boolean;
  opponentEscrowCreated?: boolean;
  bothEscrowsReady?: boolean;
  connected: boolean;
  isLoading: boolean;
  onCreateEscrow: () => void;
  onDepositStake: () => void;
  onStartGame: () => void;
  onBackToMenu: () => void;
  onTestFrontendVersion?: () => Promise<void>;
  hasDeposited?: boolean;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomId,
  playerRole,
  playerWallet,
  betAmount,
  roomStatus,
  escrowCreated,
  opponentEscrowCreated = false,
  bothEscrowsReady = false,
  connected,
  isLoading,
  onCreateEscrow,
  onDepositStake,
  onStartGame,
  onBackToMenu,
  onTestFrontendVersion,
  hasDeposited = false
}) => {
  const { theme } = useTheme();
  const [copied, setCopied] = React.useState(false);
  
  // Responsive utilities
  const containerWidth = useContainerWidth();
  const textSizes = useTextSizes();
  const isMobile = useIsMobile();
  const isDesktopLayout = useIsDesktopLayout();
  
  // Calculate player count based on room status
  const playerCount = roomStatus?.playerCount || 0;
  
  // Calculate escrow count - backend already includes all escrows
  const escrowCount = roomStatus?.escrowCount || 0;
  
  const gameStarted = roomStatus?.gameStarted || false;
  const bothPlayersPresent = playerCount === 2;
  const bothEscrowsCreated = escrowCount === 2 || (escrowCreated && opponentEscrowCreated);
  
  // Extract the actual bet amount from room status escrows (shared between players)
  const actualBetAmount = React.useMemo(() => {
    if (roomStatus?.escrows && Object.keys(roomStatus.escrows).length > 0) {
      // Get the first escrow amount (should be same for both players)
      const escrowAmounts = Object.values(roomStatus.escrows);
      return Number(escrowAmounts[0]) || betAmount;
    }
    return betAmount;
  }, [roomStatus?.escrows, betAmount]);
  
  // FIXED: Only show "Game Ready" section when BOTH players have actually joined the game on-chain
  // Use escrowCount >= 2 to ensure both white (initialize_game) and black (join_game) have completed
  const readyToDeposit = bothPlayersPresent && escrowCount >= 2 && !gameStarted;
  const readyToStart = bothPlayersPresent && bothEscrowsCreated;

  return (
    <div style={{ textAlign: 'center', color: theme.text }}>
      
      {/* Room ID Share Section */}
      <div style={{ 
        margin: isMobile ? '10px auto' : '20px auto',
        padding: isMobile ? '12px' : (isDesktopLayout ? '20px' : '15px'),
        backgroundColor: theme.surface,
        borderRadius: '10px',
        border: `2px solid ${theme.border}`,
        boxShadow: theme.shadow,
        width: isDesktopLayout ? '800px' : '95%'
      }}>
        <h3 style={{ 
          margin: '0 0 12px 0', 
          color: theme.text,
          fontSize: textSizes.h3
        }}>📋 Share Room ID</h3>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: isMobile ? '6px' : '10px',
          flexWrap: 'wrap'
        }}>
          <input
            type="text"
            value={roomId}
            readOnly
            style={{
              padding: isMobile ? '8px 10px' : '12px 16px',
              fontSize: isMobile ? textSizes.body : '18px',
              fontWeight: 'bold',
              border: `2px solid ${theme.border}`,
              borderRadius: '8px',
              backgroundColor: theme.background,
              color: theme.text,
              minWidth: isMobile ? '180px' : '300px',
              textAlign: 'center'
            }}
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(roomId);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            style={{
              padding: isMobile ? '8px 10px' : '12px 16px',
              backgroundColor: copied ? theme.primary : theme.surface,
              color: copied ? 'white' : theme.text,
              border: `2px solid ${theme.border}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: textSizes.body,
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            {copied ? '✅ Copied!' : '📋 Copy'}
          </button>
        </div>
      </div>

      {/* NEW: Game Ready Section (when both players joined but haven't deposited) */}
      {readyToDeposit && (
        <div style={{ 
          margin: isMobile ? '15px auto' : '25px auto',
          padding: isMobile ? '15px' : (isDesktopLayout ? '25px' : '20px'),
          backgroundColor: theme.successLight,
          borderRadius: '12px',
          border: `2px solid ${theme.success}`,
          boxShadow: theme.shadow,
          width: isDesktopLayout ? '800px' : '95%',
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center'
        }}>
          <h3 style={{ 
            margin: '0 0 15px 0', 
            color: theme.successDark,
            fontSize: textSizes.h2,
            textAlign: 'center'
          }}>🎯 Game Ready!</h3>
          
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ 
              fontSize: textSizes.body,
              color: theme.successDark,
              textAlign: 'center'
            }}>
              ✅ White Player: {
                roomStatus?.players?.[0] 
                  ? (typeof roomStatus.players[0] === 'string' 
                      ? roomStatus.players[0].slice(0, 8) + '...'
                      : roomStatus.players[0]?.wallet?.slice(0, 8) + '...' || 'Unknown')
                  : 'Waiting...'
              }
            </div>
            <div style={{ 
              fontSize: textSizes.body,
              color: theme.successDark,
              textAlign: 'center'
            }}>
              ✅ Black Player: {
                roomStatus?.players?.[1] 
                  ? (typeof roomStatus.players[1] === 'string' 
                      ? roomStatus.players[1].slice(0, 8) + '...'
                      : roomStatus.players[1]?.wallet?.slice(0, 8) + '...' || 'Unknown')
                  : 'Waiting...'
              }
            </div>
          </div>

          <div style={{ 
            fontSize: textSizes.h3,
            color: theme.successDark,
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            �� Ready to deposit {actualBetAmount} SOL?
          </div>

          <button
            onClick={hasDeposited ? undefined : onDepositStake}
            disabled={isLoading || hasDeposited}
            style={{
              padding: isMobile ? '12px 20px' : '18px 35px',
              backgroundColor: hasDeposited ? '#4CAF50' : (isLoading ? theme.border : theme.success),
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: (isLoading || hasDeposited) ? 'not-allowed' : 'pointer',
              fontSize: isMobile ? textSizes.body : textSizes.h3,
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              marginBottom: '10px'
            }}
          >
            {hasDeposited ? '✅ Deposit Complete - Waiting for Opponent' : 
             (isLoading ? '⏳ Depositing...' : `💰 Start Game & Deposit ${actualBetAmount} SOL`)}
          </button>
          
          <div style={{ 
            fontSize: textSizes.small,
            color: theme.textSecondary,
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            ⏳ Waiting for both players to deposit...
          </div>
        </div>
      )}

      {/* Room Status Section */}
      <div style={{ 
        margin: isMobile ? '10px auto' : '20px auto',
        padding: isMobile ? '12px' : (isDesktopLayout ? '20px' : '15px'),
        backgroundColor: theme.surface,
        borderRadius: '10px',
        border: `2px solid ${theme.border}`,
        boxShadow: theme.shadow,
        width: isDesktopLayout ? '800px' : '95%',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center'
      }}>
        <h3 style={{ 
          margin: '0 0 12px 0', 
          color: theme.text,
          fontSize: textSizes.h3
        }}>🎮 Room Status</h3>
        
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: isMobile ? '8px' : '15px',
          marginBottom: isMobile ? '15px' : '20px'
        }}>
          <div style={{ 
            textAlign: 'center', 
            padding: isMobile ? '8px' : '10px',
            backgroundColor: theme.background,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`
          }}>
            <div style={{ fontSize: textSizes.h3, fontWeight: 'bold', color: theme.primary }}>
              {playerCount}/2
            </div>
            <div style={{ fontSize: textSizes.body, color: theme.textSecondary }}>
              Players
            </div>
          </div>
          
          <div style={{ 
            textAlign: 'center', 
            padding: isMobile ? '8px' : '10px',
            backgroundColor: theme.background,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`
          }}>
            <div style={{ fontSize: textSizes.h3, fontWeight: 'bold', color: theme.secondary }}>
              {escrowCount}/2
            </div>
            <div style={{ fontSize: textSizes.body, color: theme.textSecondary }}>
              Deposits
            </div>
          </div>
          
          <div style={{ 
            textAlign: 'center', 
            padding: isMobile ? '8px' : '10px',
            backgroundColor: theme.background,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`
          }}>
            <div style={{ fontSize: textSizes.h3, fontWeight: 'bold', color: theme.accent }}>
              {actualBetAmount}
            </div>
            <div style={{ fontSize: textSizes.body, color: theme.textSecondary }}>
              SOL Bet
            </div>
          </div>
          
          <div style={{ 
            textAlign: 'center', 
            padding: isMobile ? '8px' : '10px',
            backgroundColor: theme.background,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`
          }}>
            <div style={{ fontSize: textSizes.h3, fontWeight: 'bold', color: gameStarted ? '#4CAF50' : '#FF9800' }}>
              {gameStarted ? '🎮' : '⏳'}
            </div>
            <div style={{ fontSize: textSizes.body, color: theme.textSecondary }}>
              {gameStarted ? 'Started' : 'Waiting'}
            </div>
          </div>
        </div>

        {/* Status Messages */}
        <div style={{ 
          marginTop: isMobile ? '12px' : '15px',
          padding: isMobile ? '10px' : '15px',
          backgroundColor: theme.background,
          borderRadius: '8px',
          border: `1px solid ${theme.border}`
        }}>
          <div style={{ fontSize: textSizes.body, color: theme.text, marginBottom: '8px' }}>
            <strong>Current Status:</strong>
          </div>
          
          <div style={{ fontSize: textSizes.body, color: theme.textSecondary }}>
            {!bothPlayersPresent && (
              <div style={{ color: '#FF9800', marginBottom: '4px' }}>
                ⏳ Waiting for opponent to join...
              </div>
            )}
            
            {bothPlayersPresent && !escrowCreated && playerRole === 'white' && (
              <div style={{ color: '#2196F3', marginBottom: '4px' }}>
                🤵 Please create the game escrow (White player goes first)
              </div>
            )}
            
            {bothPlayersPresent && escrowCount === 1 && playerRole === 'black' && (
              <div style={{ color: '#2196F3', marginBottom: '4px' }}>
                ♛ Please join the game escrow (Black player)
              </div>
            )}
            
            {readyToDeposit && !readyToStart && (
              <div style={{ color: '#4CAF50', marginBottom: '4px' }}>
                💰 Ready to deposit! Both players can now deposit their stakes.
              </div>
            )}
            
            {readyToStart && !gameStarted && (
              <div style={{ color: '#4CAF50', marginBottom: '4px' }}>
                ✅ Ready to start the game!
              </div>
            )}
            
            {gameStarted && (
              <div style={{ color: '#4CAF50', marginBottom: '4px' }}>
                🎮 Game has started!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Player Info Section */}
      <div style={{ 
        margin: isMobile ? '10px auto' : '20px auto',
        padding: isMobile ? '12px' : (isDesktopLayout ? '20px' : '15px'),
        backgroundColor: theme.surface,
        borderRadius: '10px',
        border: `2px solid ${theme.border}`,
        boxShadow: theme.shadow,
        width: isDesktopLayout ? '800px' : '95%',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center'
      }}>
        <h3 style={{ 
          margin: '0 0 12px 0', 
          color: theme.text,
          fontSize: textSizes.h3
        }}>👤 Your Info</h3>
        
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: isMobile ? '8px' : '15px'
        }}>
          <div style={{ 
            textAlign: 'left',
            padding: isMobile ? '8px' : '12px',
            backgroundColor: theme.background,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`
          }}>
            <div style={{ fontSize: textSizes.body, color: theme.textSecondary, marginBottom: '4px' }}>
              <strong>Role:</strong>
            </div>
            <div style={{ 
              fontSize: textSizes.body, 
              fontWeight: 'bold',
              color: playerRole === 'white' ? '#4CAF50' : '#FF9800'
            }}>
              {playerRole.toUpperCase()}
            </div>
          </div>
          
          <div style={{ 
            textAlign: 'left',
            padding: isMobile ? '8px' : '12px',
            backgroundColor: theme.background,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`
          }}>
            <div style={{ fontSize: textSizes.body, color: theme.textSecondary, marginBottom: '4px' }}>
              <strong>Wallet:</strong>
            </div>
            <div style={{ 
              fontSize: textSizes.small, 
              fontFamily: 'monospace',
              color: theme.text,
              wordBreak: 'break-all'
            }}>
              {playerWallet}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ 
        margin: isMobile ? '15px auto' : '30px auto',
        display: 'flex',
        flexWrap: 'wrap',
        gap: isMobile ? '8px' : '15px',
        justifyContent: 'center',
        width: isDesktopLayout ? '800px' : '95%'
      }}>
        {/* Create Escrow Button (White player first) */}
        {!escrowCreated && connected && playerRole === 'white' && escrowCount === 0 && (
          <button
            onClick={onCreateEscrow}
            disabled={isLoading}
            style={{
              padding: isMobile ? '10px 16px' : '15px 30px',
              backgroundColor: isLoading ? theme.border : theme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: textSizes.body,
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            {isLoading ? '⏳ Creating...' : '🤵 Create Game (White Player)'}
          </button>
        )}

        {/* Join Escrow Button (Black player second) */}
        {!escrowCreated && connected && playerRole === 'black' && escrowCount === 1 && (
          <button
            onClick={onCreateEscrow}
            disabled={isLoading}
            style={{
              padding: isMobile ? '10px 16px' : '15px 30px',
              backgroundColor: isLoading ? theme.border : theme.warning,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: textSizes.body,
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            {isLoading ? '⏳ Joining...' : '♛ Join Game (Black Player)'}
          </button>
        )}

        {/* Escrow Created Indicator */}
        {escrowCreated && !readyToDeposit && (
          <div style={{
            padding: isMobile ? '10px 16px' : '15px 30px',
            backgroundColor: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
            borderRadius: '8px',
            fontSize: textSizes.body,
            fontWeight: 'bold'
          }}>
            ✅ Joined Game - Waiting for opponent
          </div>
        )}

        {/* Test Frontend Version Button */}
        {onTestFrontendVersion && (
          <button
            onClick={onTestFrontendVersion}
            style={{
              padding: isMobile ? '8px 12px' : '10px 20px',
              backgroundColor: '#e67e22',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: textSizes.small,
              fontWeight: 'bold',
              marginBottom: '10px'
            }}
          >
            🧪 Test Frontend Version
          </button>
        )}

        {/* Back to Menu Button */}
        <button
          onClick={onBackToMenu}
          style={{
            padding: isMobile ? '10px 16px' : '15px 30px',
            backgroundColor: theme.surface,
            color: theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: textSizes.body,
            fontWeight: 'bold',
            transition: 'all 0.2s ease'
          }}
        >
          ← Back to Menu
        </button>
      </div>
    </div>
  );
};

export default LobbyView;