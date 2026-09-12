export interface Lottery {
  id: string;
  name: string;
  description: string;
  price: number;
  max_tickets: number;
  sold_tickets: number;
  status: 'active' | 'inactive' | 'completed';
  draw_date: string;
  created_at: string;
  updated_at: string;
}

export interface LotterySchedule {
  id: string;
  lottery_id: string;
  day_of_week: number;
  draw_time: string;
  is_active: boolean;
  created_at: string;
}

export interface PrizeConfiguration {
  id: string;
  lottery_id: string;
  prize_type: string;
  prize_name: string;
  prize_value: number;
  quantity: number;
  winning_condition: string;
  is_active: boolean;
  created_at: string;
}

export interface LotteryResult {
  id: string;
  lottery_id: string;
  draw_date: string;
  winning_numbers: string[];
  prize_breakdown: PrizeBreakdown[];
  created_at: string;
}

export interface PrizeBreakdown {
  prize_type: string;
  winners: number;
  amount_per_winner: number;
}

export interface Ticket {
  id: string;
  lottery_id: string;
  ticket_number: string;
  customer_name?: string;
  customer_phone?: string;
  seller_id: string;
  seller_name: string;
  status: 'sold' | 'cancelled' | 'pending';
  sold_at: string;
  cancelled_at?: string;
  prize_won?: number;
  prize_type?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'seller' | 'viewer';
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface SalesSummary {
  total_sales: number;
  total_tickets: number;
  total_revenue: number;
  by_lottery: LotterySales[];
  by_seller: SellerSales[];
}

export interface LotterySales {
  lottery_id: string;
  lottery_name: string;
  tickets_sold: number;
  revenue: number;
}

export interface SellerSales {
  seller_id: string;
  seller_name: string;
  tickets_sold: number;
  revenue: number;
}

export interface SalesByUser {
  id: string;
  seller_name: string;
  total_tickets: number;
  total_revenue: number;
  lotteries: {
    lottery_name: string;
    tickets: number;
    revenue: number;
  }[];
}