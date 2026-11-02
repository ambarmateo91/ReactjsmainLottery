const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_NUMBERS = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/** Hora actual en República Dominicana (America/Santo_Domingo). */
export function getDrNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santo_Domingo',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return {
    day: get('weekday').toLowerCase(),
    dayIndex: DAY_NAMES.indexOf(get('weekday').toLowerCase()),
    time: `${hour.padStart(2, '0')}:${get('minute').padStart(2, '0')}`,
    date: new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santo_Domingo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date),
  };
}

/** Normaliza un TIME de PostgreSQL (puede venir "18:00:00") a "HH:MM". */
export function toTimeString(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function scheduleMatchesDay(dayOfWeek, now) {
  if (dayOfWeek == null || dayOfWeek === '' || dayOfWeek === 'daily') return true;
  const value = String(dayOfWeek).trim().toLowerCase();
  if (/^\d+$/.test(value)) {
    const number = Number(value);
    return number === 7 || number === now.dayIndex;
  }
  return value === now.day;
}

/**
 * Indica si una lotería ya cerró sus ventas.
 * Cierra cuando el día coincide con su horario y la hora actual es igual o posterior.
 */
export function getScheduleState(schedule, date = new Date()) {
  const now = getDrNow(date);
  const closingTime = toTimeString(schedule?.draw_time);
  if (!closingTime) return { closed: false, closing_time: null, now };
  const dayMatches = scheduleMatchesDay(schedule?.day_of_week, now);
  return {
    closed: dayMatches && now.time >= closingTime,
    closing_time: closingTime,
    now,
  };
}

/**
 * Fecha del próximo sorteo (YYYY-MM-DD) según el horario de la lotería.
 * Si ya cerró hoy, devuelve el siguiente día que corresponda.
 */
export function getNextDrawDate(schedule, date = new Date()) {
  const now = getDrNow(date);
  if (!schedule?.draw_time) return now.date;

  const closingTime = toTimeString(schedule.draw_time);
  const dayOfWeek = schedule.day_of_week;

  const matches = (dayIndex) => {
    if (dayOfWeek == null || dayOfWeek === '' || dayOfWeek === 'daily') return true;
    const value = String(dayOfWeek).trim().toLowerCase();
    if (/^\d+$/.test(value)) {
      const number = Number(value);
      return number === 7 || number === dayIndex;
    }
    return value === DAY_NAMES[dayIndex];
  };

  // Sorteo de hoy todavía abierto
  if (matches(now.dayIndex) && (!closingTime || now.time < closingTime)) {
    return now.date;
  }

  // Buscar el próximo día que coincida (máximo 7 días)
  const base = new Date(`${now.date}T12:00:00-04:00`);
  for (let offset = 1; offset <= 7; offset++) {
    const candidate = new Date(base.getTime() + offset * 24 * 60 * 60 * 1000);
    const candidateDay = candidate.getUTCDay();
    if (matches(candidateDay)) {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Santo_Domingo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(candidate);
    }
  }

  return now.date;
}

export { DAY_NAMES, DAY_NUMBERS };
