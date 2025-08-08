/**
 * Professional Header Component
 * App branding, navigation, and wallet connection
 */

import React, { useState, useRef, useEffect } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTheme } from '../App';
import { useTextSizes, useIsMobile, useIsDesktopLayout } from '../utils/responsive';

export interface HeaderProps {
  currentView: 'menu' | 'lobby' | 'game';
  roomId?: string;
  balance?: number;
  connected?: boolean;
  onLogoClick?: () => void;
  onGameHistoryClick?: () => void;
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

const WalletDropdown: React.FC<{
  connected: boolean;
  publicKey: string;
  balance?: number;
  onGameHistoryClick?: () => void;
}> = ({ connected, publicKey, balance, onGameHistoryClick }) => {
  const { theme } = useTheme();
  const isDesktopLayout = useIsDesktopLayout();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  if (!connected || !publicKey) {
    return <WalletMultiButton style={{
      backgroundColor: theme.primary,
      borderRadius: '8px',
      height: isDesktopLayout ? '40px' : '32px',
      fontSize: isDesktopLayout ? '14px' : '11px',
      fontWeight: 'bold',
      border: 'none',
      transition: 'all 0.2s ease',
      padding: isDesktopLayout ? '8px 12px' : '6px 8px'
    }} />;
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Wallet Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: theme.success,
          color: 'white',
          borderRadius: '8px',
          height: isDesktopLayout ? '40px' : '32px',
          fontSize: isDesktopLayout ? '14px' : '11px',
          fontWeight: 'bold',
          border: 'none',
          padding: isDesktopLayout ? '8px 12px' : '6px 8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          minWidth: 0,
          maxWidth: isDesktopLayout ? 'none' : '120px',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = theme.successDark || theme.success;
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = theme.success;
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0
        }}>
          {formatWallet(publicKey)}
        </span>
        {balance !== undefined && (
          <span style={{
            fontSize: isDesktopLayout ? '12px' : '10px',
            opacity: 0.9,
            flexShrink: 0
          }}>
            {balance.toFixed(3)} SOL
          </span>
        )}
        <span style={{
          fontSize: '12px',
          opacity: 0.8,
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          flexShrink: 0
        }}>
          ▼
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '4px',
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '8px',
          boxShadow: theme.shadow,
          zIndex: 1000,
          minWidth: '200px',
          overflow: 'hidden'
        }}>
          {/* Wallet Info Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${theme.border}`,
            backgroundColor: `${theme.primary}10`
          }}>
            <div style={{
              color: theme.text,
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '4px'
            }}>
              Connected Wallet
            </div>
            <div style={{
              color: theme.textSecondary,
              fontSize: '12px',
              fontFamily: 'monospace',
              wordBreak: 'break-all' as const
            }}>
              {publicKey}
            </div>
            {balance !== undefined && (
              <div style={{
                color: theme.success,
                fontSize: '14px',
                fontWeight: '600',
                marginTop: '4px'
              }}>
                Balance: {balance.toFixed(4)} SOL
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div style={{ padding: '8px 0' }}>
            {/* Game History */}
            <button
              onClick={() => {
                setIsOpen(false);
                onGameHistoryClick?.();
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                color: theme.text,
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'background-color 0.2s ease',
                textAlign: 'left' as const
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${theme.primary}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ fontSize: '16px' }}>🎮</span>
              <div>
                <div>Game History</div>
                <div style={{
                  fontSize: '12px',
                  color: theme.textSecondary,
                  marginTop: '2px'
                }}>
                  View your past games and claim winnings
                </div>
              </div>
            </button>

            {/* Copy Wallet Address */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(publicKey);
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                color: theme.text,
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'background-color 0.2s ease',
                textAlign: 'left' as const
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${theme.primary}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ fontSize: '16px' }}>📋</span>
              <div>
                <div>Copy Address</div>
                <div style={{
                  fontSize: '12px',
                  color: theme.textSecondary,
                  marginTop: '2px'
                }}>
                  Copy wallet address to clipboard
                </div>
              </div>
            </button>

            {/* Disconnect */}
            <div style={{
              borderTop: `1px solid ${theme.border}`,
              marginTop: '8px',
              paddingTop: '8px'
            }}>
              <WalletMultiButton style={{
                width: '100%',
                backgroundColor: 'transparent',
                color: theme.error,
                border: 'none',
                fontSize: '14px',
                fontWeight: '500',
                padding: '12px 16px',
                textAlign: 'left',
                borderRadius: '0'
              }} />
            </div>
          </div>
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
  onGameHistoryClick
}) => {
  const { theme } = useTheme();
  const textSizes = useTextSizes();
  const isMobile = useIsMobile();
  const isDesktopLayout = useIsDesktopLayout();
  const { publicKey } = useWallet();

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
          
          {/* Wallet Button with Dropdown */}
          <div style={{
            fontSize: isDesktopLayout ? '14px' : '11px',
            flexShrink: 0,
            maxWidth: isMobile ? '140px' : 'none' // Limit width on mobile
          }}>
            <WalletDropdown
              connected={connected || false}
              publicKey={publicKey?.toString() || ''}
              balance={balance}
              onGameHistoryClick={onGameHistoryClick}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;