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
// LEADERBOARD
// ========================================

// Get leaderboard data
router.get('/leaderboard', async (req, res) => {
  try {
    console.log('🏆 Fetching leaderboard data...');
    const pool = getPool();
    
    // Get top players with their stats
    const result = await pool.query(`
      SELECT 
        wallet_address,
        username,
        games_played,
        games_won,
        games_drawn,
        (games_played - games_won - games_drawn) as games_lost,
        CASE 
          WHEN games_played > 0 
          THEN ROUND((games_won::DECIMAL / games_played::DECIMAL) * 100, 1)
          ELSE 0 
        END as win_percentage,
        total_winnings,
        total_losses,
        (total_winnings - total_losses) as net_earnings,
        current_win_streak,
        best_win_streak,
        rating_rapid,
        rating_blitz,
        rating_bullet,
        last_active
      FROM users 
      WHERE games_played > 0 
      ORDER BY 
        games_won DESC, 
        win_percentage DESC, 
        total_winnings DESC
      LIMIT 20
    `);
    
    console.log(`✅ Found ${result.rows.length} players for leaderboard`);
    
    // Format the data for frontend
    const leaderboard = result.rows.map((player, index) => ({
      rank: index + 1,
      wallet: player.wallet_address,
      username: player.username || `Player ${player.wallet_address.slice(0, 6)}...`,
      gamesPlayed: parseInt(player.games_played),
      gamesWon: parseInt(player.games_won),
      gamesDrawn: parseInt(player.games_drawn),
      gamesLost: parseInt(player.games_lost),
      winPercentage: parseFloat(player.win_percentage),
      totalWinnings: parseFloat(player.total_winnings || 0),
      totalLosses: parseFloat(player.total_losses || 0),
      netEarnings: parseFloat(player.net_earnings || 0),
      currentStreak: parseInt(player.current_win_streak || 0),
      bestStreak: parseInt(player.best_win_streak || 0),
      ratingRapid: parseInt(player.rating_rapid || 1200),
      ratingBlitz: parseInt(player.rating_blitz || 1200),
      ratingBullet: parseInt(player.rating_bullet || 1200),
      lastActive: player.last_active
    }));
    
    res.json({
      success: true,
      leaderboard,
      totalPlayers: result.rows.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch leaderboard data',
      details: error.message 
    });
  }
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
// UPDATE OPERATIONS (PUT/PATCH)
// ========================================

// Update room status and game state
router.put('/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { 
      gameState, 
      stakeAmount, 
      timeControl, 
      timeLimit, 
      increment,
      winner,
      gameResult,
      finalPosition,
      pgn
    } = req.body;
    
    const pool = getPool();
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    if (gameState !== undefined) {
      updateFields.push(`game_state = $${paramCount++}`);
      values.push(gameState);
    }
    if (stakeAmount !== undefined) {
      updateFields.push(`stake_amount = $${paramCount++}`);
      values.push(stakeAmount);
    }
    if (timeControl !== undefined) {
      updateFields.push(`time_control = $${paramCount++}`);
      values.push(timeControl);
    }
    if (timeLimit !== undefined) {
      updateFields.push(`time_limit = $${paramCount++}`);
      values.push(timeLimit);
    }
    if (increment !== undefined) {
      updateFields.push(`increment = $${paramCount++}`);
      values.push(increment);
    }
    if (winner !== undefined) {
      updateFields.push(`winner = $${paramCount++}`);
      values.push(winner);
    }
    if (gameResult !== undefined) {
      updateFields.push(`game_result = $${paramCount++}`);
      values.push(gameResult);
    }
    if (finalPosition !== undefined) {
      updateFields.push(`final_position = $${paramCount++}`);
      values.push(finalPosition);
    }
    if (pgn !== undefined) {
      updateFields.push(`pgn = $${paramCount++}`);
      values.push(pgn);
    }
    
    // Always update the timestamp
    updateFields.push(`updated_at = $${paramCount++}`);
    values.push(new Date());
    
    // Add roomId for WHERE clause
    values.push(roomId);
    
    if (updateFields.length === 1) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }
    
    const query = `
      UPDATE games 
      SET ${updateFields.join(', ')}
      WHERE room_id = $${paramCount}
      RETURNING *
    `;
    
    console.log('🔄 Updating room:', roomId, 'with fields:', updateFields);
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    console.log('✅ Room updated successfully:', result.rows[0]);
    
    res.json({ 
      success: true, 
      message: 'Room updated successfully',
      room: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Update room error:', error);
    res.status(500).json({ error: 'Failed to update room', details: error.message });
  }
});

