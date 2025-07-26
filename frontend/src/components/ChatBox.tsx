import React, { useState, useRef, useEffect } from 'react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Responsive utilities
  const textSizes = useTextSizes();
  const isMobile = useIsMobile();
  const isTabletOrSmaller = useIsTabletOrSmaller();



  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ 
          fontSize: textSizes.body, 
          fontWeight: 'bold' 
        }}>
          💬 Game Chat
        </div>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: isMobile ? '10px' : '15px',
        backgroundColor: theme.background
      }}>
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