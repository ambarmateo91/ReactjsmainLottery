import { supabase } from '../config/auth-config';
import type { Lottery, Ticket, LotteryResult, PrizeConfiguration, UserProfile, LotterySchedule, SalesSummary, SalesByUser } from '../types/lottery';

export const lotteryApi = {
  async getAll(): Promise<Lottery[]> {
    const { data, error } = await supabase
      .from('lotteries')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Lottery | null> {
    const { data, error } = await supabase
      .from('lotteries')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(lottery: Omit<Lottery, 'id' | 'created_at' | 'updated_at'>): Promise<Lottery> {
    const { data, error } = await supabase
      .from('lotteries')
      .insert(lottery)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Lottery>): Promise<Lottery> {
    const { data, error } = await supabase
      .from('lotteries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('lotteries').delete().eq('id', id);
    if (error) throw error;
  },
};

export const ticketApi = {
  async getByLottery(lotteryId: string): Promise<Ticket[]> {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('lottery_id', lotteryId)
      .order('sold_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async sell(ticket: Omit<Ticket, 'id' | 'sold_at'>): Promise<Ticket> {
    const { data, error } = await supabase
      .from('tickets')
      .insert({ ...ticket, sold_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async cancel(id: string): Promise<Ticket> {
    const { data, error } = await supabase
      .from('tickets')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async verify(ticketNumber: string): Promise<Ticket | null> {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('ticket_number', ticketNumber)
      .single();
    if (error) return null;
    return data;
  },
};

export const resultApi = {
  async getByLottery(lotteryId: string): Promise<LotteryResult[]> {
    const { data, error } = await supabase
      .from('lottery_results')
      .select('*')
      .eq('lottery_id', lotteryId)
      .order('draw_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(result: Omit<LotteryResult, 'id' | 'created_at'>): Promise<LotteryResult> {
    const { data, error } = await supabase
      .from('lottery_results')
      .insert(result)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

export const prizeApi = {
  async getByLottery(lotteryId: string): Promise<PrizeConfiguration[]> {
    const { data, error } = await supabase
      .from('prize_configurations')
      .select('*')
      .eq('lottery_id', lotteryId)
      .eq('is_active', true);
    if (error) throw error;
    return data || [];
  },

  async create(prize: Omit<PrizeConfiguration, 'id' | 'created_at'>): Promise<PrizeConfiguration> {
    const { data, error } = await supabase
      .from('prize_configurations')
      .insert(prize)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

export const userApi = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  },

  async getAllSellers(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .in('role', ['seller', 'admin'])
      .eq('is_active', true);
    if (error) throw error;
    return data || [];
  },
};

export const scheduleApi = {
  async getByLottery(lotteryId: string): Promise<LotterySchedule[]> {
    const { data, error } = await supabase
      .from('lottery_schedules')
      .select('*')
      .eq('lottery_id', lotteryId)
      .eq('is_active', true);
    if (error) throw error;
    return data || [];
  },

  async create(schedule: Omit<LotterySchedule, 'id' | 'created_at'>): Promise<LotterySchedule> {
    const { data, error } = await supabase
      .from('lottery_schedules')
      .insert(schedule)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

export const reportsApi = {
  async getSalesSummary(): Promise<SalesSummary> {
    const { data, error } = await supabase.rpc('get_sales_summary');
    if (error) throw error;
    return data || { total_sales: 0, total_tickets: 0, total_revenue: 0, by_lottery: [], by_seller: [] };
  },

  async getSalesByUser(): Promise<SalesByUser[]> {
    const { data, error } = await supabase.rpc('get_sales_by_user');
    if (error) throw error;
    return data || [];
  },
};