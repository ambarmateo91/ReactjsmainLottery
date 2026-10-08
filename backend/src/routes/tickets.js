import { Router } from 'express';
import { pool } from '../db.js';

function mapTicket(row) {
  if (!row) return null;
  const status = row.status === 'cancelled' ? 'cancelled' : row.status === 'active' ? 'sold' : row.status;
  return {
    id: String(row.id),
    lottery_id: String(row.lottery_id),
    ticket_number: row.ticket_number,
    customer_name: null,
    customer_phone: null,
    seller_id: String(row.user_id),
    seller_name: row.seller_name || null,
    status,
    sold_at: row.created_at,
    cancelled_at: row.cancelled_at,
    prize_won: row.prize_amount != null ? Number(row.prize_amount) : null,
    prize_type: row.play_type || null,
    lottery_name: row.lottery_name || null,
    is_winner: row.is_winner || false,
    amount: row.amount != null ? Number(row.amount) : 0,
    numbers: row.numbers || null,
    play_type: row.play_type || null,
    draw_date: row.draw_date || null,
    draw_time: row.draw_time || null,
  };
}

const router = Router();

function parseNumbers(input) {
  if (input == null) return null;
  if (Array.isArray(input)) return input.length ? input : null;
  const parts = String(input).split(/[-\s]+/).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : null;
}

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, l.name AS lottery_name, COALESCE(p.full_name, u.username, u.email) AS seller_name
       FROM tickets t
       LEFT JOIN lotteries l ON l.id = t.lottery_id
       LEFT JOIN users u ON u.id = t.user_id
       LEFT JOIN user_profiles p ON p.user_id = t.user_id
       ORDER BY t.created_at DESC LIMIT 200`
    );
    return res.json(rows.map(mapTicket));
  } catch (err) {
    console.error('tickets list error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

router.get('/verify/:ticketNumber', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, l.name AS lottery_name, COALESCE(p.full_name, u.username, u.email) AS seller_name,
        COALESCE(s.draw_time, (SELECT s2.draw_time FROM lottery_schedules s2 WHERE s2.lottery_id = t.lottery_id AND s2.is_active ORDER BY s2.draw_time LIMIT 1)) AS draw_time
       FROM tickets t
       LEFT JOIN lotteries l ON l.id = t.lottery_id
       LEFT JOIN users u ON u.id = t.user_id
       LEFT JOIN user_profiles p ON p.user_id = t.user_id
       LEFT JOIN lottery_schedules s ON s.id = t.schedule_id
       WHERE t.ticket_number = $1`,
      [req.params.ticketNumber]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Boleto no encontrado' });
    return res.json(mapTicket(rows[0]));
  } catch (err) {
    console.error('ticket verify error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, l.name AS lottery_name, COALESCE(p.full_name, u.username, u.email) AS seller_name,
        COALESCE(s.draw_time, (SELECT s2.draw_time FROM lottery_schedules s2 WHERE s2.lottery_id = t.lottery_id AND s2.is_active ORDER BY s2.draw_time LIMIT 1)) AS draw_time
       FROM tickets t
       LEFT JOIN lotteries l ON l.id = t.lottery_id
       LEFT JOIN users u ON u.id = t.user_id
       LEFT JOIN user_profiles p ON p.user_id = t.user_id
       LEFT JOIN lottery_schedules s ON s.id = t.schedule_id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Boleto no encontrado' });
    return res.json(mapTicket(rows[0]));
  } catch (err) {
    console.error('ticket get error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

router.post('/', async (req, res) => {
  const { lottery_id, ticket_number, seller_id, amount, play_type, numbers } = req.body || {};
  if (!lottery_id || !ticket_number || !seller_id) {
    return res.status(400).json({ error: 'lottery_id, ticket_number y seller_id requeridos' });
  }
  try {
    const lot = await pool.query('SELECT id, is_active FROM lotteries WHERE id = $1', [Number(lottery_id)]);
    if (!lot.rows[0]) return res.status(404).json({ error: 'Lotería no encontrada' });
    if (lot.rows[0].is_active === false) return res.status(400).json({ error: 'Lotería no está activa' });
    const { rows } = await pool.query(
      `INSERT INTO tickets (lottery_id, ticket_number, user_id, play_type, numbers, amount, status, draw_date)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', CURRENT_DATE) RETURNING *`,
      [
        Number(lottery_id),
        ticket_number,
        Number(seller_id),
        play_type || 'quiniela',
        JSON.stringify(parseNumbers(numbers)),
        amount != null ? Number(amount) : 0,
      ]
    );
    const sch = await pool.query(
      `SELECT draw_time FROM lottery_schedules WHERE lottery_id = $1 AND is_active ORDER BY draw_time LIMIT 1`,
      [Number(lottery_id)]
    );
    return res.status(201).json({ ...mapTicket(rows[0]), draw_time: sch.rows[0]?.draw_time || null });
  } catch (err) {
    console.error('ticket sell error', err);
    if (err?.code === '23505') return res.status(409).json({ error: 'Número de boleto duplicado' });
    return res.status(500).json({ error: 'Error interno' });
  }
});

router.patch('/:id', async (req, res) => {
  const { status, cancellation_reason, cancelled_by, prize_won } = req.body || {};
  try {
    const { rows: existing } = await pool.query('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ error: 'Boleto no encontrado' });
    const nextStatus = status === 'cancelled' || status === 'sold' ? status : existing[0].status;
    const dbStatus = nextStatus === 'sold' ? 'active' : nextStatus;
    const { rows } = await pool.query(
      `UPDATE tickets SET status = $1, cancelled_at = CASE WHEN $1 = 'cancelled' THEN NOW() ELSE cancelled_at END,
        cancelled_by = COALESCE($2, cancelled_by), cancellation_reason = COALESCE($3, cancellation_reason),
        prize_amount = COALESCE($4, prize_amount), updated_at = NOW() WHERE id = $5 RETURNING *`,
      [dbStatus, cancelled_by != null ? Number(cancelled_by) : null, cancellation_reason || null, prize_won ?? null, req.params.id]
    );
    return res.json(mapTicket(rows[0]));
  } catch (err) {
    console.error('ticket patch error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
