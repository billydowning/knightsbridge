/**
 * Lobby View Component
 * Room management screen showing players, escrows, and game start options
 */

import React from 'react';
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
  const [copied, setCopied] = React.useState(false);
  
  const playerCount = roomStatus?.playerCount || 0;
  const escrowCount = roomStatus?.escrowCount || 0;
  const gameStarted = roomStatus?.gameStarted || false;
  const bothPlayersPresent = playerCount === 2;
  const bothEscrowsCreated = escrowCount === 2 || (escrowCreated && opponentEscrowCreated);
  const readyToStart = bothPlayersPresent && bothEscrowsCreated;

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>🏠 Room: {roomId}</h2>
      
      {/* Room ID Share Section */}
      <div style={{ 
        margin: '20px 0',
        padding: '20px',
        backgroundColor: '#e8f5e8',
        borderRadius: '10px',
        border: '2px solid #4CAF50'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#2e7d32' }}>📋 Share Room ID</h3>
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
              border: '2px solid #4CAF50',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              color: '#2e7d32',
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
              backgroundColor: copied ? '#45a049' : '#4CAF50',
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
        <p style={{ 
          margin: '10px 0 0 0', 
          fontSize: '14px', 
          color: '#2e7d32',
          fontStyle: 'italic'
        }}>
          {playerRole === 'white' 
            ? 'Share this Room ID with your opponent (Black player)'
            : 'You joined this room as Black player'
          }
        </p>
      </div>
      
      {/* Player Info */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          border: '2px solid #dee2e6'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>👤 Your Info</h4>
          <p style={{ margin: '5px 0' }}>
            <strong>Role:</strong> 
            <span style={{ 
              color: playerRole === 'white' ? '#4CAF50' : '#FF9800',
              fontWeight: 'bold',
              marginLeft: '5px'
            }}>
              {playerRole.toUpperCase()}
            </span>
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>Wallet:</strong> {playerWallet.slice(0, 6)}...{playerWallet.slice(-4)}
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>Bet:</strong> {betAmount} SOL
          </p>
        </div>

        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          border: '2px solid #dee2e6'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>🎮 Room Status</h4>
          <p style={{ margin: '5px 0' }}>
            <strong>Players:</strong> {playerCount}/2
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>Your Escrow:</strong> 
            <span style={{ 
              color: escrowCreated ? '#4CAF50' : '#ff9800',
              fontWeight: 'bold',
              marginLeft: '5px'
            }}>
              {escrowCreated ? '✅ Created' : '❌ Not Created'}
            </span>
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>Opponent Escrow:</strong> 
            <span style={{ 
              color: opponentEscrowCreated ? '#4CAF50' : '#ff9800',
              fontWeight: 'bold',
              marginLeft: '5px'
            }}>
              {opponentEscrowCreated ? '✅ Created' : '⏳ Waiting...'}
            </span>
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>Game Ready:</strong> 
            <span style={{ 
              color: bothEscrowsReady ? '#4CAF50' : '#ff9800',
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
          background: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '8px', 
          margin: '20px 0',
          border: '1px solid #dee2e6'
        }}>
          <h4 style={{ margin: '0 0 15px 0' }}>👥 Players in Room</h4>
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
                  backgroundColor: player.wallet === playerWallet ? '#e3f2fd' : '#ffffff',
                  borderRadius: '5px',
                  border: player.wallet === playerWallet ? '2px solid #2196F3' : '1px solid #dee2e6'
                }}
              >
                <p style={{ margin: '0', fontWeight: 'bold' }}>
                  <span style={{ 
                    color: player.role === 'white' ? '#4CAF50' : '#FF9800' 
                  }}>
                    {player.role.toUpperCase()}:
                  </span>
                </p>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                  {player.wallet.slice(0, 8)}...{player.wallet.slice(-6)}
                  {player.wallet === playerWallet && (
                    <span style={{ 
                      backgroundColor: '#2196F3', 
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
          background: '#fff3cd', 
          padding: '15px', 
          borderRadius: '8px', 
          margin: '20px 0',
          border: '1px solid #ffeaa7'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>⚠️ Waiting for Opponent!</h4>
          <p style={{ margin: '10px 0' }}>Share this room ID with your opponent:</p>
          <code style={{ 
            background: '#f8f9fa', 
            padding: '8px 12px', 
            borderRadius: '4px',
            fontSize: '18px',
            fontWeight: 'bold',
            border: '1px solid #dee2e6'
          }}>
            {roomId}
          </code>
          <p style={{ margin: '10px 0', fontSize: '14px', color: '#666' }}>
            Tell them to enter this room ID and click "Join Room"
          </p>
        </div>
      )}

      {/* Real-time Sync Indicator */}
      <div style={{ 
        background: '#e7f3ff', 
        padding: '8px', 
        borderRadius: '4px', 
        margin: '15px 0', 
        fontSize: '12px',
        color: '#1976d2'
      }}>
        🔄 Real-time sync active - updates automatically
      </div>

      {/* New Game Indicator */}
      {escrowCount === 0 && (
        <div style={{ 
          background: '#fff3cd', 
          padding: '15px', 
          borderRadius: '8px', 
          margin: '20px 0',
          border: '1px solid #ffeaa7'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>🎮 Ready for New Game!</h4>
          <p style={{ margin: '0' }}>Both players need to create new escrows to start playing again.</p>
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
              backgroundColor: connected && !isLoading ? '#FF9800' : '#ccc',
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
              background: '#d4edda', 
              padding: '15px', 
              borderRadius: '8px', 
              margin: '20px 0',
              border: '1px solid #c3e6cb'
            }}>
              <p style={{ margin: '0', fontWeight: 'bold', color: '#155724' }}>
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
                  backgroundColor: isLoading ? '#ccc' : '#2196F3',
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
            backgroundColor: '#666',
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
        backgroundColor: '#f8f9fa', 
        borderRadius: '5px',
        fontSize: '14px',
        color: '#666'
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