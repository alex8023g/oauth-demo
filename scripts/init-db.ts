import { getDb } from '../lib/db';

console.log('Initializing database...');

try {
  const db = getDb();
  console.log('✓ Database initialized successfully');
  console.log('✓ Schema created');
  console.log('✓ Database location: data/database.db');
} catch (error) {
  console.error('✗ Failed to initialize database:', error);
  process.exit(1);
}
