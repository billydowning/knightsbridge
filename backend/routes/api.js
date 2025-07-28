const express = require('express');
const router = express.Router();
const { pool: getPool } = require('../database');

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
    
    console.log('🔍 Room creation request:', { roomId, playerWallet });
    
    if (!roomId || !playerWallet) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'Room ID and player wallet are required' });
    }
    
    console.log('✅ Required fields present, getting pool...');
    const pool = getPool();
    console.log('✅ Pool obtained, checking for existing room...');
    
    // Check if room already exists
    const existingRoom = await pool.query('SELECT room_id FROM games WHERE room_id = $1', [roomId]);
    console.log('✅ Existing room check completed:', existingRoom.rows.length, 'rooms found');
    
    if (existingRoom.rows.length > 0) {
      console.log('❌ Room already exists');
      return res.status(409).json({ error: 'Room already exists' });
    }
    
    console.log('✅ Room is unique, creating new room...');
    // Create room in database
    const result = await pool.query(
      'INSERT INTO games (room_id, player_white_wallet, game_state, updated_at) VALUES ($1, $2, $3, $4) RETURNING *',
      [roomId, playerWallet, 'waiting', new Date()]
    );
    
    console.log('✅ Room created successfully:', result.rows[0]);
    
    res.json({ 
      success: true, 
      role: 'white',
      roomId,
      playerWallet,
      room: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Create room error (detailed):', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to create room', details: error.message });
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
    
    const pool = getPool();

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
    
    const pool = getPool();

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
    
    const pool = getPool();

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
    
    const pool = getPool();
    const user = await pool.query(
      'INSERT INTO users (wallet_address, username, email, avatar_url) VALUES ($1, $2, $3, $4) ON CONFLICT (wallet_address) DO UPDATE SET username = $2, email = $3, avatar_url = $4 RETURNING *',
      [walletAddress, username, email, avatarUrl]
    );
    
    res.json({ success: true, user: user.rows[0] });
  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Get user profile
router.get('/users/profile/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const pool = getPool();
    const user = await pool.query(
      'SELECT wallet_address, username, email, avatar_url FROM users WHERE wallet_address = $1',
      [walletAddress]
    );
    
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, user: user.rows[0] });
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
    
    const pool = getPool();
    const statistics = await pool.query(
      'SELECT * FROM user_statistics WHERE user_id = $1 AND time_control = $2',
      [userId, timeControl]
    );
    
    if (statistics.rows.length === 0) {
      return res.status(404).json({ error: 'User statistics not found' });
    }
    
    res.json({ success: true, statistics: statistics.rows[0] });
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
    
    const pool = getPool();
    const game = await pool.query(
      'INSERT INTO games (room_id, blockchain_tx_id, player_white_wallet, player_black_wallet, stake_amount, time_control, time_limit, increment, game_state, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [roomId, blockchainTxId, playerWhiteWallet, playerBlackWallet, stakeAmount, timeControl, timeLimit, increment, 'waiting', new Date()]
    );
    
    res.json({ success: true, game: game.rows[0] });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Get game by room ID
