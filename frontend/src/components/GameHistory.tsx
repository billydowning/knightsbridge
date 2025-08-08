/**
 * GameHistory Dashboard Component
 * Toyota Reliability: Comprehensive game history with reconnection capabilities
 */

import React, { useState, useEffect } from 'react';

interface GameHistoryEntry {
  roomId: string;
  gameActive: boolean;
  winner: 'white' | 'black' | 'draw' | null;
  playerRole: 'white' | 'black';
  opponentWallet: string;
  betAmount: number;
  moveCount: number;
  gameStarted: string;
  gameEnded?: string;
  winnings?: number;
  winningsClaimed: boolean;
  claimTransactionHash?: string;
}

interface GameHistoryProps {
  playerWallet: string;
  isOpen: boolean;
  onClose: () => void;
  onReconnectToGame: (roomId: string) => void;
  onClaimWinnings: (roomId: string, winnings: number) => Promise<string>;
}

export const GameHistory: React.FC<GameHistoryProps> = ({
  playerWallet,
  isOpen,
  onClose,
  onReconnectToGame,
  onClaimWinnings
}) => {
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [claimingGame, setClaimingGame] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load game history when dashboard opens
  useEffect(() => {
    if (isOpen && playerWallet) {
      loadGameHistory();
    }
  }, [isOpen, playerWallet]);

  const loadGameHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API call to backend
      const response = await fetch(`/api/games/history/${playerWallet}`);
      if (response.ok) {
        const history = await response.json();
        setGameHistory(history);
      } else {
        throw new Error('Failed to load game history');
      }
    } catch (err) {
      console.error('❌ Error loading game history:', err);
      setError('Failed to load game history. Please try again.');
      
      // 🚛 TOYOTA: Mock data for development
      setGameHistory([
        {
          roomId: 'ROOM-ABC123',
          gameActive: true,
          winner: null,
          playerRole: 'white',
          opponentWallet: '7xKXt...9Y2z',
          betAmount: 0.1,
          moveCount: 12,
          gameStarted: '2025-01-08T18:30:00Z',
          winnings: 0,
          winningsClaimed: false
        },
        {
          roomId: 'ROOM-DEF456',
          gameActive: false,
          winner: 'white',
          playerRole: 'white',
          opponentWallet: '9zR4K...3L8m',
          betAmount: 0.05,
          moveCount: 28,
          gameStarted: '2025-01-08T17:15:00Z',
          gameEnded: '2025-01-08T17:45:00Z',
          winnings: 0.099,
          winningsClaimed: false
        },
        {
          roomId: 'ROOM-GHI789',
          gameActive: false,
          winner: 'draw',
          playerRole: 'black',
          opponentWallet: '2mP8T...6N1k',
          betAmount: 0.2,
          moveCount: 45,
          gameStarted: '2025-01-08T16:00:00Z',
          gameEnded: '2025-01-08T16:35:00Z',
          winnings: 0.198,
          winningsClaimed: true,
          claimTransactionHash: '3K9mL...8F2q'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReconnect = (roomId: string) => {
    console.log('🔄 Reconnecting to game:', roomId);
    onReconnectToGame(roomId);
    onClose();
  };

  const handleClaimWinnings = async (roomId: string, winnings: number) => {
    setClaimingGame(roomId);
    setError(null);
    
    try {
      console.log(`💰 Claiming winnings for ${roomId}: ${winnings} SOL`);
      const transactionHash = await onClaimWinnings(roomId, winnings);
      
      // Update local state to reflect claim
      setGameHistory(prev => 
        prev.map(game => 
          game.roomId === roomId 
            ? { ...game, winningsClaimed: true, claimTransactionHash: transactionHash }
            : game
        )
      );
      
      console.log('✅ Winnings claimed successfully:', transactionHash);
    } catch (err) {
      console.error('❌ Error claiming winnings:', err);
      setError(`Failed to claim winnings: ${err.message}`);
    } finally {
      setClaimingGame(null);
    }
  };

  const getGameStatusBadge = (game: GameHistoryEntry) => {
    if (game.gameActive) {
      return <span style={{ 
        backgroundColor: '#28a745', 
        color: 'white', 
        padding: '2px 8px', 
        borderRadius: '12px', 
        fontSize: '11px',
        fontWeight: 'bold'
      }}>ACTIVE</span>;
    }
    
    if (game.winner === game.playerRole) {
      return <span style={{ 
        backgroundColor: '#007bff', 
        color: 'white', 
        padding: '2px 8px', 
        borderRadius: '12px', 
        fontSize: '11px',
        fontWeight: 'bold'
      }}>WON</span>;
    }
    
    if (game.winner === 'draw') {
      return <span style={{ 
        backgroundColor: '#6c757d', 
        color: 'white', 
        padding: '2px 8px', 
        borderRadius: '12px', 
        fontSize: '11px',
        fontWeight: 'bold'
      }}>DRAW</span>;
    }
    
    return <span style={{ 
      backgroundColor: '#dc3545', 
      color: 'white', 
      padding: '2px 8px', 
      borderRadius: '12px', 
      fontSize: '11px',
      fontWeight: 'bold'
    }}>LOST</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const shortenWallet = (wallet: string) => {
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  };

  if (!isOpen) return null;

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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '900px',
        width: '90%',
        maxHeight: '80%',
        overflow: 'auto',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e9ecef'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#212529' }}>
              Game History
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6c757d' }}>
              {shortenWallet(playerWallet)}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6c757d',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#6c757d'
          }}>
            Loading game history...
          </div>
        ) : gameHistory.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#6c757d'
          }}>
            No games found. Start playing to see your history!
          </div>
        ) : (
          <>
            {/* Games Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Status</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Room</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Opponent</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Bet</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Moves</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Date</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Winnings</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {gameHistory.map((game) => (
                    <tr key={game.roomId} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={{ padding: '12px 8px' }}>
                        {getGameStatusBadge(game)}
                      </td>
                      <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontSize: '12px' }}>
                        {game.roomId}
                      </td>
                      <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontSize: '12px' }}>
                        {shortenWallet(game.opponentWallet)}
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: '600' }}>
                        {game.betAmount} SOL
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {game.moveCount}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '12px', color: '#6c757d' }}>
                        {formatDate(game.gameStarted)}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {game.winnings ? (
                          <div style={{ fontSize: '12px' }}>
                            <div style={{ fontWeight: '600', color: '#28a745' }}>
                              +{game.winnings} SOL
                            </div>
                            {game.winningsClaimed && (
                              <div style={{ color: '#6c757d', fontSize: '10px' }}>
                                Claimed ✓
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#6c757d', fontSize: '12px' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {game.gameActive ? (
                          <button
                            onClick={() => handleReconnect(game.roomId)}
                            style={{
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            Reconnect
                          </button>
                        ) : game.winnings && !game.winningsClaimed ? (
                          <button
                            onClick={() => handleClaimWinnings(game.roomId, game.winnings)}
                            disabled={claimingGame === game.roomId}
                            style={{
                              backgroundColor: claimingGame === game.roomId ? '#6c757d' : '#28a745',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: claimingGame === game.roomId ? 'not-allowed' : 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            {claimingGame === game.roomId ? 'Claiming...' : 'Claim'}
                          </button>
                        ) : (
                          <span style={{ color: '#6c757d', fontSize: '12px' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GameHistory;