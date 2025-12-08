import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Package, ShoppingCart, TrendingUp, DollarSign, Plus, Loader2, ArrowRight } from 'lucide-react';

interface DSRDashboardProps {
  onNavigate: (tab: string) => void;
}

export default function DSRDashboard({ onNavigate }: DSRDashboardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dsrId, setDsrId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    myStock: 0,
    totalSales: 0,
    approvedSales: 0,
    totalCommission: 0,
    pendingCommission: 0,
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchDSRData();
    }
  }, [user]);

  async function fetchDSRData() {
    if (!user) return;

    try {
      // Get profile data for the current user
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, team_id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) {
        setLoading(false);
        return;
      }

      setDsrId(profileData.id);

      // Count inventory assigned to this user with status 'in_hand'
      const { count: stockCount } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to_user_id', user.id)
        .eq('status', 'in_hand');

      // Get sales made by this user
      const { data: sales, count: salesCount } = await supabase
        .from('sales')
        .select('*', { count: 'exact' })
        .eq('sold_by_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Count paid sales as "approved"
      const { count: approvedCount } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .eq('sold_by_user_id', user.id)
        .eq('is_paid', true);

      // Since commissions table doesn't exist, set commission values to 0
      const totalCommission = 0;
      const pendingCommission = 0;

      setMetrics({
        myStock: stockCount || 0,
        totalSales: salesCount || 0,
        approvedSales: approvedCount || 0,
        totalCommission,
        pendingCommission,
      });
      setRecentSales(sales || []);
    } catch (error) {
      console.error('Error fetching DSR data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
          <p className="text-muted-foreground">Track your sales and commissions</p>
        </div>
        <Button onClick={() => onNavigate('add-sale')} className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Sale
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <CardTitle>My Stock</CardTitle>
            <div className="text-2xl">{metrics.myStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <CardTitle>Total Sales</CardTitle>
            <div className="text-2xl">{metrics.totalSales}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <CardTitle>Approved Sales</CardTitle>
            <div className="text-2xl">{metrics.approvedSales}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <CardTitle>Total Commission</CardTitle>
            <div className="text-2xl">TZS {metrics.totalCommission.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Recent Sales
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('my-sales')}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {recentSales.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No sales recorded yet</p>
              <Button className="mt-4" onClick={() => onNavigate('add-sale')}>
                Add Your First Sale
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                  <div>
                    <p className="font-medium text-foreground">{sale.sale_id}</p>
                    <p className="text-sm text-muted-foreground">Sold: {new Date(sale.sold_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={sale.is_paid ? 'default' : 'outline'} className={sale.is_paid ? 'bg-success/10 text-success' : ''}>
                      {sale.is_paid ? 'Paid' : 'Unpaid'}
                    </Badge>
                    <Badge variant="outline">{sale.has_package ? 'With Package' : 'No Package'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
