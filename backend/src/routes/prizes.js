import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const conds = [];
    const params = [];
    if (status) {
      params.push(status);
      conds.push(`p.status = $${params.length}`);
    }
    const { rows } = await pool.query(
      `SELECT p.*, t.ticket_number, l.name AS lottery_name, COALESCE(prof.full_name, u.username, u.email) AS user_name
       FROM prizes p
       LEFT JOIN tickets t ON t.id = p.ticket_id
       LEFT JOIN lotteries l ON l.id = t.lottery_id
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN user_profiles prof ON prof.user_id = p.user_id
       ${conds.length ? `WHERE ${conds.join(' AND ')}` : ''}
       ORDER BY p.created_at DESC LIMIT 200`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error('prizes list error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

router.patch('/:id', async (req, res) => {
  const { status } = req.body || {};
  try {
    const { rows: existing } = await pool.query('SELECT * FROM prizes WHERE id = $1', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ error: 'Premio no encontrado' });
    const { rows } = await pool.query(
      `UPDATE prizes SET status = $1, paid_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE paid_at END WHERE id = $2 RETURNING *`,
      [status || existing[0].status, req.params.id]
    );
    return res.json(rows[0]);
  } catch (err) {
    console.error('prize patch error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
