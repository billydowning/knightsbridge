const express = require('express');
const router = express.Router();
const { dbService, pool } = require('../database');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'knightsbridge-chess-backend'
  });
});

// ========================================
// ROOM MANAGEMENT (for HTTP fallback)
// ========================================

// Create room
router.post('/rooms', async (req, res) => {
  try {
    const { roomId, playerWallet } = req.body;
    
    if (!roomId || !playerWallet) {
      return res.status(400).json({ error: 'Room ID and player wallet are required' });
    }
    
    // Check if room already exists
    const existingRoom = await pool.query('SELECT room_id FROM games WHERE room_id = $1', [roomId]);
    if (existingRoom.rows.length > 0) {
      return res.status(409).json({ error: 'Room already exists' });
    }
    
    // Create room in database
    await pool.query(
      'INSERT INTO games (room_id, player_white_wallet, game_state, updated_at) VALUES ($1, $2, $3, $4)',
      [roomId, playerWallet, 'waiting', new Date()]
    );
    
    console.log('✅ Room created via HTTP API:', roomId, 'for player:', playerWallet);
    
    res.json({ 
      success: true, 
      role: 'white',
      roomId,
      playerWallet
    });
  } catch (error) {
    console.error('❌ Create room error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Join room
router.post('/rooms/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { playerWallet } = req.body;
    
    if (!playerWallet) {
      return res.status(400).json({ error: 'Player wallet is required' });
    }
    
    // Check if room exists
    const existingRoom = await pool.query('SELECT room_id, player_white_wallet, player_black_wallet FROM games WHERE room_id = $1', [roomId]);
    if (existingRoom.rows.length === 0) {
      return res.status(404).json({ error: 'Room does not exist' });
    }
    
    const room = existingRoom.rows[0];
    
    // Check if player is already in the room
    if (room.player_white_wallet === playerWallet) {
      return res.json({ success: true, role: 'white' });
    }
    
    if (room.player_black_wallet === playerWallet) {
      return res.json({ success: true, role: 'black' });
    }
    
    // Check if room is full
    if (room.player_black_wallet) {
      return res.status(409).json({ error: 'Room is full' });
    }
    
    // Add black player to room
    await pool.query(
      'UPDATE games SET player_black_wallet = $1, updated_at = $2 WHERE room_id = $3',
      [playerWallet, new Date(), roomId]
    );
    
    console.log('✅ Player joined room via HTTP API:', roomId, 'player:', playerWallet, 'role: black');
    
    res.json({ 
      success: true, 
      role: 'black',
      roomId,
      playerWallet
    });
  } catch (error) {
    console.error('❌ Join room error:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Get room status
router.get('/rooms/:roomId/status', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Get room from database
    const roomResult = await pool.query(
      'SELECT room_id, player_white_wallet, player_black_wallet, game_state, updated_at FROM games WHERE room_id = $1',
      [roomId]
    );
    
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room does not exist' });
    }
    
    const room = roomResult.rows[0];
    
    // Get escrows for this room
    const escrowsResult = await pool.query(
      'SELECT player_wallet, escrow_amount FROM escrows WHERE room_id = $1',
      [roomId]
    );
    
    const escrows = {};
    escrowsResult.rows.forEach(row => {
      escrows[row.player_wallet] = parseFloat(row.escrow_amount);
    });
    
    // Calculate player count and escrow count
    const players = [];
    if (room.player_white_wallet) players.push({ wallet: room.player_white_wallet, role: 'white' });
    if (room.player_black_wallet) players.push({ wallet: room.player_black_wallet, role: 'black' });
    
    const roomStatus = {
      roomId: room.room_id,
      playerCount: players.length,
      players,
      escrowCount: Object.keys(escrows).length,
      escrows,
      gameStarted: room.game_state === 'active',
      lastUpdated: room.updated_at
    };
    
    console.log('✅ Room status retrieved via HTTP API:', roomId, roomStatus);
    
    res.json({ 
      success: true, 
      roomStatus
    });
  } catch (error) {
    console.error('❌ Get room status error:', error);
    res.status(500).json({ error: 'Failed to get room status' });
  }
});

// Add escrow
router.post('/rooms/:roomId/escrow', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { playerWallet, amount } = req.body;
    
    if (!playerWallet || !amount) {
      return res.status(400).json({ error: 'Player wallet and amount are required' });
    }
    
    // Check if room exists
    const roomResult = await pool.query('SELECT room_id FROM games WHERE room_id = $1', [roomId]);
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room does not exist' });
    }
    
    // Check if escrow already exists
    const existingEscrow = await pool.query(
      'SELECT id FROM escrows WHERE room_id = $1 AND player_wallet = $2',
      [roomId, playerWallet]
    );
    
    if (existingEscrow.rows.length > 0) {
      return res.status(409).json({ error: 'Escrow already exists for this player' });
    }
    
    // Create escrow
    await pool.query(
      'INSERT INTO escrows (room_id, player_wallet, escrow_amount, status) VALUES ($1, $2, $3, $4)',
      [roomId, playerWallet, amount, 'pending']
    );
    
    console.log('✅ Escrow added via HTTP API:', roomId, 'player:', playerWallet, 'amount:', amount);
    
    res.json({ 
      success: true, 
      message: 'Escrow created successfully',
      roomId,
      playerWallet,
      amount
    });
  } catch (error) {
    console.error('❌ Add escrow error:', error);
    res.status(500).json({ error: 'Failed to add escrow' });
  }
});

