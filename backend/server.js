// Knightsbridge Chess Backend Server
// Updated: 2025-07-21 - Database-based multiplayer system
// Force redeploy for WebSocket fixes - Additional debugging
// Manual Railway redeploy required - Test endpoints added
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { dbService } = require('./database');

console.log('🚀 Starting Knightsbridge Chess Backend Server...');
console.log('📋 Environment:', process.env.NODE_ENV);
console.log('🔧 Debug mode:', process.env.DEBUG);

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://knightsbridge.vercel.app', 'https://knightsbridge-chess.vercel.app', 'https://knightsbridge-chess-git-main-williamdowning.vercel.app']
    : '*',
  credentials: true
}));

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://knightsbridge.vercel.app', 'https://knightsbridge-chess.vercel.app', 'https://knightsbridge-chess-git-main-williamdowning.vercel.app']
      : '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

console.log('🚀 Socket.io server initialized with CORS origins:', process.env.NODE_ENV === 'production' 
  ? ['https://knightsbridge.vercel.app', 'https://knightsbridge-chess.vercel.app', 'https://knightsbridge-chess-git-main-williamdowning.vercel.app']
  : '*');

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// API Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Test endpoint to verify backend is working
app.get('/test', (req, res) => {
  console.log('🧪 Test endpoint called');
  res.json({ 
    message: 'Backend is working!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    gameRoomsCount: gameRooms.size,
    activeConnections: io.engine.clientsCount
  });
});

// Debug endpoint to see current state
app.get('/debug', (req, res) => {
  console.log('🔍 Debug endpoint called');
  const debugInfo = {
    gameRooms: Array.from(gameRooms.entries()).map(([id, room]) => ({
      roomId: id,
      players: room.players.length,
      gameStarted: room.gameStarted,
      created: new Date(room.created).toISOString()
    })),
    activeConnections: io.engine.clientsCount,
    environment: process.env.NODE_ENV
  };
  res.json(debugInfo);
});

// Debug endpoint to list all rooms
app.get('/debug/rooms', (req, res) => {
  const rooms = Array.from(gameRooms.keys());
  res.json({
    roomCount: rooms.length,
    rooms: rooms,
    gameStates: Array.from(gameStates.keys()),
    playerSessions: Array.from(playerSessions.keys())
  });
});

// Game state management
const gameStates = new Map(); // Store game states in memory
const playerSessions = new Map(); // Track player sessions
const gameRooms = new Map(); // Store game rooms
const chatMessages = new Map(); // Store chat messages by room ID

