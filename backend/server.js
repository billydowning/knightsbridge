// Knightsbridge Chess Backend Server
// Updated: 2025-07-23 - DigitalOcean App Platform migration
// Optimized for stable WebSocket connections
require('dotenv').config();



const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initializePool, testConnection, roomService, chatService } = require('./database');

console.log('🚀 Starting Knightsbridge Chess Backend Server...');
console.log('📋 Environment:', process.env.NODE_ENV);
console.log('🔧 Debug mode:', process.env.DEBUG);
console.log('🌊 Platform: DigitalOcean App Platform');

// CORS origins configuration
const corsOrigins = process.env.NODE_ENV === 'production' 
  ? ["https://knightsbridge.vercel.app", "https://knightsbridge-app-35xls.ondigitalocean.app"]
  : ["http://localhost:5173", "http://localhost:3000", "https://knightsbridge.vercel.app"];

// Check for DigitalOcean CA certificate environment variables
const possibleCAVars = ['DATABASE_CA_CERT', 'DB_CA_CERT', 'CA_CERT', 'DIGITALOCEAN_CA_CERT', 'POSTGRES_CA_CERT'];
for (const varName of possibleCAVars) {
  if (process.env[varName]) {
    console.log(`🔌 Found CA certificate in environment variable: ${varName}`);
  }
}

const app = express();
const server = http.createServer(app);

// DigitalOcean App Platform optimized Socket.IO configuration
const io = socketIo(server, {
  cors: {
    origin: true, // Allow all origins for now to debug
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  },
  transports: ['websocket', 'polling'], // Allow fallback to polling
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  upgradeTimeout: 10000, // 10 seconds
  allowEIO3: true, // Allow Engine.IO v3 clients
  maxHttpBufferSize: 1e6, // 1MB max message size
  // Use default Socket.IO path
});

// Initialize database connection and create tables
async function initializeDatabase() {
  try {
    console.log('🔌 Connecting to PostgreSQL database...');
    
    // Check if we have the required environment variables
    if (!process.env.DATABASE_URL) {
      console.log('⚠️ DATABASE_URL not set - running in test mode without database');
      console.log('📝 WebSocket functionality will work but room/chat data will not persist');
      return true; // Allow server to start without database
    }
    
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Database connection test failed');
      throw new Error('Database connection test failed');
    }
    
    console.log('✅ Database connection successful');
    
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
    
    const poolInstance = initializePool();
    await poolInstance.query(createEscrowsTable);
    console.log('✅ Escrows table created/verified successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error.message, '- Code:', error.code);
    console.error('❌ Full error details:', error);
    // Continue running for health checks - don't throw
    return false;
  }
}

// Server health monitoring
let connectionStats = {
  totalConnections: 0,
  totalDisconnections: 0,
  currentConnections: 0,
  lastReset: Date.now()
};

// In-memory storage for testing (when DATABASE_URL is not set)
const testRooms = new Map();
const testChatMessages = new Map();

// Reset stats every hour
setInterval(() => {
  console.log('📊 Connection stats reset:', connectionStats);
  connectionStats = {
    totalConnections: 0,
    totalDisconnections: 0,
    currentConnections: io.engine.clientsCount,
    lastReset: Date.now()
  };
}, 3600000); // 1 hour

// Log server health every 5 minutes
setInterval(() => {
  console.log('🏥 Server health check:', {
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    connectedSockets: io.engine.clientsCount,
    connectionStats,
    timestamp: new Date().toISOString()
  });
}, 300000); // 5 minutes

// Database connection will be tested in initializeDatabase()

// Debug logging for HTTP requests
app.use((req, res, next) => {
  console.log(`🌐 HTTP Request: ${req.method} ${req.url} from ${req.ip}`);
  next();
});

