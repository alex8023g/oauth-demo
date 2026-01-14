import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const dbPath = join(process.cwd(), 'data', 'database.db');
const schemaPath = join(process.cwd(), 'lib', 'db', 'schema.sql');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    // Create data directory if it doesn't exist
    // const fs = require('fs');
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    // Initialize schema
    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
  }

  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// User types
export interface User {
  id: number;
  email: string;
  name: string | null;
  google_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// export interface Session {
//   id: number;
//   user_id: number;
//   token: string;
//   expires_at: string;
//   created_at: string;
// }

// User operations
export const userOperations = {
  findByEmail(email: string): User | undefined {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email) as User | undefined;
  },

  findByGoogleId(googleId: string): User | undefined {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM users WHERE google_id = ?');
    return stmt.get(googleId) as User | undefined;
  },

  findById(id: number): User | undefined {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | undefined;
  },

  create(data: {
    email: string;
    name?: string;
    google_id?: string;
    avatar_url?: string;
  }): User {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO users (email, name, google_id, avatar_url)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.email,
      data.name || null,
      data.google_id || null,
      data.avatar_url || null
    );

    return this.findById(Number(result.lastInsertRowid))!;
  },

  update(id: number, data: Partial<Omit<User, 'id' | 'created_at'>>): User | undefined {
    const db = getDb();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.email !== undefined) {
      fields.push('email = ?');
      values.push(data.email);
    }
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.google_id !== undefined) {
      fields.push('google_id = ?');
      values.push(data.google_id);
    }
    if (data.avatar_url !== undefined) {
      fields.push('avatar_url = ?');
      values.push(data.avatar_url);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.findById(id);
  },

  delete(id: number): boolean {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
};

// Session operations
// export const sessionOperations = {
//   findByToken(token: string): Session | undefined {
//     const db = getDb();
//     const stmt = db.prepare('SELECT * FROM sessions WHERE token = ?');
//     return stmt.get(token) as Session | undefined;
//   },

//   findByUserId(userId: number): Session[] {
//     const db = getDb();
//     const stmt = db.prepare('SELECT * FROM sessions WHERE user_id = ?');
//     return stmt.all(userId) as Session[];
//   },

//   create(data: { user_id: number; token: string; expires_at: Date }): Session {
//     const db = getDb();
//     const stmt = db.prepare(`
//       INSERT INTO sessions (user_id, token, expires_at)
//       VALUES (?, ?, ?)
//     `);

//     const result = stmt.run(data.user_id, data.token, data.expires_at.toISOString());

//     const selectStmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
//     return selectStmt.get(result.lastInsertRowid) as Session;
//   },

//   delete(token: string): boolean {
//     const db = getDb();
//     const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
//     const result = stmt.run(token);
//     return result.changes > 0;
//   },

//   deleteByUserId(userId: number): number {
//     const db = getDb();
//     const stmt = db.prepare('DELETE FROM sessions WHERE user_id = ?');
//     const result = stmt.run(userId);
//     return result.changes;
//   },

//   deleteExpired(): number {
//     const db = getDb();
//     const stmt = db.prepare('DELETE FROM sessions WHERE expires_at < ?');
//     const result = stmt.run(new Date().toISOString());
//     return result.changes;
//   },
// };
