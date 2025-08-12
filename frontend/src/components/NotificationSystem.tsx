/**
 * Notification System Component
 * Provides real-time notifications and alerts for game events
 */

import React, { useState, useEffect, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface NotificationSystemProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({
  notifications,
  onRemove
}) => {
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 1000,
      maxWidth: '400px'
    }}>
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onRemove
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    if (notification.duration) {
      console.log(`🔔 Setting auto-dismiss timer for notification "${notification.title}" - ${notification.duration}ms`);
      const timer = setTimeout(() => {
        console.log(`⏰ Auto-dismissing notification "${notification.title}"`);
        setIsVisible(false);
        setTimeout(() => {
          console.log(`🗑️ Removing notification "${notification.title}"`);
          onRemove(notification.id);
        }, 300);
      }, notification.duration);
      
      return () => {
        console.log(`🚫 Clearing timer for notification "${notification.title}"`);
        clearTimeout(timer);
      };
    } else {
      console.log(`⚠️ No duration set for notification "${notification.title}" - will not auto-dismiss`);
    }
  }, [notification.id, notification.duration, onRemove]);

  const getNotificationStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      backgroundColor: 'white',
      border: '1px solid #e9ecef',
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '10px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.3s ease',
      maxWidth: '400px',
      wordWrap: 'break-word'
    };

    switch (notification.type) {
      case 'success':
        baseStyle.borderLeft = '4px solid #28a745';
        break;
      case 'error':
        baseStyle.borderLeft = '4px solid #dc3545';
        break;
      case 'warning':
        baseStyle.borderLeft = '4px solid #ffc107';
        break;
      case 'info':
        baseStyle.borderLeft = '4px solid #17a2b8';
        break;
    }

    return baseStyle;
  };

  const getIcon = (): string => {
    switch (notification.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  return (
    <div style={getNotificationStyle()}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            <span style={{ marginRight: '8px', fontSize: '16px' }}>
              {getIcon()}
            </span>
            <h4 style={{ 
              margin: 0, 
              fontSize: '14px', 
              fontWeight: 'bold',
              color: '#495057'
            }}>
              {notification.title}
            </h4>
          </div>
          <p style={{ 
            margin: 0, 
            fontSize: '12px', 
            color: '#6c757d',
            lineHeight: '1.4'
          }}>
            {notification.message}
          </p>
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              style={{
                marginTop: '8px',
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {notification.action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onRemove(notification.id), 300);
          }}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            color: '#6c757d',
            marginLeft: '10px',
            padding: '0'
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

// Hook for managing notifications
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { ...notification, id }]);
  };

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showSuccess = (title: string, message: string, duration = 5000) => {
    addNotification({ type: 'success', title, message, duration });
  };

  const showError = (title: string, message: string, duration = 7000) => {
    addNotification({ type: 'error', title, message, duration });
  };

  const showWarning = (title: string, message: string, duration = 5000) => {
    addNotification({ type: 'warning', title, message, duration });
  };

  const showInfo = (title: string, message: string, duration = 4000) => {
    addNotification({ type: 'info', title, message, duration });
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

export default NotificationSystem; 