'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { DashboardStats } from '../components/dashboard/StatsCards';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { lotteryApi, reportsApi, userApi } from '../../lib/supabase';
import { getActiveLotteries } from '../../lib/lottery-utils';
import { formatCurrency } from '../../lib/utils';
import { Loader2, Ticket, TrendingUp, Users, DollarSign, BarChart3 } from 'lucide-react';

export function Dashboard() {
  const { isAdmin, isSeller } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalTickets: 0,
    totalRevenue: 0,
    activeUsers: 0,
  });
  const [recentLotteries, setRecentLotteries] = useState<Array<{ id: string; name: string; sold_tickets: number; max_tickets: number; draw_date: string }>>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [lotteries, salesSummary, sellers] = await Promise.all([
          getActiveLotteries(),
          isAdmin ? reportsApi.getSalesSummary() : Promise.resolve({ total_sales: 0, total_tickets: 0, total_revenue: 0, by_lottery: [], by_seller: [] }),
          isAdmin ? userApi.getAllSellers() : Promise.resolve([]),
        ]);

        setRecentLotteries(lotteries.slice(0, 5));

        if (isAdmin) {
          setStats({
            totalSales: salesSummary.total_sales,
            totalTickets: salesSummary.total_tickets,
            totalRevenue: salesSummary.total_revenue,
            activeUsers: sellers.length,
          });
        } else {
          setStats({
            totalSales: 0,
            totalTickets: 0,
            totalRevenue: 0,
            activeUsers: 0,
          });
        }
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Resumen del sistema de lotería</p>
        </div>
      </div>

      <DashboardStats
        totalSales={stats.totalSales}
        totalTickets={stats.totalTickets}
        totalRevenue={stats.totalRevenue}
        activeUsers={stats.activeUsers}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-1 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Loterías Activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentLotteries.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No hay loterías activas</p>
                ) : (
                  recentLotteries.map((lottery) => (
                    <div key={lottery.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{lottery.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Sorteo: {new Date(lottery.draw_date).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {lottery.sold_tickets} / {lottery.max_tickets}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {Math.round((lottery.sold_tickets / lottery.max_tickets) * 100)}%
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Acciones Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <a href="/sell" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <span className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-primary">💳</span>
                  </span>
                  <div>
                    <p className="font-medium">Vender Boletos</p>
                    <p className="text-sm text-muted-foreground">Vender nuevos boletos</p>
                  </div>
                </a>
                <a href="/verify" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <span className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                    <span className="text-green-600">🔍</span>
                  </span>
                  <div>
                    <p className="font-medium">Verificar Premio</p>
                    <p className="text-sm text-muted-foreground">Comprobar boletos ganadores</p>
                  </div>
                </a>
                <a href="/print" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <span className="w-10 h-10 rounded-lg bg-blue/10 flex items-center justify-center">
                    <span className="text-blue-600">🖨️</span>
                  </span>
                  <div>
                    <p className="font-medium">Imprimir Ticket</p>
                    <p className="text-sm text-muted-foreground">Generar tickets para clientes</p>
                  </div>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}