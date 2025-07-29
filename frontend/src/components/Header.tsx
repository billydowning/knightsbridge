/**
 * Professional Header Component
 * App branding, navigation, and wallet connection
 */

import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useTheme } from '../App';
import { useTextSizes, useIsMobile, useIsDesktopLayout } from '../utils/responsive';

export interface HeaderProps {
  currentView: 'menu' | 'lobby' | 'game';
  roomId?: string;
  balance?: number;
  connected?: boolean;
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

export const Header: React.FC<HeaderProps> = ({
  currentView,
  roomId,
  balance,
  connected
}) => {
  const { theme } = useTheme();
  const textSizes = useTextSizes();
  const isMobile = useIsMobile();
  const isDesktopLayout = useIsDesktopLayout();

  const getBreadcrumbs = () => {
    const crumbs = [{ label: 'Menu', active: currentView === 'menu' }];
    
    if (currentView === 'lobby' || currentView === 'game') {
      crumbs.push({ label: 'Lobby', active: currentView === 'lobby' });
    }
    
    if (currentView === 'game') {
      crumbs.push({ label: 'Game', active: currentView === 'game' });
    }
    
    return crumbs;
  };

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
        gap: '16px'
      }}>
        
        {/* Left: Logo and Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            fontSize: isDesktopLayout ? '32px' : '24px',
            lineHeight: 1
          }}>
            ♔
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: isDesktopLayout ? '24px' : '20px',
              fontWeight: 'bold',
              color: theme.text,
              lineHeight: 1.2
            }}>
              Knightsbridge
            </h1>
            <div style={{
              fontSize: isDesktopLayout ? '12px' : '10px',
              color: theme.textSecondary,
              fontWeight: '500',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              Blockchain Chess
            </div>
          </div>
        </div>

        {/* Center: Navigation Breadcrumbs */}
        {!isMobile && (
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: 1,
            justifyContent: 'center'
          }}>
            {getBreadcrumbs().map((crumb, index) => (
              <React.Fragment key={crumb.label}>
                {index > 0 && (
                  <span style={{
                    color: theme.textSecondary,
                    fontSize: '14px'
                  }}>
                    →
                  </span>
                )}
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: crumb.active ? 'bold' : '500',
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
          gap: isMobile ? '8px' : '12px'
        }}>
          
          {/* Balance Display */}
          {connected && typeof balance === 'number' && (
            <div style={{
              padding: '6px 12px',
              backgroundColor: `${theme.success}20`,
              color: theme.success,
              borderRadius: '20px',
              fontSize: isDesktopLayout ? '14px' : '12px',
              fontWeight: 'bold',
              border: `1px solid ${theme.success}40`
            }}>
              {balance.toFixed(3)} SOL
            </div>
          )}

          {/* Room ID Display */}
          {roomId && currentView !== 'menu' && (
            <div style={{
              padding: '6px 12px',
              backgroundColor: `${theme.primary}20`,
              color: theme.primary,
              borderRadius: '20px',
              fontSize: isDesktopLayout ? '12px' : '10px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              border: `1px solid ${theme.primary}40`,
              maxWidth: isMobile ? '80px' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {isMobile ? roomId.slice(-6) : roomId}
            </div>
          )}

          <DarkModeToggle />
          
          {/* Wallet Button */}
          <div style={{
            fontSize: isDesktopLayout ? '14px' : '12px'
          }}>
            <WalletMultiButton style={{
              backgroundColor: connected ? theme.success : theme.primary,
              borderRadius: '8px',
              height: isDesktopLayout ? '40px' : '36px',
              fontSize: isDesktopLayout ? '14px' : '12px',
              fontWeight: 'bold',
              border: 'none',
              transition: 'all 0.2s ease'
            }} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 