router.get('/games/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const pool = getPool();
    const game = await pool.query(
      'SELECT * FROM games WHERE room_id = $1',
      [roomId]
    );
    
    if (game.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json({ success: true, game: game.rows[0] });
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
    
    const pool = getPool();
    const game = await pool.query(
      'UPDATE games SET $1 WHERE room_id = $2 RETURNING *',
      [updateData, roomId]
    );
    
    if (game.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json({ success: true, game: game.rows[0] });
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
    const pool = getPool();
    const game = await pool.query(
      'SELECT id FROM games WHERE room_id = $1',
      [roomId]
    );
    if (game.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const move = await pool.query(
      'INSERT INTO moves (game_id, move_data, created_at) VALUES ($1, $2, $3) RETURNING *',
      [game.rows[0].id, JSON.stringify(moveData), new Date()]
    );
    
    res.json({ success: true, move: move.rows[0] });
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
    const pool = getPool();
    const game = await pool.query(
      'SELECT id FROM games WHERE room_id = $1',
      [roomId]
    );
    if (game.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const moves = await pool.query(
      'SELECT * FROM moves WHERE game_id = $1 ORDER BY created_at ASC',
      [game.rows[0].id]
    );
    
    res.json({ success: true, moves: moves.rows });
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
    
    const pool = getPool();
    const tournament = await pool.query(
      'INSERT INTO tournaments (name, description, tournament_type, time_control, entry_fee, prize_pool, max_participants, start_date, end_date, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [name, description, tournamentType, timeControl, entryFee, prizePool, maxParticipants, startDate, endDate, createdBy, new Date()]
    );
    
    res.json({ success: true, tournament: tournament.rows[0] });
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
    
    const pool = getPool();
    const participant = await pool.query(
      'INSERT INTO tournament_participants (tournament_id, user_id, joined_at) VALUES ($1, $2, $3) RETURNING *',
      [tournamentId, userId, new Date()]
    );
    
    res.json({ success: true, participant: participant.rows[0] });
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
    
    const pool = getPool();
    const leaderboard = await pool.query(
      'SELECT u.wallet_address, u.username, us.wins, us.losses, us.draws, us.total_games, us.total_points FROM user_statistics us JOIN users u ON us.user_id = u.id WHERE us.time_control = $1 AND us.period = $2 ORDER BY us.total_points DESC LIMIT $3',
      [timeControl, period, limit]
    );
    
    res.json({ success: true, leaderboard: leaderboard.rows });
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
    
    const pool = getPool();
    const analytics = await pool.query(
      'SELECT * FROM daily_analytics WHERE date = $1',
      [targetDate]
    );
    
    res.json({ success: true, analytics: analytics.rows[0] });
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
    
    const pool = getPool();
    const notification = await pool.query(
      'INSERT INTO notifications (user_id, type, title, message, data, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, type, title, message, JSON.stringify(data), new Date()]
    );
    
    res.json({ success: true, notification: notification.rows[0] });
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
    
    const pool = getPool();
    const notifications = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    
    res.json({ success: true, notifications: notifications.rows });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const pool = getPool();
    const notification = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *',
      [notificationId]
    );
    
    if (notification.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ success: true, notification: notification.rows[0] });
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
    const pool = getPool();
    const isConnected = await pool.query('SELECT 1 FROM users LIMIT 1'); // Simple check
    
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

// ========================================
// DELETE OPERATIONS (for testing/cleanup)
// ========================================

// Delete room and all associated data
router.delete('/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const pool = getPool();
    
    console.log('🗑️ Deleting room and associated data:', roomId);
    
    // Delete in proper order due to foreign key constraints
    // 1. Delete escrows first
    const escrowResult = await pool.query('DELETE FROM escrows WHERE room_id = $1', [roomId]);
    console.log('✅ Deleted escrows:', escrowResult.rowCount);
    
    // 2. Delete game moves if any
    const movesResult = await pool.query('DELETE FROM game_moves WHERE room_id = $1', [roomId]);
    console.log('✅ Deleted game moves:', movesResult.rowCount);
    
    // 3. Delete the game/room
    const gameResult = await pool.query('DELETE FROM games WHERE room_id = $1 RETURNING *', [roomId]);
    
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    console.log('✅ Deleted room:', gameResult.rows[0]);
    
    res.json({ 
      success: true, 
      message: 'Room and all associated data deleted successfully',
      roomId,
      deletedCounts: {
        escrows: escrowResult.rowCount,
        moves: movesResult.rowCount,
        room: gameResult.rowCount
      }
    });
  } catch (error) {
    console.error('❌ Delete room error:', error);
    res.status(500).json({ error: 'Failed to delete room', details: error.message });
  }
});

// Delete user (be careful with this!)
router.delete('/users/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const pool = getPool();
    
    console.log('🗑️ Deleting user:', walletAddress);
    
    const result = await pool.query('DELETE FROM users WHERE wallet_address = $1 RETURNING *', [walletAddress]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ Deleted user:', result.rows[0]);
    
    res.json({ 
      success: true, 
      message: 'User deleted successfully',
      deletedUser: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

// Delete all test data (for development/testing only)
router.delete('/debug/cleanup-test-data', async (req, res) => {
  try {
    const pool = getPool();
    
    console.log('🧹 Cleaning up all test data...');
    
    // Delete test rooms and related data
    const testRoomPattern = '%test%';
    
    // Delete escrows for test rooms
    const escrowResult = await pool.query(`
      DELETE FROM escrows 
      WHERE room_id LIKE $1 OR player_wallet LIKE $1
    `, [testRoomPattern]);
    
    // Delete game moves for test rooms
    const movesResult = await pool.query(`
      DELETE FROM game_moves 
      WHERE room_id LIKE $1
    `, [testRoomPattern]);
    
    // Delete test games
    const gamesResult = await pool.query(`
      DELETE FROM games 
      WHERE room_id LIKE $1 OR player_white_wallet LIKE $1 OR player_black_wallet LIKE $1
    `, [testRoomPattern]);
    
    // Delete test users
    const usersResult = await pool.query(`
      DELETE FROM users 
      WHERE wallet_address LIKE $1 OR username LIKE $1
    `, [testRoomPattern]);
    
    console.log('✅ Test data cleanup completed');
    
    res.json({ 
      success: true, 
      message: 'All test data cleaned up successfully',
      deletedCounts: {
        escrows: escrowResult.rowCount,
        moves: movesResult.rowCount,
        games: gamesResult.rowCount,
        users: usersResult.rowCount
      }
    });
  } catch (error) {
    console.error('❌ Cleanup test data error:', error);
    res.status(500).json({ error: 'Failed to cleanup test data', details: error.message });
  }
});

// Debug endpoint to check database contents
router.get('/debug/database', async (req, res) => {
  try {
    const pool = getPool();
    
    // Get all games
    const games = await pool.query('SELECT * FROM games ORDER BY created_at DESC LIMIT 10');
    
    // Get all escrows  
    const escrows = await pool.query('SELECT * FROM escrows ORDER BY created_at DESC LIMIT 10');
    
    res.json({
      success: true,
      games: games.rows,
      escrows: escrows.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Debug database error:', error);
    res.status(500).json({ error: 'Failed to query database', details: error.message });
  }
});

module.exports = router; 