import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/sales-summary', async (_req, res) => {
  try {
    const totals = await pool.query(
      `SELECT COUNT(*)::int AS total_tickets, COALESCE(SUM(t.amount), 0)::float AS total_revenue
       FROM tickets t WHERE t.status <> 'cancelled'`
    );
    const byLottery = await pool.query(
      `SELECT t.lottery_id::text AS lottery_id, l.name AS lottery_name, COUNT(*)::int AS tickets_sold, COALESCE(SUM(t.amount), 0)::float AS revenue
       FROM tickets t JOIN lotteries l ON l.id = t.lottery_id WHERE t.status <> 'cancelled'
       GROUP BY t.lottery_id, l.name ORDER BY revenue DESC`
    );
    const bySeller = await pool.query(
      `SELECT t.user_id::text AS seller_id, COALESCE(p.full_name, u.username, u.email) AS seller_name,
        COUNT(*)::int AS tickets_sold, COALESCE(SUM(t.amount), 0)::float AS revenue
       FROM tickets t LEFT JOIN users u ON u.id = t.user_id LEFT JOIN user_profiles p ON p.user_id = t.user_id
       WHERE t.status <> 'cancelled' GROUP BY t.user_id, p.full_name, u.username, u.email ORDER BY revenue DESC`
    );
    const total_revenue = Number(totals.rows[0]?.total_revenue || 0);
    return res.json({
      total_sales: total_revenue,
      total_tickets: Number(totals.rows[0]?.total_tickets || 0),
      total_revenue,
      by_lottery: byLottery.rows,
      by_seller: bySeller.rows,
    });
  } catch (err) {
    console.error('sales summary error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
