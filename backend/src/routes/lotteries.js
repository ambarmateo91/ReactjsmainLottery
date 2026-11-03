import { Router } from 'express';
import { pool } from '../db.js';
import { DAY_NAMES, DAY_NUMBERS, getScheduleState, toTimeString } from '../lib/schedule.js';

function mapLottery(row, soldTickets) {
  const closingTime = toTimeString(row.draw_time);
  const schedule = closingTime ? { draw_time: row.draw_time, day_of_week: row.schedule_day } : null;
  return {
    id: String(row.id),
    name: row.name,
    description: row.description || '',
    code: row.code || null,
    type: row.type || null,
    price: 0,
    max_tickets: 0,
    sold_tickets: soldTickets != null ? Number(soldTickets) : Number(row.sold_tickets || 0),
    status: row.is_active ? 'active' : 'inactive',
    draw_date: new Date().toISOString(),
    closing_time: closingTime,
    schedule_id: row.schedule_id != null ? String(row.schedule_id) : null,
    schedule_day: row.schedule_day ?? null,
    is_closed: schedule ? getScheduleState(schedule).closed : false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const LOTTERY_SELECT = `
  SELECT l.*,
    (SELECT COUNT(*)::int FROM tickets t WHERE t.lottery_id = l.id AND t.status <> 'cancelled') AS sold_tickets,
    s.id AS schedule_id, s.draw_time, s.day_of_week AS schedule_day
  FROM lotteries l
  LEFT JOIN LATERAL (
    SELECT ls.id, ls.draw_time, ls.day_of_week
    FROM lottery_schedules ls
    WHERE ls.lottery_id = l.id AND ls.is_active = true
    ORDER BY ls.draw_time ASC
    LIMIT 1
  ) s ON true`;

/**
 * La columna day_of_week puede ser texto ("daily", "monday") o numérica (0-6).
 * Se detecta una sola vez para guardar el valor correcto en cualquier esquema.
 */
let dayColumnTypePromise = null;
function getDayColumnType() {
  if (!dayColumnTypePromise) {
    dayColumnTypePromise = pool
      .query(
        `SELECT data_type FROM information_schema.columns
         WHERE table_name = 'lottery_schedules' AND column_name = 'day_of_week' LIMIT 1`
      )
      .then(({ rows }) => rows[0]?.data_type || 'text')
      .catch(() => 'text');
  }
  return dayColumnTypePromise;
}

async function normalizeScheduleDay(value) {
  const type = await getDayColumnType();
  const numeric = /int|numeric|real|double|decimal/i.test(type);

  if (!numeric) {
    if (value == null || value === '') return 'daily';
    if (typeof value === 'number') return DAY_NAMES[value] || 'daily';
    return String(value);
  }

  if (value == null || value === '' || value === 'daily') return 7;
  const text = String(value).toLowerCase();
  if (/^\d+$/.test(text)) return Number(text);
  return DAY_NUMBERS[text] ?? 7;
}

/** Crea o actualiza el horario de cierre de una lotería (uno por lotería). */
async function saveSchedule(lotteryId, { draw_time, day_of_week, is_active }) {
  const day = await normalizeScheduleDay(day_of_week);
  const { rows: existing } = await pool.query(
    `SELECT id FROM lottery_schedules
     WHERE lottery_id = $1
     ORDER BY is_active DESC, draw_time ASC
     LIMIT 1`,
    [lotteryId]
  );

  if (existing[0]) {
    const { rows } = await pool.query(
      `UPDATE lottery_schedules
       SET draw_time = $1, day_of_week = $2, is_active = $3
       WHERE id = $4 RETURNING *`,
      [draw_time, day, is_active ?? true, existing[0].id]
    );
    return rows[0];
  }

  const { rows } = await pool.query(
    `INSERT INTO lottery_schedules (lottery_id, draw_time, day_of_week, is_active)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [lotteryId, draw_time, day, is_active ?? true]
  );
  return rows[0];
}

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const { rows } = await pool.query(
      `${LOTTERY_SELECT} ${status === 'active' ? 'WHERE l.is_active = true' : ''} ORDER BY l.name ASC`
    );
    return res.json(rows.map((r) => mapLottery(r, r.sold_tickets)));
  } catch (err) {
    console.error('lotteries list error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`${LOTTERY_SELECT} WHERE l.id = $1`, [req.params.id]);
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

/**
 * Elimina una lotería (mantenimiento).
 * Protege la información: si tiene tickets vendidos no se elimina, se desactiva.
 */
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT id, name FROM lotteries WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lotería no encontrada' });
    }

    const { rows: ticketRows } = await client.query(
      'SELECT COUNT(*)::int AS count FROM tickets WHERE lottery_id = $1',
      [req.params.id]
    );
    const ticketCount = Number(ticketRows[0]?.count || 0);
    if (ticketCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `No se puede eliminar "${rows[0].name}": tiene ${ticketCount} ticket(s) asociados. Desactívala en su lugar.`,
      });
    }

    // Borra registros dependientes (si la tabla existe en este esquema).
    for (const table of ['prize_configurations', 'prizes', 'lottery_results', 'lottery_schedules']) {
      try {
        await client.query(`DELETE FROM ${table} WHERE lottery_id = $1`, [req.params.id]);
      } catch (err) {
        if (err?.code !== '42P01') throw err; // 42P01 = tabla inexistente
      }
    }

    await client.query('DELETE FROM lotteries WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    return res.json({ ok: true, message: `Lotería "${rows[0].name}" eliminada` });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err?.code === '23503') {
      return res.status(409).json({
        error: 'No se puede eliminar la lotería porque tiene registros relacionados.',
      });
    }
    console.error('lottery delete error', err);
    return res.status(500).json({ error: 'Error interno' });
  } finally {
    client.release();
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

router.post('/:id/schedules', async (req, res) => {
  const { draw_time, day_of_week, is_active } = req.body || {};
  if (!draw_time) return res.status(400).json({ error: 'draw_time requerido (HH:MM)' });
  try {
    const row = await saveSchedule(req.params.id, { draw_time, day_of_week, is_active });
    return res.status(201).json(row);
  } catch (err) {
    console.error('schedule create error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

/** Crea o actualiza el horario de cierre (evita duplicados al editar). */
router.put('/:id/schedule', async (req, res) => {
  const { draw_time, day_of_week, is_active } = req.body || {};
  if (!draw_time) return res.status(400).json({ error: 'draw_time requerido (HH:MM)' });
  try {
    const row = await saveSchedule(req.params.id, { draw_time, day_of_week, is_active });
    return res.json(row);
  } catch (err) {
    console.error('schedule upsert error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

router.patch('/:id/schedules/:scheduleId', async (req, res) => {
  const { draw_time, day_of_week, is_active } = req.body || {};
  try {
    const { rows: existing } = await pool.query(
      'SELECT * FROM lottery_schedules WHERE id = $1 AND lottery_id = $2',
      [req.params.scheduleId, req.params.id]
    );
    if (!existing[0]) return res.status(404).json({ error: 'Horario no encontrado' });
    const cur = existing[0];
    const day = day_of_week != null ? await normalizeScheduleDay(day_of_week) : cur.day_of_week;
    const { rows } = await pool.query(
      `UPDATE lottery_schedules
       SET draw_time = $1, day_of_week = $2, is_active = $3
       WHERE id = $4 RETURNING *`,
      [draw_time ?? cur.draw_time, day, is_active ?? cur.is_active, req.params.scheduleId]
    );
    return res.json(rows[0]);
  } catch (err) {
    console.error('schedule patch error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

router.delete('/:id/schedules/:scheduleId', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM lottery_schedules WHERE id = $1 AND lottery_id = $2',
      [req.params.scheduleId, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Horario no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('schedule delete error', err);
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
