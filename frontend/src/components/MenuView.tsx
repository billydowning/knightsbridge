/**
 * Menu View Component
 * Initial setup screen for creating or joining rooms
 */

import React from 'react';
import { useTheme } from '../App';
import { useContainerWidth, useTextSizes, useIsMobile, useIsLaptopOrLarger, useIsMacBookAir, useIsDesktopLayout } from '../utils/responsive';

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

  // Responsive utilities
  const containerWidth = useContainerWidth();
  const textSizes = useTextSizes();
  const isMobile = useIsMobile();
  const isLaptopOrLarger = useIsLaptopOrLarger();
  const isMacBookAir = useIsMacBookAir();
  const isDesktopLayout = useIsDesktopLayout();

  const sharedButtonStyle = {
    padding: isDesktopLayout ? '16px 24px' : '10px 16px',
    boxSizing: 'border-box' as const,
    fontSize: isDesktopLayout ? '16px' : textSizes.body,
    fontWeight: 'bold',
    borderRadius: '8px',
    border: undefined,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center' as const,
    width: '100%' // Ensure buttons fill their grid cells
  };

  const handleCreateRoom = () => {
    // Generate a new room ID for creating
    const newRoomId = 'ROOM-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    setRoomId(newRoomId);
    onJoinRoom();
  };

  return (
    <div style={{ textAlign: 'center' }}>
      
      {/* Hero Section */}
      <section style={{
        background: `linear-gradient(135deg, ${theme.primary}20 0%, ${theme.secondary}15 100%)`,
        padding: isDesktopLayout ? '4rem 2rem' : '2rem 1rem',
        borderRadius: '20px',
        marginBottom: isDesktopLayout ? '3rem' : '2rem',
        border: `1px solid ${theme.border}`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          backgroundImage: `
            radial-gradient(circle at 25% 25%, ${theme.primary} 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, ${theme.secondary} 0%, transparent 50%)
          `,
          zIndex: 0
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            fontSize: isDesktopLayout ? '3rem' : '2.5rem',
            marginBottom: '1rem',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }}>
            ♔ ♛
          </div>
          
          <h1 style={{
            fontSize: isDesktopLayout ? '2rem' : '1.5rem',
            fontWeight: '600',
            color: theme.text,
            margin: '0 0 1rem 0',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            Welcome to Knightsbridge
          </h1>
          
          <p style={{
            fontSize: isDesktopLayout ? '1rem' : '0.9rem',
            color: theme.textSecondary,
            margin: '0 0 2rem 0',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.6
          }}>
            Play chess for real stakes on the Solana blockchain. 
            Create or join a room to start competing against players worldwide.
          </p>
          
          {/* Quick Stats */}
          <div style={{
            display: 'flex',
            gap: isDesktopLayout ? '2rem' : '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: '2rem'
          }}>
            {[
              { icon: '⚡', label: 'Instant Payouts' },
              { icon: '🔒', label: 'Secure Escrows' },
              { icon: '🌍', label: 'Global Players' }
            ].map((stat, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: `${theme.surface}80`,
                borderRadius: '20px',
                border: `1px solid ${theme.border}40`,
                backdropFilter: 'blur(10px)'
              }}>
                <span style={{ fontSize: '1.2rem' }}>{stat.icon}</span>
                <span style={{ 
                  fontSize: isDesktopLayout ? '0.9rem' : '0.8rem',
                  fontWeight: '600',
                  color: theme.text
                }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Create Room Section */}
      <section style={{ 
        backgroundColor: theme.surface, 
        padding: isDesktopLayout ? '3rem' : '2rem', 
        borderRadius: '16px', 
        boxShadow: theme.shadow,
        border: `1px solid ${theme.border}`,
        maxWidth: isDesktopLayout ? '800px' : '100%',
        width: '100%',
        margin: '0 auto',
        marginBottom: isDesktopLayout ? '2rem' : '1.5rem',
        overflow: 'hidden', // Prevent any overflow
        boxSizing: 'border-box'
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
            Create New Game
          </h2>
          <div style={{
            width: '3px',
            height: '40px',
            backgroundColor: theme.primary,
            borderRadius: '2px'
          }} />
        </div>
        
        {/* Bet Amount Selection */}
        <div style={{ 
          marginBottom: '2rem',
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden'
        }}>
          <h3 style={{ 
            margin: '0 0 1.5rem 0', 
            color: theme.text,
            fontSize: isDesktopLayout ? '1.1rem' : '1rem',
            fontWeight: '600'
          }}>
            Choose Your Stakes
          </h3>
          
          {/* Normal bet amounts */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(${isDesktopLayout ? '140px' : '100px'}, 1fr))`,
            gap: isDesktopLayout ? '1rem' : '0.75rem',
            marginBottom: '1rem',
            width: '100%',
            maxWidth: '100%'
          }}>
            {smallBetAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => setBetAmount(amount)}
                style={{
                  ...sharedButtonStyle,
                  backgroundColor: betAmount === amount ? theme.primary : theme.background,
                  color: betAmount === amount ? 'white' : theme.text,
                  border: `2px solid ${betAmount === amount ? theme.primary : theme.border}`,
                  transform: betAmount === amount ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: betAmount === amount ? `0 4px 12px ${theme.primary}40` : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  minWidth: 0, // Allow buttons to shrink
                  whiteSpace: 'nowrap'
                }}
              >
                <div style={{ position: 'relative', zIndex: 1 }}>
                  {amount} SOL
                </div>
                {betAmount === amount && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `linear-gradient(45deg, ${theme.primary}, ${theme.secondary})`,
                    opacity: 0.9,
                    zIndex: 0
                  }} />
                )}
              </button>
            ))}
          </div>
          
          {/* Larger bet amounts (collapsible) */}
          {showLargerAmounts && (
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fit, minmax(${isDesktopLayout ? '140px' : '100px'}, 1fr))`,
              gap: isDesktopLayout ? '1rem' : '0.75rem',
              marginBottom: '1rem',
              animation: 'fadeIn 0.3s ease-in-out',
              width: '100%',
              maxWidth: '100%'
            }}>
              {largeBetAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount)}
                  style={{
                    ...sharedButtonStyle,
                    backgroundColor: betAmount === amount ? theme.primary : theme.background,
                    color: betAmount === amount ? 'white' : theme.text,
                    border: `2px solid ${betAmount === amount ? theme.primary : theme.border}`,
                    transform: betAmount === amount ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: betAmount === amount ? `0 4px 12px ${theme.primary}40` : 'none',
                    minWidth: 0, // Allow buttons to shrink
                    whiteSpace: 'nowrap'
                  }}
                >
                  {amount} SOL
                </button>
              ))}
            </div>
          )}
          
          {/* Toggle for larger amounts */}
          <button
            onClick={() => setShowLargerAmounts(!showLargerAmounts)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'transparent',
              color: theme.primary,
              border: `1px solid ${theme.primary}60`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: isDesktopLayout ? '0.9rem' : '0.8rem',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: '0 auto'
            }}
          >
            <span>{showLargerAmounts ? '▼' : '▶'}</span>
            {showLargerAmounts ? 'Hide larger amounts' : 'Show larger amounts'}
          </button>
        </div>

        {/* Create Room Button */}
        <button
          onClick={handleCreateRoom}
          disabled={isButtonDisabled || betAmount === 0}
          style={{
            padding: isDesktopLayout ? '1.25rem 3rem' : '1rem 2rem',
            backgroundColor: (isButtonDisabled || betAmount === 0) ? theme.border : theme.secondary,
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: (isButtonDisabled || betAmount === 0) ? 'not-allowed' : 'pointer',
            fontSize: isDesktopLayout ? '1.1rem' : '1rem',
            fontWeight: 'bold',
            minWidth: isDesktopLayout ? '250px' : '200px',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: (isButtonDisabled || betAmount === 0) ? 'none' : `0 6px 20px ${theme.secondary}40`,
            transform: (isButtonDisabled || betAmount === 0) ? 'none' : 'translateY(-2px)'
          }}
        >
          <div style={{ position: 'relative', zIndex: 1 }}>
            {isLoading ? '⏳ Creating...' : `🎯 Create Room (${betAmount} SOL)`}
          </div>
          {!(isButtonDisabled || betAmount === 0) && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              right: 0,
              bottom: 0,
              background: `linear-gradient(90deg, transparent, ${theme.primary}40, transparent)`,
              animation: 'shimmer 2s infinite'
            }} />
          )}
        </button>

        {/* Error Messages for Create Section */}
        {hasInsufficientBalance && connected && (
          <div style={{ 
            color: theme.error, 
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: `${theme.error}10`,
            borderRadius: '8px',
            fontSize: isDesktopLayout ? '1rem' : '0.9rem',
            border: `1px solid ${theme.error}40`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <strong>Insufficient Balance!</strong><br/>
              Need {betAmount} SOL, but you have {balance.toFixed(3)} SOL
            </div>
          </div>
        )}

        {!connected && (
          <div style={{ 
            color: theme.warning, 
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: `${theme.warning}10`,
            borderRadius: '8px',
            fontSize: isDesktopLayout ? '1rem' : '0.9rem',
            border: `1px solid ${theme.warning}40`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>💡</span>
            <div>
              <strong>Connect your wallet to create a room</strong>
            </div>
          </div>
        )}
      </section>

      {/* Divider */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        margin: '2rem 0',
        maxWidth: '400px',
        marginLeft: 'auto',
        marginRight: 'auto'
      }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: theme.border }} />
        <span style={{
          fontSize: '1rem', 
          fontWeight: '600',
          color: theme.textSecondary,
          padding: '0.5rem 1rem',
          backgroundColor: theme.surface,
          borderRadius: '20px',
          border: `1px solid ${theme.border}`
        }}>
          OR
        </span>
        <div style={{ flex: 1, height: '1px', backgroundColor: theme.border }} />
      </div>

      {/* Join Room Section */}
      <section style={{ 
        backgroundColor: theme.surface, 
        padding: isDesktopLayout ? '3rem' : '2rem', 
        borderRadius: '16px', 
        boxShadow: theme.shadow,
        border: `1px solid ${theme.border}`,
        maxWidth: isDesktopLayout ? '800px' : '100%',
        margin: '0 auto',
        marginBottom: '2rem'
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
            Join Existing Game
          </h2>
          <div style={{
            width: '3px',
            height: '40px',
            backgroundColor: theme.primary,
            borderRadius: '2px'
          }} />
        </div>
        
        {/* Room ID Input */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '1rem', 
            fontSize: isDesktopLayout ? '1.1rem' : '1rem', 
            fontWeight: '600',
            color: theme.text
          }}>
            Room ID
          </label>
          <input
            type="text"
            placeholder="Enter Room ID from White player"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            disabled={isLoading}
            style={{
              padding: '1rem 1.5rem',
              border: `2px solid ${theme.border}`,
              borderRadius: '12px',
              width: '100%',
              maxWidth: '400px',
              fontSize: '1rem',
              textAlign: 'center',
              backgroundColor: theme.background,
              color: theme.text,
              transition: 'all 0.2s ease',
              fontFamily: 'monospace',
              fontWeight: 'bold'
            }}
          />
          <div style={{ 
            fontSize: '0.9rem', 
            color: theme.textSecondary, 
            marginTop: '0.75rem',
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
            padding: isDesktopLayout ? '1.25rem 3rem' : '1rem 2rem',
            backgroundColor: (!connected || isLoading || !roomId.trim()) ? theme.border : theme.primary,
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: (!connected || isLoading || !roomId.trim()) ? 'not-allowed' : 'pointer',
            fontSize: isDesktopLayout ? '1.1rem' : '1rem',
            fontWeight: 'bold',
            minWidth: '200px',
            transition: 'all 0.3s ease',
            boxShadow: (!connected || isLoading || !roomId.trim()) ? 'none' : `0 6px 20px ${theme.primary}40`,
            transform: (!connected || isLoading || !roomId.trim()) ? 'none' : 'translateY(-2px)'
          }}
        >
          {isLoading ? '⏳ Joining...' : '🚪 Join Room'}
        </button>

        {/* Error Messages for Join Section */}
        {!connected && (
          <div style={{ 
            color: theme.warning, 
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: `${theme.warning}10`,
            borderRadius: '8px',
            fontSize: isDesktopLayout ? '1rem' : '0.9rem',
            border: `1px solid ${theme.warning}40`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>💡</span>
            <div>
              <strong>Connect your wallet to join a room</strong>
            </div>
          </div>
        )}
      </section>

      {/* How to Play Section */}
      <section style={{ 
        backgroundColor: theme.background, 
        padding: isDesktopLayout ? '3rem' : '2rem', 
        borderRadius: '16px',
        boxShadow: theme.shadow,
        border: `1px solid ${theme.border}`,
        maxWidth: isDesktopLayout ? '800px' : '100%',
        margin: '2rem auto 0 auto',
        textAlign: 'left'
      }}>
        <h3 style={{ 
          margin: '0 0 2rem 0', 
          color: theme.text,
          fontSize: isDesktopLayout ? '1.25rem' : '1.1rem',
          fontWeight: '600',
          textAlign: 'center'
        }}>
          How to Play
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: isDesktopLayout ? 'repeat(2, 1fr)' : '1fr',
          gap: '1.5rem'
        }}>
          {[
            { icon: '🎯', title: 'Create Room', desc: 'Choose bet amount and create a new game as White' },
            { icon: '📋', title: 'Share Room ID', desc: 'Share the generated Room ID with your opponent' },
            { icon: '🚪', title: 'Join Room', desc: 'Enter the Room ID to join as Black' },
            { icon: '💰', title: 'Deposit Stakes', desc: 'Both players must deposit stakes to start the game' },
            { icon: '🏆', title: 'Winner Takes All', desc: 'Winner gets both stakes (minus fees)' },
            { icon: '🤝', title: 'Draw Split', desc: 'Both players get their stake back on draw' }
          ].map((step, index) => (
            <div key={index} style={{
              display: 'flex',
              gap: '1rem',
              padding: '1rem',
              backgroundColor: theme.surface,
              borderRadius: '8px',
              border: `1px solid ${theme.border}`
            }}>
              <div style={{ fontSize: '1.5rem', minWidth: '32px' }}>
                {step.icon}
              </div>
              <div>
                <h4 style={{
                  margin: '0 0 0.5rem 0',
                  color: theme.text,
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}>
                  {step.title}
                </h4>
                <p style={{
                  margin: 0,
                  color: theme.textSecondary,
                  fontSize: '0.9rem',
                  lineHeight: 1.5
                }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default MenuView;