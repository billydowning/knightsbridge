# 🚀 WebSocket Implementation Guide

## Overview

This document outlines the comprehensive WebSocket system implemented for **real-time chat** and **live chess move synchronization** in the Knightsbridge Chess application.

## 🏗️ Architecture

### **Backend WebSocket Server** (`backend/server.js`)
- **Socket.io** server with enhanced game management
- **Real-time move validation** and synchronization
- **Chat system** with message persistence
- **Player session management** and disconnection handling
- **Game state management** with turn validation

### **Frontend WebSocket Client** (`frontend/src/services/websocketService.ts`)
- **TypeScript** service with comprehensive event handling
- **Auto-reconnection** with exponential backoff
- **Real-time chat** integration
- **Move synchronization** between players
- **Error handling** and connection status management

## 📡 WebSocket Events

### **Connection Events**
```typescript
// Client → Server
socket.emit('joinGame', gameId, playerInfo)

// Server → Client
socket.on('assignedColor', { color: 'white' | 'black', isTurn: boolean })
socket.on('playerJoined', { playerId: string, color: 'white' | 'black' })
socket.on('gameStarted', { whitePlayer: string, blackPlayer: string })
socket.on('playerDisconnected', { playerId: string, color: 'white' | 'black' })
```

### **Move Events**
```typescript
// Client → Server
socket.emit('makeMove', { gameId, move, playerId, color })

// Server → Client
socket.on('moveMade', { move, playerId, color, timestamp, nextTurn })
socket.on('moveConfirmed', { move, nextTurn })
socket.on('moveError', { error: string })
```

### **Chat Events**
```typescript
// Client → Server
socket.emit('sendMessage', { gameId, message, playerId, playerName })

// Server → Client
socket.on('newMessage', { id, gameId, playerId, playerName, message, timestamp, type })
socket.on('chatHistory', messages[])
socket.on('chatError', { error: string })
```

### **Game Control Events**
```typescript
// Client → Server
socket.emit('playerReady', { gameId, playerId, color })
socket.emit('resignGame', { gameId, playerId, color })
socket.emit('offerDraw', { gameId, playerId, color })
socket.emit('respondToDraw', { gameId, accepted })

// Server → Client
socket.on('gameResigned', { playerId, color, winner })
socket.on('drawOffered', { playerId, color })
socket.on('drawResponse', { accepted })
```

## 🎮 Features Implemented

### **1. Real-Time Chat System**
- ✅ **Message persistence** in PostgreSQL database
- ✅ **Message validation** (length, content)
- ✅ **Message types** (chat, system, draw_offer, resignation)
- ✅ **Real-time delivery** to all players in game
- ✅ **Chat history** loading on game join
- ✅ **Message timestamps** and player identification

### **2. Live Move Synchronization**
- ✅ **Turn validation** (prevents out-of-turn moves)
- ✅ **Move broadcasting** to opponent
- ✅ **Move confirmation** to sender
- ✅ **Move persistence** in database
- ✅ **Game state management** with turn tracking
- ✅ **Move history** with timestamps

### **3. Player Management**
- ✅ **Automatic color assignment** (first = white, second = black)
- ✅ **Player ready status** tracking
- ✅ **Disconnection detection** and notification
- ✅ **Session management** with cleanup
- ✅ **Game start** when both players join

### **4. Game Controls**
- ✅ **Resignation** with winner determination
- ✅ **Draw offers** with accept/decline
- ✅ **Game state requests** and synchronization
- ✅ **Connection status** monitoring
- ✅ **Error handling** and user feedback

## 🗄️ Database Schema

### **Chat Messages Table**
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    player_id VARCHAR(255) NOT NULL,
    player_name VARCHAR(100),
    message TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'chat',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Database Service Methods**
```typescript
// Add chat message
async addChatMessage(gameId: string, messageData: {
  playerId: string;
  playerName: string;
  message: string;
  messageType?: string;
})

// Get chat history
async getChatMessages(gameId: string, limit?: number)

// Add move to database
async addMove(gameId: string, moveData: {
  from: string;
  to: string;
  piece: string;
  playerId: string;
  color: string;
  moveNumber?: number;
})
```

## 🎯 Frontend Integration

### **React Hook** (`useWebSocket`)
```typescript
const {
  isConnected,
  messages,
  gameState,
  assignedColor,
  isMyTurn,
  error,
  sendMessage,
  makeMove,
  playerReady,
  resignGame,
  offerDraw,
  respondToDraw
} = useWebSocket({
  gameId: roomId,
  playerId,
  playerName,
  onMoveReceived: (move) => {
    // Handle incoming move
  },
  onChatMessage: (message) => {
    // Handle new chat message
  }
});
```

### **Chat Component** (`GameChat`)
- ✅ **Real-time message display**
- ✅ **Message input** with validation
- ✅ **Auto-scroll** to latest messages
- ✅ **Message types** with different styling
- ✅ **Connection status** indicator
- ✅ **Error handling** and display

