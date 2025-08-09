-- Migration: Create migrations tracking table
-- This table tracks which migrations have been applied to prevent re-running them

CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sql_checksum VARCHAR(64), -- SHA-256 hash of the migration SQL
    description TEXT
);

-- Insert this migration into the tracking table
INSERT INTO schema_migrations (migration_name, description) 
VALUES ('001_create_migrations_table', 'Create schema_migrations table to track database migrations')
ON CONFLICT (migration_name) DO NOTHING;