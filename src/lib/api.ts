import { pgRequest } from '../config/database';
import type { Lottery, Ticket, LotteryResult, PrizeConfiguration, UserProfile, LotterySchedule, SalesSummary, SalesByUser } from '../types/lottery';

const TABLES = {
  lotteries: 'lotteries',
  tickets: 'tickets',
  lottery_results: 'lottery_results',
  prize_configurations: 'prize_configurations',
  user_profiles: 'user_profiles',
  lottery_schedules: 'lottery_schedules',
};

export const lotteryApi = {
  async getAll(): Promise<Lottery[]> {
    const data = await pgRequest<any[]>(`${TABLES.lotteries}?order=created_at.desc`);
    return data;
  },

  async getById(id: string): Promise<Lottery | null> {
    const data = await pgRequest<any[]>(`${TABLES.lotteries}?id=eq.${id}&limit=1`);
    return data[0] || null;
  },

  async create(lottery: Omit<Lottery, 'id' | 'created_at' | 'updated_at'>): Promise<Lottery> {
    const data = await pgRequest<any[]>(TABLES.lotteries, {
      method: 'POST',
      body: JSON.stringify(lottery),
    });
    return data[0];
  },

  async update(id: string, updates: Partial<Lottery>): Promise<Lottery> {
    const data = await pgRequest<any[]>(`${TABLES.lotteries}?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
    });
    return data[0];
  },

  async delete(id: string): Promise<void> {
    await pgRequest(`${TABLES.lotteries}?id=eq.${id}`, { method: 'DELETE' });
  },
};

export const ticketApi = {
  async getByLottery(lotteryId: string): Promise<Ticket[]> {
    const data = await pgRequest<any[]>(`${TABLES.tickets}?lottery_id=eq.${lotteryId}&order=sold_at.desc`);
    return data;
  },

  async sell(ticket: Omit<Ticket, 'id' | 'sold_at'>): Promise<Ticket> {
    const data = await pgRequest<any[]>(TABLES.tickets, {
      method: 'POST',
      body: JSON.stringify({ ...ticket, sold_at: new Date().toISOString() }),
    });
    return data[0];
  },

  async cancel(id: string): Promise<Ticket> {
    const data = await pgRequest<any[]>(`${TABLES.tickets}?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled', cancelled_at: new Date().toISOString() }),
    });
    return data[0];
  },

  async verify(ticketNumber: string): Promise<Ticket | null> {
    const data = await pgRequest<any[]>(`${TABLES.tickets}?ticket_number=eq.${ticketNumber}&limit=1`);
    return data[0] || null;
  },

  async getById(id: string): Promise<Ticket | null> {
    const data = await pgRequest<any[]>(`${TABLES.tickets}?id=eq.${id}&limit=1`);
    return data[0] || null;
  },

  async update(id: string, updates: Partial<Ticket>): Promise<Ticket> {
    const data = await pgRequest<any[]>(`${TABLES.tickets}?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return data[0];
  },
};

export const resultApi = {
  async getByLottery(lotteryId: string): Promise<LotteryResult[]> {
    const data = await pgRequest<any[]>(`${TABLES.lottery_results}?lottery_id=eq.${lotteryId}&order=draw_date.desc`);
    return data;
  },

  async create(result: Omit<LotteryResult, 'id' | 'created_at'>): Promise<LotteryResult> {
    const data = await pgRequest<any[]>(TABLES.lottery_results, {
      method: 'POST',
      body: JSON.stringify(result),
    });
    return data[0];
  },
};

export const prizeApi = {
  async getByLottery(lotteryId: string): Promise<PrizeConfiguration[]> {
    const data = await pgRequest<any[]>(`${TABLES.prize_configurations}?lottery_id=eq.${lotteryId}&is_active=eq.true`);
    return data;
  },

  async create(prize: Omit<PrizeConfiguration, 'id' | 'created_at'>): Promise<PrizeConfiguration> {
    const data = await pgRequest<any[]>(TABLES.prize_configurations, {
      method: 'POST',
      body: JSON.stringify(prize),
    });
    return data[0];
  },
};

export const userApi = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    const data = await pgRequest<any[]>(`${TABLES.user_profiles}?id=eq.${userId}&limit=1`);
    return data[0] || null;
  },

  async getAllSellers(): Promise<UserProfile[]> {
    const data = await pgRequest<any[]>(`${TABLES.user_profiles}?role=in.(seller,admin)&is_active=eq.true`);
    return data;
  },
};

export const scheduleApi = {
  async getByLottery(lotteryId: string): Promise<LotterySchedule[]> {
    const data = await pgRequest<any[]>(`${TABLES.lottery_schedules}?lottery_id=eq.${lotteryId}&is_active=eq.true`);
    return data;
  },

  async create(schedule: Omit<LotterySchedule, 'id' | 'created_at'>): Promise<LotterySchedule> {
    const data = await pgRequest<any[]>(TABLES.lottery_schedules, {
      method: 'POST',
      body: JSON.stringify(schedule),
    });
    return data[0];
  },
};

export const reportsApi = {
  async getSalesSummary(): Promise<SalesSummary> {
    const data = await pgRequest<any>(`rpc/get_sales_summary`);
    return data || { total_sales: 0, total_tickets: 0, total_revenue: 0, by_lottery: [], by_seller: [] };
  },

  async getSalesByUser(): Promise<SalesByUser[]> {
    const data = await pgRequest<any[]>(`rpc/get_sales_by_user`);
    return data || [];
  },
};

export async function validateTicketSale(lotteryId: string, quantity: number): Promise<{ valid: boolean; error?: string }> {
  const lottery = await lotteryApi.getById(lotteryId);

  if (!lottery) return { valid: false, error: 'Lotería no encontrada' };
  if (lottery.status !== 'active') return { valid: false, error: 'Lotería no está activa' };
  if (lottery.sold_tickets + quantity > lottery.max_tickets) {
    return { valid: false, error: `Solo quedan ${lottery.max_tickets - lottery.sold_tickets} boletos disponibles` };
  }

  return { valid: true };
}