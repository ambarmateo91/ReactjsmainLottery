export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Credenciales inválidas',
  EMAIL_NOT_CONFIRMED: 'Email no confirmado',
  USER_NOT_FOUND: 'Usuario no encontrado',
  WEAK_PASSWORD: 'Contraseña muy débil',
  EMAIL_ALREADY_EXISTS: 'El email ya está registrado',
  NETWORK_ERROR: 'Error de conexión',
  SESSION_EXPIRED: 'Sesión expirada',
  UNAUTHORIZED: 'No autorizado',
} as const;

export const AUTH_MESSAGES = {
  LOGIN_SUCCESS: 'Inicio de sesión exitoso',
  LOGOUT_SUCCESS: 'Sesión cerrada correctamente',
  REGISTER_SUCCESS: 'Registro exitoso',
  PASSWORD_RESET_SENT: 'Email de recuperación enviado',
  PROFILE_UPDATED: 'Perfil actualizado',
} as const;

export const SESSION_STORAGE_KEYS = {
  USER: 'lottery_user',
  SESSION: 'lottery_session',
} as const;