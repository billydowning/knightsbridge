/**
 * Lobby View Component
 * Room management screen showing players, escrows, and game start options
 */

import React from 'react';
import { useTheme } from '../App';
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
  
  // Debug: Log room status
  React.useEffect(() => {
    console.log('🔍 LobbyView room status:', roomStatus);
  }, [roomStatus]);
  
  // Calculate player count based on room status
  const playerCount = roomStatus?.playerCount || 0;
  
  const escrowCount = roomStatus?.escrowCount || 0;
  const gameStarted = roomStatus?.gameStarted || false;
  const bothPlayersPresent = playerCount === 2;
  const bothEscrowsCreated = escrowCount === 2 || (escrowCreated && opponentEscrowCreated);
  const readyToStart = bothPlayersPresent && bothEscrowsCreated;

  return (
    <div style={{ textAlign: 'center', color: theme.text }}>
      <h2 style={{ color: theme.text }}>🏠 Room ID: {roomId}</h2>
      
      {/* Room ID Share Section */}
      <div style={{ 
        margin: '20px auto',
        padding: '20px',
        backgroundColor: theme.surface,
        borderRadius: '10px',
        border: `2px solid ${theme.border}`,
        boxShadow: theme.shadow,
        width: '785px'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: theme.text }}>📋 Share Room ID</h3>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <input
            type="text"
            value={roomId}
            readOnly
            style={{
              padding: '12px 16px',
              fontSize: '18px',
              fontWeight: 'bold',
              border: `2px solid ${theme.border}`,
              borderRadius: '8px',
              backgroundColor: theme.background,
              color: theme.text,
              minWidth: '200px',
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
              padding: '12px 20px',
              backgroundColor: copied ? theme.secondary : theme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'background-color 0.3s ease'
            }}
          >
            {copied ? '✅ Copied!' : '📋 Copy'}
          </button>
        </div>
        <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: theme.textSecondary }}>
          Share this Room ID with your opponent to join the game
        </p>
      </div>
      
      {/* Player Info */}
      <div style={{ 
        display: 'flex',
        margin: '0 auto 20px auto',
        width: '785px'
      }}>
        <div style={{ 
          width: '392.5px',
          padding: '15px', 
          backgroundColor: theme.surface, 
          borderRadius: '8px',
          border: `2px solid ${theme.border}`,
          boxSizing: 'border-box'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: theme.text }}>👤 Your Info</h4>
          <p style={{ margin: '5px 0', color: theme.textSecondary }}>
            <strong>Role:</strong> 
            <span style={{ 
              color: playerRole === 'white' ? theme.success : theme.warning,
              fontWeight: 'bold',
              marginLeft: '5px'
            }}>
              {playerRole.toUpperCase()}
            </span>
          </p>
          <p style={{ margin: '5px 0', color: theme.textSecondary }}>
            <strong>Wallet:</strong> {playerWallet.slice(0, 6)}...{playerWallet.slice(-4)}
          </p>
          <p style={{ margin: '5px 0', color: theme.textSecondary }}>
            <strong>Bet:</strong> {betAmount} SOL
          </p>
        </div>

        <div style={{ 
          width: '392.5px',
          padding: '15px', 
          backgroundColor: theme.surface, 
          borderRadius: '8px',
          border: `2px solid ${theme.border}`,
          boxSizing: 'border-box'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: theme.text }}>🎮 Room Status</h4>
          <p style={{ margin: '5px 0', color: theme.textSecondary }}>
            <strong>Players:</strong> {playerCount}/2
          </p>
          <p style={{ margin: '5px 0', color: theme.textSecondary }}>
            <strong>Your Escrow:</strong> 
            <span style={{ 
              color: escrowCreated ? theme.success : theme.warning,
              fontWeight: 'bold',
              marginLeft: '5px'
            }}>
              {escrowCreated ? '✅ Created' : '❌ Not Created'}
            </span>
          </p>
          <p style={{ margin: '5px 0', color: theme.textSecondary }}>
            <strong>Opponent Escrow:</strong> 
            <span style={{ 
              color: opponentEscrowCreated ? theme.success : theme.warning,
              fontWeight: 'bold',
              marginLeft: '5px'
            }}>
              {opponentEscrowCreated ? '✅ Created' : '⏳ Waiting...'}
            </span>
          </p>
          <p style={{ margin: '5px 0', color: theme.textSecondary }}>
            <strong>Game Ready:</strong> 
            <span style={{ 
              color: bothEscrowsReady ? theme.success : theme.warning,
              fontWeight: 'bold',
              marginLeft: '5px'
            }}>
              {bothEscrowsReady ? '✅ Ready to Start!' : '⏳ Waiting for Escrows'}
            </span>
          </p>
        </div>
      </div>

      {/* Players List */}
      {roomStatus && roomStatus.players && (
        <div style={{ 
          background: theme.surface, 
          padding: '15px', 
          borderRadius: '8px', 
          margin: '20px auto',
          border: `1px solid ${theme.border}`,
          width: '785px'
        }}>
          <h4 style={{ margin: '0 0 15px 0', color: theme.text }}>👥 Players in Room</h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '10px'
          }}>
            {roomStatus.players.map((player, index) => (
              <div 
                key={index} 
                style={{ 
                  padding: '10px',
                  backgroundColor: player.wallet === playerWallet ? theme.primaryLight : theme.surface,
                  borderRadius: '5px',
                  border: player.wallet === playerWallet ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`
                }}
              >
                <p style={{ margin: '0', fontWeight: 'bold', color: theme.text }}>
                  <span style={{ 
                    color: player.role === 'white' ? theme.success : theme.warning 
                  }}>
                    {player.role.toUpperCase()}:
                  </span>
                </p>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: theme.textSecondary }}>
                  {player.wallet.slice(0, 8)}...{player.wallet.slice(-6)}
                  {player.wallet === playerWallet && (
                    <span style={{ 
                      backgroundColor: theme.primary, 
                      color: 'white', 
                      padding: '2px 6px', 
                      borderRadius: '10px', 
                      fontSize: '12px',
                      marginLeft: '8px'
                    }}>
                      YOU
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waiting for Opponent */}
      {playerCount === 1 && (
        <div style={{ 
          background: theme.warningLight, 
          padding: '15px', 
          borderRadius: '8px', 
          margin: '20px auto',
          border: `1px solid ${theme.warning}`,
          width: '785px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: theme.warning }}>⚠️ Waiting for Opponent!</h4>
          <p style={{ margin: '10px 0', color: theme.textSecondary }}>Share this room ID with your opponent:</p>
          <code style={{ 
            background: theme.surface, 
            padding: '8px 12px', 
            borderRadius: '4px',
            fontSize: '18px',
            fontWeight: 'bold',
            border: `1px solid ${theme.border}`
          }}>
            {roomId}
          </code>
          <p style={{ margin: '10px 0', fontSize: '14px', color: theme.textSecondary }}>
            Tell them to enter this room ID and click "Join Room"
          </p>
        </div>
      )}



      {/* New Game Indicator */}
      {escrowCount === 0 && (
        <div style={{ 
          background: theme.warningLight, 
          padding: '15px', 
          borderRadius: '8px', 
          margin: '20px auto',
          border: `1px solid ${theme.warning}`,
          width: '785px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: theme.warning }}>🎮 Ready for New Game!</h4>
          <p style={{ margin: '0', color: theme.textSecondary }}>Both players need to create new escrows to start playing again.</p>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ marginTop: '30px' }}>
        {!escrowCreated ? (
          <button
            onClick={() => {
              console.log('🔧 Create Escrow button clicked');
              console.log('Connected:', connected);
              console.log('IsLoading:', isLoading);
              onCreateEscrow();
            }}
            disabled={!connected || isLoading}
            style={{
              padding: '15px 30px',
              backgroundColor: connected && !isLoading ? theme.warning : theme.border,
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: connected && !isLoading ? 'pointer' : 'not-allowed',
              fontSize: '16px',
              fontWeight: 'bold',
              margin: '10px',
              minWidth: '180px'
            }}
          >
            {isLoading ? '⏳ Creating...' : '💰 Create Escrow'}
          </button>
        ) : (
          <div>
            <div style={{ 
              background: theme.successLight, 
              padding: '15px', 
              borderRadius: '8px', 
              margin: '20px auto',
              border: `1px solid ${theme.success}`,
              width: '785px'
            }}>
              <p style={{ margin: '0', fontWeight: 'bold', color: theme.successDark }}>
                ✅ Your escrow created! 
                {bothEscrowsCreated ? 
                  ' Game will start automatically...' : 
                  ` Waiting for opponent... (${escrowCount}/2)`}
              </p>
            </div>
            
            {readyToStart && (
              <button
                onClick={onStartGame}
                disabled={isLoading}
                style={{
                  padding: '15px 30px',
                  backgroundColor: isLoading ? theme.border : theme.info,
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  margin: '10px',
                  minWidth: '180px'
                }}
              >
                {isLoading ? '⏳ Starting...' : '🚀 Start Game Now'}
              </button>
            )}
          </div>
        )}

        {/* Back to Menu Button */}
        <button
          onClick={onBackToMenu}
          disabled={isLoading}
          style={{
            padding: '10px 20px',
            backgroundColor: theme.textSecondary,
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            margin: '10px',
            fontSize: '14px'
          }}
        >
          ← Back to Menu
        </button>
      </div>

      {/* Status Summary */}
      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: theme.surface, 
        borderRadius: '5px',
        fontSize: '14px',
        color: theme.textSecondary
      }}>
        <strong>Next Steps:</strong> {
          !bothPlayersPresent ? 'Waiting for second player to join' :
          !bothEscrowsCreated ? 'Both players need to create escrows' :
          'Ready to start game!'
        }
      </div>
    </div>
  );
};

export default LobbyView;