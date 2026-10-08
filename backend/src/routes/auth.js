import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { toAuthUser, verifyPassword, signSession, authMiddleware } from '../auth.js';

const router = Router();

async function findUserByUsername(username) {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.email, COALESCE(p.full_name, u.username) AS full_name, u.role, u.is_active, u.password
     FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.username = $1`,
    [username]
  );
  return rows[0] || null;
}

router.post('/register', async (req, res) => {
  const { username, email, password, full_name } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Usuario y password requeridos' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const exists = await client.query('SELECT id FROM users WHERE username = $1', [username]);
    if (exists.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'El usuario ya está registrado' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await client.query(
      `INSERT INTO users (username, email, password, role, is_active) VALUES ($1, $2, $3, 'seller_user', true) RETURNING id`,
      [username, email || `${username}@loteria.local`, password_hash]
    );
    const newId = rows[0].id;
    await client.query(
      `INSERT INTO user_profiles (user_id, username, full_name) VALUES ($1, $2, $3)`,
      [newId, username, full_name || username]
    );
    await client.query('COMMIT');
    const user = await findUserByUsername(username);
    const authUser = toAuthUser(user);
    return res.status(201).json({ user: authUser, session: signSession(authUser) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('register error', err);
    return res.status(500).json({ error: 'Error de registro' });
  } finally {
    client.release();
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Usuario y password requeridos' });
  try {
    const row = await findUserByUsername(username);
    if (!row || row.is_active === false) return res.status(401).json({ error: 'Credenciales inválidas' });
    const ok = await verifyPassword(password, row.password);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });
    const user = toAuthUser(row);
    return res.json({ user, session: signSession(user) });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ error: 'Error de autenticación' });
  }
});

router.post('/logout', (_req, res) => {
  return res.json({ ok: true });
});

router.post('/refresh', async (req, res) => {
  try {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(req.body?.refresh_token || req.body?.session?.refresh_token, secret);
    if (!decoded?.sub) return res.status(401).json({ error: 'Invalid refresh token' });
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.email, COALESCE(p.full_name, u.username) AS full_name, u.role, u.is_active
       FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = $1`,
      [decoded.sub]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Usuario no encontrado' });
    const user = toAuthUser(rows[0]);
    return res.json({ user, session: signSession(user) });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.email, COALESCE(p.full_name, u.username) AS full_name, u.role, u.is_active
       FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = $1`,
      [req.auth.sub]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json(toAuthUser(rows[0]));
  } catch (err) {
    console.error('me error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
