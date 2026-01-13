-- Payment Record Database Schema
-- Run with: wrangler d1 execute payment-records --file=./schema.sql

-- Records table for income and expenses
CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    icon TEXT,
    color TEXT
);

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
CREATE INDEX IF NOT EXISTS idx_records_category ON records(category);
CREATE INDEX IF NOT EXISTS idx_records_type ON records(type);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Insert default expense categories
INSERT OR IGNORE INTO categories (name, type, icon, color) VALUES 
    ('餐饮', 'expense', '🍽️', '#FF6B6B'),
    ('交通', 'expense', '🚗', '#4ECDC4'),
    ('购物', 'expense', '🛒', '#45B7D1'),
    ('娱乐', 'expense', '🎮', '#96CEB4'),
    ('医疗', 'expense', '💊', '#FFEAA7'),
    ('教育', 'expense', '📚', '#DDA0DD'),
    ('居住', 'expense', '🏠', '#98D8C8'),
    ('通讯', 'expense', '📱', '#F7DC6F'),
    ('其他支出', 'expense', '📦', '#BDC3C7');

-- Insert default income categories
INSERT OR IGNORE INTO categories (name, type, icon, color) VALUES 
    ('工资', 'income', '💰', '#2ECC71'),
    ('奖金', 'income', '🎁', '#27AE60'),
    ('投资', 'income', '📈', '#1ABC9C'),
    ('兼职', 'income', '💼', '#16A085'),
    ('其他收入', 'income', '💵', '#58D68D');
