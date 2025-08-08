/**
 * Game History Component
 * Shows user's complete game history with results, moves, and actions
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../App';
import { useTextSizes, useIsMobile, useIsDesktopLayout } from '../utils/responsive';

export interface GameHistoryItem {
  id: string;
  roomId: string;
  blockchainTxId?: string;
  playerWhite: string;
  playerBlack: string;
  opponentWallet: string;
  stakeAmount: number;
  platformFee: number;
  winner?: string;
  gameResult?: string;
  timeControl: string;
  timeLimit?: number;
  increment?: number;
  gameState: 'waiting' | 'active' | 'finished' | 'cancelled';
  moveCount: number;
  finalPosition?: string;
  pgn?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  userColor: 'white' | 'black';
  userResult?: 'win' | 'loss' | 'draw';
  escrowStatus: string;
  canClaimWinnings: boolean;
  canReconnect: boolean;
  totalMoves: number;
  moves: Array<{
    move_number: number;
    player: 'white' | 'black';
    from_square: string;
    to_square: string;
    piece: string;
    captured_piece?: string;
    move_notation: string;
    time_spent?: number;
    is_check?: boolean;
    is_checkmate?: boolean;
    is_castle?: boolean;
    is_en_passant?: boolean;
    is_promotion?: boolean;
    promotion_piece?: string;
    created_at: string;
  }>;
}

export interface GameHistoryProps {
  walletAddress: string;
  onClaimWinnings: (roomId: string, stakeAmount: number) => Promise<void>;
  onReconnectGame: (roomId: string) => void;
  onClose: () => void;
}

export const GameHistory: React.FC<GameHistoryProps> = ({
  walletAddress,
  onClaimWinnings,
  onReconnectGame,
  onClose
}) => {
  const { theme } = useTheme();
  const textSizes = useTextSizes();
  const isMobile = useIsMobile();
  const isDesktopLayout = useIsDesktopLayout();

  const [games, setGames] = useState<GameHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'finished'>('all');
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [claimingWinnings, setClaimingWinnings] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch game history
  const fetchGameHistory = async (pageNum: number = 1, statusFilter: string = 'all') => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🎮 Loading game history for:', walletAddress);
      
      const response = await fetch(
        `${process.env.NODE_ENV === 'production' 
          ? 'https://knightsbridge-app-35xls.ondigitalocean.app/api'
          : 'https://knightsbridge-app-35xls.ondigitalocean.app/api'
        }/users/${walletAddress}/games?page=${pageNum}&limit=10&status=${statusFilter}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setGames(data.games);
        setTotalPages(data.pagination.totalPages);
        console.log(`✅ Loaded ${data.games.length} games for user`);
      } else {
        throw new Error(data.error || 'Failed to fetch game history');
      }
    } catch (error) {
      console.error('❌ Error fetching game history:', error);
      setError(error instanceof Error ? error.message : 'Failed to load game history');
    } finally {
      setLoading(false);
    }
  };

  // Load game history on mount and when filter/page changes
  useEffect(() => {
    if (walletAddress) {
      fetchGameHistory(page, filter);
    }
  }, [walletAddress, page, filter]);

  // Handle claiming winnings
  const handleClaimWinnings = async (roomId: string, stakeAmount: number) => {
    try {
      setClaimingWinnings(prev => new Set([...prev, roomId]));
      await onClaimWinnings(roomId, stakeAmount);
      
      // Refresh the game history to update claim status
      await fetchGameHistory(page, filter);
    } catch (error) {
      console.error('❌ Error claiming winnings:', error);
    } finally {
      setClaimingWinnings(prev => {
        const newSet = new Set(prev);
        newSet.delete(roomId);
        return newSet;
      });
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Format wallet address for display
  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  // Get result display info
  const getResultInfo = (game: GameHistoryItem) => {
    if (game.gameState === 'active') {
      return { text: 'In Progress', color: theme.warning, icon: '⏳' };
    }
    
    if (!game.userResult) {
      return { text: 'No Result', color: theme.textSecondary, icon: '❓' };
    }
    
    switch (game.userResult) {
      case 'win':
        return { text: 'Won', color: theme.success, icon: '🏆' };
      case 'loss':
        return { text: 'Lost', color: theme.error, icon: '💀' };
      case 'draw':
        return { text: 'Draw', color: theme.warning, icon: '🤝' };
      default:
        return { text: 'Unknown', color: theme.textSecondary, icon: '❓' };
    }
  };

  const cardStyle = {
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: '12px',
    boxShadow: theme.shadow,
    marginBottom: '16px',
    overflow: 'hidden' as const
  };

  const buttonStyle = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontWeight: '600' as const,
    fontSize: '14px',
    cursor: 'pointer' as const,
    transition: 'all 0.2s ease',
    marginRight: '8px'
  };

  if (loading && games.length === 0) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}>
        <div style={{
          ...cardStyle,
          padding: '2rem',
          maxWidth: '90vw',
          width: '400px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <h2 style={{ color: theme.text, marginBottom: '8px' }}>Loading Game History</h2>
          <p style={{ color: theme.textSecondary, margin: 0 }}>
            Fetching your games...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: isMobile ? '16px' : '32px'
    }}>
      <div style={{
        ...cardStyle,
        width: '100%',
        maxWidth: isDesktopLayout ? '1000px' : '90vw',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{
              color: theme.text,
              margin: 0,
              fontSize: isDesktopLayout ? '24px' : '20px',
              fontWeight: '700'
            }}>
              🎮 Game History
            </h2>
            <p style={{
              color: theme.textSecondary,
              margin: '4px 0 0 0',
              fontSize: '14px'
            }}>
              {formatWallet(walletAddress)} • {games.length} games
            </p>
          </div>
          
          <button
            onClick={onClose}
            style={{
              ...buttonStyle,
              backgroundColor: theme.error,
              color: 'white',
              marginRight: 0
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Filter Tabs */}
        <div style={{
          padding: '16px 24px 0 24px',
          display: 'flex',
          gap: '8px',
          borderBottom: `1px solid ${theme.border}`
        }}>
          {(['all', 'active', 'finished'] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => {
                setFilter(filterOption);
                setPage(1);
              }}
              style={{
                ...buttonStyle,
                backgroundColor: filter === filterOption ? theme.primary : 'transparent',
                color: filter === filterOption ? 'white' : theme.text,
                border: `1px solid ${filter === filterOption ? theme.primary : theme.border}`,
                marginRight: 0,
                marginBottom: '16px'
              }}
            >
              {filterOption === 'all' ? 'All Games' : 
               filterOption === 'active' ? 'Active' : 'Finished'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px 24px'
        }}>
          {error ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: theme.error
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
              <h3>Error Loading Games</h3>
              <p>{error}</p>
              <button
                onClick={() => fetchGameHistory(page, filter)}
                style={{
                  ...buttonStyle,
                  backgroundColor: theme.primary,
                  color: 'white',
                  marginRight: 0
                }}
              >
                Try Again
              </button>
            </div>
          ) : games.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: theme.textSecondary
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
              <h3>No Games Found</h3>
              <p>
                {filter === 'all' 
                  ? 'You haven\'t played any games yet. Start your first game!'
                  : `No ${filter} games found.`
                }
              </p>
            </div>
          ) : (
            <>
              {games.map((game) => {
                const resultInfo = getResultInfo(game);
                const isExpanded = expandedGame === game.roomId;
                
                return (
                  <div key={game.roomId} style={cardStyle}>
                    {/* Game Summary */}
                    <div
                      style={{
                        padding: '16px 20px',
                        cursor: 'pointer',
                        borderBottom: isExpanded ? `1px solid ${theme.border}` : 'none'
                      }}
                      onClick={() => setExpandedGame(isExpanded ? null : game.roomId)}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <span style={{
                            fontSize: '16px',
                            color: resultInfo.color,
                            fontWeight: '600'
                          }}>
                            {resultInfo.icon} {resultInfo.text}
                          </span>
                          
                          <div style={{
                            padding: '2px 8px',
                            backgroundColor: `${theme.primary}20`,
                            color: theme.primary,
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {game.userColor === 'white' ? '⚪ White' : '⚫ Black'}
                          </div>
                          
                          <div style={{
                            padding: '2px 8px',
                            backgroundColor: `${theme.textSecondary}20`,
                            color: theme.textSecondary,
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {game.timeControl}
                          </div>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: theme.text
                          }}>
                            {game.stakeAmount} SOL
                          </span>
                          
                          <span style={{
                            fontSize: '20px',
                            color: theme.textSecondary,
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease'
                          }}>
                            ▼
                          </span>
                        </div>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '14px',
                        color: theme.textSecondary
                      }}>
                        <span>
                          vs {formatWallet(game.opponentWallet)} • {game.totalMoves} moves
                        </span>
                        <span>
                          {formatDate(game.createdAt)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <div style={{
                        padding: '16px 20px',
                        backgroundColor: `${theme.background}50`
                      }}>
                        {/* Action Buttons */}
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          marginBottom: '16px',
                          flexWrap: 'wrap' as const
                        }}>
                          {game.canClaimWinnings && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClaimWinnings(game.roomId, game.stakeAmount);
                              }}
                              disabled={claimingWinnings.has(game.roomId)}
                              style={{
                                ...buttonStyle,
                                backgroundColor: theme.success,
                                color: 'white',
                                opacity: claimingWinnings.has(game.roomId) ? 0.6 : 1
                              }}
                            >
                              {claimingWinnings.has(game.roomId) 
                                ? '⏳ Claiming...' 
                                : '💰 Claim Winnings'
                              }
                            </button>
                          )}
                          
                          {game.canReconnect && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onReconnectGame(game.roomId);
                                onClose();
                              }}
                              style={{
                                ...buttonStyle,
                                backgroundColor: theme.warning,
                                color: 'white'
                              }}
                            >
                              🔄 Reconnect
                            </button>
                          )}
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(game.roomId);
                            }}
                            style={{
                              ...buttonStyle,
                              backgroundColor: 'transparent',
                              color: theme.text,
                              border: `1px solid ${theme.border}`
                            }}
                          >
                            📋 Copy Room ID
                          </button>
                        </div>
                        
                        {/* Game Details */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                          gap: '12px',
                          marginBottom: '16px'
                        }}>
                          <div>
                            <strong style={{ color: theme.text }}>Room ID:</strong>
                            <div style={{ 
                              color: theme.textSecondary, 
                              fontFamily: 'monospace',
                              fontSize: '12px'
                            }}>
                              {game.roomId}
                            </div>
                          </div>
                          
                          {game.gameResult && (
                            <div>
                              <strong style={{ color: theme.text }}>Result:</strong>
                              <div style={{ color: theme.textSecondary }}>
                                {game.gameResult}
                              </div>
                            </div>
                          )}
                          
                          {game.startedAt && (
                            <div>
                              <strong style={{ color: theme.text }}>Started:</strong>
                              <div style={{ color: theme.textSecondary }}>
                                {formatDate(game.startedAt)}
                              </div>
                            </div>
                          )}
                          
                          {game.finishedAt && (
                            <div>
                              <strong style={{ color: theme.text }}>Finished:</strong>
                              <div style={{ color: theme.textSecondary }}>
                                {formatDate(game.finishedAt)}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Move History */}
                        {game.moves.length > 0 && (
                          <div>
                            <strong style={{ color: theme.text, marginBottom: '8px', display: 'block' }}>
                              Move History ({game.moves.length} moves):
                            </strong>
                            <div style={{
                              maxHeight: '200px',
                              overflow: 'auto',
                              backgroundColor: theme.surface,
                              border: `1px solid ${theme.border}`,
                              borderRadius: '6px',
                              padding: '8px'
                            }}>
                              {game.moves.map((move, index) => (
                                <div
                                  key={index}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '4px 8px',
                                    backgroundColor: index % 2 === 0 ? 'transparent' : `${theme.primary}05`,
                                    borderRadius: '3px',
                                    fontSize: '14px'
                                  }}
                                >
                                  <span style={{ color: theme.text }}>
                                    {move.move_number}. {move.player === 'white' ? '⚪' : '⚫'} {move.move_notation}
                                  </span>
                                  <span style={{ 
                                    color: theme.textSecondary,
                                    fontSize: '12px',
                                    fontFamily: 'monospace'
                                  }}>
                                    {move.from_square}→{move.to_square}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '24px'
                }}>
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    style={{
                      ...buttonStyle,
                      backgroundColor: 'transparent',
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                      opacity: page === 1 ? 0.5 : 1,
                      cursor: page === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ← Previous
                  </button>
                  
                  <span style={{
                    color: theme.text,
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    Page {page} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    style={{
                      ...buttonStyle,
                      backgroundColor: 'transparent',
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                      opacity: page === totalPages ? 0.5 : 1,
                      cursor: page === totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameHistory;