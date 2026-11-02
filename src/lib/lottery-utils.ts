import { lotteryApi, prizeApi } from '../lib/api';
import type { Lottery } from '../types/lottery';

/** Loterías disponibles para vender: solo activas. */
export async function getActiveLotteries(): Promise<Lottery[]> {
  const all = await lotteryApi.getAll();
  if (!Array.isArray(all)) return [];
  return all.filter((lottery) => lottery.status === 'active');
}

export async function getLotteryWithDetails(lotteryId: string) {
  const [lottery, schedules, prizes] = await Promise.all([
    lotteryApi.getById(lotteryId),
    Promise.resolve([]),
    prizeApi.getByLottery(lotteryId),
  ]);

  return {
    lottery,
    schedules: schedules || [],
    prizes: prizes || [],
  };
}

export async function getNextDrawDate(_lotteryId: string): Promise<Date | null> {
  return null;
}

export async function validateTicketSale(lotteryId: string, quantity: number): Promise<{ valid: boolean; error?: string }> {
  try {
    const lottery = await lotteryApi.getById(lotteryId);

    if (!lottery) return { valid: false, error: 'Lotería no encontrada' };
    if (lottery.status !== 'active') return { valid: false, error: 'Lotería no está activa' };
    if (lottery.is_closed) {
      return {
        valid: false,
        error: `Ventas cerradas para esta lotería. Hora de cierre: ${lottery.closing_time || ''}`.trim(),
      };
    }
    if (lottery.max_tickets > 0 && lottery.sold_tickets + quantity > lottery.max_tickets) {
      return { valid: false, error: `Solo quedan ${lottery.max_tickets - lottery.sold_tickets} boletos disponibles` };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Error al validar la lotería' };
  }
}

export function calculateCommission(amount: number, rate: number = 0.1): number {
  return Math.round(amount * rate * 100) / 100;
}
