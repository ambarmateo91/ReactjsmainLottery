import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || '12h';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export function mapRole(dbRole) {
  if (dbRole === 'admin_user' || dbRole === 'admin') return 'admin';
  if (dbRole === 'seller_user' || dbRole === 'banca_user' || dbRole === 'seller') return 'seller';
  return 'viewer';
}

export function toAuthUser(row) {
  if (!row) return null;
  const role = mapRole(row.role);
  return {
    id: String(row.id),
    username: row.username,
    email: row.email,
    full_name: row.full_name,
    role,
    user_metadata: {
      role,
      full_name: row.full_name,
    },
  };
}

export async function verifyPassword(plain, stored) {
  if (!stored) return false;
  if (/^\$2[aby]\$/.test(stored)) {
    try {
      return await bcrypt.compare(plain, stored);
    } catch {
      return false;
    }
  }
  return plain === stored;
}

export function signSession(user) {
  const secret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET || secret;
  const access_token = jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: ACCESS_EXPIRES });
  const refresh_token = jwt.sign({ sub: user.id, type: 'refresh' }, refreshSecret, { expiresIn: REFRESH_EXPIRES });
  return {
    access_token,
    refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + 12 * 3600,
  };
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
