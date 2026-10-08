import { pool } from './db.js';

// Seed NO destructivo: esta BD pertenece al sistema banca/quiniela.
// Solo reporta el estado; no inserta ni modifica usuarios.
async function main() {
  const users = await pool.query('SELECT COUNT(*)::int AS n FROM users');
  const lots = await pool.query('SELECT COUNT(*)::int AS n FROM lotteries');
  const ticks = await pool.query('SELECT COUNT(*)::int AS n FROM tickets');
  console.log(`Seed check OK. users=${users.rows[0].n} lotteries=${lots.rows[0].n} tickets=${ticks.rows[0].n}`);
  console.log('Sin cambios: use una BD vacía + migrate para el esquema nuevo (ver schema.sql).');
  await pool.end();
}

main().catch(async (err) => {
  console.error('Seed failed:', err.message);
  await pool.end();
  process.exit(1);
});
