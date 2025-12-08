import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Package, Loader2, ArrowLeft, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

interface DSRAddSaleProps {
  onNavigate: (tab: string) => void;
}

interface StockOption {
  id: string;
  batch_number: string;
  smartcard: string | null;
  serial_number: string | null;
  stock_type: string;
}

const STOCK_PRICES: Record<string, number> = {
  'full_set': 65000,
  'decoder_only': 25000,
  'virtual': 27500,
};

export default function DSRAddSale({ onNavigate }: DSRAddSaleProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [availableStock, setAvailableStock] = useState<StockOption[]>([]);
  const [selectedStockId, setSelectedStockId] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [hasPackage, setHasPackage] = useState(false);
  const [isPaid, setIsPaid] = useState(true);

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
      if (!profileData) { setLoading(false); return; }
      setProfileId(profileData.id);
      setTeamId(profileData.team_id);
      
      // Get inventory assigned to this user (status = 'in_hand')
      const { data: stockData } = await supabase
        .from('inventory')
        .select('id, batch_number, smartcard, serial_number, stock_type')
        .eq('assigned_to_user_id', user.id)
        .eq('status', 'in_hand');
      setAvailableStock((stockData || []) as StockOption[]);
    } catch (error) {
      console.error('Error fetching DSR data:', error);
    } finally { setLoading(false); }
  }

  const handleStockSelect = (stockId: string) => {
    setSelectedStockId(stockId);
  };

  const getSelectedStockType = () => {
    const selected = availableStock.find(s => s.id === selectedStockId);
    return selected?.stock_type || 'full_set';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('User not authenticated'); return; }
    if (!selectedStockId) { toast.error('Please select a stock item'); return; }
    setSubmitting(true);
    try {
      // Generate a unique sale_id
      const saleId = `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const { error: saleError } = await supabase
        .from('sales')
        .insert({
          sale_id: saleId,
          inventory_id: selectedStockId,
          sold_by_user_id: user.id,
          customer_phone: customerPhone || null,
          has_package: hasPackage,
          is_paid: isPaid,
        });
      if (saleError) throw saleError;
      
      // Update inventory status to 'sold'
      await supabase
        .from('inventory')
        .update({ status: 'sold' })
        .eq('id', selectedStockId);
      
      toast.success('Sale recorded successfully!');
      onNavigate('my-sales');
    } catch (error: any) {
      console.error('Error creating sale:', error);
      toast.error(error.message || 'Failed to record sale');
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add New Sale</h1>
          <p className="text-muted-foreground">Record a new sale transaction</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Select Stock Item</CardTitle>
          </CardHeader>
          <CardContent>
            {availableStock.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No stock available. Contact your TL for stock assignment.</p>
            ) : (
              <Select value={selectedStockId} onValueChange={handleStockSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stock item" />
                </SelectTrigger>
                <SelectContent>
                  {availableStock.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.batch_number} • {s.stock_type === 'full_set' ? 'Full Set' : 'Decoder Only'} • SC: {s.smartcard || '-'} • SN: {s.serial_number || '-'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Sale Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Customer Phone (Optional)</Label>
              <Input id="phone" placeholder="Enter customer phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Has Package?</Label>
              <RadioGroup value={hasPackage ? 'yes' : 'no'} onValueChange={(v) => setHasPackage(v === 'yes')} className="flex gap-4">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="yes" />
                  <span>Yes</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="no" />
                  <span>No</span>
                </Label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Payment Status</Label>
              <RadioGroup value={isPaid ? 'paid' : 'unpaid'} onValueChange={(v) => setIsPaid(v === 'paid')} className="flex gap-4">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="paid" />
                  <span>Paid</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="unpaid" />
                  <span>Unpaid</span>
                </Label>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Sale Price:</span>
              <span className="text-2xl font-bold text-primary">TZS {(STOCK_PRICES[getSelectedStockType()] || 0).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full gap-2" size="lg" disabled={submitting || !selectedStockId}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Recording Sale...
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              Record Sale
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