// Update user profile
router.put('/users/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { 
      username, 
      email, 
      avatarUrl,
      ratingRapid,
      ratingBlitz,
      ratingBullet
    } = req.body;
    
    const pool = getPool();
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    if (username !== undefined) {
      updateFields.push(`username = $${paramCount++}`);
      values.push(username);
    }
    if (email !== undefined) {
      updateFields.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (avatarUrl !== undefined) {
      updateFields.push(`avatar_url = $${paramCount++}`);
      values.push(avatarUrl);
    }
    if (ratingRapid !== undefined) {
      updateFields.push(`rating_rapid = $${paramCount++}`);
      values.push(ratingRapid);
    }
    if (ratingBlitz !== undefined) {
      updateFields.push(`rating_blitz = $${paramCount++}`);
      values.push(ratingBlitz);
    }
    if (ratingBullet !== undefined) {
      updateFields.push(`rating_bullet = $${paramCount++}`);
      values.push(ratingBullet);
    }
    
    // Always update the timestamp
    updateFields.push(`updated_at = $${paramCount++}`);
    values.push(new Date());
    
    // Add walletAddress for WHERE clause
    values.push(walletAddress);
    
    if (updateFields.length === 1) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }
    
    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE wallet_address = $${paramCount}
      RETURNING *
    `;
    
    console.log('🔄 Updating user:', walletAddress, 'with fields:', updateFields);
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ User updated successfully:', result.rows[0]);
    
    res.json({ 
      success: true, 
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

// Update escrow status
router.patch('/escrows/:escrowId', async (req, res) => {
  try {
    const { escrowId } = req.params;
    const { status, txHash, confirmedAmount } = req.body;
    
    const pool = getPool();
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    if (status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (txHash !== undefined) {
      updateFields.push(`tx_hash = $${paramCount++}`);
      values.push(txHash);
    }
    if (confirmedAmount !== undefined) {
      updateFields.push(`confirmed_amount = $${paramCount++}`);
      values.push(confirmedAmount);
    }
    
    // Always update the timestamp
    updateFields.push(`updated_at = $${paramCount++}`);
    values.push(new Date());
    
    // Add escrowId for WHERE clause
    values.push(escrowId);
    
    if (updateFields.length === 1) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }
    
    const query = `
      UPDATE escrows 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    console.log('🔄 Updating escrow:', escrowId, 'with fields:', updateFields);
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Escrow not found' });
    }
    
    console.log('✅ Escrow updated successfully:', result.rows[0]);
    
    res.json({ 
      success: true, 
      message: 'Escrow updated successfully',
      escrow: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Update escrow error:', error);
    res.status(500).json({ error: 'Failed to update escrow', details: error.message });
  }
});

// Patch room with minimal updates (useful for quick status changes)
router.patch('/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const updates = req.body;
    
    const pool = getPool();
    
    // Validate that we have something to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    // Allow any field from the games table to be updated
    const allowedFields = [
      'game_state', 'stake_amount', 'time_control', 'time_limit', 'increment',
      'winner', 'game_result', 'final_position', 'pgn', 'move_count',
      'player_black_wallet', 'blockchain_tx_id', 'platform_fee',
      'started_at', 'finished_at'
    ];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided to update' });
    }
    
    // Always update the timestamp
    updateFields.push(`updated_at = $${paramCount++}`);
    values.push(new Date());
    
    // Add roomId for WHERE clause
    values.push(roomId);
    
    const query = `
      UPDATE games 
      SET ${updateFields.join(', ')}
      WHERE room_id = $${paramCount}
      RETURNING *
    `;
    
    console.log('🔄 Patching room:', roomId, 'with updates:', Object.keys(updates));
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    console.log('✅ Room patched successfully:', result.rows[0]);
    
    res.json({ 
      success: true, 
      message: 'Room patched successfully',
      room: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Patch room error:', error);
    res.status(500).json({ error: 'Failed to patch room', details: error.message });
  }
});

