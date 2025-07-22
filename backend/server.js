// Knightsbridge Chess Backend Server
// Updated: 2025-07-21 - Database-based multiplayer system
// Force redeploy for WebSocket fixes - Additional debugging
// Manual Railway redeploy required - Test endpoints added
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { pool, testConnection, roomService, chatService } = require('./database');

console.log('🚀 Starting Knightsbridge Chess Backend Server...');
console.log('📋 Environment:', process.env.NODE_ENV);
console.log('🔧 Debug mode:', process.env.DEBUG);

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:5173", "https://knightsbridge.vercel.app"],
    methods: ["GET", "POST"]
  }
});

// Initialize database connection and create tables
async function initializeDatabase() {
  try {
    console.log('🔌 Connecting to PostgreSQL database...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();
    
    // Create escrows table if it doesn't exist
    console.log('🏗️ Creating escrows table...');
    const createEscrowsTable = `
      CREATE TABLE IF NOT EXISTS escrows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id VARCHAR(100) NOT NULL,
        player_wallet VARCHAR(44) NOT NULL,
        escrow_amount DECIMAL(20, 9) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'released', 'refunded')),
        blockchain_tx_id VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(room_id, player_wallet)
      )
    `;
    
    await pool.query(createEscrowsTable);
    console.log('✅ Escrows table created/verified successfully');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    process.exit(1);
  }
}

// Test database connection on startup
testConnection().then(success => {
  if (success) {
    console.log('✅ Database connection established');
  } else {
    console.error('❌ Database connection failed');
  }
});

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://knightsbridge.vercel.app', 'https://knightsbridge-chess.vercel.app', 'https://knightsbridge-chess-git-main-williamdowning.vercel.app']
    : '*',
  credentials: true
}));

// Socket.io setup (already configured above)
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
app.get('/test', async (req, res) => {
  console.log('🧪 Test endpoint called');
  
  try {
    // Test database connection
    const dbConnected = await testConnection();
    
    res.json({ 
      message: 'Backend is working!', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      databaseConnected: dbConnected,
      activeConnections: io.engine.clientsCount
    });
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    res.status(500).json({ 
      message: 'Backend error', 
      error: error.message 
    });
  }
});

