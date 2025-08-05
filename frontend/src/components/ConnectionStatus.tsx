/**
 * Toyota Connection Status Component
 * 
 * Simple, reliable connection indicator that only shows when reconnection feature is enabled
 * Follows Toyota principles: minimal, predictable, graceful degradation
 */

import React from 'react';

interface ConnectionStatusProps {
  status: 'connected' | 'connecting' | 'disconnected';
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  status, 
  className = '' 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: '🟢',
          text: 'Connected',
          color: '#4caf50',
          bgColor: '#e8f5e8'
        };
      case 'connecting':
        return {
          icon: '🟡',
          text: 'Connecting...',
          color: '#ff9800',
          bgColor: '#fff3e0'
        };
      case 'disconnected':
        return {
          icon: '🔴',
          text: 'Disconnected',
          color: '#f44336',
          bgColor: '#ffebee'
        };
      default:
        return {
          icon: '🟡',
          text: 'Unknown',
          color: '#757575',
          bgColor: '#f5f5f5'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div 
      className={`connection-status ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        borderRadius: '12px',
        backgroundColor: config.bgColor,
        border: `1px solid ${config.color}20`,
        fontSize: '12px',
        fontWeight: '500',
        color: config.color,
        transition: 'all 0.3s ease'
      }}
    >
      <span style={{ fontSize: '10px' }}>{config.icon}</span>
      <span>{config.text}</span>
    </div>
  );
};

/**
 * Toyota Connection Status Banner
 * 
 * Shows connection issues prominently but non-intrusively
 * Only appears when disconnected and feature is enabled
 */
interface ConnectionBannerProps {
  status: 'connected' | 'connecting' | 'disconnected';
  onManualReconnect?: () => void;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({ 
  status, 
  onManualReconnect 
}) => {
  // Only show banner when connection issues exist
  if (status === 'connected') {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        backgroundColor: status === 'disconnected' ? '#ffebee' : '#fff3e0',
        borderBottom: `2px solid ${status === 'disconnected' ? '#f44336' : '#ff9800'}`,
        padding: '8px 16px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        fontSize: '14px',
        fontWeight: '500',
        color: status === 'disconnected' ? '#c62828' : '#e65100'
      }}
    >
      <ConnectionStatus status={status} />
      
      <span>
        {status === 'connecting' 
          ? 'Attempting to reconnect...' 
          : 'Connection lost. Trying to reconnect automatically.'
        }
      </span>
      
      {status === 'disconnected' && onManualReconnect && (
        <button
          onClick={onManualReconnect}
          style={{
            padding: '4px 12px',
            borderRadius: '16px',
            border: 'none',
            backgroundColor: '#f44336',
            color: 'white',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#d32f2f';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f44336';
          }}
        >
          Retry Now
        </button>
      )}
    </div>
  );
};