/**
 * Menu View Component
 * Initial setup screen for creating or joining rooms
 */

import React from 'react';
import { useTheme } from '../App';

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
  const { theme } = useTheme();
  const presetBetAmounts = [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 50, 100];
  const isJoining = roomId.trim() !== '';
  const isButtonDisabled = !connected || isLoading || (connected && balance < betAmount);
  const hasInsufficientBalance = connected && balance < betAmount;
  const [showLargerAmounts, setShowLargerAmounts] = React.useState(false);

  const smallBetAmounts = [0.01, 0.05, 0.1, 0.5, 1];
  const largeBetAmounts = [2, 5, 10, 50, 100];

  // Dynamic width measurement for larger amounts container
  const normalBetSectionRef = React.useRef<HTMLDivElement>(null);
  const [largerAmountsWidth, setLargerAmountsWidth] = React.useState('auto');

  React.useEffect(() => {
    if (normalBetSectionRef.current) {
      setLargerAmountsWidth(`${normalBetSectionRef.current.offsetWidth}px`);
    }
  }, []);

  const sharedButtonStyle = {
    padding: '12px 20px',
    minWidth: '120px',
    boxSizing: 'border-box' as const,
    fontSize: '14px',
    fontWeight: 'bold',
    borderRadius: '8px',
    border: undefined,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  const handleCreateRoom = () => {
    // Generate a new room ID for creating
    const newRoomId = 'ROOM-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    setRoomId(newRoomId);
    onJoinRoom();
  };

  return (
    <div style={{ textAlign: 'center' }}>
      
      {/* Create Room Section */}
      <div style={{ 
        backgroundColor: theme.surface, 
        padding: '30px', 
        borderRadius: '10px', 
        boxShadow: theme.shadow,
        marginBottom: '30px',
        border: `1px solid ${theme.border}`,
        width: '800px', // Match chessboard (480px) + chat box (300px) + gap (20px)
        margin: '0 auto'
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: theme.text }}>🎯 Create A Room</h2>
        
        {/* Bet Amount Buttons */}
        <div ref={normalBetSectionRef} style={{ marginBottom: '25px' }}>
          <h4 style={{ margin: '0 0 15px 0', color: theme.textSecondary }}>Choose Bet Amount:</h4>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '10px', 
            justifyContent: 'center' 
          }}>
            {smallBetAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => setBetAmount(amount)}
                style={{
                  ...sharedButtonStyle,
                  backgroundColor: betAmount === amount ? theme.primary : theme.surface,
                  color: betAmount === amount ? 'white' : theme.text,
                  border: `2px solid ${theme.border}`
                }}
              >
                {amount} SOL
              </button>
            ))}
          </div>
          
          {/* Toggle for larger amounts */}
          <button
            onClick={() => setShowLargerAmounts(!showLargerAmounts)}
            style={{
              marginTop: '15px',
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: theme.primary,
              border: `1px solid ${theme.primary}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            {showLargerAmounts ? '▼ Hide larger amounts' : '▶ Click here to see larger amounts'}
          </button>
          
          {/* Larger bet amounts (hidden by default) */}
          {showLargerAmounts && (
            <div style={{ 
              marginTop: '15px',
              padding: '15px',
              backgroundColor: theme.background,
              borderRadius: '8px',
              border: `1px solid ${theme.border}`,
              width: largerAmountsWidth,
              margin: '0 auto'
            }}>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '10px', 
                justifyContent: 'center' 
              }}>
                {largeBetAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setBetAmount(amount)}
                    style={{
                      ...sharedButtonStyle,
                      backgroundColor: betAmount === amount ? theme.primary : theme.surface,
                      color: betAmount === amount ? 'white' : theme.text,
                      border: `2px solid ${theme.border}`
                    }}
                  >
                    {amount} SOL
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Create Room Button */}
        <button
          onClick={handleCreateRoom}
          disabled={isButtonDisabled || betAmount === 0}
          style={{
            padding: '15px 40px',
            backgroundColor: (isButtonDisabled || betAmount === 0) ? theme.border : theme.secondary,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: (isButtonDisabled || betAmount === 0) ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            minWidth: '200px',
            transition: 'all 0.2s ease'
          }}
        >
          {isLoading ? '⏳ Creating...' : 'Create Room'}
        </button>

        {/* Error Messages for Create Section */}
        {hasInsufficientBalance && connected && (
          <div style={{ 
            color: theme.accent, 
            marginTop: '15px',
            padding: '10px',
            backgroundColor: theme.background,
            borderRadius: '8px',
            fontSize: '14px',
            border: `1px solid ${theme.accent}`
          }}>
            <strong>⚠️ Insufficient Balance!</strong><br/>
            Need {betAmount} SOL, but you have {balance.toFixed(3)} SOL
          </div>
        )}

        {!connected && (
          <div style={{ 
            color: '#f39c12', 
            marginTop: '15px',
            padding: '10px',
            backgroundColor: theme.background,
            borderRadius: '8px',
            fontSize: '14px',
            border: `1px solid #f39c12`
          }}>
            <strong>💡 Connect your wallet to create a room</strong>
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ 
        textAlign: 'center',
        margin: '30px 0',
        fontSize: '18px', 
        fontWeight: 'bold',
        color: theme.textSecondary
      }}>
        OR
      </div>

      {/* Join Room Section */}
      <div style={{ 
        backgroundColor: theme.surface, 
        padding: '30px', 
        borderRadius: '10px', 
        boxShadow: theme.shadow,
        border: `1px solid ${theme.border}`,
        width: '800px', // Match chessboard (480px) + chat box (300px) + gap (20px)
        margin: '0 auto'
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: theme.text }}>🎯 Join A Room</h2>
        
        {/* Room ID Input */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontSize: '16px', 
            fontWeight: 'bold',
            color: theme.text
          }}>
            Room ID:
          </label>
          <input
            type="text"
            placeholder="Enter Room ID from White player"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            disabled={isLoading}
            style={{
              padding: '15px 20px',
              border: `2px solid ${theme.border}`,
              borderRadius: '8px',
              width: '100%',
              maxWidth: '400px',
              fontSize: '16px',
              textAlign: 'center',
              backgroundColor: theme.background,
              color: theme.text,
              transition: 'border-color 0.2s ease'
            }}
          />
          <div style={{ 
            fontSize: '14px', 
            color: theme.textSecondary, 
            marginTop: '10px',
            fontStyle: 'italic',
            textAlign: 'center'
          }}>
            Get the Room ID from the White player who created the room
          </div>
        </div>

        {/* Join Room Button */}
        <button
          onClick={onJoinRoom}
          disabled={!connected || isLoading || !roomId.trim()}
          style={{
            padding: '15px 40px',
            backgroundColor: (!connected || isLoading || !roomId.trim()) ? theme.border : theme.primary,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: (!connected || isLoading || !roomId.trim()) ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            minWidth: '200px',
            transition: 'all 0.2s ease'
          }}
        >
          {isLoading ? '⏳ Joining...' : 'Join Room'}
        </button>

        {/* Error Messages for Join Section */}
        {!connected && (
          <div style={{ 
            color: '#f39c12', 
            marginTop: '15px',
            padding: '10px',
            backgroundColor: theme.background,
            borderRadius: '8px',
            fontSize: '14px',
            border: `1px solid #f39c12`
          }}>
            <strong>💡 Connect your wallet to join a room</strong>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div style={{ 
        backgroundColor: theme.background, 
        padding: '30px', 
        borderRadius: '10px',
        boxShadow: theme.shadow,
        border: `1px solid ${theme.border}`,
        width: '800px', // Match chessboard (480px) + chat box (300px) + gap (20px)
        margin: '50px auto 0 auto',
        fontSize: '14px',
        textAlign: 'left',
        color: theme.text
      }}>
        <h4 style={{ margin: '0 0 15px 0', color: theme.text }}>📋 How to Play:</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
          <li><strong>Create Room:</strong> Choose bet amount and create a new game as White</li>
          <li><strong>Share Room ID:</strong> Share the generated Room ID with your opponent</li>
          <li><strong>Join Room:</strong> Enter the Room ID to join as Black</li>
          <li><strong>Create Escrows:</strong> Both players must create escrows to start the game</li>
          <li><strong>Winner Takes All:</strong> Winner gets both escrows (minus fees)</li>
          <li><strong>Draw:</strong> Both players get their escrow back</li>
        </ul>
      </div>
    </div>
  );
};

export default MenuView;