-- 🚛 Knightsbridge Chess - Staging Database Initialization
-- Toyota-level reliability: Clean, identical schema to production
-- This script creates all necessary tables for the staging environment

-- ========================================
-- USERS & AUTHENTICATION
-- ========================================

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
    total_winnings DECIMAL(20, 9) DEFAULT 0, -- SOL amount
    total_losses DECIMAL(20, 9) DEFAULT 0,
    best_win_streak INTEGER DEFAULT 0,
    current_win_streak INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- User statistics for different time controls
CREATE TABLE IF NOT EXISTS user_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    time_control VARCHAR(20) NOT NULL, -- 'rapid', 'blitz', 'bullet'
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    games_drawn INTEGER DEFAULT 0,
    average_game_duration INTEGER, -- in seconds
    total_moves_played INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, time_control)
);

-- ========================================
-- GAMES & GAME DATA
-- ========================================

CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id VARCHAR(100) UNIQUE NOT NULL,
    blockchain_tx_id VARCHAR(100), -- Solana transaction ID
    player_white_id UUID REFERENCES users(id),
    player_black_id UUID REFERENCES users(id),
    player_white_wallet VARCHAR(44) NOT NULL,
    player_black_wallet VARCHAR(44) NOT NULL,
    stake_amount DECIMAL(20, 9) NOT NULL, -- SOL amount
    platform_fee DECIMAL(20, 9) DEFAULT 0,
    winner VARCHAR(10) CHECK (winner IN ('white', 'black', 'draw', NULL)),
    game_result VARCHAR(20) CHECK (game_result IN ('checkmate', 'stalemate', 'resignation', 'timeout', 'agreement', 'abandoned', NULL)),
    time_control VARCHAR(20) NOT NULL DEFAULT 'rapid', -- 'rapid', 'blitz', 'bullet', 'custom'
    time_limit INTEGER, -- in seconds
    increment INTEGER DEFAULT 0, -- in seconds
    game_state VARCHAR(20) DEFAULT 'waiting' CHECK (game_state IN ('waiting', 'active', 'finished', 'cancelled')),
    move_count INTEGER DEFAULT 0,
    final_position TEXT, -- FEN notation
    pgn TEXT, -- Portable Game Notation
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual moves in games
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
    position_hash BYTEA, -- SHA-256 hash of position
    time_spent INTEGER, -- milliseconds
    is_check BOOLEAN DEFAULT FALSE,
    is_checkmate BOOLEAN DEFAULT FALSE,
    is_castle BOOLEAN DEFAULT FALSE,
    is_en_passant BOOLEAN DEFAULT FALSE,
    is_promotion BOOLEAN DEFAULT FALSE,
    promotion_piece VARCHAR(10),
    blockchain_tx_id VARCHAR(100), -- Solana transaction ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(game_id, move_number)
);

-- ========================================
-- ESCROWS & BLOCKCHAIN
-- ========================================

CREATE TABLE IF NOT EXISTS escrows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id VARCHAR(100) NOT NULL,
    player_wallet VARCHAR(44) NOT NULL,
    escrow_amount DECIMAL(20, 9) NOT NULL, -- SOL amount
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'refunded', 'cancelled')),
    blockchain_tx_id VARCHAR(100), -- Solana transaction ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, player_wallet)
);

-- ========================================
-- ROOMS & MATCHMAKING
-- ========================================

CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id VARCHAR(100) UNIQUE NOT NULL,
    player_white_wallet VARCHAR(44),
    player_black_wallet VARCHAR(44),
    stake_amount DECIMAL(20, 9) NOT NULL,
    time_control VARCHAR(20) NOT NULL DEFAULT 'rapid',
    time_limit INTEGER, -- in seconds
    increment INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished', 'cancelled')),
    escrow_count INTEGER DEFAULT 0,
    confirmed_deposits_count INTEGER DEFAULT 0,
    game_started BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- CHAT SYSTEM
-- ========================================

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

-- ========================================
-- GAME ANALYSIS & EVALUATION
-- ========================================

CREATE TABLE IF NOT EXISTS game_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    move_number INTEGER NOT NULL,
    evaluation DECIMAL(10, 2), -- Engine evaluation in centipawns
    best_move VARCHAR(10),
    engine_depth INTEGER,
    analysis_time INTEGER, -- milliseconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(game_id, move_number)
);

-- ========================================
-- TOURNAMENTS & COMPETITIONS
-- ========================================

CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tournament_type VARCHAR(20) DEFAULT 'swiss' CHECK (tournament_type IN ('swiss', 'knockout', 'round_robin')),
    time_control VARCHAR(20) NOT NULL,
    time_limit INTEGER,
    increment INTEGER DEFAULT 0,
    entry_fee DECIMAL(20, 9) DEFAULT 0,
    prize_pool DECIMAL(20, 9) DEFAULT 0,
    max_participants INTEGER,
    participants_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'registration' CHECK (status IN ('registration', 'active', 'finished', 'cancelled')),
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament participants
CREATE TABLE IF NOT EXISTS tournament_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(44) NOT NULL,
    registration_fee_paid BOOLEAN DEFAULT FALSE,
    score DECIMAL(10, 2) DEFAULT 0,
    rank INTEGER,
    games_played INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, user_id)
);

-- ========================================
-- LEADERBOARDS & RANKINGS
-- ========================================

CREATE TABLE IF NOT EXISTS leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(44) NOT NULL,
    time_control VARCHAR(20) NOT NULL,
    rating INTEGER NOT NULL,
    games_played INTEGER DEFAULT 0,
    win_rate DECIMAL(5, 2), -- percentage
    current_streak INTEGER DEFAULT 0,
    highest_rating INTEGER,
    rank_position INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, time_control)
);

-- ========================================
-- NOTIFICATIONS & ALERTS
-- ========================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(44) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- ========================================
-- ANALYTICS & METRICS
-- ========================================

CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    user_wallet VARCHAR(44),
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Games table indexes
CREATE INDEX IF NOT EXISTS idx_games_room_id ON games(room_id);
CREATE INDEX IF NOT EXISTS idx_games_white_wallet ON games(player_white_wallet);
CREATE INDEX IF NOT EXISTS idx_games_black_wallet ON games(player_black_wallet);
CREATE INDEX IF NOT EXISTS idx_games_state ON games(game_state);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);

-- Game moves indexes
CREATE INDEX IF NOT EXISTS idx_game_moves_game_id ON game_moves(game_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_move_number ON game_moves(move_number);

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON chat_messages(created_at);

-- Rooms table indexes
CREATE INDEX IF NOT EXISTS idx_rooms_room_id ON rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- Escrows table indexes
CREATE INDEX IF NOT EXISTS idx_escrows_room_id ON escrows(room_id);
CREATE INDEX IF NOT EXISTS idx_escrows_wallet ON escrows(player_wallet);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Leaderboards indexes
CREATE INDEX IF NOT EXISTS idx_leaderboards_time_control ON leaderboards(time_control);
CREATE INDEX IF NOT EXISTS idx_leaderboards_rating ON leaderboards(rating DESC);

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

-- Insert a test record to verify everything is working
INSERT INTO analytics (event_type, event_data) 
VALUES ('staging_db_initialized', '{"status": "success", "timestamp": "' || NOW() || '"}')
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Staging database initialized successfully! 🚛✨' as message;
