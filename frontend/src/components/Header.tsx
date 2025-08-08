/**
 * Professional Header Component
 * App branding, navigation, and wallet connection
 */

import React, { useState, useRef, useEffect } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTheme } from '../App';
import { useTextSizes, useIsMobile, useIsDesktopLayout } from '../utils/responsive';
import GameHistory from './GameHistory';

export interface HeaderProps {
  currentView: 'menu' | 'lobby' | 'game';
  roomId?: string;
  balance?: number;
  connected?: boolean;
  onLogoClick?: () => void;
  onReconnectToGame?: (roomId: string) => void;
  onClaimWinnings?: (roomId: string, winnings: number) => Promise<string>;
}

const DarkModeToggle: React.FC = () => {
  const { isDarkMode, toggleDarkMode, theme } = useTheme();
  const isDesktopLayout = useIsDesktopLayout();
  const textSizes = useTextSizes();

  return (
    <button
      onClick={toggleDarkMode}
      style={{
        padding: isDesktopLayout ? '8px 12px' : '6px 8px',
        backgroundColor: theme.surface,
        color: theme.text,
        border: `1px solid ${theme.border}`,
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: isDesktopLayout ? '14px' : textSizes.small,
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: isDesktopLayout ? '6px' : '4px',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap'
      }}
    >
      {isDarkMode ? '☀️' : '🌙'}
    </button>
  );
};

// Custom Wallet Dropdown Component
interface CustomWalletDropdownProps {
  publicKey: any;
  onGameHistory: () => void;
  theme: any;
  isDesktopLayout: boolean;
  isMobile: boolean;
}

