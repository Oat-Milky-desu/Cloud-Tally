-- Migration: Add wallets feature
-- Run this in Cloudflare D1 Console to add wallet support to existing database

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('debit_card', 'credit_card', 'cash', 'fund', 'e_wallet')),
    icon TEXT,
    color TEXT,
    balance REAL DEFAULT 0,
    credit_limit REAL DEFAULT 0,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Add wallet_id to records table (if not exists)
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE, 
-- so this may error if column already exists - that's OK, just ignore
ALTER TABLE records ADD COLUMN wallet_id INTEGER REFERENCES wallets(id);

-- Create index for wallet queries
CREATE INDEX IF NOT EXISTS idx_records_wallet ON records(wallet_id);

-- Insert default cash wallet
INSERT OR IGNORE INTO wallets (name, type, icon, color, balance, is_default) VALUES 
    ('现金', 'cash', '💵', '#2ECC71', 0, 1);
