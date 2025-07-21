import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../services/websocketService';

interface GameChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  playerName: string;
  isConnected: boolean;
  error: string | null;
  onClearError: () => void;
  className?: string;
}

export const GameChat: React.FC<GameChatProps> = ({
  messages,
  onSendMessage,
  playerName,
  isConnected,
  error,
  onClearError,
  className = ''
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    
    if (!newMessage.trim() || !isConnected) return;
    
    onSendMessage(newMessage.trim());
    setNewMessage('');
    setIsTyping(false);
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
    <div className={`flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <h3 className="text-lg font-semibold text-gray-800">Game Chat</h3>
          <span className={`text-sm px-2 py-1 rounded-full ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {messages.length} messages
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-red-600">⚠️</span>
              <span className="text-sm text-red-700">{error}</span>
            </div>
            <button
              onClick={onClearError}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm">No messages yet</p>
            <p className="text-xs text-gray-400 mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.playerId === playerName ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                message.playerId === playerName 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-300 text-gray-700'
              }`}>
                {message.playerId === playerName ? 'You' : message.playerName?.charAt(0) || 'P'}
              </div>

              {/* Message Content */}
              <div className={`flex-1 max-w-xs lg:max-w-md ${
                message.playerId === playerName ? 'text-right' : ''
              }`}>
                <div className={`inline-block p-3 rounded-lg border ${getMessageTypeStyles(message.type)}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs">{getMessageIcon(message.type)}</span>
                    {message.type !== 'system' && (
                      <span className="text-xs font-medium">
                        {message.playerId === playerName ? 'You' : message.playerName}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  <div className="text-sm break-words">
                    {message.message}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              setIsTyping(e.target.value.length > 0);
            }}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Type your message..." : "Connecting..."}
            disabled={!isConnected}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !isConnected}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
        
        {/* Character count */}
        {isTyping && (
          <div className="text-xs text-gray-500 mt-1 text-right">
            {newMessage.length}/500
          </div>
        )}
      </div>
    </div>
  );
}; 