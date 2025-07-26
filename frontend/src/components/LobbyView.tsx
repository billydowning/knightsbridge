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
  roomStatus: RoomStatus | null;
  escrowCreated: boolean;
  opponentEscrowCreated?: boolean;
  bothEscrowsReady?: boolean;
  connected: boolean;
  isLoading: boolean;
  onCreateEscrow: () => void;
  onStartGame: () => void;
  onBackToMenu: () => void;
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
  onStartGame,
  onBackToMenu
}) => {
  const { theme } = useTheme();
  const [copied, setCopied] = React.useState(false);
  
  // Responsive utilities
  const containerWidth = useContainerWidth();
  const textSizes = useTextSizes();
  const isMobile = useIsMobile();
  const isDesktopLayout = useIsDesktopLayout();
  
  // Dynamic width measurement hooks
  const topRef = useRef<HTMLDivElement>(null);
  const [middleWidth, setMiddleWidth] = useState('auto');

  useEffect(() => {
    if (topRef.current) {
      setMiddleWidth(`${topRef.current.offsetWidth}px`);
    }
  }, []); // Runs once after mount
  
  // Calculate player count based on room status
  const basePlayerCount = roomStatus?.playerCount || 0;
  const playerCount = basePlayerCount + 1; // Include current player
  
  // Calculate escrow count including local escrow creation state
  const baseEscrowCount = roomStatus?.escrowCount || 0;
  const escrowCount = baseEscrowCount + (escrowCreated ? 1 : 0);
  
  const gameStarted = roomStatus?.gameStarted || false;
  const bothPlayersPresent = playerCount === 2;
  const bothEscrowsCreated = escrowCount === 2 || (escrowCreated && opponentEscrowCreated);
  const readyToStart = bothPlayersPresent && bothEscrowsCreated;

  // Debug: Log room status
  React.useEffect(() => {
    console.log('🔍 LobbyView room status:', roomStatus);
    console.log('🔍 LobbyView counts:', {
      basePlayerCount: roomStatus?.playerCount || 0,
      playerCount,
      baseEscrowCount: roomStatus?.escrowCount || 0,
      escrowCount,
      escrowCreated,
      opponentEscrowCreated
    });
  }, [roomStatus, playerCount, escrowCount, escrowCreated, opponentEscrowCreated]);

  return (
    <div style={{ textAlign: 'center', color: theme.text }}>
      
      {/* Room ID Share Section */}
      <div ref={topRef} style={{ 
        margin: isMobile ? '10px auto' : '20px auto',
        padding: isMobile ? '12px' : (isDesktopLayout ? '20px' : '15px'),
        backgroundColor: theme.surface,
        borderRadius: '10px',
        border: `2px solid ${theme.border}`,
        boxShadow: theme.shadow,
        width: isDesktopLayout ? '800px' : (isMobile ? '95%' : containerWidth)
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

      {/* Room Status Section */}
      <div style={{ 
        margin: isMobile ? '10px auto' : '20px auto',
        padding: isMobile ? '12px' : (isDesktopLayout ? '20px' : '15px'),
        backgroundColor: theme.surface,
        borderRadius: '10px',
        border: `2px solid ${theme.border}`,
        boxShadow: theme.shadow,
        width: isDesktopLayout ? '800px' : middleWidth
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
              Escrows
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
              {betAmount}
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
            
            {bothPlayersPresent && !bothEscrowsCreated && (
              <div style={{ color: '#2196F3', marginBottom: '4px' }}>
                💰 Waiting for escrows to be created...
              </div>
            )}
            
            {readyToStart && (
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
        width: isDesktopLayout ? '800px' : middleWidth
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
        width: isDesktopLayout ? '800px' : middleWidth
      }}>
        {/* Create Escrow Button */}
        {!escrowCreated && connected && (
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
            {isLoading ? '⏳ Creating...' : '💰 Create Escrow'}
          </button>
        )}

        {/* Escrow Created Indicator */}
        {escrowCreated && (
          <div style={{
            padding: isMobile ? '10px 16px' : '15px 30px',
            backgroundColor: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
            borderRadius: '8px',
            fontSize: textSizes.body,
            fontWeight: 'bold'
          }}>
            ✅ Escrow Created
          </div>
        )}

        {/* Start Game Button */}
        {readyToStart && !gameStarted && (
          <button
            onClick={onStartGame}
            disabled={isLoading}
            style={{
              padding: isMobile ? '10px 16px' : '15px 30px',
              backgroundColor: isLoading ? theme.border : theme.secondary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: textSizes.body,
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            {isLoading ? '⏳ Starting...' : '🎮 Start Game'}
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