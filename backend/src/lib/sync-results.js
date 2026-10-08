import { pool } from '../db.js';
import { fetchLatest, fetchByDate, normalizeItem, matchLottery } from './loterias-api.js';

function samePlay(ticketNumbers, expected) {
  if (!Array.isArray(ticketNumbers)) return false;
  const clean = ticketNumbers.map((n) => String(n).padStart(2, '0').slice(-2));
  if (clean.length !== expected.length) return false;
  return clean.every((n, i) => n === expected[i]);
}

/** Marca ganadores de un sorteo ya registrado. Retorna cantidad marcada. */
export async function markWinners(lotteryId, drawDate, first, second, third) {
  const { rows: tickets } = await pool.query(
    `SELECT id, play_type, numbers FROM tickets WHERE lottery_id = $1 AND draw_date = $2 AND status <> 'cancelled' AND is_winner = false`,
    [lotteryId, drawDate]
  );
  let marked = 0;
  for (const t of tickets) {
    const nums = Array.isArray(t.numbers) ? t.numbers : [];
    let win = false;
    if (t.play_type === 'quiniela' && nums.length >= 1) {
      win = String(nums[0]).padStart(2, '0').slice(-2) === first;
    } else if (t.play_type === 'pale' && nums.length >= 2 && second) {
      win = samePlay(nums.slice(0, 2), [first, second]);
    } else if (t.play_type === 'tripleta' && nums.length >= 3 && second && third) {
      win = samePlay(nums.slice(0, 3), [first, second, third]);
    }
    if (win) {
      await pool.query('UPDATE tickets SET is_winner = true, updated_at = NOW() WHERE id = $1', [t.id]);
      marked += 1;
    }
  }
  return { checked: tickets.length, marked };
}

export async function syncResults({ date, mark = true } = {}) {
  if (!process.env.LOTERIAS_API_KEY) {
    throw new Error('Falta LOTERIAS_API_KEY en backend/.env (gratis en https://dgiiapicloud.com/auth)');
  }
  const { rows: lotteries } = await pool.query('SELECT id, name, code FROM lotteries');
  const items = date ? await fetchByDate(date) : await fetchLatest();
  let created = 0;
  let skipped = 0;
  let winnersMarked = 0;
  const details = [];

  for (const item of items) {
    const norm = normalizeItem(item);
    if (!norm || !norm.first) {
      skipped += 1;
      continue;
    }
    const lottery = matchLottery(item, lotteries);
    if (!lottery) {
      skipped += 1;
      continue;
    }
    const targetDate = date || norm.draw_date;
    const existing = await pool.query('SELECT id FROM lottery_results WHERE lottery_id = $1 AND draw_date = $2', [
      lottery.id,
      targetDate,
    ]);
    let resultId;
    if (existing.rowCount > 0) {
      resultId = existing.rows[0].id;
      skipped += 1;
    } else {
      const ins = await pool.query(
        `INSERT INTO lottery_results (lottery_id, draw_date, first_prize, second_prize, third_prize, status, notes)
         VALUES ($1, $2, $3, $4, $5, 'confirmed', 'Sincronizado automático') RETURNING id`,
        [lottery.id, targetDate, norm.first, norm.second, norm.third]
      );
      resultId = ins.rows[0].id;
      created += 1;
    }
    if (mark) {
      const { marked } = await markWinners(lottery.id, targetDate, norm.first, norm.second, norm.third);
      winnersMarked += marked;
    }
    details.push({ lottery: lottery.name, draw_date: targetDate, first: norm.first, resultId, winnersMarked });
  }

  return { created, skipped, winnersMarked, total: items.length, details };
}