// Get game state
router.get('/rooms/:roomId/game-state', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // For now, return a basic game state
    // In a real implementation, this would come from a game_states table
    const gameState = {
      position: {
        'a1': '♖', 'b1': '♘', 'c1': '♗', 'd1': '♕', 'e1': '♔', 'f1': '♗', 'g1': '♘', 'h1': '♖',
        'a2': '♙', 'b2': '♙', 'c2': '♙', 'd2': '♙', 'e2': '♙', 'f2': '♙', 'g2': '♙', 'h2': '♙',
        'a7': '♟', 'b7': '♟', 'c7': '♟', 'd7': '♟', 'e7': '♟', 'f7': '♟', 'g7': '♟', 'h7': '♟',
        'a8': '♜', 'b8': '♞', 'c8': '♝', 'd8': '♛', 'e8': '♚', 'f8': '♝', 'g8': '♞', 'h8': '♜'
      },
      currentPlayer: 'white',
      selectedSquare: null,
      gameActive: true,
      winner: null,
      draw: false,
      moveHistory: [],
      lastUpdated: Date.now(),
      castlingRights: 'KQkq',
      enPassantTarget: null,
      halfmoveClock: 0,
      fullmoveNumber: 1,
      inCheck: false,
      inCheckmate: false,
      lastMove: null
    };
    
    res.json({ 
      success: true, 
      gameState
    });
  } catch (error) {
    console.error('❌ Get game state error:', error);
    res.status(500).json({ error: 'Failed to get game state' });
  }
});

// Save game state
router.post('/rooms/:roomId/game-state', async (req, res) => {
  try {
    const { roomId } = req.params;
    const gameState = req.body;
    
    // For now, just log the game state
    // In a real implementation, this would save to a game_states table
    console.log('✅ Game state saved via HTTP API:', roomId, gameState);
    
    res.json({ 
      success: true, 
      message: 'Game state saved successfully'
    });
  } catch (error) {
    console.error('❌ Save game state error:', error);
    res.status(500).json({ error: 'Failed to save game state' });
  }
});

// ========================================
// USER MANAGEMENT
// ========================================

