import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, Loader2, CheckCircle, Clock } from 'lucide-react';

interface Commission {
  id: string;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  sale_id: string;
}

export default function DSRCommission() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [totals, setTotals] = useState({ total: 0, paid: 0, pending: 0 });

  useEffect(() => { if (user) { fetchCommissions(); } }, [user]);

  async function fetchCommissions() {
    if (!user) return;
    try {
      const { data: dsrData } = await supabase
        .from('dsrs')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (!dsrData) { setLoading(false); return; }
      const { data: commissionsData } = await supabase
        .from('commissions')
        .select(`id, amount, is_paid, paid_at, created_at, sales!inner(sale_id)`) // requires FK
        .eq('dsr_id', dsrData.id)
        .order('created_at', { ascending: false });
      const processed = (commissionsData || []).map((c: any) => ({ ...c, sale_id: c.sales?.sale_id || 'N/A' }));
      const total = processed.reduce((sum: number, c: any) => sum + Number(c.amount), 0);
      const paid = processed.filter((c: any) => c.is_paid).reduce((sum: number, c: any) => sum + Number(c.amount), 0);
      const pending = total - paid;
      setCommissions(processed);
      setTotals({ total, paid, pending });
    } catch (error) {
      console.error('Error fetching commissions:', error);
    } finally { setLoading(false); }
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Commission</h1>
        <p className="text-muted-foreground">Track your earnings from sales</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <CardTitle>Total Earned</CardTitle>
            <div className="text-2xl">TZS {totals.total.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <CardTitle>Paid Out</CardTitle>
            <div className="text-2xl">TZS {totals.paid.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <CardTitle>Pending</CardTitle>
            <div className="text-2xl">TZS {totals.pending.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Commission History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground">No Commissions Yet</p>
              <p className="text-muted-foreground">Commissions are earned when your sales are approved</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Sale ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell className="font-medium">{commission.sale_id}</TableCell>
                      <TableCell>TZS {Number(commission.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={commission.is_paid ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                          {commission.is_paid ? 'Paid' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(commission.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
