/**
 * Leaderboard Component
 * Displays top players with their statistics
 */

import React from 'react';
import { useTheme } from '../App';
import { useIsDesktopLayout, useIsMobile } from '../utils/responsive';

export interface LeaderboardPlayer {
  rank: number;
  wallet: string;
  username: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesDrawn: number;
  gamesLost: number;
  winPercentage: number;
  totalWinnings: number;
  totalLosses: number;
  netEarnings: number;
  currentStreak: number;
  bestStreak: number;
  ratingRapid: number;
  ratingBlitz: number;
  ratingBullet: number;
  lastActive: string;
}

export interface LeaderboardProps {
  leaderboard: LeaderboardPlayer[];
  isLoading: boolean;
  error?: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  leaderboard,
  isLoading,
  error
}) => {
  const { theme } = useTheme();
  const isDesktopLayout = useIsDesktopLayout();
  const isMobile = useIsMobile();

  const getRankIcon = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const formatSOL = (amount: number): string => {
    if (amount === 0) return '0 SOL';
    if (amount < 0.001) return '<0.001 SOL';
    return `${amount.toFixed(3)} SOL`;
  };

  const formatWinRate = (percentage: number): string => {
    return `${percentage.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div style={{
        backgroundColor: theme.surface,
        padding: isDesktopLayout ? '3rem' : '1.5rem',
        borderRadius: isDesktopLayout ? '16px' : '12px',
        boxShadow: theme.shadow,
        border: `1px solid ${theme.border}`,
        maxWidth: isDesktopLayout ? '800px' : '100%',
        width: '100%',
        margin: '0 auto',
        marginBottom: isDesktopLayout ? '2rem' : '1.5rem',
        boxSizing: 'border-box',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            width: '3px',
            height: '40px',
            backgroundColor: theme.primary,
            borderRadius: '2px'
          }} />
          <h2 style={{ 
            margin: 0, 
            color: theme.text,
            fontSize: isDesktopLayout ? '1.5rem' : '1.25rem',
            fontWeight: '600'
          }}>
            🏆 Leaderboard
          </h2>
          <div style={{
            width: '3px',
            height: '40px',
            backgroundColor: theme.primary,
            borderRadius: '2px'
          }} />
        </div>
        <div style={{
          color: theme.textSecondary,
          fontSize: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.5rem' }}>⏳</span>
          Loading leaderboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: theme.surface,
        padding: isDesktopLayout ? '3rem' : '1.5rem',
        borderRadius: isDesktopLayout ? '16px' : '12px',
        boxShadow: theme.shadow,
        border: `1px solid ${theme.border}`,
        maxWidth: isDesktopLayout ? '800px' : '100%',
        width: '100%',
        margin: '0 auto',
        marginBottom: isDesktopLayout ? '2rem' : '1.5rem',
        boxSizing: 'border-box',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            width: '3px',
            height: '40px',
            backgroundColor: theme.primary,
            borderRadius: '2px'
          }} />
          <h2 style={{ 
            margin: 0, 
            color: theme.text,
            fontSize: isDesktopLayout ? '1.5rem' : '1.25rem',
            fontWeight: '600'
          }}>
            🏆 Leaderboard
          </h2>
          <div style={{
            width: '3px',
            height: '40px',
            backgroundColor: theme.primary,
            borderRadius: '2px'
          }} />
        </div>
        <div style={{
          color: theme.warning,
          padding: '1rem',
          backgroundColor: `${theme.warning}10`,
          borderRadius: '8px',
          border: `1px solid ${theme.warning}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem'
        }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div>Failed to load leaderboard</div>
        </div>
      </div>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div style={{
        backgroundColor: theme.surface,
        padding: isDesktopLayout ? '3rem' : '1.5rem',
        borderRadius: isDesktopLayout ? '16px' : '12px',
        boxShadow: theme.shadow,
        border: `1px solid ${theme.border}`,
        maxWidth: isDesktopLayout ? '800px' : '100%',
        width: '100%',
        margin: '0 auto',
        marginBottom: isDesktopLayout ? '2rem' : '1.5rem',
        boxSizing: 'border-box',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            width: '3px',
            height: '40px',
            backgroundColor: theme.primary,
            borderRadius: '2px'
          }} />
          <h2 style={{ 
            margin: 0, 
            color: theme.text,
            fontSize: isDesktopLayout ? '1.5rem' : '1.25rem',
            fontWeight: '600'
          }}>
            🏆 Leaderboard
          </h2>
          <div style={{
            width: '3px',
            height: '40px',
            backgroundColor: theme.primary,
            borderRadius: '2px'
          }} />
        </div>
        <div style={{
          color: theme.textSecondary,
          fontSize: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.5rem' }}>🎯</span>
          No games played yet. Be the first to compete!
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: theme.surface,
      padding: isDesktopLayout ? '3rem' : '1.5rem',
      borderRadius: isDesktopLayout ? '16px' : '12px',
      boxShadow: theme.shadow,
      border: `1px solid ${theme.border}`,
      maxWidth: isDesktopLayout ? '800px' : '100%',
      width: '100%',
      margin: '0 auto',
      marginBottom: isDesktopLayout ? '2rem' : '1.5rem',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          width: '3px',
          height: '40px',
          backgroundColor: theme.primary,
          borderRadius: '2px'
        }} />
        <h2 style={{ 
          margin: 0, 
          color: theme.text,
          fontSize: isDesktopLayout ? '1.5rem' : '1.25rem',
          fontWeight: '600'
        }}>
          🏆 Leaderboard
        </h2>
        <div style={{
          width: '3px',
          height: '40px',
          backgroundColor: theme.primary,
          borderRadius: '2px'
        }} />
      </div>

      {/* Column Headers */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: isMobile ? '1rem 0.75rem' : '1.25rem 1.5rem',
        marginBottom: '0.5rem',
        borderBottom: `1px solid ${theme.border}`,
        gap: isMobile ? '0.75rem' : '1rem'
      }}>
        {/* Rank Header */}
        <div style={{
          minWidth: isMobile ? '40px' : '50px',
          textAlign: 'center',
          fontSize: isMobile ? '0.7rem' : '0.75rem',
          fontWeight: '600',
          color: theme.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Rank
        </div>

        {/* Player Header */}
        <div style={{
          flex: 1,
          fontSize: isMobile ? '0.7rem' : '0.75rem',
          fontWeight: '600',
          color: theme.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Player
        </div>

        {/* Stats Headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: isMobile ? '0.5rem' : '1rem',
          minWidth: isMobile ? '120px' : '200px'
        }}>
          <div style={{
            textAlign: 'center',
            fontSize: isMobile ? '0.7rem' : '0.75rem',
            fontWeight: '600',
            color: theme.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Wins
          </div>
          <div style={{
            textAlign: 'center',
            fontSize: isMobile ? '0.7rem' : '0.75rem',
            fontWeight: '600',
            color: theme.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Rate
          </div>
          {!isMobile && (
            <div style={{
              textAlign: 'center',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: theme.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Games
            </div>
          )}
          <div style={{
            textAlign: 'center',
            fontSize: isMobile ? '0.7rem' : '0.75rem',
            fontWeight: '600',
            color: theme.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Earned
          </div>
        </div>
      </div>

      {/* Players List */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '0.75rem' : '1rem'
      }}>
        {leaderboard.slice(0, 10).map((player) => (
          <div
            key={player.wallet}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: isMobile ? '1rem 0.75rem' : '1.25rem 1.5rem',
              backgroundColor: player.rank <= 3 
                ? `${theme.primary}08` 
                : theme.background,
              border: player.rank <= 3 
                ? `1px solid ${theme.primary}20` 
                : `1px solid ${theme.border}`,
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              gap: isMobile ? '0.75rem' : '1rem'
            }}
          >
            {/* Rank */}
            <div style={{
              minWidth: isMobile ? '40px' : '50px',
              textAlign: 'center',
              fontSize: isMobile ? '1rem' : '1.25rem',
              fontWeight: '700',
              color: player.rank <= 3 ? theme.primary : theme.text
            }}>
              {getRankIcon(player.rank)}
            </div>

            {/* Player Info */}
            <div style={{
              flex: 1,
              minWidth: 0 // Allow text to truncate
            }}>
              <div style={{
                fontSize: isMobile ? '0.9rem' : '1rem',
                fontWeight: '600',
                color: theme.text,
                marginBottom: '0.25rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {player.username}
              </div>
              <div style={{
                fontSize: isMobile ? '0.75rem' : '0.8rem',
                color: theme.textSecondary,
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {player.wallet.slice(0, 8)}...{player.wallet.slice(-4)}
              </div>
            </div>

            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: isMobile ? '0.5rem' : '1rem',
              minWidth: isMobile ? '120px' : '200px'
            }}>
              {/* Games Won */}
              <div style={{ 
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '2rem'
              }}>
                <div style={{
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  fontWeight: '700',
                  color: theme.primary
                }}>
                  {player.gamesWon}
                </div>
              </div>

              {/* Win Rate */}
              <div style={{ 
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '2rem'
              }}>
                <div style={{
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  fontWeight: '700',
                  color: player.winPercentage >= 60 ? '#4ECDC4' : theme.text
                }}>
                  {formatWinRate(player.winPercentage)}
                </div>
              </div>

              {/* Games Played (Desktop only) */}
              {!isMobile && (
                <div style={{ 
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '2rem'
                }}>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: theme.text
                  }}>
                    {player.gamesPlayed}
                  </div>
                </div>
              )}

              {/* Net Earnings */}
              <div style={{ 
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '2rem'
              }}>
                <div style={{
                  fontSize: isMobile ? '0.8rem' : '0.9rem',
                  fontWeight: '700',
                  color: player.netEarnings >= 0 ? '#4ECDC4' : theme.warning
                }}>
                  {formatSOL(player.netEarnings)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        marginTop: '1.5rem',
        padding: '1rem',
        backgroundColor: theme.background,
        borderRadius: '8px',
        border: `1px solid ${theme.border}`
      }}>
        <div style={{
          fontSize: isMobile ? '0.8rem' : '0.9rem',
          color: theme.textSecondary,
          fontStyle: 'italic'
        }}>
          Showing top {Math.min(leaderboard.length, 10)} players • Updated in real-time
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;