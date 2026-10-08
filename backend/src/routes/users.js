import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { mapRole } from '../auth.js';

const router = Router();

function mapUser(r) {
  return {
    id: String(r.id),
    email: r.email,
    username: r.username,
    full_name: r.full_name,
    role: mapRole(r.role),
    db_role: r.role,
    phone: r.phone,
    is_active: r.is_active,
    created_at: r.created_at,
  };
}

router.get('/sellers', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, COALESCE(p.full_name, u.username) AS full_name, u.role, p.phone, u.is_active, u.created_at
       FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.role IN ('seller_user', 'banca_user', 'admin_user', 'seller', 'admin') AND u.is_active = true
       ORDER BY full_name`
    );
    return res.json(
      rows.map((r) => ({
        id: String(r.id),
        email: r.email,
        full_name: r.full_name,
        role: mapRole(r.role),
        phone: r.phone,
        is_active: r.is_active,
        created_at: r.created_at,
      }))
    );
  } catch (err) {
    console.error('sellers error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.username, COALESCE(p.full_name, u.username) AS full_name, u.role, p.phone, u.is_active, u.created_at
       FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id ORDER BY u.created_at DESC LIMIT 200`
    );
    return res.json(rows.map(mapUser));
  } catch (err) {
    console.error('users list error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

router.post('/', async (req, res) => {
  const { username, email, password, full_name, role, phone } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Usuario y password requeridos' });
  const dbRole = role === 'admin' ? 'admin_user' : role === 'viewer' ? 'banca_user' : 'seller_user';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const exists = await client.query('SELECT id FROM users WHERE username = $1', [username]);
    if (exists.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'El usuario ya existe' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const created = await client.query(
      `INSERT INTO users (username, email, password, role, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id`,
      [username, email || `${username}@loteria.local`, password_hash, dbRole]
    );
    const newId = created.rows[0].id;
    await client.query(`INSERT INTO user_profiles (user_id, username, full_name, phone) VALUES ($1, $2, $3, $4)`,
      [newId, username, full_name || username, phone || null]);
    await client.query('COMMIT');
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.username, COALESCE(p.full_name, u.username) AS full_name, u.role, p.phone, u.is_active, u.created_at
       FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = $1`,
      [newId]
    );
    return res.status(201).json(mapUser(rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('user create error', err);
    return res.status(500).json({ error: 'Error interno' });
  } finally {
    client.release();
  }
});

router.patch('/:id', async (req, res) => {
  const { is_active, role, password, full_name, phone, email, username } = req.body || {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: existing } = await client.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!existing[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const isMainAdmin = existing[0].username === 'am202526';
    const dbRole = role === 'admin' ? 'admin_user' : role === 'viewer' ? 'banca_user' : role === 'seller' ? 'seller_user' : undefined;
    if (isMainAdmin && dbRole && dbRole !== 'admin_user') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'No se puede cambiar el rol del administrador principal' });
    }
    if (isMainAdmin && is_active === false) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'No se puede desactivar al administrador principal' });
    }
    if (username && username !== existing[0].username) {
      const dup = await client.query('SELECT id FROM users WHERE username = $1', [username]);
      if (dup.rowCount > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'El nombre de usuario ya existe' });
      }
    }
    await client.query(
      `UPDATE users SET username = COALESCE($1, username), email = COALESCE($2, email), password = COALESCE($3, password),
        role = COALESCE($4, role), is_active = COALESCE($5, is_active), updated_at = NOW() WHERE id = $6`,
      [
        username || null,
        email || null,
        password ? await bcrypt.hash(password, 10) : null,
        dbRole || null,
        is_active ?? null,
        req.params.id,
      ]
    );
    const finalUsername = username || existing[0].username;
    const prof = await client.query(
      `UPDATE user_profiles SET username = $1, full_name = COALESCE($2, full_name), phone = COALESCE($3, phone), updated_at = NOW() WHERE user_id = $4`,
      [finalUsername, full_name || null, phone || null, req.params.id]
    );
    if (prof.rowCount === 0) {
      await client.query(`INSERT INTO user_profiles (user_id, username, full_name, phone) VALUES ($1, $2, $3, $4)`,
        [req.params.id, finalUsername, full_name || finalUsername, phone || null]);
    }
    await client.query('COMMIT');
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.username, COALESCE(p.full_name, u.username) AS full_name, u.role, p.phone, u.is_active, u.created_at
       FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = $1`,
      [req.params.id]
    );
    return res.json(mapUser(rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('user patch error', err);
    return res.status(500).json({ error: 'Error interno' });
  } finally {
    client.release();
  }
});

export default router;
