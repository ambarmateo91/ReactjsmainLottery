import { Router } from 'express';
import { pool } from '../db.js';

function mapLottery(row, soldTickets) {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description || '',
    price: 0,
    max_tickets: 0,
    sold_tickets: soldTickets != null ? Number(soldTickets) : Number(row.sold_tickets || 0),
    status: row.is_active ? 'active' : 'inactive',
    draw_date: new Date().toISOString(),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const { rows } = await pool.query(
      `SELECT l.*, (SELECT COUNT(*)::int FROM tickets t WHERE t.lottery_id = l.id AND t.status <> 'cancelled') AS sold_tickets
       FROM lotteries l ${status === 'active' ? 'WHERE l.is_active = true' : ''} ORDER BY l.name ASC`
    );
    return res.json(rows.map((r) => mapLottery(r, r.sold_tickets)));
  } catch (err) {
    console.error('lotteries list error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.*, (SELECT COUNT(*)::int FROM tickets t WHERE t.lottery_id = l.id AND t.status <> 'cancelled') AS sold_tickets
       FROM lotteries l WHERE l.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Lotería no encontrada' });
    return res.json(mapLottery(rows[0], rows[0].sold_tickets));
  } catch (err) {
    console.error('lottery get error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

router.get('/:id/prizes', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM prize_configurations WHERE lottery_id = $1 AND is_active = true', [req.params.id]
    );
    return res.json(
      rows.map((r) => ({
        id: String(r.id),
        lottery_id: String(r.lottery_id),
        prize_type: r.prize_type,
        prize_name: `${r.play_type} - ${r.prize_type}`,
        prize_value: Number(r.estimated_prize || 0),
        quantity: 1,
        winning_condition: '',
        is_active: r.is_active,
        created_at: r.created_at,
      }))
    );
  } catch (err) {
    console.error('prizes error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

router.post('/', async (req, res) => {
  const { name, description, type, code } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name requerido' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO lotteries (name, description, type, code, is_active) VALUES ($1, $2, $3, $4, true) RETURNING *`,
      [name, description || null, type || 'dominicana', code || null]
    );
    return res.status(201).json(mapLottery(rows[0], 0));
  } catch (err) {
    console.error('lottery create error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

router.patch('/:id', async (req, res) => {
  const { name, description, type, code, is_active, auto_close, color } = req.body || {};
  try {
    const { rows: existing } = await pool.query('SELECT * FROM lotteries WHERE id = $1', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ error: 'Lotería no encontrada' });
    const cur = existing[0];
    const { rows } = await pool.query(
      `UPDATE lotteries SET name = $1, description = $2, type = $3, code = $4, is_active = $5,
        auto_close = $6, color = $7, updated_at = NOW() WHERE id = $8 RETURNING *`,
      [
        name ?? cur.name,
        description ?? cur.description,
        type ?? cur.type,
        code ?? cur.code,
        is_active ?? cur.is_active,
        auto_close ?? cur.auto_close,
        color ?? cur.color,
        req.params.id,
      ]
    );
    return res.json(mapLottery(rows[0], 0));
  } catch (err) {
    console.error('lottery patch error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

router.get('/:id/schedules', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM lottery_schedules WHERE lottery_id = $1 ORDER BY draw_time ASC', [req.params.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error('schedules error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

router.post('/:id/prizes', async (req, res) => {
  const { play_type, prize_type, estimated_prize } = req.body || {};
  if (!play_type) return res.status(400).json({ error: 'play_type requerido' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO prize_configurations (lottery_id, play_type, prize_type, estimated_prize, is_active)
       VALUES ($1, $2, $3, $4, true) RETURNING *`,
      [req.params.id, play_type, prize_type || 'cash', estimated_prize != null ? Number(estimated_prize) : 0]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('prize config create error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

router.patch('/prize-configurations/:id', async (req, res) => {
  const { play_type, prize_type, estimated_prize, is_active } = req.body || {};
  try {
    const { rows: existing } = await pool.query('SELECT * FROM prize_configurations WHERE id = $1', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ error: 'Configuración no encontrada' });
    const cur = existing[0];
    const { rows } = await pool.query(
      `UPDATE prize_configurations SET play_type = $1, prize_type = $2, estimated_prize = $3, is_active = $4,
        updated_at = NOW() WHERE id = $5 RETURNING *`,
      [
        play_type ?? cur.play_type,
        prize_type ?? cur.prize_type,
        estimated_prize != null ? Number(estimated_prize) : cur.estimated_prize,
        is_active ?? cur.is_active,
        req.params.id,
      ]
    );
    return res.json(rows[0]);
  } catch (err) {
    console.error('prize config patch error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
