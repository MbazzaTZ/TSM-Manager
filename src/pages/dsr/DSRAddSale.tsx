import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Package,
  Loader2,
  ArrowLeft,
  ShoppingCart,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';

interface DSRAddSaleProps {
  onNavigate: (tab: string) => void;
}

interface StockOption {
  id: string;
  batch_number: string;
  smartcard: string | null;
  serial_number: string | null;
  stock_type: 'full_set' | 'decoder_only' | 'dvs';
}

interface PackageInfo {
  name: string;
  price: number;
  commission: number;
}

export default function DSRAddSale({ onNavigate }: DSRAddSaleProps) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableStock, setAvailableStock] = useState<StockOption[]>([]);
  const [unpaidCount, setUnpaidCount] = useState(0);

  const [selectedStockId, setSelectedStockId] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [hasPackage, setHasPackage] = useState(false);
  const [isPaid, setIsPaid] = useState(true);

  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const [receiptOpen, setReceiptOpen] = useState(false);

  // Commission preview
  const [commissionDetails, setCommissionDetails] = useState({
    upfront: 0,
    register: 1500,
    ie: 1500,
    pkg: 0,
    total: 0,
  });

  // -------------------------------
  // LOAD DATA
  // -------------------------------
  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  async function fetchAllData() {
    setLoading(true);
    try {
      // Fetch assigned stock
      const { data: stockData } = await supabase
        .from('inventory')
        .select('id, batch_number, smartcard, serial_number, stock_type')
        .eq('assigned_to_user_id', user!.id)
        .eq('status', 'in_hand');

      setAvailableStock(stockData || []);

      // Fetch unpaid sales count
      const { data: unpaidSales } = await supabase
        .from('sales')
        .select('id')
        .eq('sold_by_user_id', user!.id)
        .eq('is_paid', false);

      setUnpaidCount(unpaidSales?.length ?? 0);

      // Fetch package list for commission display
      const { data: pkgData } = await supabase
        .from('packages')
        .select('name, price, commission');

      setPackages(Array.isArray(pkgData) ? pkgData : []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------
  // COMMISSION PREVIEW CALCULATOR
  // -------------------------------
  useEffect(() => {
    const stock = availableStock.find((s) => s.id === selectedStockId);
    if (!stock) return;

    let upfront = 0;

    if (stock.stock_type !== 'dvs') {
      // Physical
      if (stock.stock_type === 'full_set') upfront = 5000;
      if (stock.stock_type === 'decoder_only') upfront = 2000;
    }

    let pkgCommission = 0;
    if (hasPackage && selectedPackage) {
      const pkg = packages.find((p) => p.name === selectedPackage);
      pkgCommission = pkg?.commission || 0;
    }

    const register = 1500;
    const ie = 1500;

    const total = pkgCommission + register + ie;

    setCommissionDetails({
      upfront,
      register,
      ie,
      pkg: pkgCommission,
      total,
    });
  }, [selectedStockId, hasPackage, selectedPackage, packages, availableStock]);

  // -------------------------------
  // SUBMIT SALE
  // -------------------------------
  const confirmSale = async () => {
    setSubmitting(true);
    try {
      const saleId = `SALE-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
      const stock = availableStock.find((s) => s.id === selectedStockId);

      const { error: saleError } = await supabase
        .from('sales')
        .insert({
          sold_by_user_id: user!.id,
          stock_type: stock?.stock_type,
          package: selectedPackage,
          customer_phone: customerPhone || null,
          is_paid: isPaid,
        });

      if (saleError) throw saleError;

      // Update inventory
      await supabase
        .from('inventory')
        .update({ status: 'sold' })
        .eq('id', selectedStockId);

      toast.success("Sale recorded successfully!");
      onNavigate('my-sales');
    } catch (err: any) {
      toast.error(err.message || 'Failed to record sale');
    } finally {
      setSubmitting(false);
      setReceiptOpen(false);
    }
  };

  // -------------------------------
  // UI
  // -------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedStock = availableStock.find((s) => s.id === selectedStockId);

  const AMOUNT_DUE = commissionDetails.total + commissionDetails.upfront;

  const BLOCK_SUBMISSION = unpaidCount > 1;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add New Sale</h1>
          <p className="text-muted-foreground">Record a sale with receipt preview</p>
        </div>
      </div>

      {/* Unpaid Warning */}
      {BLOCK_SUBMISSION && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-400/40 text-red-600 text-sm">
          ⚠️ You have unpaid sales. Clear them before adding a new sale.
        </div>
      )}

      {/* Form */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Select Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedStockId} onValueChange={setSelectedStockId}>
            <SelectTrigger>
              <SelectValue placeholder="Select stock item" />
            </SelectTrigger>
            <SelectContent>
              {availableStock.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.batch_number} • {s.stock_type.toUpperCase()} • SC: {s.smartcard || '-'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Details */}
      {selectedStock && (
        <>
          <Card className="glass">
            <CardHeader>
              <CardTitle>Sale Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Customer Phone (optional)</Label>
                <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
              </div>
              {/* ...existing code... */}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