// CORS configuration
app.use(cors({
  origin: true, // Allow all origins for now to debug
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Socket.io setup (already configured above)
console.log('🚀 Socket.io server initialized with CORS origins:', corsOrigins);

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Root endpoint to test server accessibility
app.get('/', (req, res) => {
  console.log('🌐 Root endpoint called');
  res.json({
    message: 'Knightsbridge Chess Server is running! 🎯',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: process.env.PORT || 3001,
    databaseUrl: process.env.DATABASE_URL ? 'Configured' : 'Not set',
    databaseCaCert: process.env.DATABASE_CA_CERT ? 'Configured' : 'Not set'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('🏥 Health check endpoint called');
  res.json({
    message: 'Knightsbridge Chess Backend is running!',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: process.env.PORT || 3001,
    databaseUrl: process.env.DATABASE_URL ? 'Configured' : 'Not set',
    databaseCaCert: process.env.DATABASE_CA_CERT ? 'Configured' : 'Not set'
  });
});

// API Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Test endpoint to verify backend is working (with database check)
app.get('/test-db', async (req, res) => {
  console.log('🧪 Test endpoint with database called');
  
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
    const poolInstance = initializePool();
    const result = await poolInstance.query('SELECT COUNT(*) as room_count FROM games');
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

// Socket.IO test endpoint
app.get('/socket-test', (req, res) => {
  console.log('🔌 Socket.IO test endpoint called');
  res.json({
    message: 'Socket.IO server is running',
    socketIO: {
      engine: {
        clientsCount: io.engine.clientsCount,
        upgradeTimeout: io.engine.upgradeTimeout,
        pingTimeout: io.engine.pingTimeout,
        pingInterval: io.engine.pingInterval
      },
      path: io.path(),
      transports: io.engine.opts.transports
    },
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to list all rooms
app.get('/debug/rooms', async (req, res) => {
  try {
    const poolInstance = initializePool();
    const result = await poolInstance.query('SELECT room_id, player_white_wallet, player_black_wallet, game_state FROM games');
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
    const poolInstance = initializePool();
    const result = await poolInstance.query('SELECT room_id, player_white_wallet, player_black_wallet, game_state FROM games WHERE room_id = $1', [roomId]);
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
    const poolInstance = initializePool();
    await poolInstance.query('DELETE FROM games');
    await poolInstance.query('DELETE FROM moves');
    await poolInstance.query('DELETE FROM chat_messages');
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
    
    const poolInstance = initializePool();
    await poolInstance.query(createEscrowsTable);
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
    
    const poolInstance = initializePool();
    await poolInstance.query('DELETE FROM escrows');
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
    const poolInstance = initializePool();
    for (const statement of dropStatements) {
      await poolInstance.query(statement);
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
      await poolInstance.query(statement);
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

// Root endpoint for debugging
app.get('/', (req, res) => {
  res.json({
    message: 'Knightsbridge Chess Backend is running!',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: process.env.PORT || 8080,
    databaseUrl: process.env.DATABASE_URL ? 'Configured' : 'Not configured',
    databaseCaCert: process.env.DATABASE_CA_CERT ? 'Configured' : 'Not configured'
  });
});

// Simple test endpoint that doesn't require database
app.get('/test', (req, res) => {
  res.json({
    message: 'Backend is responding!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Health check endpoint for DigitalOcean App Platform
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    connectedSockets: io.engine.clientsCount,
    connectionStats,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  };
  
  console.log('🏥 Health check requested:', health);
  
  // Return 200 only if server is healthy
  const isHealthy = process.uptime() > 0 && io.engine.clientsCount >= 0;
  res.status(isHealthy ? 200 : 503).json(health);
});

// Readiness check endpoint for DigitalOcean App Platform
app.get('/ready', async (req, res) => {
  const readiness = {
    status: 'ready',
    database: 'disconnected',
    websocket: 'running',
    timestamp: new Date().toISOString()
  };
  
  // Check database connection with retry
  for (let i = 0; i < 3; i++) {
    try {
      const poolInstance = initializePool();
      await poolInstance.query('SELECT 1');
      readiness.database = 'connected';
      res.status(200).json(readiness);
      return;
    } catch (error) {
      console.error(`❌ Database health check attempt ${i + 1} failed:`, error);
      if (i === 2) {
        res.status(503).json(readiness);
      }
    }
  }
});

// Add more frequent health checks for DigitalOcean App Platform
setInterval(async () => {
  try {
    // Check database connection
    const poolInstance = initializePool();
    await poolInstance.query('SELECT 1');
    console.log('✅ Database health check passed');
  } catch (error) {
    console.error('❌ Database health check failed:', error);
  }
  
  // Log detailed server stats
  console.log('🏥 Detailed server health:', {
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    connectedSockets: io.engine.clientsCount,
    connectionStats,
    timestamp: new Date().toISOString()
  });
}, 60000); // Every minute

// Handle Socket.io connections
io.on('connection', (socket) => {
  console.log('🔌 A user connected:', socket.id);
  console.log('📋 Socket events available:', Object.keys(socket._events || {}));
  console.log('📊 Total connected sockets:', io.engine.clientsCount);
  console.log('📊 Server memory usage:', process.memoryUsage());
  
  // Update connection stats
  connectionStats.totalConnections++;
  connectionStats.currentConnections = io.engine.clientsCount;
  console.log('📊 Updated connection stats:', connectionStats);

  // Debug: Log when event handler is registered
  console.log('✅ createRoom event handler registered for socket:', socket.id);

  // Test event handler to verify backend is working
  socket.on('test', (data, callback) => {
    console.log('🧪 Test event received:', data);
    if (typeof callback === 'function') callback({ success: true, message: 'Backend is working!' });
  });

  // Heartbeat to keep connection alive
  socket.on('ping', (callback) => {
    console.log('💓 Ping received from socket:', socket.id);
    if (typeof callback === 'function') callback({ pong: Date.now() });
  });

  // Debug: Add error handler to see if there are any Socket.io errors
  socket.on('error', (error) => {
    console.error('❌ Socket error for socket:', socket.id, 'error:', error);
  });

  // Debug: Add disconnect handler
  socket.on('disconnect', (reason) => {
    console.log('🔌 User disconnected:', socket.id, 'reason:', reason);
    console.log('📊 Remaining connected sockets:', io.engine.clientsCount);
    console.log('📊 Server memory usage after disconnect:', process.memoryUsage());
    
    // Update disconnection stats
    connectionStats.totalDisconnections++;
    connectionStats.currentConnections = io.engine.clientsCount;
    console.log('📊 Updated disconnection stats:', connectionStats);
  });

  // Add connection health monitoring
  socket.on('health', (callback) => {
    const health = {
      socketId: socket.id,
      connectedSockets: io.engine.clientsCount,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: Date.now(),
      connectionStats
    };
    console.log('🏥 Health check from socket:', socket.id, health);
    if (typeof callback === 'function') callback(health);
  });

  // Create a new room
  socket.on('createRoom', async (data, callback) => {
    console.log('📨 Received createRoom event:', data);
    console.log('📨 Callback function:', typeof callback);
    
    try {
      const { playerWallet } = data;
      
      // Generate a unique room ID
      const roomId = 'ROOM-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      console.log('🏗️ Generated room ID:', roomId);
      
      // Check if we have database access
      if (process.env.DATABASE_URL) {
        const poolInstance = initializePool();
        
        // Check if room already exists in database
        const existingRoom = await poolInstance.query('SELECT room_id FROM games WHERE room_id = $1', [roomId]);
        if (existingRoom.rows.length > 0) {
          console.log('❌ Room already exists in database:', roomId);
          if (typeof callback === 'function') callback({ success: false, error: 'Room already exists' });
          return;
        }

        // Insert new room into database
        await poolInstance.query(
          'INSERT INTO games (room_id, player_white_wallet, game_state, updated_at) VALUES ($1, $2, $3, $4)',
          [roomId, playerWallet, 'waiting', new Date()]
        );
        console.log('✅ Room created in database:', roomId, 'for player:', playerWallet);
      } else {
        // Use in-memory storage for testing
        testRooms.set(roomId, {
          roomId,
          playerWallet,
          created_at: new Date(),
          last_updated: new Date(),
          players: [{ wallet: playerWallet, role: 'white', isReady: true }]
        });
        console.log('✅ Room created in memory (test mode):', testRooms.get(roomId));
      }

      // Join the socket to the room
      socket.join(roomId);
      console.log('✅ Socket joined room:', roomId);

      // Broadcast room update to all clients in the room
      io.to(roomId).emit('roomUpdated', { roomId, gameState: 'waiting' });
      console.log('📡 Broadcasted roomUpdated to room:', roomId);

      // Send success response with room ID
      const response = { success: true, roomId: roomId, role: 'white' };
      console.log('📤 Sending createRoom response:', response);
      if (typeof callback === 'function') callback(response);
      
    } catch (error) {
      console.error('❌ Error in createRoom:', error);
      if (typeof callback === 'function') callback({ success: false, error: error.message });
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
      console.log('🔍 Debug - Room ID:', roomId, 'Player Wallet:', playerWallet);
      
      // Validate required parameters
      if (!roomId) {
        console.error('❌ Missing roomId in joinRoom event');
        if (typeof callback === 'function') callback({ success: false, error: 'Missing roomId' });
        return;
      }
      
      if (!playerWallet) {
        console.error('❌ Missing playerWallet in joinRoom event');
        if (typeof callback === 'function') callback({ success: false, error: 'Missing playerWallet' });
        return;
      }
      
      // Check if we have database access
      if (process.env.DATABASE_URL) {
        const poolInstance = initializePool();
        
        // Check if room exists in database
        const existingRoom = await poolInstance.query('SELECT room_id FROM games WHERE room_id = $1', [roomId]);
        if (existingRoom.rows.length === 0) {
          console.log('❌ Room not found in database:', roomId);
          if (typeof callback === 'function') callback({ success: false, error: 'Room does not exist' });
          return;
        }

        // Get current players in the room from database
        const result = await poolInstance.query('SELECT player_white_wallet, player_black_wallet FROM games WHERE room_id = $1', [roomId]);
        const currentPlayers = result.rows;

        // Check if player is already in the room
        const existingPlayer = currentPlayers.find(p => p.player_white_wallet === playerWallet || p.player_black_wallet === playerWallet);
        if (existingPlayer) {
          console.log('✅ Player already in room:', existingPlayer);
          socket.join(roomId);
          if (typeof callback === 'function') callback({ success: true, role: existingPlayer.player_white_wallet === playerWallet ? 'white' : 'black' });
          return;
        }

        // Add new player to the room
        const newRole = currentPlayers.length === 0 ? 'white' : 'black'; // Assign role based on current players
        await poolInstance.query(
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

        if (typeof callback === 'function') callback({ success: true, role: newRole });
      } else {
        // Use in-memory storage for testing
        const room = testRooms.get(roomId);
        if (!room) {
          console.log('❌ Room not found in memory:', roomId);
          if (typeof callback === 'function') callback({ success: false, error: 'Room does not exist' });
          return;
        }

        // Check if player is already in the room
        console.log('🔍 Debug - Checking if player already in room. Current players:', room.players.map(p => ({ wallet: p.wallet, role: p.role })));
        const existingPlayer = room.players.find(p => p.wallet === playerWallet);
        if (existingPlayer) {
          console.log('✅ Player already in room (memory):', existingPlayer);
          socket.join(roomId);
          if (typeof callback === 'function') callback({ success: true, role: existingPlayer.role });
          return;
        }

        // Add new player to the room
        const hasWhitePlayer = room.players.some(p => p.role === 'white');
        const newRole = hasWhitePlayer ? 'black' : 'white';
        room.players.push({ wallet: playerWallet, role: newRole, isReady: true });
        room.last_updated = new Date();
        
        console.log('✅ Player joined room (memory):', roomId, 'player:', playerWallet, 'role:', newRole);

        // Join the socket to the room
        socket.join(roomId);

        // Broadcast room update
        io.to(roomId).emit('roomUpdated', { roomId, gameState: 'waiting' });
        
        // If both players are present, notify about game ready
        if (room.players.length === 2) {
          io.to(roomId).emit('gameReady', { roomId, players: room.players.map(p => p.role) });
        }

        if (typeof callback === 'function') callback({ success: true, role: newRole });
      }
      
    } catch (error) {
      console.error('Error joining room:', error);
      if (typeof callback === 'function') callback({ success: false, error: 'Failed to join room' });
    }
  });

  // Get room status
  socket.on('getRoomStatus', async (data, callback) => {
    try {
      const { roomId } = data;
      
      // Check if we have database access
      if (process.env.DATABASE_URL) {
        const poolInstance = initializePool();
        
        // Get room details from database
        const result = await poolInstance.query('SELECT player_white_wallet, player_black_wallet, game_state FROM games WHERE room_id = $1', [roomId]);
        const room = result.rows[0];

        if (!room) {
          if (typeof callback === 'function') callback({ success: false, error: 'Room does not exist' });
          return;
        }

        // Get escrows for this room
        const escrowsResult = await poolInstance.query('SELECT player_wallet, escrow_amount FROM escrows WHERE room_id = $1', [roomId]);
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
        if (typeof callback === 'function') callback({ success: true, roomStatus });
      } else {
        // Use in-memory storage for testing
        const room = testRooms.get(roomId);
        if (!room) {
          console.log('❌ Room not found in memory:', roomId);
          if (typeof callback === 'function') callback({ success: false, error: 'Room does not exist' });
          return;
        }

        const roomStatus = {
          playerCount: room.players.length,
          players: room.players.map(p => ({ role: p.role, wallet: p.wallet })),
          escrowCount: 0, // No escrows in test mode
          escrows: {},
          gameStarted: false
        };

        console.log('📊 Room status for', roomId, ':', roomStatus);
        if (typeof callback === 'function') callback({ success: true, roomStatus });
      }
      
    } catch (error) {
      console.error('Error getting room status:', error);
      if (typeof callback === 'function') callback({ success: false, error: 'Failed to get room status' });
    }
  });

  // Add escrow for a player
  socket.on('addEscrow', async (data, callback) => {
    try {
      console.log('💰 Received addEscrow event:', data);
      const { roomId, playerWallet, amount } = data;
      
      // Check if we have database access
      if (process.env.DATABASE_URL) {
        const poolInstance = initializePool();
        
        // Get current escrows from database
        const result = await poolInstance.query('SELECT escrow_amount FROM escrows WHERE room_id = $1 AND player_wallet = $2', [roomId, playerWallet]);
        if (result.rows.length > 0) {
          console.log('❌ Escrow already exists for player:', playerWallet, 'in room:', roomId);
          if (typeof callback === 'function') callback({ success: false, error: 'Escrow already exists' });
          return;
        }

        // Insert new escrow into database
        await poolInstance.query(
          'INSERT INTO escrows (room_id, player_wallet, escrow_amount) VALUES ($1, $2, $3)',
          [roomId, playerWallet, amount]
        );
        console.log('✅ Escrow added to database:', roomId, playerWallet, amount);

        // Broadcast escrow update
        io.to(roomId).emit('escrowUpdated', { roomId, escrows: await poolInstance.query('SELECT player_wallet, escrow_amount FROM escrows WHERE room_id = $1', [roomId]).then(r => r.rows) });
      } else {
        // Use in-memory storage for testing
        console.log('✅ Escrow added to memory (test mode):', roomId, playerWallet, amount);
        if (typeof callback === 'function') callback({ success: true, message: 'Escrow added (test mode)' });
      }
      
      // Auto-start game if both escrows are created and both players are present
      if (process.env.DATABASE_URL) {
        const currentPlayers = await poolInstance.query('SELECT player_white_wallet, player_black_wallet FROM games WHERE room_id = $1', [roomId]).then(r => r.rows[0]);
        const escrows = await poolInstance.query('SELECT player_wallet FROM escrows WHERE room_id = $1', [roomId]).then(r => r.rows);
        
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
          await poolInstance.query('UPDATE games SET game_state = $1 WHERE room_id = $2', ['active', roomId]);
          
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
      } else {
        // Test mode - use in-memory storage
        const room = testRooms.get(roomId);
        if (room && room.players.length === 2) {
          console.log('🎮 Test mode: Game ready with both players');
          io.to(roomId).emit('gameReady', { roomId, players: room.players.map(p => p.role) });
        }
      }
      
      if (typeof callback === 'function') callback({ success: true, message: 'Escrow created successfully' });
      
    } catch (error) {
      console.error('❌ Error adding escrow:', error);
      if (typeof callback === 'function') callback({ success: false, error: 'Failed to add escrow' });
    }
  });

  // Debug: Log when addEscrow event handler is registered
  console.log('✅ addEscrow event handler registered for socket:', socket.id);

  // Clear escrows for a room
  socket.on('clearEscrows', async (data, callback) => {
    try {
      const { roomId } = data;
      
      // Check if we have database access
      if (process.env.DATABASE_URL) {
        const poolInstance = initializePool();
        
        // Clear escrows from database
        await poolInstance.query('DELETE FROM escrows WHERE room_id = $1', [roomId]);
        console.log('🔄 Cleared escrows for room:', roomId);
      } else {
        // Use in-memory storage for testing
        console.log('🔄 Cleared escrows for room (test mode):', roomId);
      }

      // Broadcast room update
      io.to(roomId).emit('roomUpdated', { roomId, gameState: 'waiting' });
      if (typeof callback === 'function') callback({ success: true });
      
    } catch (error) {
      console.error('Error clearing escrows:', error);
      if (typeof callback === 'function') callback({ success: false, error: 'Failed to clear escrows' });
    }
  });

  // Save game state
  socket.on('saveGameState', async (data, callback) => {
    try {
      const { roomId, gameState } = data;
      
      // Check if we have database access
      if (process.env.DATABASE_URL) {
        const poolInstance = initializePool();
        
        // Update game state in database
        await poolInstance.query(
          'UPDATE games SET game_state = $1, updated_at = $2 WHERE room_id = $3',
          [gameState, new Date(), roomId]
        );
        
        console.log('✅ Game state saved to database:', roomId);
      } else {
        // Use in-memory storage for testing
        const room = testRooms.get(roomId);
        if (room) {
          room.gameState = gameState;
          room.last_updated = new Date();
          console.log('✅ Game state saved to memory (test mode):', roomId);
        }
      }
      
      if (typeof callback === 'function') callback({ success: true });
      
      // Broadcast game state update
      io.to(roomId).emit('gameStateUpdated', { roomId, gameState });
      
    } catch (error) {
      console.error('Error saving game state:', error);
      if (typeof callback === 'function') callback({ success: false, error: 'Failed to save game state' });
    }
  });

  // Get game state
  socket.on('getGameState', async (data, callback) => {
    try {
      const { roomId } = data;
      
      // Check if we have database access
      if (process.env.DATABASE_URL) {
        const poolInstance = initializePool();
        
        // Get game state from database
        const result = await poolInstance.query('SELECT game_state FROM games WHERE room_id = $1', [roomId]);
        const gameState = result.rows[0];

        if (gameState) {
          if (typeof callback === 'function') callback({ success: true, gameState: gameState.game_state });
        } else {
          if (typeof callback === 'function') callback({ success: false, error: 'Game state not found' });
        }
      } else {
        // Use in-memory storage for testing
        const room = testRooms.get(roomId);
        if (room) {
          if (typeof callback === 'function') callback({ success: true, gameState: room.gameState || 'waiting' });
        } else {
          if (typeof callback === 'function') callback({ success: false, error: 'Game state not found' });
        }
      }
      
    } catch (error) {
      console.error('Error getting game state:', error);
      if (typeof callback === 'function') callback({ success: false, error: 'Failed to get game state' });
    }
  });

  // Clear all rooms (for testing/debugging)
  socket.on('clearAllRooms', async (data, callback) => {
    try {
      // Check if we have database access
      if (process.env.DATABASE_URL) {
        const poolInstance = initializePool();
        await poolInstance.query('DELETE FROM games');
        await poolInstance.query('DELETE FROM escrows');
        await poolInstance.query('DELETE FROM moves');
        await poolInstance.query('DELETE FROM chat_messages');
        
        console.log('🧹 All rooms cleared from database');
      } else {
        // Use in-memory storage for testing
        testRooms.clear();
        testChatMessages.clear();
        console.log('🧹 All rooms cleared from memory (test mode)');
      }
      
      if (typeof callback === 'function') callback({ success: true });
      
    } catch (error) {
      console.error('Error clearing rooms:', error);
      if (typeof callback === 'function') callback({ success: false, error: 'Failed to clear rooms' });
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

      const poolInstance = initializePool();

      // Get current game state from database
      const result = await poolInstance.query('SELECT game_state, current_turn FROM games WHERE room_id = $1', [gameId]);
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
      await poolInstance.query(
        'INSERT INTO moves (room_id, move_data, player_id, color, timestamp) VALUES ($1, $2, $3, $4, $5)',
        [gameId, JSON.stringify(move), playerId, color, new Date()]
      );

      // Switch turns
      const nextTurn = color === 'white' ? 'black' : 'white';
      await poolInstance.query('UPDATE games SET current_turn = $1 WHERE room_id = $2', [nextTurn, gameId]);

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

      const poolInstance = initializePool();
      
      // Insert new chat message into database
      await poolInstance.query(
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
      
      // Check if we have database access
      if (process.env.DATABASE_URL) {
        const poolInstance = initializePool();
        
        // Get chat messages from database
        const result = await poolInstance.query('SELECT player_id, player_name, message, timestamp FROM chat_messages WHERE game_id = $1 ORDER BY timestamp ASC', [roomId]);
        const messages = result.rows.map(msg => ({
          id: msg.id, // Assuming msg.id is the unique ID from the DB
          gameId: msg.game_id,
          playerId: msg.player_id,
          playerName: msg.player_name,
          message: msg.message,
          timestamp: msg.timestamp
        }));
        if (typeof callback === 'function') callback({ success: true, messages });
      } else {
        // Use in-memory storage for testing
        const messages = testChatMessages.get(roomId) || [];
        if (typeof callback === 'function') callback({ success: true, messages });
      }
      
    } catch (error) {
      console.error('Error getting chat messages:', error);
      if (typeof callback === 'function') callback({ success: false, error: 'Failed to get chat messages' });
    }
  });

  // Send chat message to room
  socket.on('sendChatMessage', async (data, callback) => {
    try {
      const { roomId, message, playerWallet, playerRole } = data;
      
      if (!message || message.trim().length === 0) {
        if (typeof callback === 'function') callback({ success: false, error: 'Message cannot be empty' });
        return;
      }

      if (message.length > 500) {
        if (typeof callback === 'function') callback({ success: false, error: 'Message too long (max 500 characters)' });
        return;
      }

      const newMessage = {
        id: Date.now().toString(),
        roomId,
        playerWallet,
        playerRole,
        message: message.trim(),
        timestamp: new Date()
      };

      // Check if we have database access
      if (process.env.DATABASE_URL) {
        const poolInstance = initializePool();
        
        // Insert new chat message into database
        await poolInstance.query(
          'INSERT INTO chat_messages (game_id, player_id, player_name, message, timestamp) VALUES ($1, $2, $3, $4, $5)',
          [roomId, playerWallet, playerRole, message.trim(), new Date()]
        );
      } else {
        // Use in-memory storage for testing
        const messages = testChatMessages.get(roomId) || [];
        messages.push(newMessage);
        testChatMessages.set(roomId, messages);
      }

      console.log('💬 Chat message sent:', roomId, playerWallet, message);
      if (typeof callback === 'function') callback({ success: true, message: newMessage });

      // Broadcast message to all players in the room
      io.to(roomId).emit('chatMessageReceived', newMessage);

    } catch (error) {
      console.error('Error sending chat message:', error);
      if (typeof callback === 'function') callback({ success: false, error: 'Failed to send message' });
    }
  });

  // Handle game state requests
  socket.on('getGameState', async (gameId) => {
    try {
      const poolInstance = initializePool();
      const result = await poolInstance.query('SELECT game_state FROM games WHERE room_id = $1', [gameId]);
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
      const poolInstance = initializePool();
      const result = await poolInstance.query('SELECT player_id, player_name, message, timestamp FROM chat_messages WHERE game_id = $1 ORDER BY timestamp ASC', [gameId]);
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

  // Handle custom test events
  socket.on('customEvent', (data) => {
    console.log('📨 Received custom event:', data);
    socket.emit('customResponse', { 
      received: data, 
      serverTime: new Date().toISOString(),
      socketId: socket.id 
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Clean up player session
    // No in-memory playerSessions to clean up
  });
});

const PORT = process.env.PORT || 8080; // Use DigitalOcean's PORT or default to 8080
console.log('🔧 Server configuration:');
console.log('  - PORT:', PORT);
console.log('  - NODE_ENV:', process.env.NODE_ENV);
console.log('  - DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
console.log('  - DATABASE_CA_CERT:', process.env.DATABASE_CA_CERT ? 'Set' : 'Not set');

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  try {
    // Initialize database and create tables
    await initializeDatabase();
    console.log('✅ Server startup completed successfully');
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    // Don't exit - let the server run for health checks
  }
});