// Update user statistics (for game results)
router.put('/users/:walletAddress/statistics', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { 
      gamesPlayed,
      gamesWon,
      gamesDrawn,
      totalWinnings,
      totalLosses,
      winStreak,
      ratingChange
    } = req.body;
    
    const pool = getPool();
    
    // First check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE wallet_address = $1', [walletAddress]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Build update query for statistics
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    if (gamesPlayed !== undefined) {
      updateFields.push(`games_played = games_played + $${paramCount++}`);
      values.push(gamesPlayed);
    }
    if (gamesWon !== undefined) {
      updateFields.push(`games_won = games_won + $${paramCount++}`);
      values.push(gamesWon);
    }
    if (gamesDrawn !== undefined) {
      updateFields.push(`games_drawn = games_drawn + $${paramCount++}`);
      values.push(gamesDrawn);
    }
    if (totalWinnings !== undefined) {
      updateFields.push(`total_winnings = total_winnings + $${paramCount++}`);
      values.push(totalWinnings);
    }
    if (totalLosses !== undefined) {
      updateFields.push(`total_losses = total_losses + $${paramCount++}`);
      values.push(totalLosses);
    }
    if (winStreak !== undefined) {
      updateFields.push(`current_win_streak = $${paramCount++}`);
      values.push(winStreak);
      updateFields.push(`best_win_streak = GREATEST(best_win_streak, $${paramCount++})`);
      values.push(winStreak);
    }
    
    // Always update the timestamp
    updateFields.push(`updated_at = $${paramCount++}`);
    values.push(new Date());
    
    // Add walletAddress for WHERE clause
    values.push(walletAddress);
    
    if (updateFields.length === 1) {
      return res.status(400).json({ error: 'No statistics provided to update' });
    }
    
    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE wallet_address = $${paramCount}
      RETURNING *
    `;
    
    console.log('🔄 Updating user statistics:', walletAddress);
    
    const result = await pool.query(query, values);
    
    console.log('✅ User statistics updated successfully:', result.rows[0]);
    
    res.json({ 
      success: true, 
      message: 'User statistics updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Update user statistics error:', error);
    res.status(500).json({ error: 'Failed to update user statistics', details: error.message });
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
    // 1. Delete escrows first (this table exists)
    const escrowResult = await pool.query('DELETE FROM escrows WHERE room_id = $1', [roomId]);
    console.log('✅ Deleted escrows:', escrowResult.rowCount);
    
    // 2. Delete the game/room from games table
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
    
    // Delete escrows for test rooms (this table exists)
    const escrowResult = await pool.query(`
      DELETE FROM escrows 
      WHERE room_id LIKE $1 OR player_wallet LIKE $1
    `, [testRoomPattern]);
    
    // Delete test games (from games table)
    const gamesResult = await pool.query(`
      DELETE FROM games 
      WHERE room_id LIKE $1 OR player_white_wallet LIKE $1 OR player_black_wallet LIKE $1
    `, [testRoomPattern]);
    
    // Delete test users (if table exists)
    let usersResult = { rowCount: 0 };
    try {
      usersResult = await pool.query(`
        DELETE FROM users 
        WHERE wallet_address LIKE $1 OR username LIKE $1
      `, [testRoomPattern]);
    } catch (userError) {
      console.log('ℹ️ Users table not accessible or does not exist:', userError.message);
    }
    
    console.log('✅ Test data cleanup completed');
    
    res.json({ 
      success: true, 
      message: 'All test data cleaned up successfully',
      deletedCounts: {
        escrows: escrowResult.rowCount,
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

// Test endpoint to verify frontend version and functionality
router.post('/test/frontend-version', async (req, res) => {
  try {
    const { playerWallet, testTransactionId, frontendVersion } = req.body;
    
    console.log('🧪 Frontend version test received:', {
      playerWallet: playerWallet,
      testTransactionId: testTransactionId,
      frontendVersion: frontendVersion,
      timestamp: new Date().toISOString()
    });
    
    // Check if this looks like a real transaction ID format
    const isValidTxFormat = testTransactionId && 
                           typeof testTransactionId === 'string' && 
                           testTransactionId.length > 20 &&
                           testTransactionId !== 'deposit-completed';
    
    res.json({
      success: true,
      message: 'Frontend version test complete',
      playerWallet: playerWallet,
      testTransactionId: testTransactionId,
      frontendVersion: frontendVersion,
      isValidTxFormat: isValidTxFormat,
      hasFixDeployed: isValidTxFormat,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Frontend version test error:', error);
    res.status(500).json({ error: 'Frontend version test failed', details: error.message });
  }
});

// ========================================
// GAME COMPLETION (HTTP fallback)
// ========================================

// Complete game and update user statistics
router.post('/games/:roomId/complete', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { winner, gameResult, playerRole } = req.body;
    
    console.log('🏁 HTTP Game completion request:', { roomId, winner, gameResult, playerRole });
    
    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }
    
    const pool = getPool();
    
    // Get game details
    const gameQuery = await pool.query(
      'SELECT player_white_wallet, player_black_wallet, stake_amount FROM games WHERE room_id = $1',
      [roomId]
    );
    
    if (gameQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const game = gameQuery.rows[0];
    const whiteWallet = game.player_white_wallet;
    const blackWallet = game.player_black_wallet;
    const gameStake = parseFloat(game.stake_amount || 0);
    
    console.log('🎮 Game details from HTTP:', { whiteWallet, blackWallet, gameStake, winner });
    
    // Ensure both players exist in users table
    for (const wallet of [whiteWallet, blackWallet]) {
      if (wallet) {
        await pool.query(`
          INSERT INTO users (wallet_address, games_played, games_won, games_drawn, total_winnings, total_losses, current_win_streak, best_win_streak, created_at, updated_at)
          VALUES ($1, 0, 0, 0, 0, 0, 0, 0, NOW(), NOW())
          ON CONFLICT (wallet_address) DO NOTHING
        `, [wallet]);
      }
    }
    
    // Calculate winnings/losses based on game result and 2% platform fee
    const platformFeeRate = 0.02; // 2% platform fee
    const totalPot = gameStake * 2;
    const netPot = totalPot * (1 - platformFeeRate);
    
    let whiteWinnings = 0, blackWinnings = 0;
    let whiteWins = 0, blackWins = 0;
    let whiteDraws = 0, blackDraws = 0;
    
    if (winner === 'white') {
      whiteWinnings = netPot;
      blackWinnings = -gameStake;
      whiteWins = 1;
    } else if (winner === 'black') {
      blackWinnings = netPot;
      whiteWinnings = -gameStake;
      blackWins = 1;
    } else if (winner === 'draw' || winner === null) {
      // Draw - both get their stake back minus small platform fee
      const refund = gameStake * (1 - platformFeeRate);
      whiteWinnings = refund - gameStake; // Small loss due to platform fee
      blackWinnings = refund - gameStake;
      whiteDraws = 1;
      blackDraws = 1;
    }
    
    console.log('💰 Calculated earnings (HTTP):', { whiteWinnings, blackWinnings, whiteWins, blackWins, whiteDraws, blackDraws });
    
    // Update white player stats if wallet exists
    if (whiteWallet) {
      await pool.query(`
        UPDATE users SET
          games_played = games_played + 1,
          games_won = games_won + $2,
          games_drawn = games_drawn + $3,
          total_winnings = total_winnings + $4,
          total_losses = total_losses + $5,
          current_win_streak = CASE WHEN $2 > 0 THEN current_win_streak + 1 ELSE 0 END,
          best_win_streak = CASE WHEN $2 > 0 AND current_win_streak + 1 > best_win_streak THEN current_win_streak + 1 ELSE best_win_streak END,
          updated_at = NOW()
        WHERE wallet_address = $1
      `, [whiteWallet, whiteWins, whiteDraws, Math.max(0, whiteWinnings), Math.max(0, -whiteWinnings)]);
    }
    
    // Update black player stats if wallet exists
    if (blackWallet) {
      await pool.query(`
        UPDATE users SET
          games_played = games_played + 1,
          games_won = games_won + $2,
          games_drawn = games_drawn + $3,
          total_winnings = total_winnings + $4,
          total_losses = total_losses + $5,
          current_win_streak = CASE WHEN $2 > 0 THEN current_win_streak + 1 ELSE 0 END,
          best_win_streak = CASE WHEN $2 > 0 AND current_win_streak + 1 > best_win_streak THEN current_win_streak + 1 ELSE best_win_streak END,
          updated_at = NOW()
        WHERE wallet_address = $1
      `, [blackWallet, blackWins, blackDraws, Math.max(0, blackWinnings), Math.max(0, -blackWinnings)]);
    }
    
    // Update game state to finished
    await pool.query(
      'UPDATE games SET game_state = $1, winner = $2, game_result = $3, finished_at = NOW() WHERE room_id = $4',
      ['finished', winner, gameResult, roomId]
    );
    
    console.log('✅ User statistics updated successfully via HTTP');
    
    res.json({
      success: true,
      message: 'Game completed and user statistics updated',
      roomId,
      winner,
      gameResult,
      whiteWallet,
      blackWallet,
      statsUpdated: true
    });
    
  } catch (error) {
    console.error('❌ HTTP Game completion error:', error);
    res.status(500).json({ 
      error: 'Failed to complete game',
      details: error.message 
    });
  }
});

module.exports = router; 