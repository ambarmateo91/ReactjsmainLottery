'use client';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TrendingUp, Users, Ticket, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function StatCard({ title, value, icon, trend, trendUp, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className={`text-xs mt-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface DashboardStatsProps {
  totalSales?: number;
  totalTickets?: number;
  totalRevenue?: number;
  activeUsers?: number;
}

export function DashboardStats({ totalSales = 0, totalTickets = 0, totalRevenue = 0, activeUsers = 0 }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Ventas"
        value={totalSales}
        icon={<DollarSign className="h-4 w-4" />}
        trend="+12.5%"
        trendUp
      />
      <StatCard
        title="Boletos Vendidos"
        value={totalTickets.toLocaleString()}
        icon={<Ticket className="h-4 w-4" />}
        trend="+8.2%"
        trendUp
      />
      <StatCard
        title="Ingresos Totales"
        value={formatCurrency(totalRevenue)}
        icon={<TrendingUp className="h-4 w-4" />}
        trend="+15.3%"
        trendUp
      />
      <StatCard
        title="Vendedores Activos"
        value={activeUsers}
        icon={<Users className="h-4 w-4" />}
        trend="+2"
        trendUp
      />
    </div>
  );
}