// Handle Socket.io connections
io.on('connection', (socket) => {
  console.log('🔌 A user connected:', socket.id);
  console.log('📋 Socket events available:', Object.keys(socket._events || {}));

  // Debug: Log when event handler is registered
  console.log('✅ createRoom event handler registered for socket:', socket.id);

  // Debug: Add error handler to see if there are any Socket.io errors
  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });

  // Debug: Add disconnect handler
  socket.on('disconnect', (reason) => {
    console.log('🔌 User disconnected:', socket.id, 'reason:', reason);
  });

  // Create a new room
  socket.on('createRoom', async (data, callback) => {
    console.log('📨 Received createRoom event:', data);
    console.log('📨 Callback function:', typeof callback);
    console.log('🔍 Current rooms in memory:', Array.from(gameRooms.keys()));
    
    try {
      const { roomId, playerWallet } = data;
      
      if (gameRooms.has(roomId)) {
        console.log('❌ Room already exists:', roomId);
        callback({ success: false, error: 'Room already exists' });
        return;
      }

      const room = {
        roomId,
        players: [{ wallet: playerWallet, role: 'white', isReady: true }],
        escrows: {},
        gameStarted: false,
        created: Date.now(),
        lastUpdated: Date.now()
      };

      gameRooms.set(roomId, room);
      console.log('✅ Room created:', roomId, 'for player:', playerWallet);
      console.log('🔍 Rooms after creation:', Array.from(gameRooms.keys()));

      // Join the socket to the room
      socket.join(roomId);
      console.log('✅ Socket joined room:', roomId);

      // Broadcast room update to all clients in the room
      io.to(roomId).emit('roomUpdated', room);
      console.log('📡 Broadcasted roomUpdated to room:', roomId);

      // Send success response
      const response = { success: true, role: 'white' };
      console.log('📤 Sending createRoom response:', response);
      callback(response);
      
    } catch (error) {
      console.error('❌ Error in createRoom:', error);
      callback({ success: false, error: error.message });
    }
  });

  // Debug: Log when event handler is registered
  console.log('✅ createRoom event handler registered for socket:', socket.id);

  // Debug: Add error handler to see if there are any Socket.io errors
  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });

  // Debug: Add disconnect handler
  socket.on('disconnect', (reason) => {
    console.log('🔌 User disconnected:', socket.id, 'reason:', reason);
  });

  // Join an existing room
  socket.on('joinRoom', async (data, callback) => {
    try {
      const { roomId, playerWallet } = data;
      console.log('📨 Received joinRoom event:', data);
      console.log('🔍 Current rooms in memory:', Array.from(gameRooms.keys()));
      console.log('🔍 Looking for room:', roomId);
      
      const room = gameRooms.get(roomId);
      if (!room) {
        console.log('❌ Room not found:', roomId);
        console.log('🔍 Available rooms:', Array.from(gameRooms.keys()));
        callback({ success: false, error: 'Room does not exist' });
        return;
      }

      console.log('✅ Room found:', roomId, 'players:', room.players.length);

      // Check if player is already in the room
      const existingPlayer = room.players.find(p => p.wallet === playerWallet);
      if (existingPlayer) {
        socket.join(roomId);
        callback({ success: true, role: existingPlayer.role });
        return;
      }

      // Add new player if room has space
      if (room.players.length < 2) {
        const newRole = room.players.length === 0 ? 'white' : 'black';
        room.players.push({ wallet: playerWallet, role: newRole, isReady: true });
        room.lastUpdated = Date.now();
        
        // Join the room
        socket.join(roomId);
        
        console.log('✅ Player joined room:', roomId, 'player:', playerWallet, 'role:', newRole);
        callback({ success: true, role: newRole });
        
        // Broadcast room update
        io.to(roomId).emit('roomUpdated', { roomId, room });
        
        // If both players are present, notify about game ready
        if (room.players.length === 2) {
          io.to(roomId).emit('gameReady', { roomId, players: room.players });
        }
      } else {
        callback({ success: false, error: 'Room is full' });
      }
      
    } catch (error) {
      console.error('Error joining room:', error);
      callback({ success: false, error: 'Failed to join room' });
    }
  });

  // Get room status
  socket.on('getRoomStatus', async (data, callback) => {
    try {
      const { roomId } = data;
      
      const room = gameRooms.get(roomId);
      if (!room) {
        callback({ success: false, error: 'Room does not exist' });
        return;
      }

      const roomStatus = {
        playerCount: room.players.length,
        players: room.players,
        escrowCount: Object.keys(room.escrows).length,
        escrows: room.escrows,
        gameStarted: room.gameStarted
      };

      callback({ success: true, roomStatus });
      
    } catch (error) {
      console.error('Error getting room status:', error);
      callback({ success: false, error: 'Failed to get room status' });
    }
  });

  // Add escrow for a player
  socket.on('addEscrow', async (data, callback) => {
    try {
      const { roomId, playerWallet, amount } = data;
      
      const room = gameRooms.get(roomId);
      if (!room) {
        callback({ success: false, error: 'Room does not exist' });
        return;
      }

      // Add escrow
      room.escrows[playerWallet] = amount;
      room.lastUpdated = Date.now();
      
      console.log('✅ Escrow added:', roomId, playerWallet, amount);
      callback({ success: true });
      
      // Broadcast escrow update
      io.to(roomId).emit('escrowUpdated', { roomId, escrows: room.escrows });
      
      // Auto-start game if both escrows are created and both players are present
      if (Object.keys(room.escrows).length === 2 && room.players.length === 2 && !room.gameStarted) {
        room.gameStarted = true;
        room.lastUpdated = Date.now();
        
        console.log('🎮 Auto-starting game in room:', roomId);
        io.to(roomId).emit('gameStarted', { roomId, players: room.players });
        io.to(roomId).emit('roomUpdated', { roomId, room });
      }
      
    } catch (error) {
      console.error('Error adding escrow:', error);
      callback({ success: false, error: 'Failed to add escrow' });
    }
  });

  // Clear escrows for a room
  socket.on('clearEscrows', async (data, callback) => {
    try {
      const { roomId } = data;
      
      const room = gameRooms.get(roomId);
      if (!room) {
        callback({ success: false, error: 'Room does not exist' });
        return;
      }

      room.escrows = {};
      room.gameStarted = false;
      room.lastUpdated = Date.now();
      
      console.log('🔄 Cleared escrows for room:', roomId);
      callback({ success: true });
      
      // Broadcast room update
      io.to(roomId).emit('roomUpdated', { roomId, room });
      
    } catch (error) {
      console.error('Error clearing escrows:', error);
      callback({ success: false, error: 'Failed to clear escrows' });
    }
  });

  // Save game state
  socket.on('saveGameState', async (data, callback) => {
    try {
      const { roomId, gameState } = data;
      
      gameStates.set(roomId, {
        ...gameState,
        lastUpdated: Date.now()
      });
      
      console.log('✅ Game state saved:', roomId);
      callback({ success: true });
      
      // Broadcast game state update
      io.to(roomId).emit('gameStateUpdated', { roomId, gameState });
      
    } catch (error) {
      console.error('Error saving game state:', error);
      callback({ success: false, error: 'Failed to save game state' });
    }
  });

  // Get game state
  socket.on('getGameState', async (data, callback) => {
    try {
      const { roomId } = data;
      
      const gameState = gameStates.get(roomId);
      if (gameState) {
        callback({ success: true, gameState });
      } else {
        callback({ success: false, error: 'Game state not found' });
      }
      
    } catch (error) {
      console.error('Error getting game state:', error);
      callback({ success: false, error: 'Failed to get game state' });
    }
  });

  // Clear all rooms (for testing/debugging)
  socket.on('clearAllRooms', async (data, callback) => {
    try {
      gameRooms.clear();
      gameStates.clear();
      playerSessions.clear();
      
      console.log('🧹 All rooms cleared');
      callback({ success: true });
      
    } catch (error) {
      console.error('Error clearing rooms:', error);
      callback({ success: false, error: 'Failed to clear rooms' });
    }
  });

  // Handle chess moves with validation
  socket.on('makeMove', async ({ gameId, move, playerId, color }) => {
    try {
      // Validate move (basic validation - can be enhanced)
      if (!move || !move.from || !move.to) {
        socket.emit('moveError', { error: 'Invalid move format' });
        return;
      }

      // Store move in game state
      if (!gameStates.has(gameId)) {
        gameStates.set(gameId, { moves: [], currentTurn: 'white' });
      }
      
      const gameState = gameStates.get(gameId);
      
      // Check if it's the player's turn
      if (gameState.currentTurn !== color) {
        socket.emit('moveError', { error: 'Not your turn' });
        return;
      }

      // Add move to game state
      gameState.moves.push({
        ...move,
        playerId,
        color,
        timestamp: Date.now()
      });

      // Switch turns
      gameState.currentTurn = color === 'white' ? 'black' : 'white';

      // Broadcast move to other player
      socket.to(gameId).emit('moveMade', {
        move,
        playerId,
        color,
        timestamp: Date.now(),
        nextTurn: gameState.currentTurn
      });

      // Confirm move to sender
      socket.emit('moveConfirmed', {
        move,
        nextTurn: gameState.currentTurn
      });

      // Save move to database
      try {
        await dbService.addMove(gameId, {
          from: move.from,
          to: move.to,
          piece: move.piece,
          playerId,
          color,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error saving move to database:', error);
      }

    } catch (error) {
      console.error('Error processing move:', error);
      socket.emit('moveError', { error: 'Failed to process move' });
    }
  });

  // Handle chat messages
  socket.on('sendMessage', async ({ gameId, message, playerId, playerName }) => {
    try {
      // Basic message validation
      if (!message || message.trim().length === 0) {
        socket.emit('chatError', { error: 'Message cannot be empty' });
        return;
      }

      if (message.length > 500) {
        socket.emit('chatError', { error: 'Message too long (max 500 characters)' });
        return;
      }

      const chatMessage = {
        id: Date.now().toString(),
        gameId,
        playerId,
        playerName,
        message: message.trim(),
        timestamp: new Date()
      };

      // Store message in memory
      if (!chatMessages.has(gameId)) {
        chatMessages.set(gameId, []);
      }
      chatMessages.get(gameId).push(chatMessage);

      // Broadcast message to all players in the game
      io.to(gameId).emit('chatMessage', chatMessage);

      // Save message to database
      try {
        await dbService.addChatMessage(gameId, chatMessage);
      } catch (error) {
        console.error('Error saving chat message to database:', error);
      }

    } catch (error) {
      console.error('Error processing chat message:', error);
      socket.emit('chatError', { error: 'Failed to send message' });
    }
  });

  // Get chat messages for a room
  socket.on('getChatMessages', async (data, callback) => {
    try {
      const { roomId } = data;
      
      const messages = chatMessages.get(roomId) || [];
      callback({ success: true, messages });
      
    } catch (error) {
      console.error('Error getting chat messages:', error);
      callback({ success: false, error: 'Failed to get chat messages' });
    }
  });

  // Send chat message to room
  socket.on('sendChatMessage', async (data, callback) => {
    try {
      const { roomId, message, playerWallet, playerRole } = data;
      
      if (!message || message.trim().length === 0) {
        callback({ success: false, error: 'Message cannot be empty' });
        return;
      }

      if (message.length > 500) {
        callback({ success: false, error: 'Message too long (max 500 characters)' });
        return;
      }

      const chatMessage = {
        id: Date.now().toString(),
        roomId,
        playerWallet,
        playerRole,
        message: message.trim(),
        timestamp: new Date()
      };

      // Store message in memory
      if (!chatMessages.has(roomId)) {
        chatMessages.set(roomId, []);
      }
      chatMessages.get(roomId).push(chatMessage);

      console.log('💬 Chat message sent:', roomId, playerWallet, message);
      callback({ success: true, message: chatMessage });

      // Broadcast message to all players in the room
      io.to(roomId).emit('chatMessageReceived', chatMessage);

    } catch (error) {
      console.error('Error sending chat message:', error);
      callback({ success: false, error: 'Failed to send message' });
    }
  });

  // Handle game state requests
  socket.on('getGameState', async (gameId) => {
    const gameState = gameStates.get(gameId);
    if (gameState) {
      socket.emit('gameState', gameState);
    } else {
      socket.emit('gameState', { moves: [], currentTurn: 'white' });
    }
  });

  // Handle chat history requests
  socket.on('getChatHistory', async (gameId) => {
    try {
      const messages = await dbService.getChatMessages(gameId);
      socket.emit('chatHistory', messages);
    } catch (error) {
      console.error('Error fetching chat history:', error);
      socket.emit('chatHistory', []);
    }
  });

  // Handle player ready status
  socket.on('playerReady', ({ gameId, playerId, color }) => {
    socket.to(gameId).emit('playerReady', { playerId, color });
  });

  // Handle game resignation
  socket.on('resignGame', ({ gameId, playerId, color }) => {
    io.to(gameId).emit('gameResigned', { 
      playerId, 
      color,
      winner: color === 'white' ? 'black' : 'white',
      timestamp: Date.now()
    });
  });

  // Handle draw offers
  socket.on('offerDraw', ({ gameId, playerId, color }) => {
    socket.to(gameId).emit('drawOffered', { playerId, color });
  });

  socket.on('respondToDraw', ({ gameId, accepted }) => {
    io.to(gameId).emit('drawResponse', { accepted, timestamp: Date.now() });
  });

  // Handle connection status
  socket.on('ping', () => {
    socket.emit('pong');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Clean up player session
    const session = playerSessions.get(socket.id);
    if (session) {
      // Notify other players about disconnection
      socket.to(session.gameId).emit('playerDisconnected', {
        playerId: session.playerId,
        color: session.color
      });
      
      playerSessions.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3001; // Use Railway's PORT or default to 3001
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});