// Debug endpoint to see current state
app.get('/debug', async (req, res) => {
  console.log('🔍 Debug endpoint called');
  
  try {
    // Get room count from database
    const result = await pool.query('SELECT COUNT(*) as room_count FROM games');
    const roomCount = result.rows[0].room_count;
    
    const debugInfo = {
      roomCount: parseInt(roomCount),
      activeConnections: io.engine.clientsCount,
      environment: process.env.NODE_ENV,
      databaseConnected: await testConnection()
    };
    res.json(debugInfo);
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to list all rooms
app.get('/debug/rooms', async (req, res) => {
  try {
    const result = await pool.query('SELECT room_id, player_white_wallet, player_black_wallet, game_state FROM games');
    const rooms = result.rows.map(row => row.room_id);
    
    res.json({
      roomCount: rooms.length,
      rooms: rooms,
      gameStates: [], // Will be implemented later
      playerSessions: [] // Will be implemented later
    });
  } catch (error) {
    console.error('❌ Debug rooms error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check specific room
app.get('/debug/room/:roomId', async (req, res) => {
  const roomId = req.params.roomId;
  
  try {
    const result = await pool.query('SELECT room_id, player_white_wallet, player_black_wallet, game_state FROM games WHERE room_id = $1', [roomId]);
    const room = result.rows[0];

    if (!room) {
      res.json({ error: 'Room not found' });
      return;
    }
    
    res.json({
      roomId: room.room_id,
      playerWhiteWallet: room.player_white_wallet,
      playerBlackWallet: room.player_black_wallet,
      gameState: room.game_state,
      lastUpdated: room.updated_at
    });
  } catch (error) {
    console.error('❌ Debug room error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to clear all rooms
app.get('/debug/clear', async (req, res) => {
  try {
    await pool.query('DELETE FROM games');
    await pool.query('DELETE FROM moves');
    await pool.query('DELETE FROM chat_messages');
    console.log('🧹 All rooms cleared from database');
    res.json({ 
      message: 'All rooms cleared from database', 
      currentRooms: 0
    });
  } catch (error) {
    console.error('❌ Error clearing rooms:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create escrows table endpoint
app.get('/create-escrows-table', async (req, res) => {
  try {
    console.log('🏗️ Creating escrows table...');
    
    const createEscrowsTable = `
      CREATE TABLE IF NOT EXISTS escrows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id VARCHAR(100) NOT NULL,
        player_wallet VARCHAR(44) NOT NULL,
        escrow_amount DECIMAL(20, 9) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'released', 'refunded')),
        blockchain_tx_id VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(room_id, player_wallet)
      )
    `;
    
    await pool.query(createEscrowsTable);
    console.log('✅ Escrows table created successfully');
    
    res.json({ 
      success: true,
      message: 'Escrows table created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating escrows table:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear escrows endpoint
app.get('/clear-escrows', async (req, res) => {
  try {
    console.log('🧹 Clearing escrows table...');
    
    await pool.query('DELETE FROM escrows');
    console.log('✅ Escrows table cleared successfully');
    
    res.json({ 
      success: true,
      message: 'Escrows table cleared successfully'
    });
  } catch (error) {
    console.error('❌ Error clearing escrows:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deploy database schema
app.get('/deploy-schema', async (req, res) => {
  try {
    console.log('🏗️ Deploying complete database schema...');
    
    // First, drop existing tables to ensure clean slate
    const dropStatements = [
      'DROP TABLE IF EXISTS user_achievements CASCADE',
      'DROP TABLE IF EXISTS achievements CASCADE',
      'DROP TABLE IF EXISTS leaderboard_entries CASCADE',
      'DROP TABLE IF EXISTS leaderboards CASCADE',
      'DROP TABLE IF EXISTS tournament_games CASCADE',
      'DROP TABLE IF EXISTS tournament_participants CASCADE',
      'DROP TABLE IF EXISTS tournaments CASCADE',
      'DROP TABLE IF EXISTS game_analysis CASCADE',
      'DROP TABLE IF EXISTS game_moves CASCADE',
      'DROP TABLE IF EXISTS chat_messages CASCADE',
      'DROP TABLE IF EXISTS game_analytics CASCADE',
      'DROP TABLE IF EXISTS notifications CASCADE',
      'DROP TABLE IF EXISTS user_statistics CASCADE',
      'DROP TABLE IF EXISTS games CASCADE',
      'DROP TABLE IF EXISTS users CASCADE'
    ];
    
    console.log('🧹 Dropping existing tables...');
    for (const statement of dropStatements) {
      await pool.query(statement);
      console.log('✅ Dropped table');
    }
    
    // Complete database schema with all features
    const schemaStatements = [
      // Users & Authentication
      `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address VARCHAR(44) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE,
        email VARCHAR(255),
        avatar_url TEXT,
        rating_rapid INTEGER DEFAULT 1200,
        rating_blitz INTEGER DEFAULT 1200,
        rating_bullet INTEGER DEFAULT 1200,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        games_drawn INTEGER DEFAULT 0,
        total_winnings DECIMAL(20, 9) DEFAULT 0,
        total_losses DECIMAL(20, 9) DEFAULT 0,
        best_win_streak INTEGER DEFAULT 0,
        current_win_streak INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      )`,

      // User Statistics
      `CREATE TABLE IF NOT EXISTS user_statistics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        time_control VARCHAR(20) NOT NULL,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        games_drawn INTEGER DEFAULT 0,
        average_game_duration INTEGER,
        total_moves_played INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, time_control)
      )`,

      // Games Table (Enhanced)
      `CREATE TABLE IF NOT EXISTS games (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id VARCHAR(100) UNIQUE NOT NULL,
        blockchain_tx_id VARCHAR(100),
        player_white_id UUID REFERENCES users(id),
        player_black_id UUID REFERENCES users(id),
        player_white_wallet VARCHAR(44),
        player_black_wallet VARCHAR(44),
        stake_amount DECIMAL(20, 9) DEFAULT 0,
        platform_fee DECIMAL(20, 9) DEFAULT 0,
        winner VARCHAR(10) CHECK (winner IN ('white', 'black', 'draw', NULL)),
        game_result VARCHAR(20) CHECK (game_result IN ('checkmate', 'stalemate', 'resignation', 'timeout', 'agreement', NULL)),
        time_control VARCHAR(20) NOT NULL DEFAULT 'rapid',
        time_limit INTEGER,
        increment INTEGER DEFAULT 0,
        game_state VARCHAR(20) DEFAULT 'waiting' CHECK (game_state IN ('waiting', 'active', 'finished', 'cancelled')),
        move_count INTEGER DEFAULT 0,
        final_position TEXT,
        pgn TEXT,
        started_at TIMESTAMP WITH TIME ZONE,
        finished_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Escrows Table
      `CREATE TABLE IF NOT EXISTS escrows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id VARCHAR(100) NOT NULL,
        player_wallet VARCHAR(44) NOT NULL,
        escrow_amount DECIMAL(20, 9) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'released', 'refunded')),
        blockchain_tx_id VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(room_id, player_wallet)
      )`,

      // Game Moves (Enhanced)
      `CREATE TABLE IF NOT EXISTS game_moves (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id UUID REFERENCES games(id) ON DELETE CASCADE,
        move_number INTEGER NOT NULL,
        player VARCHAR(10) NOT NULL CHECK (player IN ('white', 'black')),
        from_square VARCHAR(2) NOT NULL,
        to_square VARCHAR(2) NOT NULL,
        piece VARCHAR(10) NOT NULL,
        captured_piece VARCHAR(10),
        move_notation VARCHAR(20) NOT NULL,
        position_hash BYTEA,
        time_spent INTEGER,
        is_check BOOLEAN DEFAULT FALSE,
        is_checkmate BOOLEAN DEFAULT FALSE,
        is_castle BOOLEAN DEFAULT FALSE,
        is_en_passant BOOLEAN DEFAULT FALSE,
        is_promotion BOOLEAN DEFAULT FALSE,
        promotion_piece VARCHAR(10),
        blockchain_tx_id VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(game_id, move_number)
      )`,

      // Game Analysis
      `CREATE TABLE IF NOT EXISTS game_analysis (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id UUID REFERENCES games(id) ON DELETE CASCADE,
        move_number INTEGER NOT NULL,
        evaluation DECIMAL(10, 2),
        best_move VARCHAR(10),
        engine_depth INTEGER,
        analysis_time INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(game_id, move_number)
      )`,

      // Chat Messages (Enhanced)
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id UUID REFERENCES games(id) ON DELETE CASCADE,
        player_id VARCHAR(255) NOT NULL,
        player_name VARCHAR(100),
        message TEXT NOT NULL,
        message_type VARCHAR(50) DEFAULT 'chat' CHECK (message_type IN ('chat', 'system', 'draw_offer', 'resignation')),
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Tournaments
      `CREATE TABLE IF NOT EXISTS tournaments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        tournament_type VARCHAR(20) NOT NULL CHECK (tournament_type IN ('swiss', 'round_robin', 'elimination', 'arena')),
        time_control VARCHAR(20) NOT NULL,
        entry_fee DECIMAL(20, 9) DEFAULT 0,
        prize_pool DECIMAL(20, 9) DEFAULT 0,
        max_participants INTEGER,
        current_participants INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'registration' CHECK (status IN ('registration', 'active', 'finished', 'cancelled')),
        start_date TIMESTAMP WITH TIME ZONE,
        end_date TIMESTAMP WITH TIME ZONE,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Tournament Participants
      `CREATE TABLE IF NOT EXISTS tournament_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        final_rank INTEGER,
        points DECIMAL(5, 2) DEFAULT 0,
        prize_amount DECIMAL(20, 9) DEFAULT 0,
        UNIQUE(tournament_id, user_id)
      )`,

      // Tournament Games
      `CREATE TABLE IF NOT EXISTS tournament_games (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
        game_id UUID REFERENCES games(id) ON DELETE CASCADE,
        round_number INTEGER NOT NULL,
        white_player_id UUID REFERENCES users(id),
        black_player_id UUID REFERENCES users(id),
        result VARCHAR(10) CHECK (result IN ('white', 'black', 'draw')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Leaderboards
      `CREATE TABLE IF NOT EXISTS leaderboards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        time_control VARCHAR(20) NOT NULL,
        period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
        start_date TIMESTAMP WITH TIME ZONE,
        end_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Leaderboard Entries
      `CREATE TABLE IF NOT EXISTS leaderboard_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        leaderboard_id UUID REFERENCES leaderboards(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        rank INTEGER NOT NULL,
        rating INTEGER NOT NULL,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        win_rate DECIMAL(5, 2) DEFAULT 0,
        total_winnings DECIMAL(20, 9) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(leaderboard_id, user_id)
      )`,

      // Achievements
      `CREATE TABLE IF NOT EXISTS achievements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        icon_url TEXT,
        criteria_type VARCHAR(50) NOT NULL,
        criteria_value INTEGER NOT NULL,
        reward_amount DECIMAL(20, 9) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // User Achievements
      `CREATE TABLE IF NOT EXISTS user_achievements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
        earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, achievement_id)
      )`,

      // Notifications
      `CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Game Analytics
      `CREATE TABLE IF NOT EXISTS game_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date DATE NOT NULL,
        total_games INTEGER DEFAULT 0,
        completed_games INTEGER DEFAULT 0,
        total_volume DECIMAL(20, 9) DEFAULT 0,
        platform_fees DECIMAL(20, 9) DEFAULT 0,
        active_users INTEGER DEFAULT 0,
        new_users INTEGER DEFAULT 0,
        average_game_duration INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(date)
      )`,

      // Indexes for Performance
      `CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address)`,
      `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
      `CREATE INDEX IF NOT EXISTS idx_users_rating_rapid ON users(rating_rapid DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_users_rating_blitz ON users(rating_blitz DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_users_rating_bullet ON users(rating_bullet DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_games_room_id ON games(room_id)`,
      `CREATE INDEX IF NOT EXISTS idx_games_blockchain_tx ON games(blockchain_tx_id)`,
      `CREATE INDEX IF NOT EXISTS idx_games_player_white ON games(player_white_id)`,
      `CREATE INDEX IF NOT EXISTS idx_games_player_black ON games(player_black_id)`,
      `CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_games_status ON games(game_state)`,
      `CREATE INDEX IF NOT EXISTS idx_game_moves_game_id ON game_moves(game_id)`,
      `CREATE INDEX IF NOT EXISTS idx_game_moves_move_number ON game_moves(game_id, move_number)`,
      `CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status)`,
      `CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON tournaments(start_date)`,
      `CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_rank ON leaderboard_entries(leaderboard_id, rank)`,
      `CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user ON leaderboard_entries(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_chat_messages_game_id ON chat_messages(game_id)`,
      `CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(game_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_chat_messages_player_id ON chat_messages(player_id)`,

      // Sample Data
      `INSERT INTO achievements (name, description, criteria_type, criteria_value, reward_amount) VALUES
        ('First Victory', 'Win your first game', 'games_won', 1, 0.001),
        ('Rating Climber', 'Reach 1500 rating', 'rating_reached', 1500, 0.005),
        ('Win Streak', 'Win 5 games in a row', 'streak', 5, 0.01),
        ('Tournament Champion', 'Win a tournament', 'tournament_wins', 1, 0.05)
      ON CONFLICT DO NOTHING`,

      `INSERT INTO leaderboards (name, time_control, period) VALUES
        ('Rapid Rating', 'rapid', 'all_time'),
        ('Blitz Rating', 'blitz', 'all_time'),
        ('Bullet Rating', 'bullet', 'all_time'),
        ('Weekly Winners', 'rapid', 'weekly')
      ON CONFLICT DO NOTHING`
    ];
    
    // Execute each statement
    for (const statement of schemaStatements) {
      await pool.query(statement);
      console.log('✅ Executed schema statement');
    }
    
    console.log('✅ Complete database schema deployed successfully');
    res.json({ 
      success: true, 
      message: 'Complete database schema deployed successfully',
      statementsExecuted: schemaStatements.length
    });
  } catch (error) {
    console.error('❌ Error deploying schema:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Handle Socket.io connections
io.on('connection', (socket) => {
  console.log('🔌 A user connected:', socket.id);
  console.log('📋 Socket events available:', Object.keys(socket._events || {}));

  // Debug: Log when event handler is registered
  console.log('✅ createRoom event handler registered for socket:', socket.id);

  // Test event handler to verify backend is working
  socket.on('test', (data, callback) => {
    console.log('🧪 Test event received:', data);
    callback({ success: true, message: 'Backend is working!' });
  });

  // Heartbeat to keep connection alive
  socket.on('ping', (callback) => {
    callback({ pong: Date.now() });
  });

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
    
    try {
      const { roomId, playerWallet } = data;
      
      // Check if room already exists in database
      const existingRoom = await pool.query('SELECT room_id FROM games WHERE room_id = $1', [roomId]);
      if (existingRoom.rows.length > 0) {
        console.log('❌ Room already exists in database:', roomId);
        callback({ success: false, error: 'Room already exists' });
        return;
      }

      // Insert new room into database
      await pool.query(
        'INSERT INTO games (room_id, player_white_wallet, game_state, updated_at) VALUES ($1, $2, $3, $4)',
        [roomId, playerWallet, 'waiting', new Date()]
      );
      console.log('✅ Room created in database:', roomId, 'for player:', playerWallet);

      // Join the socket to the room
      socket.join(roomId);
      console.log('✅ Socket joined room:', roomId);

      // Broadcast room update to all clients in the room
      io.to(roomId).emit('roomUpdated', { roomId, gameState: 'waiting' });
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
      
      // Check if room exists in database
      const existingRoom = await pool.query('SELECT room_id FROM games WHERE room_id = $1', [roomId]);
      if (existingRoom.rows.length === 0) {
        console.log('❌ Room not found in database:', roomId);
        callback({ success: false, error: 'Room does not exist' });
        return;
      }

      // Get current players in the room from database
      const result = await pool.query('SELECT player_white_wallet, player_black_wallet FROM games WHERE room_id = $1', [roomId]);
      const currentPlayers = result.rows;

      // Check if player is already in the room
      const existingPlayer = currentPlayers.find(p => p.player_white_wallet === playerWallet || p.player_black_wallet === playerWallet);
      if (existingPlayer) {
        console.log('✅ Player already in room:', existingPlayer);
        socket.join(roomId);
        callback({ success: true, role: existingPlayer.player_white_wallet === playerWallet ? 'white' : 'black' });
        return;
      }

      // Add new player to the room
      const newRole = currentPlayers.length === 0 ? 'white' : 'black'; // Assign role based on current players
      await pool.query(
        'UPDATE games SET player_black_wallet = $1 WHERE room_id = $2',
        [playerWallet, roomId]
      );
      console.log('✅ Player joined room:', roomId, 'player:', playerWallet, 'role:', newRole);

      // Broadcast room update
      io.to(roomId).emit('roomUpdated', { roomId, gameState: 'waiting' });
      
      // If both players are present, notify about game ready
      if (currentPlayers.length === 1) { // Only one player was in the room, now two
        io.to(roomId).emit('gameReady', { roomId, players: currentPlayers.map(p => p.player_white_wallet === playerWallet ? 'white' : 'black') });
      }

      callback({ success: true, role: newRole });
      
    } catch (error) {
      console.error('Error joining room:', error);
      callback({ success: false, error: 'Failed to join room' });
    }
  });

  // Get room status
  socket.on('getRoomStatus', async (data, callback) => {
    try {
      const { roomId } = data;
      
      // Get room details from database
      const result = await pool.query('SELECT player_white_wallet, player_black_wallet, game_state FROM games WHERE room_id = $1', [roomId]);
      const room = result.rows[0];

      if (!room) {
        callback({ success: false, error: 'Room does not exist' });
        return;
      }

      // Get escrows for this room
      const escrowsResult = await pool.query('SELECT player_wallet, escrow_amount FROM escrows WHERE room_id = $1', [roomId]);
      const escrows = escrowsResult.rows;

      // Calculate player count
      const playerCount = (room.player_white_wallet ? 1 : 0) + (room.player_black_wallet ? 1 : 0);
      
      // Build players array
      const players = [];
      if (room.player_white_wallet) {
        players.push({ role: 'white', wallet: room.player_white_wallet });
      }
      if (room.player_black_wallet) {
        players.push({ role: 'black', wallet: room.player_black_wallet });
      }

      // Build escrows object
      const escrowsObj = {};
      escrows.forEach(escrow => {
        escrowsObj[escrow.player_wallet] = escrow.escrow_amount;
      });

      const roomStatus = {
        playerCount: playerCount,
        players: players,
        escrowCount: escrows.length,
        escrows: escrowsObj,
        gameStarted: room.game_state === 'active'
      };

      console.log('📊 Room status for', roomId, ':', roomStatus);
      callback({ success: true, roomStatus });
      
    } catch (error) {
      console.error('Error getting room status:', error);
      callback({ success: false, error: 'Failed to get room status' });
    }
  });

  // Add escrow for a player
  socket.on('addEscrow', async (data, callback) => {
    try {
      console.log('💰 Received addEscrow event:', data);
      const { roomId, playerWallet, amount } = data;
      
      // Get current escrows from database
      const result = await pool.query('SELECT escrow_amount FROM escrows WHERE room_id = $1 AND player_wallet = $2', [roomId, playerWallet]);
      if (result.rows.length > 0) {
        console.log('❌ Escrow already exists for player:', playerWallet, 'in room:', roomId);
        callback({ success: false, error: 'Escrow already exists' });
        return;
      }

      // Insert new escrow into database
      await pool.query(
        'INSERT INTO escrows (room_id, player_wallet, escrow_amount) VALUES ($1, $2, $3)',
        [roomId, playerWallet, amount]
      );
      console.log('✅ Escrow added to database:', roomId, playerWallet, amount);

      // Broadcast escrow update
      io.to(roomId).emit('escrowUpdated', { roomId, escrows: await pool.query('SELECT player_wallet, escrow_amount FROM escrows WHERE room_id = $1', [roomId]).then(r => r.rows) });
      
      // Auto-start game if both escrows are created and both players are present
      const currentPlayers = await pool.query('SELECT player_white_wallet, player_black_wallet FROM games WHERE room_id = $1', [roomId]).then(r => r.rows[0]);
      const escrows = await pool.query('SELECT player_wallet FROM escrows WHERE room_id = $1', [roomId]).then(r => r.rows);
      
      console.log('🔍 Auto-start check:', {
        roomId,
        currentPlayers,
        escrows: escrows.map(e => e.player_wallet),
        whiteWallet: currentPlayers?.player_white_wallet,
        blackWallet: currentPlayers?.player_black_wallet,
        escrowCount: escrows.length
      });
      
      // Check if both players are present and both escrows are created
      if (currentPlayers && 
          currentPlayers.player_white_wallet && 
          currentPlayers.player_black_wallet && 
          escrows.length === 2) {
        
        console.log('🎮 Starting game automatically - both players and escrows ready');
        await pool.query('UPDATE games SET game_state = $1 WHERE room_id = $2', ['active', roomId]);
        
        // Broadcast game started event to ALL players in the room
        console.log('📢 Broadcasting gameStarted event to room:', roomId);
        io.to(roomId).emit('gameStarted', { 
          roomId, 
          players: [currentPlayers.player_white_wallet, currentPlayers.player_black_wallet]
        });
        
        // Also emit room updated event
        console.log('📢 Broadcasting roomUpdated event to room:', roomId);
        io.to(roomId).emit('roomUpdated', { roomId, gameState: 'active' });
        
        console.log('✅ Game started event broadcasted to room:', roomId);
      } else {
        console.log('⏳ Game not ready yet:', {
          bothPlayersPresent: !!(currentPlayers?.player_white_wallet && currentPlayers?.player_black_wallet),
          escrowCount: escrows.length,
          whiteWallet: currentPlayers?.player_white_wallet,
          blackWallet: currentPlayers?.player_black_wallet
        });
      }
      
      callback({ success: true, message: 'Escrow created successfully' });
      
    } catch (error) {
      console.error('❌ Error adding escrow:', error);
      callback({ success: false, error: 'Failed to add escrow' });
    }
  });

  // Debug: Log when addEscrow event handler is registered
  console.log('✅ addEscrow event handler registered for socket:', socket.id);

  // Clear escrows for a room
  socket.on('clearEscrows', async (data, callback) => {
    try {
      const { roomId } = data;
      
      // Clear escrows from database
      await pool.query('DELETE FROM escrows WHERE room_id = $1', [roomId]);
      console.log('🔄 Cleared escrows for room:', roomId);

      // Broadcast room update
      io.to(roomId).emit('roomUpdated', { roomId, gameState: 'waiting' });
      
    } catch (error) {
      console.error('Error clearing escrows:', error);
      callback({ success: false, error: 'Failed to clear escrows' });
    }
  });

  // Save game state
  socket.on('saveGameState', async (data, callback) => {
    try {
      const { roomId, gameState } = data;
      
      // Update game state in database
      await pool.query(
        'UPDATE games SET game_state = $1, updated_at = $2 WHERE room_id = $3',
        [gameState, new Date(), roomId]
      );
      
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
      
      // Get game state from database
      const result = await pool.query('SELECT game_state FROM games WHERE room_id = $1', [roomId]);
      const gameState = result.rows[0];

      if (gameState) {
        callback({ success: true, gameState: gameState.game_state });
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
      await pool.query('DELETE FROM games');
      await pool.query('DELETE FROM escrows');
      await pool.query('DELETE FROM moves');
      await pool.query('DELETE FROM chat_messages');
      
      console.log('🧹 All rooms cleared from database');
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

      // Get current game state from database
      const result = await pool.query('SELECT game_state, current_turn FROM games WHERE room_id = $1', [gameId]);
      const gameState = result.rows[0];

      if (!gameState) {
        socket.emit('moveError', { error: 'Game state not found' });
        return;
      }

      // Check if it's the player's turn
      if (gameState.current_turn !== color) {
        socket.emit('moveError', { error: 'Not your turn' });
        return;
      }

      // Add move to database
      await pool.query(
        'INSERT INTO moves (room_id, move_data, player_id, color, timestamp) VALUES ($1, $2, $3, $4, $5)',
        [gameId, JSON.stringify(move), playerId, color, new Date()]
      );

      // Switch turns
      const nextTurn = color === 'white' ? 'black' : 'white';
      await pool.query('UPDATE games SET current_turn = $1 WHERE room_id = $2', [nextTurn, gameId]);

      // Broadcast move to other player
      socket.to(gameId).emit('moveMade', {
        move,
        playerId,
        color,
        timestamp: Date.now(),
        nextTurn: nextTurn
      });

      // Confirm move to sender
      socket.emit('moveConfirmed', {
        move,
        nextTurn: nextTurn
      });

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

      // Insert new chat message into database
      await pool.query(
        'INSERT INTO chat_messages (game_id, player_id, player_name, message, timestamp) VALUES ($1, $2, $3, $4, $5)',
        [gameId, playerId, playerName, message.trim(), new Date()]
      );

      // Broadcast message to all players in the game
      io.to(gameId).emit('chatMessage', {
        id: Date.now().toString(), // Use a unique ID for frontend
        gameId,
        playerId,
        playerName,
        message: message.trim(),
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error processing chat message:', error);
      socket.emit('chatError', { error: 'Failed to send message' });
    }
  });

  // Get chat messages for a room
  socket.on('getChatMessages', async (data, callback) => {
    try {
      const { roomId } = data;
      
      // Get chat messages from database
      const result = await pool.query('SELECT player_id, player_name, message, timestamp FROM chat_messages WHERE game_id = $1 ORDER BY timestamp ASC', [roomId]);
      const messages = result.rows.map(msg => ({
        id: msg.id, // Assuming msg.id is the unique ID from the DB
        gameId: msg.game_id,
        playerId: msg.player_id,
        playerName: msg.player_name,
        message: msg.message,
        timestamp: msg.timestamp
      }));
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

      // Insert new chat message into database
      await pool.query(
        'INSERT INTO chat_messages (game_id, player_id, player_name, message, timestamp) VALUES ($1, $2, $3, $4, $5)',
        [roomId, playerWallet, playerRole, message.trim(), new Date()]
      );

      console.log('💬 Chat message sent:', roomId, playerWallet, message);
      callback({ success: true, message: {
        id: Date.now().toString(), // Use a unique ID for frontend
        roomId,
        playerWallet,
        playerRole,
        message: message.trim(),
        timestamp: new Date()
      } });

      // Broadcast message to all players in the room
      io.to(roomId).emit('chatMessageReceived', {
        id: Date.now().toString(), // Use a unique ID for frontend
        roomId,
        playerWallet,
        playerRole,
        message: message.trim(),
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error sending chat message:', error);
      callback({ success: false, error: 'Failed to send message' });
    }
  });

  // Handle game state requests
  socket.on('getGameState', async (gameId) => {
    try {
      const result = await pool.query('SELECT game_state FROM games WHERE room_id = $1', [gameId]);
      const gameState = result.rows[0];
      if (gameState) {
        socket.emit('gameState', gameState.game_state);
      } else {
        socket.emit('gameState', 'waiting');
      }
    } catch (error) {
      console.error('Error getting game state:', error);
      socket.emit('gameState', 'waiting');
    }
  });

  // Handle chat history requests
  socket.on('getChatHistory', async (gameId) => {
    try {
      const result = await pool.query('SELECT player_id, player_name, message, timestamp FROM chat_messages WHERE game_id = $1 ORDER BY timestamp ASC', [gameId]);
      const messages = result.rows.map(msg => ({
        id: msg.id, // Assuming msg.id is the unique ID from the DB
        gameId: msg.game_id,
        playerId: msg.player_id,
        playerName: msg.player_name,
        message: msg.message,
        timestamp: msg.timestamp
      }));
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
    // No in-memory playerSessions to clean up
  });
});

const PORT = process.env.PORT || 3001; // Use Railway's PORT or default to 3001
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initialize database and create tables
  await initializeDatabase();
});