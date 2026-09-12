import { supabase } from '../config/auth-config';
import type { Lottery, Ticket, LotterySchedule, PrizeConfiguration } from '../types/lottery';

export async function getActiveLotteries(): Promise<Lottery[]> {
  const { data, error } = await supabase
    .from('lotteries')
    .select('*')
    .eq('status', 'active')
    .order('draw_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getLotteryWithDetails(lotteryId: string) {
  const [lottery, schedules, prizes] = await Promise.all([
    supabase.from('lotteries').select('*').eq('id', lotteryId).single(),
    supabase.from('lottery_schedules').select('*').eq('lottery_id', lotteryId).eq('is_active', true),
    supabase.from('prize_configurations').select('*').eq('lottery_id', lotteryId).eq('is_active', true),
  ]);

  return {
    lottery: lottery.data,
    schedules: schedules.data || [],
    prizes: prizes.data || [],
  };
}

export async function getNextDrawDate(lotteryId: string): Promise<Date | null> {
  const { data } = await supabase
    .from('lottery_schedules')
    .select('draw_time')
    .eq('lottery_id', lotteryId)
    .eq('is_active', true)
    .order('day_of_week', { ascending: true })
    .limit(1);
  
  if (!data || data.length === 0) return null;
  
  const schedule = data[0];
  const now = new Date();
  const targetDay = schedule.day_of_week;
  const currentDay = now.getDay();
  let daysUntil = targetDay - currentDay;
  
  if (daysUntil < 0) daysUntil += 7;
  if (daysUntil === 0) {
    const [hours, minutes] = schedule.draw_time.split(':').map(Number);
    const drawTime = new Date();
    drawTime.setHours(hours, minutes, 0, 0);
    if (drawTime <= now) daysUntil = 7;
  }
  
  const nextDraw = new Date(now);
  nextDraw.setDate(now.getDate() + daysUntil);
  const [hours, minutes] = schedule.draw_time.split(':').map(Number);
  nextDraw.setHours(hours, minutes, 0, 0);
  
  return nextDraw;
}

export async function validateTicketSale(lotteryId: string, quantity: number): Promise<{ valid: boolean; error?: string }> {
  const { data: lottery } = await supabase
    .from('lotteries')
    .select('max_tickets, sold_tickets, status')
    .eq('id', lotteryId)
    .single();

  if (!lottery) return { valid: false, error: 'Lotería no encontrada' };
  if (lottery.status !== 'active') return { valid: false, error: 'Lotería no está activa' };
  if (lottery.sold_tickets + quantity > lottery.max_tickets) {
    return { valid: false, error: `Solo quedan ${lottery.max_tickets - lottery.sold_tickets} boletos disponibles` };
  }

  return { valid: true };
}

export function calculateCommission(amount: number, rate: number = 0.1): number {
  return Math.round(amount * rate * 100) / 100;
}