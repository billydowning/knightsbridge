/**
 * Menu View Component
 * Initial setup screen for creating or joining rooms
 */

import React from 'react';

export interface MenuViewProps {
  roomId: string;
  setRoomId: (roomId: string) => void;
  betAmount: number;
  setBetAmount: (amount: number) => void;
  balance: number;
  connected: boolean;
  isLoading: boolean;
  onJoinRoom: () => void;
}

export const MenuView: React.FC<MenuViewProps> = ({
  roomId,
  setRoomId,
  betAmount,
  setBetAmount,
  balance,
  connected,
  isLoading,
  onJoinRoom
}) => {
  // Check if user manually entered a room ID (joining) vs auto-generated (creating)
  // If roomId is not empty, user is joining (regardless of format)
  const isJoining = roomId.trim() !== '';
  const isButtonDisabled = !connected || isLoading || (connected && balance < betAmount);
  const hasInsufficientBalance = connected && balance < betAmount;

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>🎯 Game Setup</h2>
      
      {/* Room ID Input */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Room ID (leave empty to CREATE new room)"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          disabled={isLoading}
          style={{
            padding: '10px',
            margin: '10px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            width: '300px',
            fontSize: '16px'
          }}
        />
        <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
          <strong>Leave empty:</strong> Create new room (you'll be WHITE) - Room ID will be generated<br/>
          <strong>Enter room ID:</strong> Join existing room (you'll be BLACK) - Get ID from White player
        </div>
      </div>

      {/* Bet Amount Input */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="number"
          placeholder="Bet Amount (SOL)"
          value={betAmount}
          onChange={(e) => setBetAmount(Number(e.target.value))}
          step="0.1"
          min="0.1"
          disabled={isLoading}
          style={{
            padding: '10px',
            margin: '10px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            width: '250px',
            fontSize: '16px'
          }}
        />
      </div>

      {/* Balance Display */}
      {connected && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '10px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '5px',
          fontSize: '14px'
        }}>
          <strong>Your Balance:</strong> {balance.toFixed(3)} SOL
        </div>
      )}

      {/* Join/Create Button */}
      <button
        onClick={onJoinRoom}
        disabled={isButtonDisabled}
        style={{
          padding: '15px 30px',
          backgroundColor: isButtonDisabled ? '#ccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: 'bold',
          minWidth: '200px'
        }}
      >
        {isLoading ? (
          '⏳ Loading...'
        ) : (
          isJoining ? 'Join Room (Black)' : 'Create Room (White)'
        )}
      </button>

      {/* Error Messages */}
      {hasInsufficientBalance && connected && (
        <div style={{ 
          color: 'red', 
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#ffebee',
          borderRadius: '5px',
          fontSize: '14px'
        }}>
          <strong>⚠️ Insufficient Balance!</strong><br/>
          Need {betAmount} SOL, but you have {balance.toFixed(3)} SOL
        </div>
      )}

      {!connected && (
        <div style={{ 
          color: '#ff9800', 
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#fff3e0',
          borderRadius: '5px',
          fontSize: '14px'
        }}>
          <strong>💡 Connect your wallet to continue</strong>
        </div>
      )}

      {/* Instructions */}
      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        backgroundColor: '#e3f2fd', 
        borderRadius: '5px',
        fontSize: '14px',
        textAlign: 'left'
      }}>
        <h4 style={{ margin: '0 0 10px 0' }}>📋 How to Play:</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li><strong>Create Room:</strong> Leave room ID empty to start a new game as White</li>
          <li><strong>Join Room:</strong> Enter a room ID to join as Black</li>
          <li><strong>Escrow:</strong> Both players must create escrows to start the game</li>
          <li><strong>Winner Takes All:</strong> Winner gets both escrows (minus fees)</li>
          <li><strong>Draw:</strong> Both players get their escrow back</li>
        </ul>
      </div>
    </div>
  );
};

export default MenuView;