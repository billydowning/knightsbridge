// 🚛 Staging Database Initialization Endpoint
// This creates a temporary endpoint to initialize staging database schema

const express = require('express');
const { Pool } = require('pg');
const app = express();

// Database connection using the same SSL solution as production
let dbUrl = process.env.DATABASE_URL;
if (dbUrl && dbUrl.includes('?sslmode=')) {
  dbUrl = dbUrl.split('?')[0];
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

// Database initialization schema
const INIT_SCHEMA = `
-- 🚛 Knightsbridge Chess - Staging Database Initialization
-- Toyota-level reliability: Clean, identical schema to production

-- Users table
CREATE TABLE IF NOT EXISTS users (
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
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id VARCHAR(100) UNIQUE NOT NULL,
    blockchain_tx_id VARCHAR(100),
    player_white_id UUID REFERENCES users(id),
    player_black_id UUID REFERENCES users(id),
    player_white_wallet VARCHAR(44) NOT NULL,
    player_black_wallet VARCHAR(44) NOT NULL,
    stake_amount DECIMAL(20, 9) NOT NULL,
    platform_fee DECIMAL(20, 9) DEFAULT 0,
    winner VARCHAR(10) CHECK (winner IN ('white', 'black', 'draw', NULL)),
    game_result VARCHAR(20) CHECK (game_result IN ('checkmate', 'stalemate', 'resignation', 'timeout', 'agreement', 'abandoned', NULL)),
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
);

-- Game moves table
CREATE TABLE IF NOT EXISTS game_moves (
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
);

-- Escrows table
CREATE TABLE IF NOT EXISTS escrows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id VARCHAR(100) NOT NULL,
    player_wallet VARCHAR(44) NOT NULL,
    escrow_amount DECIMAL(20, 9) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'refunded', 'cancelled')),
    blockchain_tx_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, player_wallet)
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id VARCHAR(100) UNIQUE NOT NULL,
    player_white_wallet VARCHAR(44),
    player_black_wallet VARCHAR(44),
    stake_amount DECIMAL(20, 9) NOT NULL,
    time_control VARCHAR(20) NOT NULL DEFAULT 'rapid',
    time_limit INTEGER,
    increment INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished', 'cancelled')),
    escrow_count INTEGER DEFAULT 0,
    confirmed_deposits_count INTEGER DEFAULT 0,
    game_started BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id VARCHAR(100) NOT NULL,
    player_wallet VARCHAR(44) NOT NULL,
    player_id VARCHAR(10) CHECK (player_id IN ('white', 'black')),
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'chat' CHECK (message_type IN ('chat', 'system', 'emote')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_games_room_id ON games(room_id);
CREATE INDEX IF NOT EXISTS idx_games_white_wallet ON games(player_white_wallet);
CREATE INDEX IF NOT EXISTS idx_games_black_wallet ON games(player_black_wallet);
CREATE INDEX IF NOT EXISTS idx_games_state ON games(game_state);
CREATE INDEX IF NOT EXISTS idx_chat_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_rooms_room_id ON rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_escrows_room_id ON escrows(room_id);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
`;

// Endpoint to initialize database
app.get('/init-staging-db', async (req, res) => {
  try {
    console.log('🚛 Starting staging database initialization...');
    
    // Execute the schema creation
    await pool.query(INIT_SCHEMA);
    
    // Test the connection by inserting a test record
    await pool.query(`
      INSERT INTO users (wallet_address, username) 
      VALUES ('test_staging_init', 'staging_test_user') 
      ON CONFLICT (wallet_address) DO NOTHING
    `);
    
    // Verify tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('✅ Staging database initialized successfully!');
    
    res.json({
      success: true,
      message: 'Staging database initialized successfully! 🚛✨',
      tablesCreated: tablesResult.rows.map(row => row.table_name),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error initializing staging database:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Basic health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    message: 'Staging DB Init Service Running',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`🚛 Staging DB Init Service running on port \${PORT}\`);
});