// Register/Update user
router.post('/users/register', async (req, res) => {
  try {
    const { walletAddress, username, email, avatarUrl } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    const user = await dbService.createOrUpdateUser(walletAddress, {
      username,
      email,
      avatar_url: avatarUrl
    });
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Get user profile
router.get('/users/profile/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const user = await dbService.getUserByWallet(walletAddress);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Get user statistics
router.get('/users/:userId/statistics', async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeControl } = req.query;
    
    const statistics = await dbService.getUserStatistics(userId, timeControl);
    
    if (!statistics) {
      return res.status(404).json({ error: 'User statistics not found' });
    }
    
    res.json({ success: true, statistics });
  } catch (error) {
    console.error('Get user statistics error:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
});

// ========================================
// GAME MANAGEMENT
// ========================================

// Create new game
router.post('/games/create', async (req, res) => {
  try {
    const {
      roomId,
      blockchainTxId,
      playerWhiteWallet,
      playerBlackWallet,
      stakeAmount,
      timeControl,
      timeLimit,
      increment
    } = req.body;
    
    if (!roomId || !playerWhiteWallet || !playerBlackWallet || !stakeAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const game = await dbService.createGame({
      roomId,
      blockchainTxId,
      playerWhiteWallet,
      playerBlackWallet,
      stakeAmount,
      timeControl,
      timeLimit,
      increment
    });
    
    res.json({ success: true, game });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Get game by room ID
router.get('/games/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const game = await dbService.getGameByRoomId(roomId);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json({ success: true, game });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ error: 'Failed to get game' });
  }
});

// Update game
router.put('/games/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const updateData = req.body;
    
    const game = await dbService.updateGame(roomId, updateData);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json({ success: true, game });
  } catch (error) {
    console.error('Update game error:', error);
    res.status(500).json({ error: 'Failed to update game' });
  }
});

// Record move
router.post('/games/:roomId/moves', async (req, res) => {
  try {
    const { roomId } = req.params;
    const moveData = req.body;
    
    // Get game first
    const game = await dbService.getGameByRoomId(roomId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const move = await dbService.recordMove(game.id, moveData);
    
    res.json({ success: true, move });
  } catch (error) {
    console.error('Record move error:', error);
    res.status(500).json({ error: 'Failed to record move' });
  }
});

// Get game moves
router.get('/games/:roomId/moves', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Get game first
    const game = await dbService.getGameByRoomId(roomId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const moves = await dbService.getGameMoves(game.id);
    
    res.json({ success: true, moves });
  } catch (error) {
    console.error('Get game moves error:', error);
    res.status(500).json({ error: 'Failed to get game moves' });
  }
});

// ========================================
// TOURNAMENT MANAGEMENT
// ========================================

// Create tournament
router.post('/tournaments/create', async (req, res) => {
  try {
    const {
      name,
      description,
      tournamentType,
      timeControl,
      entryFee,
      prizePool,
      maxParticipants,
      startDate,
      endDate,
      createdBy
    } = req.body;
    
    if (!name || !tournamentType || !timeControl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const tournament = await dbService.createTournament({
      name,
      description,
      tournamentType,
      timeControl,
      entryFee,
      prizePool,
      maxParticipants,
      startDate,
      endDate,
      createdBy
    });
    
    res.json({ success: true, tournament });
  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

// Get tournaments
router.get('/tournaments', async (req, res) => {
  try {
    const { status, timeControl } = req.query;
    
    // This would need to be implemented in the database service
    // For now, we'll return a placeholder
    res.json({ success: true, tournaments: [] });
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.status(500).json({ error: 'Failed to get tournaments' });
  }
});

// Join tournament
router.post('/tournaments/:tournamentId/join', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const participant = await dbService.joinTournament(tournamentId, userId);
    
    res.json({ success: true, participant });
  } catch (error) {
    console.error('Join tournament error:', error);
    res.status(500).json({ error: 'Failed to join tournament' });
  }
});

// ========================================
// LEADERBOARDS
// ========================================

// Get leaderboard
router.get('/leaderboards/:timeControl', async (req, res) => {
  try {
    const { timeControl } = req.params;
    const { period = 'all_time', limit = 50 } = req.query;
    
    const leaderboard = await dbService.getLeaderboard(timeControl, period, limit);
    
    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// ========================================
// ANALYTICS
// ========================================

// Get daily analytics
router.get('/analytics/daily', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const analytics = await dbService.getDailyAnalytics(targetDate);
    
    res.json({ success: true, analytics });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// ========================================
// NOTIFICATIONS
// ========================================

// Create notification
router.post('/notifications', async (req, res) => {
  try {
    const { userId, type, title, message, data } = req.body;
    
    if (!userId || !type || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const notification = await dbService.createNotification(userId, {
      type,
      title,
      message,
      data
    });
    
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Get user notifications
router.get('/users/:userId/notifications', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;
    
    const notifications = await dbService.getUserNotifications(userId, limit);
    
    res.json({ success: true, notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await dbService.markNotificationAsRead(notificationId);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// ========================================
// HEALTH CHECK
// ========================================

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const isConnected = await dbService.testConnection();
    
    if (isConnected) {
      res.json({ 
        success: true, 
        message: 'API is healthy',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({ 
        success: false, 
        message: 'Database connection failed',
        database: 'disconnected'
      });
    }
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({ 
      success: false, 
      message: 'Health check failed',
      error: error.message
    });
  }
});

module.exports = router; 