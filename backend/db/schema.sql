-- MIG33 Clone Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(32) UNIQUE NOT NULL,
  password_hash TEXT,
  email VARCHAR(255) UNIQUE,
  avatar VARCHAR(255),
  credits BIGINT DEFAULT 0,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'mentor', 'merchant', 'admin', 'customer_service', 'super_admin')),
  status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'away', 'offline')),
  status_message VARCHAR(100) DEFAULT '',
  country VARCHAR(4),
  gender VARCHAR(6) CHECK (gender IN ('male', 'female')),
  is_active BOOLEAN DEFAULT FALSE,
  activation_token VARCHAR(128),
  is_invisible BOOLEAN DEFAULT false,
  suspended_at TIMESTAMP,
  suspended_by VARCHAR(100),
  last_ip VARCHAR(45),
  pin VARCHAR(4),
  login_streak INT DEFAULT 0,
  last_login_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  owner_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  creator_name VARCHAR(50),
  description TEXT,
  max_users INTEGER DEFAULT 25,
  is_private BOOLEAN DEFAULT FALSE,
  password VARCHAR(100),
  room_code VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Room admins table
CREATE TABLE IF NOT EXISTS room_admins (
  id SERIAL PRIMARY KEY,
  room_id BIGINT REFERENCES rooms(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, user_id)
);

-- User room history table (for Chat menu)
CREATE TABLE IF NOT EXISTS user_room_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  room_id BIGINT REFERENCES rooms(id) ON DELETE CASCADE,
  last_joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, room_id)
);

-- User posts table
CREATE TABLE IF NOT EXISTS user_posts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url VARCHAR(255),
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User gifts table
CREATE TABLE IF NOT EXISTS user_gifts (
  id BIGSERIAL PRIMARY KEY,
  sender_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  receiver_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  gift_name VARCHAR(100) NOT NULL,
  gift_icon VARCHAR(50),
  gift_cost INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User follows table
CREATE TABLE IF NOT EXISTS user_follows (
  id BIGSERIAL PRIMARY KEY,
  follower_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  following_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- User blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
  id BIGSERIAL PRIMARY KEY,
  blocker_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  blocked_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT REFERENCES rooms(id) ON DELETE CASCADE,
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
  request_id VARCHAR(100) UNIQUE,
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
  room_id BIGINT REFERENCES rooms(id) ON DELETE CASCADE,
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
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feed posts table
CREATE TABLE IF NOT EXISTS feed_posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feed likes table
CREATE TABLE IF NOT EXISTS feed_likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id)
);

-- Feed comments table
CREATE TABLE IF NOT EXISTS feed_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Abuse Reports table
CREATE TABLE IF NOT EXISTS abuse_reports (
  id BIGSERIAL PRIMARY KEY,
  reporter_username VARCHAR(50) NOT NULL,
  target_username VARCHAR(50) NOT NULL,
  room_id BIGINT REFERENCES rooms(id) ON DELETE CASCADE,
  message_id VARCHAR(100),
  message_text TEXT,
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('spam', 'harassment', 'porn', 'scam')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
CREATE INDEX IF NOT EXISTS idx_feed_posts_user_id ON feed_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_likes_post_id ON feed_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_post_id ON feed_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_user_room_history_user_id ON user_room_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_room_history_room_id ON user_room_history(room_id);
CREATE INDEX IF NOT EXISTS idx_user_room_history_last_joined ON user_room_history(last_joined_at DESC);


-- 🔐 STEP 5: Add request_id column for idempotency tracking (migration for existing tables)
ALTER TABLE credit_logs ADD COLUMN IF NOT EXISTS request_id VARCHAR(100) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_credit_logs_request_id ON credit_logs(request_id);

-- Insert default rooms (only if they don't exist)
INSERT INTO rooms (name, description, max_users, room_code) VALUES
  ('Indonesia', 'Welcome to Indonesia room', 100, 'MIGX-00001'),
  ('Dhaka cafe', 'Welcome to Dhaka cafe', 50, 'MIGX-00002'),
  ('Mobile fun', 'Fun chat for mobile users', 50, 'MIGX-00003')
ON CONFLICT (name) DO NOTHING;