### **Enhanced Game View** (`GameViewEnhanced`)
- ✅ **WebSocket integration** with chat sidebar
- ✅ **Connection status** display
- ✅ **Player color** assignment display
- ✅ **Opponent disconnection** alerts
- ✅ **Draw offer** handling
- ✅ **Real-time game controls**

## 🔧 Configuration

### **Backend Environment Variables**
```env
# WebSocket Server
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=knightsbridge_chess
DB_USER=postgres
DB_PASSWORD=password
```

### **Frontend Environment Variables**
```env
# WebSocket Client
REACT_APP_WEBSOCKET_URL=http://localhost:3001
```

## 🚀 Usage Examples

### **Starting the Backend**
```bash
cd backend
npm install
npm start
```

### **Starting the Frontend**
```bash
cd frontend
npm install
npm run dev
```

### **Joining a Game**
```typescript
// Player joins game room
websocketService.joinGame('game-123', {
  playerId: 'player-wallet-address',
  playerName: 'Player Name'
});

// Server assigns color and turn
socket.on('assignedColor', ({ color, isTurn }) => {
  console.log(`Playing as ${color}, my turn: ${isTurn}`);
});
```

### **Making a Move**
```typescript
// Player makes a move
websocketService.makeMove('game-123', {
  from: 'e2',
  to: 'e4',
  piece: 'pawn'
}, 'player-id', 'white');

// Server validates and broadcasts
socket.on('moveMade', (moveData) => {
  console.log('Move made:', moveData);
  // Update chess board
});
```

### **Sending a Chat Message**
```typescript
// Player sends message
websocketService.sendMessage('game-123', 'Good move!', 'player-id', 'Player Name');

// Server broadcasts to all players
socket.on('newMessage', (message) => {
  console.log('New message:', message);
  // Update chat display
});
```

## 🛡️ Security Features

### **Input Validation**
- ✅ **Message length** limits (500 characters)
- ✅ **Move format** validation
- ✅ **Player authentication** via wallet address
- ✅ **Turn validation** (prevents out-of-turn moves)
- ✅ **SQL injection** prevention via parameterized queries

### **Error Handling**
- ✅ **Connection errors** with auto-reconnection
- ✅ **Move validation** errors with user feedback
- ✅ **Chat message** validation errors
- ✅ **Database connection** error handling
- ✅ **Graceful degradation** when WebSocket unavailable

## 📊 Performance Optimizations

### **Backend Optimizations**
- ✅ **Connection pooling** for database
- ✅ **Memory-based game state** for fast access
- ✅ **Efficient message broadcasting** to game rooms
- ✅ **Automatic cleanup** of disconnected sessions
- ✅ **Rate limiting** to prevent spam

### **Frontend Optimizations**
- ✅ **Auto-reconnection** with exponential backoff
- ✅ **Message batching** for chat history
- ✅ **Efficient re-rendering** with React hooks
- ✅ **Connection status** caching
- ✅ **Error state** management

## 🔄 Real-Time Features

### **Live Synchronization**
- ✅ **Instant move updates** between players
- ✅ **Real-time chat** with message delivery
- ✅ **Connection status** monitoring
- ✅ **Player presence** indicators
- ✅ **Game state** synchronization

### **User Experience**
- ✅ **Visual feedback** for connection status
- ✅ **Typing indicators** in chat
- ✅ **Message timestamps** and formatting
- ✅ **Error messages** with clear explanations
- ✅ **Loading states** during operations

## 🎯 Next Steps

### **Potential Enhancements**
- [ ] **Voice chat** integration
- [ ] **Move analysis** with chess engine
- [ ] **Spectator mode** for tournaments
- [ ] **Advanced anti-cheat** measures
- [ ] **Mobile optimization** for WebSocket
- [ ] **Message encryption** for privacy
- [ ] **File sharing** in chat
- [ ] **Emoji reactions** to messages

### **Production Considerations**
- [ ] **SSL/TLS** encryption for WebSocket
- [ ] **Load balancing** for multiple servers
- [ ] **Redis** for session management
- [ ] **Message queuing** for reliability
- [ ] **Monitoring** and analytics
- [ ] **Rate limiting** per user
- [ ] **Backup** and disaster recovery

## 📝 Conclusion

The WebSocket implementation provides a **robust, scalable foundation** for real-time chess gameplay with comprehensive chat functionality. The system handles:

- ✅ **Real-time move synchronization**
- ✅ **Live chat communication**
- ✅ **Player management** and session handling
- ✅ **Game state** persistence and validation
- ✅ **Error handling** and user feedback
- ✅ **Scalable architecture** for future enhancements

This implementation creates a **seamless multiplayer experience** that rivals modern chess platforms while maintaining the blockchain integration for secure, trustless gameplay. 