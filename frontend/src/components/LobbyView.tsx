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
  hasDeposited = false
}) => {
  const { theme } = useTheme();
  const [copied, setCopied] = React.useState(false);
  
  // Responsive utilities
  const containerWidth = useContainerWidth();
  const textSizes = useTextSizes();
  const isMobile = useIsMobile();
  const isDesktopLayout = useIsDesktopLayout();

  // Helper function to get room player wallet by role
  const getRoomPlayerWallet = (roomStatus: any, role: 'white' | 'black'): string | null => {
    if (!roomStatus?.players) return null;
    const player = roomStatus.players.find((p: any) => p.role === role);
    return player?.wallet || null;
  };

  // Helper function to check wallet mismatch
  const hasWalletMismatch = (): boolean => {
    if (!roomStatus || !playerRole || !playerWallet) return false;
    const roomWallet = getRoomPlayerWallet(roomStatus, playerRole as 'white' | 'black');
    return roomWallet !== null && roomWallet !== playerWallet;
  };

  // Helper function to get wallet mismatch info
  const getWalletMismatchInfo = (): { roomWallet: string; mismatch: boolean } | null => {
    if (!roomStatus || !playerRole) return null;
    const roomWallet = getRoomPlayerWallet(roomStatus, playerRole as 'white' | 'black');
    if (!roomWallet) return null;
    return {
      roomWallet,
      mismatch: roomWallet !== playerWallet
    };
  };
  
  // Status calculations
  const escrowCount = roomStatus?.escrowCount || 0;
  const confirmedDepositsCount = roomStatus?.confirmedDepositsCount || 0; // NEW: Track confirmed deposits
  const playerCount = roomStatus?.playerCount || 0;
  const gameStarted = roomStatus?.gameStarted || false;
  
  const bothEscrowsCreated = escrowCount === 2 || (escrowCreated && opponentEscrowCreated);

  // Helper function to determine actual bet amount displayed
  const actualBetAmount = betAmount;

  // Check if both players are present (playerCount === 2) first, regardless of escrow status
  const bothPlayersPresent = playerCount === 2;

  // Only show the deposit section when both players are present AND both escrows exist
  // Use escrowCount >= 2 to ensure both white (initialize_game) and black (join_game) have completed
  const readyToDeposit = bothPlayersPresent && escrowCount >= 2 && !gameStarted;
  const readyToStart = bothPlayersPresent && bothEscrowsCreated;

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

  return (
    <div style={{ 
      textAlign: 'center', 
      color: theme.text,
      padding: isDesktopLayout ? '2rem' : '1rem',
      paddingLeft: isDesktopLayout ? '2rem' : '1rem',
      paddingRight: isDesktopLayout ? '2rem' : '1rem',
      maxWidth: '100vw',
      width: '100%',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      
      {/* Room ID Share Section */}
      <section style={{ 
        ...cardStyle,
        margin: isMobile ? '0 auto 1.5rem auto' : '0 auto 2rem auto',
        padding: isDesktopLayout ? '2rem' : '1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(45deg, ${theme.primary}08 0%, ${theme.secondary}05 100%)`,
          zIndex: 0
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '1rem'
          }}>
            <div style={{
              width: '3px',
              height: '20px',
              background: `linear-gradient(to bottom, ${theme.primary}, ${theme.secondary})`,
              borderRadius: '2px'
            }} />
            <h3 style={{ 
              margin: 0, 
              color: theme.text,
              fontSize: isDesktopLayout ? '20px' : '18px',
              fontWeight: '600'
            }}>Share Room</h3>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: isDesktopLayout ? '12px' : '8px',
            flexWrap: 'wrap'
          }}>
            <input
              type="text"
              value={roomId}
              readOnly
              style={{
                padding: isDesktopLayout ? '14px 18px' : '12px 16px',
                fontSize: isDesktopLayout ? '16px' : '14px',
                fontWeight: '600',
                border: `2px solid ${theme.border}`,
                borderRadius: '12px',
                backgroundColor: theme.background,
                color: theme.text,
                minWidth: isDesktopLayout ? '300px' : '200px',
                textAlign: 'center',
                fontFamily: 'monospace',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomId);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              style={{
                ...sharedButtonStyle,
                backgroundColor: copied ? theme.success : theme.primary,
                color: 'white',
                border: `2px solid ${copied ? theme.success : theme.primary}`,
                transform: copied ? 'scale(1.05)' : 'scale(1)',
                boxShadow: copied ? `0 4px 12px ${theme.success}40` : `0 4px 12px ${theme.primary}40`
              }}
            >
              {copied ? '✅ Copied!' : '📋 Copy'}
            </button>
          </div>
        </div>
      </section>

      {/* NEW: Game Ready Section (when both players joined but haven't deposited) */}
      {readyToDeposit && (
        <section style={{ 
          ...cardStyle,
          margin: isMobile ? '0 auto 1.5rem auto' : '0 auto 2rem auto',
          padding: isDesktopLayout ? '2.5rem' : '2rem',
          background: `linear-gradient(135deg, ${theme.success}12 0%, ${theme.success}06 100%)`,
          border: `1px solid ${theme.success}30`,
          position: 'relative',
          overflow: 'hidden',
          animation: 'slideInUp 0.4s ease-out'
        }}>
          {/* Enhanced decorative elements */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '60px',
            height: '60px',
            background: `linear-gradient(45deg, ${theme.success}15, ${theme.success}08)`,
            borderRadius: '50%',
            zIndex: 0
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-15px',
            left: '-15px',
            width: '40px',
            height: '40px',
            background: `linear-gradient(45deg, ${theme.primary}10, ${theme.secondary}08)`,
            borderRadius: '50%',
            zIndex: 0
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Enhanced header with better visual hierarchy */}
            <div style={{
              textAlign: 'center',
              marginBottom: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '0.75rem'
              }}>
                <div style={{
                  width: '4px',
                  height: '28px',
                  background: `linear-gradient(to bottom, ${theme.success}, ${theme.success}60)`,
                  borderRadius: '2px'
                }} />
                <h3 style={{ 
                  margin: 0, 
                  color: theme.successDark,
                  fontSize: isDesktopLayout ? '24px' : '22px',
                  fontWeight: '600',
                  letterSpacing: '-0.5px'
                }}>Game Ready!</h3>
                <div style={{
                  width: '4px',
                  height: '28px',
                  background: `linear-gradient(to bottom, ${theme.success}, ${theme.success}60)`,
                  borderRadius: '2px'
                }} />
              </div>
              
              <div style={{
                fontSize: isDesktopLayout ? '16px' : '14px',
                color: theme.textSecondary,
                fontWeight: '500'
              }}>
                Both players have joined • Ready to deposit stakes
              </div>
            </div>
            
            {/* Enhanced player display cards */}
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: isDesktopLayout ? '16px' : '12px',
              marginBottom: '2rem'
            }}>
              <div style={{ 
                background: `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
                border: `1px solid ${theme.success}20`,
                borderRadius: '12px',
                padding: isDesktopLayout ? '16px' : '12px',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <div style={{
                  fontSize: isDesktopLayout ? '14px' : '12px',
                  color: theme.textSecondary,
                  marginBottom: '6px',
                  fontWeight: '600'
                }}>
                  White Player
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  <span style={{ fontSize: '18px' }}>♔</span>
                  <span style={{
                    fontSize: isDesktopLayout ? '14px' : '12px',
                    color: theme.text,
                    fontFamily: 'monospace',
                    fontWeight: '600'
                  }}>
                    {roomStatus?.players?.[0] 
                      ? (typeof roomStatus.players[0] === 'string' 
                          ? `${roomStatus.players[0].slice(0, 6)}...${roomStatus.players[0].slice(-4)}`
                          : `${roomStatus.players[0]?.wallet?.slice(0, 6)}...${roomStatus.players[0]?.wallet?.slice(-4)}` || 'Unknown')
                      : 'Waiting...'
                    }
                  </span>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    background: theme.success,
                    borderRadius: '50%',
                    boxShadow: `0 0 6px ${theme.success}60`
                  }} />
                </div>
              </div>
              
              <div style={{ 
                background: `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
                border: `1px solid ${theme.success}20`,
                borderRadius: '12px',
                padding: isDesktopLayout ? '16px' : '12px',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <div style={{
                  fontSize: isDesktopLayout ? '14px' : '12px',
                  color: theme.textSecondary,
                  marginBottom: '6px',
                  fontWeight: '600'
                }}>
                  Black Player
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  <span style={{ fontSize: '18px' }}>♚</span>
                  <span style={{
                    fontSize: isDesktopLayout ? '14px' : '12px',
                    color: theme.text,
                    fontFamily: 'monospace',
                    fontWeight: '600'
                  }}>
                    {roomStatus?.players?.[1] 
                      ? (typeof roomStatus.players[1] === 'string' 
                          ? `${roomStatus.players[1].slice(0, 6)}...${roomStatus.players[1].slice(-4)}`
                          : `${roomStatus.players[1]?.wallet?.slice(0, 6)}...${roomStatus.players[1]?.wallet?.slice(-4)}` || 'Unknown')
                      : 'Waiting...'
                    }
                  </span>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    background: theme.success,
                    borderRadius: '50%',
                    boxShadow: `0 0 6px ${theme.success}60`
                  }} />
                </div>
              </div>
            </div>

            {/* Wallet Mismatch Warning */}
            {hasWalletMismatch() && (
              <div style={{
                background: `linear-gradient(135deg, ${theme.error}15 0%, ${theme.error}08 100%)`,
                border: `2px solid ${theme.error}`,
                borderRadius: '12px',
                padding: isDesktopLayout ? '16px' : '12px',
                marginBottom: '1.5rem',
                textAlign: 'center',
                animation: 'pulse 2s infinite'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '20px' }}>⚠️</span>
                  <span style={{
                    fontSize: isDesktopLayout ? '16px' : '14px',
                    color: theme.error,
                    fontWeight: '700'
                  }}>
                    Wallet Mismatch Detected
                  </span>
                </div>
                <div style={{
                  fontSize: isDesktopLayout ? '14px' : '12px',
                  color: theme.text,
                  lineHeight: 1.4,
                  marginBottom: '8px'
                }}>
                  You're connected as <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                    {playerWallet ? `${playerWallet.slice(0, 6)}...${playerWallet.slice(-4)}` : 'Unknown'}
                  </span>, but this room's {playerRole} player is{' '}
                  <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                    {(() => {
                      const roomWallet = getRoomPlayerWallet(roomStatus, playerRole as 'white' | 'black');
                      return roomWallet ? `${roomWallet.slice(0, 6)}...${roomWallet.slice(-4)}` : 'Unknown';
                    })()}
                  </span>
                </div>
                <div style={{
                  fontSize: isDesktopLayout ? '12px' : '10px',
                  color: theme.textSecondary,
                  fontStyle: 'italic'
                }}>
                  Please connect the correct wallet to continue
                </div>
              </div>
            )}

            {/* Enhanced bet information */}
            <div style={{
              background: `linear-gradient(135deg, ${theme.primary}08 0%, ${theme.secondary}06 100%)`,
              border: `1px solid ${theme.primary}20`,
              borderRadius: '12px',
              padding: isDesktopLayout ? '20px' : '16px',
              textAlign: 'center',
              marginBottom: '2rem'
            }}>
              <div style={{
                fontSize: isDesktopLayout ? '14px' : '12px',
                color: theme.textSecondary,
                marginBottom: '8px',
                fontWeight: '600'
              }}>
                Stake Amount
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '20px' }}>💰</span>
                <span style={{
                  fontSize: isDesktopLayout ? '24px' : '20px',
                  color: theme.text,
                  fontWeight: '700',
                  fontFamily: 'monospace'
                }}>
                  {actualBetAmount} SOL
                </span>
              </div>
              <div style={{
                fontSize: isDesktopLayout ? '12px' : '10px',
                color: theme.textSecondary,
                marginTop: '4px',
                fontStyle: 'italic'
              }}>
                Winner takes all • Secured by blockchain
              </div>
            </div>

            {/* Enhanced action button */}
            <div style={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%'
            }}>
              <button
                onClick={hasDeposited || hasWalletMismatch() ? undefined : onDepositStake}
                disabled={isLoading || hasDeposited || hasWalletMismatch()}
                style={{
                  ...sharedButtonStyle,
                  background: hasDeposited 
                    ? `linear-gradient(135deg, #4CAF50 0%, #45a049 100%)` 
                    : (hasWalletMismatch()
                        ? `linear-gradient(135deg, ${theme.error} 0%, ${theme.error}dd 100%)`
                        : (isLoading 
                            ? theme.border 
                            : `linear-gradient(135deg, ${theme.success} 0%, ${theme.success}dd 100%)`)),
                  color: 'white',
                  border: 'none',
                  fontSize: isDesktopLayout ? '16px' : '14px',
                  fontWeight: '600' as const,
                  cursor: (isLoading || hasDeposited || hasWalletMismatch()) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: hasDeposited 
                    ? '0 6px 20px rgba(76, 175, 80, 0.3)' 
                    : (hasWalletMismatch()
                        ? `0 6px 20px ${theme.error}40`
                        : (isLoading 
                            ? 'none' 
                            : `0 6px 20px ${theme.success}40`)),
                  marginBottom: '12px',
                  width: isDesktopLayout ? '380px' : '90%',
                  maxWidth: isDesktopLayout ? '380px' : '320px',
                  minHeight: '56px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && !hasDeposited && !hasWalletMismatch()) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 8px 25px ${theme.success}50`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading && !hasDeposited && !hasWalletMismatch()) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = `0 6px 20px ${theme.success}40`;
                  }
                }}
              >
                {/* Shimmer effect for active button */}
                {!isLoading && !hasDeposited && !hasWalletMismatch() && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                    animation: 'shimmer 2s infinite'
                  }} />
                )}
                <span style={{ position: 'relative', zIndex: 2 }}>
                  {hasWalletMismatch() ? '❌ Wrong Wallet Connected' :
                   (hasDeposited ? '✅ Deposit Complete - Waiting for Opponent' : 
                    (isLoading ? '⏳ Processing Deposit...' : `🚀 Deposit ${actualBetAmount} SOL & Start Game`))}
                </span>
              </button>
              
              <div style={{ 
                fontSize: isDesktopLayout ? '12px' : '10px',
                color: theme.textSecondary,
                textAlign: 'center',
                fontStyle: 'italic',
                opacity: 0.8,
                maxWidth: isDesktopLayout ? '380px' : '90%'
              }}>
                {hasDeposited 
                  ? 'Your deposit is secured • Waiting for opponent to deposit'
                  : 'Your stake will be held in secure escrow until game completion'
                }
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Room Status Section */}
      <section style={{ 
        ...cardStyle,
        margin: isMobile ? '0 auto 1.5rem auto' : '0 auto 2rem auto',
        padding: isDesktopLayout ? '2rem' : '1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(45deg, ${theme.secondary}08 0%, ${theme.primary}05 100%)`,
          zIndex: 0
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              width: '3px',
              height: '20px',
              background: `linear-gradient(to bottom, ${theme.secondary}, ${theme.primary})`,
              borderRadius: '2px'
            }} />
            <h3 style={{ 
              margin: 0, 
              color: theme.text,
              fontSize: isDesktopLayout ? '20px' : '18px',
              fontWeight: '600'
            }}>Room Status</h3>
          </div>
          
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: isDesktopLayout ? '16px' : '12px',
            marginBottom: isDesktopLayout ? '24px' : '20px'
          }}>
            <div style={{ 
              textAlign: 'center', 
              padding: isDesktopLayout ? '16px' : '12px',
              background: `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
              borderRadius: '12px',
              border: `1px solid ${theme.border}`,
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}>
              <div style={{ fontSize: isDesktopLayout ? '18px' : '16px', fontWeight: 'bold', color: theme.primary }}>
                {playerCount}/2
              </div>
              <div style={{ fontSize: isDesktopLayout ? '14px' : '12px', color: theme.textSecondary, marginTop: '4px' }}>
                Players
              </div>
            </div>
            
            <div style={{ 
              textAlign: 'center', 
              padding: isDesktopLayout ? '16px' : '12px',
              background: `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
              borderRadius: '12px',
              border: `1px solid ${theme.border}`,
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}>
              <div style={{ fontSize: isDesktopLayout ? '18px' : '16px', fontWeight: 'bold', color: theme.secondary }}>
                {confirmedDepositsCount}/2
              </div>
              <div style={{ fontSize: isDesktopLayout ? '14px' : '12px', color: theme.textSecondary, marginTop: '4px' }}>
                Deposits
              </div>
            </div>
            
            <div style={{ 
              textAlign: 'center', 
              padding: isDesktopLayout ? '16px' : '12px',
              background: `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
              borderRadius: '12px',
              border: `1px solid ${theme.border}`,
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}>
              <div style={{ fontSize: isDesktopLayout ? '18px' : '16px', fontWeight: 'bold', color: theme.accent }}>
                {actualBetAmount}
              </div>
              <div style={{ fontSize: isDesktopLayout ? '14px' : '12px', color: theme.textSecondary, marginTop: '4px' }}>
                SOL Bet
              </div>
            </div>
            
            <div style={{ 
              textAlign: 'center', 
              padding: isDesktopLayout ? '16px' : '12px',
              background: `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
              borderRadius: '12px',
              border: `1px solid ${theme.border}`,
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}>
              <div style={{ fontSize: isDesktopLayout ? '18px' : '16px', fontWeight: 'bold', color: gameStarted ? '#4CAF50' : '#FF9800' }}>
                {gameStarted ? '🎮' : '⏳'}
              </div>
              <div style={{ fontSize: isDesktopLayout ? '14px' : '12px', color: theme.textSecondary, marginTop: '4px' }}>
                {gameStarted ? 'Started' : 'Waiting'}
              </div>
            </div>
          </div>

          {/* Status Messages */}
          <div style={{ 
            marginTop: isDesktopLayout ? '16px' : '12px',
            padding: isDesktopLayout ? '16px' : '12px',
            background: `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
            borderRadius: '12px',
            border: `1px solid ${theme.border}`
          }}>
            <div style={{ fontSize: isDesktopLayout ? '14px' : '12px', color: theme.text, marginBottom: '8px', fontWeight: '600' }}>
              Current Status:
            </div>
            
            <div style={{ fontSize: isDesktopLayout ? '14px' : '12px', color: theme.textSecondary }}>
              {!bothPlayersPresent && (
                <div style={{ color: '#FF9800', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>⏳</span>
                  Waiting for opponent to join...
                </div>
              )}
              
              {bothPlayersPresent && !escrowCreated && playerRole === 'white' && (
                <div style={{ color: '#2196F3', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>🤵</span>
                  Please create the game escrow (White player goes first)
                </div>
              )}
              
              {bothPlayersPresent && escrowCount === 1 && playerRole === 'black' && (
                <div style={{ color: '#2196F3', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>♛</span>
                  Please join the game escrow (Black player)
                </div>
              )}
              
              {readyToDeposit && !readyToStart && (
                <div style={{ color: '#4CAF50', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>💰</span>
                  Ready to deposit! Both players can now deposit their stakes.
                </div>
              )}
              
              {readyToStart && !gameStarted && (
                <div style={{ color: '#4CAF50', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>✅</span>
                  Ready to start the game!
                </div>
              )}
              
              {gameStarted && (
                <div style={{ color: '#4CAF50', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>🎮</span>
                  Game has started!
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Player Info Section */}
      <section style={{ 
        ...cardStyle,
        margin: isMobile ? '0 auto 1.5rem auto' : '0 auto 2rem auto',
        padding: isDesktopLayout ? '2rem' : '1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(45deg, ${theme.accent}08 0%, ${theme.primary}05 100%)`,
          zIndex: 0
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              width: '3px',
              height: '20px',
              background: `linear-gradient(to bottom, ${theme.accent}, ${theme.primary})`,
              borderRadius: '2px'
            }} />
            <h3 style={{ 
              margin: 0, 
              color: theme.text,
              fontSize: isDesktopLayout ? '20px' : '18px',
              fontWeight: '600'
            }}>Your Info</h3>
          </div>
          
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: isDesktopLayout ? '16px' : '12px'
          }}>
            <div style={{ 
              textAlign: 'left',
              padding: isDesktopLayout ? '16px' : '12px',
              background: `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
              borderRadius: '12px',
              border: `1px solid ${theme.border}`,
              transition: 'all 0.2s ease'
            }}>
              <div style={{ fontSize: isDesktopLayout ? '14px' : '12px', color: theme.textSecondary, marginBottom: '6px', fontWeight: '600' }}>
                Role:
              </div>
              <div style={{ 
                fontSize: isDesktopLayout ? '16px' : '14px', 
                fontWeight: 'bold',
                color: playerRole === 'white' ? '#4CAF50' : '#FF9800',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ fontSize: '18px' }}>{playerRole === 'white' ? '♔' : '♚'}</span>
                {playerRole.toUpperCase()}
              </div>
            </div>
            
            <div style={{ 
              textAlign: 'left',
              padding: isDesktopLayout ? '16px' : '12px',
              background: `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
              borderRadius: '12px',
              border: `1px solid ${theme.border}`,
              transition: 'all 0.2s ease'
            }}>
              <div style={{ fontSize: isDesktopLayout ? '14px' : '12px', color: theme.textSecondary, marginBottom: '6px', fontWeight: '600' }}>
                Wallet:
              </div>
              <div style={{ 
                fontSize: isDesktopLayout ? '12px' : '10px', 
                fontFamily: 'monospace',
                color: theme.text,
                background: `${theme.primary}10`,
                padding: '4px 8px',
                borderRadius: '6px',
                border: `1px solid ${theme.primary}20`,
                textAlign: 'center',
                lineHeight: 1.4
              }}>
                {playerWallet.length > 20 
                  ? `${playerWallet.slice(0, 6)}...${playerWallet.slice(-4)}`
                  : playerWallet
                }
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <section style={{ 
        margin: isMobile ? '1.5rem auto 0 auto' : '2rem auto 0 auto',
        display: 'flex',
        flexWrap: 'wrap',
        gap: isDesktopLayout ? '16px' : '12px',
        justifyContent: 'center',
        width: isDesktopLayout ? '800px' : '95%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Create Escrow Button (White player first) */}
        {!escrowCreated && connected && playerRole === 'white' && escrowCount === 0 && (
          <button
            onClick={onCreateEscrow}
            disabled={isLoading}
            style={{
              ...sharedButtonStyle,
              backgroundColor: isLoading ? theme.border : theme.primary,
              color: 'white',
              border: 'none',
              fontSize: isDesktopLayout ? '16px' : '14px',
              fontWeight: '600' as const,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isLoading ? 'none' : `0 4px 12px ${theme.primary}40`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Shimmer effect for primary button */}
            {!isLoading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)`,
                animation: 'shimmer 2s infinite',
                zIndex: 1
              }} />
            )}
            <span style={{ position: 'relative', zIndex: 2 }}>
              {isLoading ? '⏳ Creating...' : '🤵 Create Game (White Player)'}
            </span>
          </button>
        )}

        {/* Join Escrow Button (Black player second) */}
        {!escrowCreated && connected && playerRole === 'black' && escrowCount === 1 && (
          <button
            onClick={onCreateEscrow}
            disabled={isLoading}
            style={{
              ...sharedButtonStyle,
              backgroundColor: isLoading ? theme.border : theme.warning,
              color: 'white',
              border: 'none',
              fontSize: isDesktopLayout ? '16px' : '14px',
              fontWeight: '600' as const,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isLoading ? 'none' : `0 4px 12px ${theme.warning}40`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Shimmer effect for warning button */}
            {!isLoading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)`,
                animation: 'shimmer 2s infinite',
                zIndex: 1
              }} />
            )}
            <span style={{ position: 'relative', zIndex: 2 }}>
              {isLoading ? '⏳ Joining...' : '♛ Join Game (Black Player)'}
            </span>
          </button>
        )}

        {/* Escrow Created Indicator */}
        {escrowCreated && !readyToDeposit && (
          <div style={{
            ...sharedButtonStyle,
            background: `linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)`,
            color: '#155724',
            border: '1px solid #c3e6cb',
            fontSize: isDesktopLayout ? '16px' : '14px',
            fontWeight: '600' as const,
            boxShadow: '0 4px 12px rgba(21, 87, 36, 0.2)',
            cursor: 'default',
            animation: 'pulse 2s infinite'
          }}>
            <span style={{ fontSize: '18px', marginRight: '8px' }}>✅</span>
            Joined Game - Waiting for opponent
          </div>
        )}

        {/* Back to Menu Button */}
        <button
          onClick={onBackToMenu}
          style={{
            ...sharedButtonStyle,
            background: `linear-gradient(135deg, ${theme.surface} 0%, ${theme.background} 100%)`,
            color: theme.text,
            border: `2px solid ${theme.border}`,
            fontSize: isDesktopLayout ? '16px' : '14px',
            fontWeight: '600' as const,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          }}
        >
          <span style={{ fontSize: '16px', marginRight: '8px' }}>←</span>
          Back to Menu
        </button>
      </section>
    </div>
  );
};

export default LobbyView;