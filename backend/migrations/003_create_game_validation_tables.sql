-- Migration: Create post-game validation system tables
-- These tables track comprehensive validation results for financial security

-- Game validation results table
CREATE TABLE IF NOT EXISTS game_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    validation_type VARCHAR(50) NOT NULL CHECK (validation_type IN (
        'move_replay', 'financial_security', 'anti_cheat', 'timing', 'position_integrity'
    )),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'passed', 'failed', 'warning')),
    score INTEGER, -- 0-100 confidence score
    details JSONB, -- Detailed validation results
    error_message TEXT,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validator_version VARCHAR(20) DEFAULT '1.0',
    UNIQUE(game_id, validation_type)
);

-- Move validation results (detailed per-move analysis)
CREATE TABLE IF NOT EXISTS move_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    move_number INTEGER NOT NULL,
    is_legal BOOLEAN NOT NULL,
    position_before TEXT, -- FEN before move
    position_after TEXT, -- FEN after move
    expected_position TEXT, -- Expected FEN from replay
    time_used INTEGER, -- milliseconds used for this move
    is_suspicious BOOLEAN DEFAULT FALSE,
    anti_cheat_flags JSONB, -- Specific flags like "too_fast", "engine_like", etc.
    validation_details JSONB,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(game_id, move_number)
);

-- Payout validation (financial security before escrow release)
CREATE TABLE IF NOT EXISTS payout_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    escrow_account VARCHAR(44), -- Solana escrow account
    winner_wallet VARCHAR(44) NOT NULL,
    stake_amount DECIMAL(20, 9) NOT NULL,
    platform_fee DECIMAL(20, 9) NOT NULL,
    validation_status VARCHAR(20) NOT NULL CHECK (validation_status IN (
        'pending', 'approved', 'rejected', 'disputed'
    )),
    validation_score INTEGER, -- Overall confidence score 0-100
    risk_factors JSONB, -- Risk assessment details
    human_review_required BOOLEAN DEFAULT FALSE,
    approved_by VARCHAR(100), -- System or admin who approved
    approved_at TIMESTAMP WITH TIME ZONE,
    payout_tx_id VARCHAR(100), -- Solana transaction ID when paid
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(game_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_validations_game_id ON game_validations(game_id);
CREATE INDEX IF NOT EXISTS idx_game_validations_status ON game_validations(status);
CREATE INDEX IF NOT EXISTS idx_move_validations_game_id ON move_validations(game_id);
CREATE INDEX IF NOT EXISTS idx_move_validations_suspicious ON move_validations(is_suspicious);
CREATE INDEX IF NOT EXISTS idx_payout_validations_status ON payout_validations(validation_status);
CREATE INDEX IF NOT EXISTS idx_payout_validations_review ON payout_validations(human_review_required);

-- Insert this migration into the tracking table
INSERT INTO schema_migrations (migration_name, description) 
VALUES ('003_create_game_validation_tables', 'Create comprehensive post-game validation system for financial security')
ON CONFLICT (migration_name) DO NOTHING;