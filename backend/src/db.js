import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

function buildConfig() {
  if (process.env.DB_HOST) {
    return {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    };
  }
  if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL or DB_HOST in backend/.env');
    process.exit(1);
  }
  return {
    connectionString: process.env.DATABASE_URL.split('?')[0],
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  };
}

export const pool = new Pool(buildConfig());

pool.on('error', (err) => {
  console.error('Unexpected PG pool error', err);
});
