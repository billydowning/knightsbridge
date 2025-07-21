-- 🏗️ Chess Application PostgreSQL Schema
-- Comprehensive database design for Knightsbridge Chess

-- ========================================
-- USERS & AUTHENTICATION
-- ========================================

CREATE TABLE users (
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
CREATE TABLE user_statistics (
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

CREATE TABLE games (
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
    game_result VARCHAR(20) CHECK (game_result IN ('checkmate', 'stalemate', 'resignation', 'timeout', 'agreement', NULL)),
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
CREATE TABLE game_moves (
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

-- Game analysis and engine evaluation
CREATE TABLE game_analysis (
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

-- Chat messages for games
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    player_id VARCHAR(255) NOT NULL, -- Wallet address or user ID
    player_name VARCHAR(100),
    message TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'chat' CHECK (message_type IN ('chat', 'system', 'draw_offer', 'resignation')),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TOURNAMENTS
-- ========================================

CREATE TABLE tournaments (
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
);

CREATE TABLE tournament_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    final_rank INTEGER,
    points DECIMAL(5, 2) DEFAULT 0,
    prize_amount DECIMAL(20, 9) DEFAULT 0,
    UNIQUE(tournament_id, user_id)
);

CREATE TABLE tournament_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    white_player_id UUID REFERENCES users(id),
    black_player_id UUID REFERENCES users(id),
    result VARCHAR(10) CHECK (result IN ('white', 'black', 'draw')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- LEADERBOARDS & ACHIEVEMENTS
-- ========================================

CREATE TABLE leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    time_control VARCHAR(20) NOT NULL,
    period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE leaderboard_entries (
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
);

CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    criteria_type VARCHAR(50) NOT NULL, -- 'games_won', 'rating_reached', 'streak', etc.
    criteria_value INTEGER NOT NULL,
    reward_amount DECIMAL(20, 9) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- ========================================
-- NOTIFICATIONS & COMMUNICATION
-- ========================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'game_invite', 'tournament_start', 'achievement', etc.
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional data
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ANALYTICS & REPORTING
-- ========================================

CREATE TABLE game_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    total_games INTEGER DEFAULT 0,
    completed_games INTEGER DEFAULT 0,
    total_volume DECIMAL(20, 9) DEFAULT 0, -- Total SOL staked
    platform_fees DECIMAL(20, 9) DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    average_game_duration INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date)
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Users
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_rating_rapid ON users(rating_rapid DESC);
CREATE INDEX idx_users_rating_blitz ON users(rating_blitz DESC);
CREATE INDEX idx_users_rating_bullet ON users(rating_bullet DESC);

-- Games
CREATE INDEX idx_games_room_id ON games(room_id);
CREATE INDEX idx_games_blockchain_tx ON games(blockchain_tx_id);
CREATE INDEX idx_games_player_white ON games(player_white_id);
CREATE INDEX idx_games_player_black ON games(player_black_id);
CREATE INDEX idx_games_created_at ON games(created_at DESC);
CREATE INDEX idx_games_status ON games(game_state);

-- Game moves
CREATE INDEX idx_game_moves_game_id ON game_moves(game_id);
CREATE INDEX idx_game_moves_move_number ON game_moves(game_id, move_number);

-- Tournaments
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_start_date ON tournaments(start_date);

-- Leaderboards
CREATE INDEX idx_leaderboard_entries_rank ON leaderboard_entries(leaderboard_id, rank);
CREATE INDEX idx_leaderboard_entries_user ON leaderboard_entries(user_id);

-- Notifications
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Chat messages indexes
CREATE INDEX idx_chat_messages_game_id ON chat_messages(game_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(game_id, created_at DESC);
CREATE INDEX idx_chat_messages_player_id ON chat_messages(player_id);

-- ========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ========================================

-- Update user statistics when games are completed
CREATE OR REPLACE FUNCTION update_user_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update games played
    UPDATE users 
    SET games_played = games_played + 1,
        updated_at = NOW()
    WHERE id IN (NEW.player_white_id, NEW.player_black_id);
    
    -- Update games won/drawn
    IF NEW.winner IS NOT NULL THEN
        IF NEW.winner = 'white' THEN
            UPDATE users 
            SET games_won = games_won + 1,
                total_winnings = total_winnings + NEW.stake_amount,
                updated_at = NOW()
            WHERE id = NEW.player_white_id;
            
            UPDATE users 
            SET total_losses = total_losses + NEW.stake_amount,
                updated_at = NOW()
            WHERE id = NEW.player_black_id;
        ELSIF NEW.winner = 'black' THEN
            UPDATE users 
            SET games_won = games_won + 1,
                total_winnings = total_winnings + NEW.stake_amount,
                updated_at = NOW()
            WHERE id = NEW.player_black_id;
            
            UPDATE users 
            SET total_losses = total_losses + NEW.stake_amount,
                updated_at = NOW()
            WHERE id = NEW.player_white_id;
        ELSIF NEW.winner = 'draw' THEN
            UPDATE users 
            SET games_drawn = games_drawn + 1,
                updated_at = NOW()
            WHERE id IN (NEW.player_white_id, NEW.player_black_id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_statistics
    AFTER UPDATE ON games
    FOR EACH ROW
    WHEN (OLD.game_state != 'finished' AND NEW.game_state = 'finished')
    EXECUTE FUNCTION update_user_statistics();

-- ========================================
-- SAMPLE DATA FOR TESTING
-- ========================================

-- Insert sample achievements
INSERT INTO achievements (name, description, criteria_type, criteria_value, reward_amount) VALUES
('First Victory', 'Win your first game', 'games_won', 1, 0.001),
('Rating Climber', 'Reach 1500 rating', 'rating_reached', 1500, 0.005),
('Win Streak', 'Win 5 games in a row', 'streak', 5, 0.01),
('Tournament Champion', 'Win a tournament', 'tournament_wins', 1, 0.05);

-- Insert sample leaderboards
INSERT INTO leaderboards (name, time_control, period) VALUES
('Rapid Rating', 'rapid', 'all_time'),
('Blitz Rating', 'blitz', 'all_time'),
('Bullet Rating', 'bullet', 'all_time'),
('Weekly Winners', 'rapid', 'weekly'); 