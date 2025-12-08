
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DSRCommission {
  id: string;
  full_name: string;
  total_sales: number;
  total_commission: number;
  bonus_awarded: number;
}

export default function AdminCommissionPage() {
  const [dsrCommissions, setDsrCommissions] = useState<DSRCommission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCommissions() {
      setLoading(true);
      // Fetch all DSRs
      const { data: users, error: userError } = await (supabase.from('users') as any)
        .select('id, full_name')
        .eq('role', 'dsr');
      if (userError || !users) return setLoading(false);

      // For each DSR, fetch sales and commission summary
      const commissions: DSRCommission[] = [];
      for (const user of users as any[]) {
        // Total sales and commission
        const { data: sales } = await (supabase.from('sales') as any)
          .select('total_commission')
          .eq('user_id', user.id);
        const total_sales = sales ? sales.length : 0;
        const total_commission = sales ? sales.reduce((sum: number, s: any) => sum + (s.total_commission || 0), 0) : 0;

        // Latest monthly bonus
        const { data: perf } = await (supabase.from('monthly_performance') as any)
          .select('bonus_awarded')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        const bonus_awarded = perf && perf.length > 0 ? perf[0].bonus_awarded : 0;

        commissions.push({
          id: user.id,
          full_name: user.full_name,
          total_sales,
          total_commission,
          bonus_awarded,
        });
      }
      setDsrCommissions(commissions);
      setLoading(false);
    }
    fetchCommissions();
  }, []);

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">DSR Commission Summary</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>DSR Name</TableHead>
              <TableHead>Total Sales</TableHead>
              <TableHead>Total Commission</TableHead>
              <TableHead>Bonus Awarded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dsrCommissions.map((dsr) => (
              <TableRow key={dsr.id}>
                <TableCell>{dsr.full_name}</TableCell>
                <TableCell>{dsr.total_sales}</TableCell>
                <TableCell>
                  <Badge variant="success">{dsr.total_commission.toLocaleString()} TZS</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={dsr.bonus_awarded > 0 ? "success" : "secondary"}>{dsr.bonus_awarded.toLocaleString()} TZS</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
