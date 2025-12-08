import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Package, Search, Loader2, ArrowLeft } from 'lucide-react';

interface DSRStockProps {
  onNavigate: (tab: string) => void;
}

interface StockItem {
  id: string;
  batch_number: string;
  smartcard: string;
  serial_number: string;
  stock_type: 'full_set' | 'decoder_only';
  status: 'in_store' | 'in_hand' | 'sold';
  assigned_to_user_id: string | null;
  updated_at: string;
}

export default function DSRStock({ onNavigate }: DSRStockProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchStock();
    }
  }, [user]);

  async function fetchStock() {
    if (!user) return;

    try {
      // Get profile data for the current user
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) {
        setLoading(false);
        return;
      }

      const { data: stockData } = await supabase
        .from('inventory')
        .select('*')
        .eq('assigned_to_user_id', user.id)
        .eq('status', 'in_hand')
        .order('updated_at', { ascending: false });

      setStock((stockData || []) as StockItem[]);
    } catch (error) {
      console.error('Error fetching stock:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredStock = stock.filter(item =>
    item.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.smartcard?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'full_set':
        return 'bg-primary/10 text-primary';
      case 'decoder_only':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Stock</h1>
          <p className="text-muted-foreground">Stock assigned to you for sales</p>
        </div>
      </div>

      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Available Stock ({filteredStock.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stock..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStock.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground">No Stock Available</p>
              <p className="text-muted-foreground">Contact your Team Leader to get stock assigned</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Batch</TableHead>
                    <TableHead>Smartcard</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStock.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.batch_number}</TableCell>
                      <TableCell>{item.smartcard || '-'}</TableCell>
                      <TableCell>{item.serial_number || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(item.stock_type)}>{item.stock_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.updated_at 
                          ? new Date(item.updated_at).toLocaleDateString()
                          : '-'}
                      </TableCell>
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