const CustomWalletDropdown: React.FC<CustomWalletDropdownProps> = ({
  publicKey,
  onGameHistory,
  theme,
  isDesktopLayout,
  isMobile
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const { disconnect } = useWallet();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(publicKey.toString());
      setShowDropdown(false);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowDropdown(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Wallet Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          backgroundColor: theme.success,
          color: 'white',
          borderRadius: '8px',
          height: isDesktopLayout ? '40px' : '32px',
          fontSize: isDesktopLayout ? '14px' : '11px',
          fontWeight: 'bold',
          border: 'none',
          transition: 'all 0.2s ease',
          padding: isMobile ? '6px 8px' : '8px 12px',
          maxWidth: isMobile ? '120px' : 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = theme.successDark || '#1e7e34';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = theme.success;
        }}
      >
        <span>
          {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
        </span>
        <span style={{ fontSize: '10px' }}>▼</span>
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '4px',
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '8px',
          boxShadow: theme.shadow,
          minWidth: '180px',
          zIndex: 1000
        }}>
          {/* Game History Option */}
          <button
            onClick={() => {
              onGameHistory();
              setShowDropdown(false);
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: 'transparent',
              color: theme.text,
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: `1px solid ${theme.border}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${theme.primary}20`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span>📊</span>
            <span>Game History</span>
          </button>

          {/* Copy Address Option */}
          <button
            onClick={copyAddress}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: 'transparent',
              color: theme.text,
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: `1px solid ${theme.border}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${theme.primary}20`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span>📋</span>
            <span>Copy Address</span>
          </button>

          {/* Disconnect Option */}
          <button
            onClick={handleDisconnect}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: 'transparent',
              color: theme.error,
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${theme.error}20`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span>🔌</span>
            <span>Disconnect</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const Header: React.FC<HeaderProps> = ({
  currentView,
  roomId,
  balance,
  connected,
  onLogoClick,
  onReconnectToGame,
  onClaimWinnings
}) => {
  const { theme } = useTheme();
  const textSizes = useTextSizes();
  const isMobile = useIsMobile();
  const isDesktopLayout = useIsDesktopLayout();
  const { publicKey, connected: walletConnected } = useWallet();
  const [showGameHistory, setShowGameHistory] = useState(false);

  const getBreadcrumbs = () => {
    const crumbs = [];
    
    // Removed: Game breadcrumb per user request
    // if (currentView === 'game') {
    //   crumbs.push({ label: 'Game', active: true });
    // }
    
    return crumbs;
  };

  const crumbs = getBreadcrumbs();

  return (
    <header style={{
      background: `linear-gradient(135deg, ${theme.surface} 0%, ${theme.background} 100%)`,
      borderBottom: `1px solid ${theme.border}`,
      padding: isMobile ? '12px 16px' : '16px 24px',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      backdropFilter: 'blur(10px)',
      boxShadow: theme.shadow
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: isMobile ? '8px' : '16px',
        width: '100%',
        minWidth: 0 // Allow content to shrink
      }}>
        
        {/* Left: Logo and Branding */}
        <div 
          onClick={onLogoClick}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            flexShrink: 0, // Don't let logo shrink
            minWidth: 0,
            cursor: onLogoClick ? 'pointer' : 'default',
            transition: 'opacity 0.2s ease',
            opacity: 1
          }}
          onMouseEnter={(e) => {
            if (onLogoClick) {
              e.currentTarget.style.opacity = '0.8';
            }
          }}
          onMouseLeave={(e) => {
            if (onLogoClick) {
              e.currentTarget.style.opacity = '1';
            }
          }}
        >
          <span 
            style={{
              fontSize: isDesktopLayout ? '48px' : '42px',
              color: theme.text,
              fontWeight: '900',
              textShadow: `0 2px 6px rgba(0,0,0,0.3), 0 0 10px ${theme.text}40`,
              lineHeight: 1,
              display: 'block',
              WebkitTextStroke: `1px ${theme.text}20`,
              marginBottom: isDesktopLayout ? '-12px' : '-9px'
            }}
            title="Knightsbridge Chess"
          >
            ♘
          </span>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            marginBottom: isDesktopLayout ? '-12px' : '-9px'
          }}>
            <h1 style={{
              margin: 0,
              fontSize: isDesktopLayout ? '18px' : '16px',
              fontWeight: '600',
              color: theme.text,
              lineHeight: 1.2
            }}>
              Knightsbridge
            </h1>
            <div style={{
              fontSize: isDesktopLayout ? '10px' : '9px',
              color: theme.textSecondary,
              fontWeight: '500',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              lineHeight: 1,
              margin: 0
            }}>
              Blockchain Chess
            </div>
          </div>
        </div>

        {/* Center: Navigation Breadcrumbs */}
        {!isMobile && crumbs.length > 0 && (
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flex: 1,
            justifyContent: 'center',
            minWidth: 0, // Allow to shrink
            overflow: 'hidden'
          }}>
            {crumbs.map((crumb, index) => (
              <React.Fragment key={crumb.label}>
                {index > 0 && (
                  <span style={{
                    color: theme.textSecondary,
                    fontSize: '12px'
                  }}>
                    →
                  </span>
                )}
                <span style={{
                  padding: '3px 6px',
                  borderRadius: '3px',
                  fontSize: '12px',
                  fontWeight: crumb.active ? '600' : '500',
                  color: crumb.active ? theme.primary : theme.textSecondary,
                  backgroundColor: crumb.active ? `${theme.primary}15` : 'transparent'
                }}>
                  {crumb.label}
                </span>
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Right: Wallet and Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '6px' : '12px',
          flexShrink: 0, // Prevent shrinking
          minWidth: 0 // Allow content to shrink
        }}>
          


          {/* Room ID Display */}
          {roomId && currentView !== 'menu' && !isMobile && (
            <div style={{
              padding: '4px 8px',
              backgroundColor: `${theme.primary}20`,
              color: theme.primary,
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '600',
              fontFamily: 'monospace',
              border: `1px solid ${theme.primary}40`,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {roomId}
            </div>
          )}

          <DarkModeToggle />
          
          {/* Custom Wallet Dropdown */}
          <div style={{
            fontSize: isDesktopLayout ? '14px' : '11px',
            flexShrink: 0,
            maxWidth: isMobile ? '120px' : 'none',
            position: 'relative'
          }}>
            {walletConnected && publicKey ? (
              <CustomWalletDropdown 
                publicKey={publicKey}
                onGameHistory={() => setShowGameHistory(true)}
                theme={theme}
                isDesktopLayout={isDesktopLayout}
                isMobile={isMobile}
              />
            ) : (
              <WalletMultiButton style={{
                backgroundColor: theme.primary,
                borderRadius: '8px',
                height: isDesktopLayout ? '40px' : '32px',
                fontSize: isDesktopLayout ? '14px' : '11px',
                fontWeight: 'bold',
                border: 'none',
                transition: 'all 0.2s ease',
                padding: isMobile ? '6px 8px' : '8px 12px',
                maxWidth: isMobile ? '120px' : 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }} />
            )}
          </div>
        </div>
      </div>
      
      {/* Game History Dashboard */}
      {showGameHistory && walletConnected && publicKey && (
        <GameHistory
          playerWallet={publicKey.toString()}
          isOpen={showGameHistory}
          onClose={() => setShowGameHistory(false)}
          onReconnectToGame={(roomId) => {
            if (onReconnectToGame) {
              onReconnectToGame(roomId);
            }
          }}
          onClaimWinnings={async (roomId, winnings) => {
            if (onClaimWinnings) {
              return await onClaimWinnings(roomId, winnings);
            }
            throw new Error('Claim winnings function not provided');
          }}
        />
      )}
    </header>
  );
};

export default Header; 