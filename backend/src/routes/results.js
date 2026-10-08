import { Router } from 'express';
import { pool } from '../db.js';
import { syncResults } from '../lib/sync-results.js';

const router = Router();

router.post('/sync', async (req, res) => {
  try {
    const summary = await syncResults({ date: req.body?.draw_date, mark: req.body?.mark !== false });
    return res.json({ ok: true, ...summary });
  } catch (err) {
    console.error('sync error', err);
    return res.status(502).json({ error: err instanceof Error ? err.message : 'Error sincronizando' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { lottery_id, draw_date } = req.query;
    const conds = [];
    const params = [];
    if (lottery_id) {
      params.push(Number(lottery_id));
      conds.push(`r.lottery_id = $${params.length}`);
    }
    if (draw_date) {
      params.push(draw_date);
      conds.push(`r.draw_date = $${params.length}`);
    }
    const { rows } = await pool.query(
      `SELECT r.*, l.name AS lottery_name, s.draw_time AS schedule_time
       FROM lottery_results r
       LEFT JOIN lotteries l ON l.id = r.lottery_id
       LEFT JOIN lottery_schedules s ON s.id = r.schedule_id
       ${conds.length ? `WHERE ${conds.join(' AND ')}` : ''}
       ORDER BY r.draw_date DESC, r.created_at DESC LIMIT 200`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error('results list error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

router.get('/:id/winners', async (req, res) => {
  try {
    const { rows: results } = await pool.query('SELECT * FROM lottery_results WHERE id = $1', [req.params.id]);
    if (!results[0]) return res.status(404).json({ error: 'Resultado no encontrado' });
    const r = results[0];
    const { rows } = await pool.query(
      `SELECT t.*, COALESCE(p.full_name, u.username, u.email) AS seller_name
       FROM tickets t
       LEFT JOIN users u ON u.id = t.user_id
       LEFT JOIN user_profiles p ON p.user_id = t.user_id
       WHERE t.lottery_id = $1 AND t.draw_date = $2 AND t.is_winner = true`,
      [r.lottery_id, r.draw_date]
    );
    return res.json({ result: r, winners: rows });
  } catch (err) {
    console.error('winners error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

router.post('/', async (req, res) => {
  const { lottery_id, schedule_id, draw_date, first_prize, second_prize, third_prize, notes, registered_by } = req.body || {};
  if (!lottery_id || !draw_date || !first_prize) {
    return res.status(400).json({ error: 'lottery_id, draw_date y first_prize requeridos' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO lottery_results (lottery_id, schedule_id, draw_date, first_prize, second_prize, third_prize, status, notes, registered_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8) RETURNING *`,
      [
        Number(lottery_id),
        schedule_id != null && schedule_id !== '' ? Number(schedule_id) : null,
        draw_date,
        first_prize,
        second_prize || null,
        third_prize || null,
        notes || null,
        registered_by || null,
      ]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('result create error', err);
    if (err?.code === '23505') return res.status(409).json({ error: 'Ya existe un resultado para ese sorteo' });
    return res.status(500).json({ error: 'Error interno' });
  }
});

router.patch('/:id', async (req, res) => {
  const { status, first_prize, second_prize, third_prize, notes, confirmed_by } = req.body || {};
  try {
    const { rows: existing } = await pool.query('SELECT * FROM lottery_results WHERE id = $1', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ error: 'Resultado no encontrado' });
    const cur = existing[0];
    const nextStatus = status ?? cur.status;
    const { rows } = await pool.query(
      `UPDATE lottery_results SET status = $1, first_prize = $2, second_prize = $3, third_prize = $4, notes = $5,
        confirmed_by = COALESCE($6, confirmed_by),
        confirmed_at = CASE WHEN $1 = 'confirmed' AND confirmed_at IS NULL THEN NOW() ELSE confirmed_at END,
        updated_at = NOW() WHERE id = $7 RETURNING *`,
      [
        nextStatus,
        first_prize ?? cur.first_prize,
        second_prize ?? cur.second_prize,
        third_prize ?? cur.third_prize,
        notes ?? cur.notes,
        confirmed_by || null,
        req.params.id,
      ]
    );
    return res.json(rows[0]);
  } catch (err) {
    console.error('result patch error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
