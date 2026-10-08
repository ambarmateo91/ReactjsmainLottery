'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DashboardStats } from '@/components/dashboard/StatsCards';
import { reportsApi, userApi } from '@/lib/api';
import { printReport } from '@/lib/report-print';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export function AdminReports() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>({ total_sales: 0, total_tickets: 0, total_revenue: 0, by_lottery: [], by_seller: [] });
  const [sellers, setSellers] = useState<Array<any>>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [data, sellersData] = await Promise.all([reportsApi.getSalesSummary(), userApi.getAllSellers()]);
        setSummary(data);
        setSellers(Array.isArray(sellersData) ? sellersData : []);
      } catch {
        toast({ title: 'Error', description: 'No se pudo cargar el reporte', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p>Cargando reporte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground">Resumen de ventas del sistema</p>
        </div>
        <Button type="button" onClick={() => printReport(summary)}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <DashboardStats
        totalSales={summary.total_sales || 0}
        totalTickets={summary.total_tickets || 0}
        totalRevenue={summary.total_revenue || 0}
        activeUsers={sellers.length || 0}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Por lotería</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2">Lotería</th>
                    <th className="p-2 text-right">Boletos</th>
                    <th className="p-2 text-right">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary.by_lottery || []).map((row: any) => (
                    <tr key={row.lottery_id} className="border-b">
                      <td className="p-2 font-medium">{row.lottery_name}</td>
                      <td className="p-2 text-right">{row.tickets_sold}</td>
                      <td className="p-2 text-right">RD${Number(row.revenue || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Por vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2">Vendedor</th>
                    <th className="p-2 text-right">Boletos</th>
                    <th className="p-2 text-right">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary.by_seller || []).map((row: any) => (
                    <tr key={row.seller_id} className="border-b">
                      <td className="p-2 font-medium">{row.seller_name}</td>
                      <td className="p-2 text-right">{row.tickets_sold}</td>
                      <td className="p-2 text-right">RD${Number(row.revenue || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
