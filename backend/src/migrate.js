import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Migrations applied OK');
  await pool.end();
}

main().catch(async (err) => {
  console.error('Migrate failed:', err.message);
  await pool.end();
  process.exit(1);
});
