import { lotteryApi, prizeApi } from '../lib/api';
import type { Lottery } from '../types/lottery';

export async function getActiveLotteries(): Promise<Lottery[]> {
  return lotteryApi.getAll();
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
  const { data: lottery } = await fetch(`/api/lotteries/${lotteryId}`).then(r => r.json()).catch(() => ({ data: null }));
  
  if (!lottery) return { valid: false, error: 'Lotería no encontrada' };
  if (lottery.status !== 'active') return { valid: false, error: 'Lotería no está activa' };
  if (lottery.soldTickets + quantity > lottery.maxTickets) {
    return { valid: false, error: `Solo quedan ${lottery.maxTickets - lottery.soldTickets} boletos disponibles` };
  }

  return { valid: true };
}

export function calculateCommission(amount: number, rate: number = 0.1): number {
  return Math.round(amount * rate * 100) / 100;
}