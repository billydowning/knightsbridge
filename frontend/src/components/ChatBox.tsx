import React, { useState, useEffect, useRef } from 'react';

export interface ChatMessage {
  id: string;
  player: string;
  message: string;
  timestamp: Date | string;
}

export interface ChatBoxProps {
  roomId: string;
  playerRole: string;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  roomId,
  playerRole,
  messages,
  onSendMessage
}) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    const messagesContainer = document.querySelector('[data-messages-container]');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const formatTime = (timestamp: Date | string) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      width: '300px',
      height: '480px', // Match chessboard height (8 squares × 60px)
      border: '2px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#f8f9fa',
      display: 'flex',
      flexDirection: 'column',
      marginLeft: '20px'
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#2c3e50',
        color: 'white',
        borderTopLeftRadius: '6px',
        borderTopRightRadius: '6px',
        fontWeight: 'bold',
        fontSize: '14px'
      }}>
        💬 Game Chat - Room: {roomId}
      </div>

      {/* Messages Area */}
      <div 
        data-messages-container
        style={{
          flex: 1,
          padding: '12px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {messages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#666',
            fontSize: '12px',
            fontStyle: 'italic',
            marginTop: '20px'
          }}>
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.player === playerRole ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{
                maxWidth: '80%',
                padding: '8px 12px',
                borderRadius: '12px',
                backgroundColor: msg.player === playerRole ? '#007bff' : '#e9ecef',
                color: msg.player === playerRole ? 'white' : '#333',
                fontSize: '13px',
                wordWrap: 'break-word'
              }}>
                <div style={{
                  fontWeight: 'bold',
                  fontSize: '11px',
                  marginBottom: '2px',
                  opacity: 0.8
                }}>
                  {msg.player === playerRole ? 'You' : msg.player}
                </div>
                <div>{msg.message}</div>
                <div style={{
                  fontSize: '10px',
                  opacity: 0.7,
                  marginTop: '4px',
                  textAlign: 'right'
                }}>
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} style={{
        padding: '12px',
        borderTop: '1px solid #ddd',
        backgroundColor: 'white'
      }}>
        <div style={{
          display: 'flex',
          gap: '8px'
        }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '13px',
              outline: 'none'
            }}
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: newMessage.trim() ? '#007bff' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              fontWeight: 'bold'
            }}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBox; 