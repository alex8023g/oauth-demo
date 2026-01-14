import { getDb } from '../lib/db';

console.log('Checking database structure...\n');

try {
  const db = getDb();

  // Get all tables
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )
    .all() as { name: string }[];

  console.log('📊 Tables:');
  tables.forEach((table) => {
    console.log(`  - ${table.name}`);
  });

  console.log('\n📋 Table Schemas:\n');

  tables.forEach((table) => {
    console.log(`\n${table.name}:`);
    const columns = db
      .prepare(`PRAGMA table_info(${table.name})`)
      .all() as Array<{
        cid: number;
        name: string;
        type: string;
        notnull: number;
        dflt_value: string | null;
        pk: number;
      }>;

    columns.forEach((col) => {
      const constraints = [];
      if (col.pk) constraints.push('PRIMARY KEY');
      if (col.notnull) constraints.push('NOT NULL');
      if (col.dflt_value) constraints.push(`DEFAULT ${col.dflt_value}`);

      console.log(
        `  ${col.name}: ${col.type}${constraints.length > 0 ? ' (' + constraints.join(', ') + ')' : ''}`
      );
    });
  });

  console.log('\n✓ Database is ready to use');
} catch (error) {
  console.error('✗ Error checking database:', error);
  process.exit(1);
}
