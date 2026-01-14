-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  google_id TEXT UNIQUE,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table (for JWT refresh tokens or session management)
-- CREATE TABLE IF NOT EXISTS sessions (
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   user_id INTEGER NOT NULL,
--   token TEXT UNIQUE NOT NULL,
--   expires_at DATETIME NOT NULL,
--   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
-- );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
-- CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
-- CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
