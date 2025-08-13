import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../App';
import { useTextSizes, useIsMobile, useIsTabletOrSmaller } from '../utils/responsive';

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName?: string;
  message: string;
  timestamp: number;
  type?: 'system' | 'player' | 'draw_offer' | 'resignation';
}

export interface ChatBoxProps {
  roomId: string;
  playerRole: string;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  className?: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  roomId,
  playerRole,
  messages,
  onSendMessage,
  className = ''
}) => {
  const { theme } = useTheme();
  const [newMessage, setNewMessage] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(() => {
    // Load sound preference from localStorage
    const saved = localStorage.getItem('knightsbridge-chat-sound');
    return saved !== null ? JSON.parse(saved) : true; // Default enabled
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastMessageCountRef = useRef(messages.length);
  
  // Responsive utilities
  const textSizes = useTextSizes();
  const isMobile = useIsMobile();
  const isTabletOrSmaller = useIsTabletOrSmaller();

  // Sound notification system
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a short, pleasant notification sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure the sound: gentle notification tone
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Higher pitch
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1); // Drop to lower pitch
      
      // Volume envelope: soft attack and quick decay
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.05); // Gentle volume
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      // Play the sound
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
    } catch (error) {
      // Fallback: try simple beep with legacy Audio
      try {
        // Create a simple beep sound using data URI
        const audio = new Audio();
        audio.volume = 0.2;
        // Simple sine wave beep (more compatible)
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBjiK1fLNeSsFJHfH8N+QQQoUXrTp65hVFAlFnt/zv2EcBjiK1fLOeSsFJHfH8N+QQQoUXrTp65hVFAlFnt/zv2EcBjiK1fLOeSsFJHfH8N+QQQoUXrTp65hVFAlFnt/zv2EcBjiK1fLOeSsFJHfH8N+QQQoUXrTp65hVFAlFnt/zv2EcBjiK1fLOeSsFJHfH8N+QQQoUXrTp65hVFAlFnt/zv2EcBjiK1fLOeSsFJHfH8N+QQQoUXrTp6';
        audio.play().catch(() => {
          // Silent fail if audio is blocked
        });
      } catch (fallbackError) {
        // Silent fail - no audio support
      }
    }
  }, [soundEnabled]);

  // Toggle sound setting and save to localStorage
  const toggleSound = useCallback(() => {
    const newSoundEnabled = !soundEnabled;
    setSoundEnabled(newSoundEnabled);
    localStorage.setItem('knightsbridge-chat-sound', JSON.stringify(newSoundEnabled));
  }, [soundEnabled]);



  // Auto-scroll to bottom when new messages arrive + sound notification
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }

    // Play sound for new incoming messages (not from current player)
    if (messages.length > lastMessageCountRef.current) {
      const newMessages = messages.slice(lastMessageCountRef.current);
      const hasIncomingMessage = newMessages.some(msg => 
        msg.playerId !== playerRole && msg.type !== 'system'
      );
      
      if (hasIncomingMessage) {
        // Small delay to ensure smooth scrolling completes first
        setTimeout(() => {
          playNotificationSound();
        }, 100);
      }
    }
    
    lastMessageCountRef.current = messages.length;
  }, [messages, playerRole, playNotificationSound]);

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    onSendMessage(newMessage.trim());
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageTypeStyles = (type: ChatMessage['type']) => {
    switch (type) {
      case 'system':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'player':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'draw_offer':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resignation':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const getMessageIcon = (type: ChatMessage['type']) => {
    switch (type) {
      case 'system':
        return '🔔';
      case 'draw_offer':
        return '🤝';
      case 'resignation':
        return '🏳️';
      default:
        return '💬';
    }
  };

  return (
    <div 
      className={`chat-box ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: isMobile ? '200px' : '300px',
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: theme.shadow
      }}
    >
      {/* Chat Header */}
      <div style={{
        padding: isMobile ? '10px' : '15px',
        backgroundColor: theme.primary,
        color: 'white',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ 
          fontSize: textSizes.body, 
          fontWeight: 'bold' 
        }}>
          💬 Game Chat
        </div>
        
        {/* Sound Toggle Button */}
        <button
          onClick={toggleSound}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '4px',
            color: 'white',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title={`Chat sounds ${soundEnabled ? 'ON' : 'OFF'}`}
        >
          <span style={{ fontSize: '12px' }}>
            {soundEnabled ? '🔊' : '🔇'}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 'normal' }}>
            {soundEnabled ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? '10px' : '15px',
          backgroundColor: theme.background
        }}
      >
        {messages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: theme.textSecondary,
            padding: isMobile ? '20px 10px' : '40px 20px'
          }}>
            <div style={{ 
              fontSize: isMobile ? '2rem' : '3rem', 
              marginBottom: '10px' 
            }}>
              💬
            </div>
            <p style={{ 
              fontSize: textSizes.body, 
              margin: '0 0 5px 0' 
            }}>
              No messages yet
            </p>
            <p style={{ 
              fontSize: textSizes.small, 
              margin: '0',
              opacity: 0.7
            }}>
              Start the conversation!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {messages.map((message, index) => (
              <div key={index} style={{
                alignSelf: message.playerId === playerRole ? 'flex-end' : 'flex-start',  // Self right, opponent left
                backgroundColor: message.playerId === playerRole ? '#007bff' : '#6c757d',  // Blue for self, gray for opponent
                color: 'white',
                padding: '8px 12px',
                borderRadius: '12px',
                maxWidth: '75%',
                marginBottom: '8px'
              }}>
                <strong>{message.playerName || message.playerId}:</strong> {message.message}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{
        padding: isMobile ? '10px' : '15px',
        borderTop: `1px solid ${theme.border}`,
        backgroundColor: theme.surface
      }}>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            style={{
              flex: 1,
              padding: isMobile ? '8px 12px' : '10px 15px',
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              fontSize: textSizes.body,
              backgroundColor: theme.background,
              color: theme.text,
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            style={{
              padding: isMobile ? '8px 12px' : '10px 15px',
              backgroundColor: newMessage.trim() ? theme.primary : theme.border,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
              fontSize: textSizes.body,
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatBox; 