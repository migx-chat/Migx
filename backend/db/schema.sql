-- MIG33 Clone Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(32) UNIQUE NOT NULL,
  password_hash TEXT,
  email VARCHAR(255) UNIQUE,
  avatar VARCHAR(255),
  credits BIGINT DEFAULT 0,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'mentor', 'merchant', 'admin')),
  status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'away', 'offline')),
  status_message VARCHAR(100) DEFAULT '',
  country VARCHAR(4),
  gender VARCHAR(6) CHECK (gender IN ('male', 'female')),
  is_active BOOLEAN DEFAULT FALSE,
  activation_token VARCHAR(128),
  is_invisible BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  owner_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  creator_name VARCHAR(50),
  description TEXT,
  max_users INTEGER DEFAULT 25,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Room admins table
CREATE TABLE IF NOT EXISTS room_admins (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(20) REFERENCES rooms(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  room_id VARCHAR(20) REFERENCES rooms(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'chat' CHECK (message_type IN ('chat', 'system', 'notice')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Private messages table
CREATE TABLE IF NOT EXISTS private_messages (
  id BIGSERIAL PRIMARY KEY,
  from_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  to_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  from_username VARCHAR(50) NOT NULL,
  to_username VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credit logs table
CREATE TABLE IF NOT EXISTS credit_logs (
  id BIGSERIAL PRIMARY KEY,
  from_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  to_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  from_username VARCHAR(50),
  to_username VARCHAR(50),
  amount INT NOT NULL,
  transaction_type VARCHAR(30) DEFAULT 'transfer' CHECK (transaction_type IN ('transfer', 'game_spend', 'reward', 'topup', 'commission')),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Merchants table
CREATE TABLE IF NOT EXISTS merchants (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  created_by BIGINT REFERENCES users(id),
  commission_rate INT DEFAULT 30,
  total_income BIGINT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Merchant spend logs table
CREATE TABLE IF NOT EXISTS merchant_spend_logs (
  id BIGSERIAL PRIMARY KEY,
  merchant_id BIGINT REFERENCES merchants(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(50),
  game_type VARCHAR(50) NOT NULL,
  spend_amount INT NOT NULL,
  commission_amount INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User levels table
CREATE TABLE IF NOT EXISTS user_levels (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  xp BIGINT DEFAULT 0,
  level INT DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Room bans table (persistent bans)
CREATE TABLE IF NOT EXISTS room_bans (
  id BIGSERIAL PRIMARY KEY,
  room_id VARCHAR(20) REFERENCES rooms(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  banned_by BIGINT REFERENCES users(id),
  reason TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, user_id)
);

-- Game history table
CREATE TABLE IF NOT EXISTS game_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(50),
  game_type VARCHAR(50) NOT NULL,
  bet_amount INT NOT NULL,
  result VARCHAR(20) CHECK (result IN ('win', 'lose', 'draw')),
  reward_amount INT DEFAULT 0,
  merchant_id BIGINT REFERENCES merchants(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game Results Table
CREATE TABLE IF NOT EXISTS game_results (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  game_type VARCHAR(20) NOT NULL,
  result VARCHAR(10) NOT NULL,
  coins_won INTEGER DEFAULT 0,
  coins_lost INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email OTP Table for email change verification
CREATE TABLE IF NOT EXISTS email_otp (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  otp VARCHAR(10) NOT NULL,
  new_email VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create forgot_password_otp table
CREATE TABLE IF NOT EXISTS forgot_password_otp (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  otp VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_private_messages_to_user ON private_messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_credit_logs_from_user ON credit_logs(from_user_id);
CREATE INDEX IF NOT EXISTS idx_credit_logs_to_user ON credit_logs(to_user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_spend_logs_merchant ON merchant_spend_logs(merchant_id);
CREATE INDEX IF NOT EXISTS idx_game_history_user ON game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_room_bans_room_id ON room_bans(room_id);


-- Insert default rooms (only if they don't exist)
INSERT INTO rooms (id, name, description, max_users) VALUES
  ('MIGX-00001', 'Indonesia', 'Welcome to Indonesia room', 100),
  ('MIGX-00002', 'Dhaka cafe', 'Welcome to Dhaka cafe', 50),
  ('MIGX-00003', 'Mobile fun', 'Fun chat for mobile users', 50)
ON CONFLICT (id) DO NOTHING;