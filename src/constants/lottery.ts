export const LOTTERY_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  COMPLETED: 'completed',
} as const;

export const TICKET_STATUS = {
  SOLD: 'sold',
  CANCELLED: 'cancelled',
  PENDING: 'pending',
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  SELLER: 'seller',
  VIEWER: 'viewer',
} as const;

export const PRIZE_TYPES = {
  GRAND: 'grand',
  SECOND: 'second',
  THIRD: 'third',
  CONSOLATION: 'consolation',
} as const;

export const DAYS_OF_WEEK = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const;

export const CURRENCY_FORMAT = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});

export const DATE_FORMAT = new Intl.DateTimeFormat('es-ES', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const DATETIME_FORMAT = new Intl.DateTimeFormat('es-ES', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});