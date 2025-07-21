require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { dbService } = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for development; restrict in production
  }
});

app.use(cors());
app.use(express.json()); // Parse JSON bodies

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

// Game state management
const gameStates = new Map(); // Store game states in memory
const playerSessions = new Map(); // Track player sessions

// Handle Socket.io connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join a game room
  socket.on('joinGame', async (gameId, playerInfo) => {
    socket.join(gameId);
    console.log(`User ${socket.id} joined game ${gameId}`);
    
    // Store player session
    playerSessions.set(socket.id, {
      gameId,
      playerId: playerInfo?.playerId,
      color: null,
      isReady: false
    });

    // Get number of players in room
    const socketsInRoom = await io.in(gameId).fetchSockets();
    const playerCount = socketsInRoom.length;

    // Assign color based on count (first is white, second is black)
    let color = 'white';
    let isTurn = true; // White starts
    if (playerCount === 2) {
      color = 'black';
      isTurn = false;
    }

    // Update player session
    const session = playerSessions.get(socket.id);
    if (session) {
      session.color = color;
      session.isReady = true;
    }

    // Send assigned color and turn to the joining player
    socket.emit('assignedColor', { color, isTurn });

    // Notify other players about new player joining
    socket.to(gameId).emit('playerJoined', { 
      playerId: playerInfo?.playerId,
      color: color === 'white' ? 'black' : 'white' // Opposite color
    });

    // If this is the second player, start the game
    if (playerCount === 2) {
      io.to(gameId).emit('gameStarted', { 
        whitePlayer: playerCount === 1 ? playerInfo?.playerId : null,
        blackPlayer: playerCount === 2 ? playerInfo?.playerId : null
      });
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
        timestamp: Date.now(),
        type: 'chat'
      };

      // Broadcast message to all players in the game
      io.to(gameId).emit('newMessage', chatMessage);

      // Save message to database
      try {
        await dbService.addChatMessage(gameId, {
          playerId,
          playerName,
          message: chatMessage.message,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error saving chat message to database:', error);
      }

    } catch (error) {
      console.error('Error processing chat message:', error);
      socket.emit('chatError', { error: 'Failed to send message' });
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