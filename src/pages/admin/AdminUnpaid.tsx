import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnpaidSales, useMarkAsPaid, useSales } from "@/hooks/useSales";
import { useInventory, InventoryItem } from "@/hooks/useInventory";
import { useTeams, useRegions } from "@/hooks/useTeams";
import { useUsers } from "@/hooks/useUsers";
import MetricCard from "@/components/MetricCard";
import StockDetailsModal from "@/components/StockDetailsModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Check,
  Phone,
  Search,
  Download,
  Loader2,
  Package,
  DollarSign,
  Users,
  Clock,
  Calendar,
  Eye,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

const STOCK_PRICES = { full_set: 65000, decoder_only: 25000 };
const NO_FILTER = "all";

const AdminUnpaid = () => {
  const { t } = useLanguage();
  const { data: sales, isLoading } = useUnpaidSales();
  const { data: allSales } = useSales();
  const { data: inventory } = useInventory();
  const { data: teams } = useTeams();
  const { data: regions } = useRegions();
  const { data: users } = useUsers();
  const markAsPaid = useMarkAsPaid();

  // Stock details modal
  const [selectedStock, setSelectedStock] = useState<InventoryItem | null>(null);
  const [stockModalOpen, setStockModalOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStockType, setFilterStockType] = useState<string>(NO_FILTER);
  const [filterRegion, setFilterRegion] = useState<string>(NO_FILTER);
  const [filterTeam, setFilterTeam] = useState<string>(NO_FILTER);

  // Bulk selection
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Compute summary stats
  const summary = useMemo(() => {
    if (!sales) {
      return {
        totalUnpaid: 0,
        unpaidFS: 0,
        unpaidDO: 0,
        totalAmount: 0,
        teamsWithUnpaid: 0,
        usersWithUnpaid: 0,
      };
    }

    const unpaidFS = sales.filter(
      (s) => s.inventory?.stock_type === "full_set"
    ).length;
    const unpaidDO = sales.filter(
      (s) => s.inventory?.stock_type === "decoder_only"
    ).length;
    const totalAmount = sales.reduce((sum, sale) => {
      const price =
        sale.inventory?.stock_type === "full_set"
          ? STOCK_PRICES.full_set
          : STOCK_PRICES.decoder_only;
      return sum + price;
    }, 0);

    const uniqueUsers = new Set(sales.map((s) => s.sold_by_user_id));
    const uniqueTeams = new Set<string>();
    sales.forEach((s) => {
      const profile = users?.find((u) => u.user_id === s.sold_by_user_id);
      if (profile?.team_id) uniqueTeams.add(profile.team_id);
    });

    return {
      totalUnpaid: sales.length,
      unpaidFS,
      unpaidDO,
      totalAmount,
      teamsWithUnpaid: uniqueTeams.size,
      usersWithUnpaid: uniqueUsers.size,
    };
  }, [sales, users]);

  // Filter logic
  const filteredSales = useMemo(() => {
    if (!sales) return [];

    return sales
      .map((sale) => ({
        ...sale,
        daysUnpaid: differenceInDays(new Date(), new Date(sale.sold_at)),
      }))
      .filter((sale) => {
        const matchesSearch =
          !searchQuery ||
          sale.sale_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sale.inventory?.smartcard
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          sale.inventory?.serial_number
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          sale.customer_phone?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStockType =
          filterStockType === NO_FILTER ||
          sale.inventory?.stock_type === filterStockType;

        // For region/team filtering we'd need more data; simplified here
        return matchesSearch && matchesStockType;
      })
      .sort((a, b) => b.daysUnpaid - a.daysUnpaid); // Sort by days unpaid descending
  }, [sales, searchQuery, filterStockType]);

  const toggleSelect = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredSales.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredSales.map((s) => s.id));
    }
  };

  const handleBulkMarkPaid = async () => {
    if (selectedItems.length === 0) return;
    if (
      !confirm(
        `Mark ${selectedItems.length} sale(s) as paid? This action cannot be undone.`
      )
    )
      return;

    setBulkProcessing(true);
    try {
      for (const saleId of selectedItems) {
        await markAsPaid.mutateAsync(saleId);
      }
      setSelectedItems([]);
    } catch (error) {
      // toast handled by hook
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleExport = () => {
    const csv = [
      ["Sale ID", "Smartcard", "Serial", "Type", "Customer Phone", "Date", "Amount (TZS)"],
      ...filteredSales.map((sale) => [
        sale.sale_id,
        sale.inventory?.smartcard || "-",
        sale.inventory?.serial_number || "-",
        sale.inventory?.stock_type || "-",
        sale.customer_phone || "-",
        format(new Date(sale.sold_at), "yyyy-MM-dd HH:mm"),
        sale.inventory?.stock_type === "full_set"
          ? STOCK_PRICES.full_set.toString()
          : STOCK_PRICES.decoder_only.toString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unpaid-sales-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => `TZS ${amount.toLocaleString()}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            {t("admin.unpaidRecovery")}
          </h1>
          <p className="text-muted-foreground text-sm">
            Track and recover unpaid sales from field teams
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filteredSales.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Total Unpaid"
          value={summary.totalUnpaid}
          icon={AlertTriangle}
          variant="danger"
        />
        <MetricCard
          title="Unpaid FS"
          value={summary.unpaidFS}
          icon={Package}
          variant="warning"
        />
        <MetricCard
          title="Unpaid DO"
          value={summary.unpaidDO}
          icon={Package}
          variant="info"
        />
        <MetricCard
          title="Amount Due"
          value={formatCurrency(summary.totalAmount)}
          icon={DollarSign}
          variant="danger"
        />
        <MetricCard
          title="Teams Affected"
          value={summary.teamsWithUnpaid}
          icon={Users}
          variant="warning"
        />
        <MetricCard
          title="Users Affected"
          value={summary.usersWithUnpaid}
          icon={Users}
          variant="info"
        />
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 border border-border/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sale ID, Smartcard, Serial..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Stock Type</Label>
            <Select value={filterStockType} onValueChange={setFilterStockType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FILTER}>All Types</SelectItem>
                <SelectItem value="full_set">Full Set</SelectItem>
                <SelectItem value="decoder_only">Decoder Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Region</Label>
            <Select value={filterRegion} onValueChange={setFilterRegion}>
              <SelectTrigger>
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FILTER}>All Regions</SelectItem>
                {regions?.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Team</Label>
            <Select value={filterTeam} onValueChange={setFilterTeam}>
              <SelectTrigger>
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FILTER}>All Teams</SelectItem>
                {teams?.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedItems.length > 0 && (
        <div className="glass rounded-xl p-4 border border-primary/50 flex items-center justify-between">
          <p className="text-sm text-foreground">
            <span className="font-bold">{selectedItems.length}</span> item(s) selected
          </p>
          <Button
            onClick={handleBulkMarkPaid}
            disabled={bulkProcessing}
            className="gap-2"
          >
            {bulkProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Mark Selected as Paid
          </Button>
        </div>
      )}

      {/* Sales List */}
      <div className="glass rounded-xl border border-border/50 overflow-hidden">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={
                filteredSales.length > 0 &&
                selectedItems.length === filteredSales.length
              }
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {filteredSales.length} unpaid sale(s)
            </span>
          </div>
        </div>

        {filteredSales.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-success" />
            </div>
            <p className="text-lg font-semibold text-success">
              Mauzo yote yamelipwa! 🎉
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              No unpaid sales found matching your filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filteredSales.map((sale) => (
              <div
                key={sale.id}
                className={cn(
                  "p-4 hover:bg-secondary/30 transition-colors",
                  selectedItems.includes(sale.id) && "bg-primary/5"
                )}
              >
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedItems.includes(sale.id)}
                    onCheckedChange={() => toggleSelect(sale.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="font-mono text-lg font-bold text-foreground cursor-pointer hover:text-primary transition-colors underline decoration-dotted"
                        onClick={() => {
                          const item = inventory?.find((i) => i.id === sale.inventory_id);
                          if (item) {
                            setSelectedStock(item);
                            setStockModalOpen(true);
                          }
                        }}
                      >
                        {sale.inventory?.smartcard || "-"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          const item = inventory?.find((i) => i.id === sale.inventory_id);
                          if (item) {
                            setSelectedStock(item);
                            setStockModalOpen(true);
                          }
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Badge variant="unpaid">{t("status.unpaid")}</Badge>
                      <Badge
                        variant={
                          sale.inventory?.stock_type === "full_set"
                            ? "info"
                            : "secondary"
                        }
                      >
                        {sale.inventory?.stock_type === "full_set"
                          ? "FS"
                          : "DO"}
                      </Badge>
                      {/* Days Unpaid Badge */}
                      <Badge
                        className={cn(
                          "flex items-center gap-1",
                          sale.daysUnpaid >= 30
                            ? "bg-destructive text-destructive-foreground"
                            : sale.daysUnpaid >= 14
                            ? "bg-warning text-warning-foreground"
                            : "bg-info text-info-foreground"
                        )}
                      >
                        <Calendar className="h-3 w-3" />
                        {sale.daysUnpaid} {sale.daysUnpaid === 1 ? "day" : "days"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>Sale ID: {sale.sale_id}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(sale.sold_at), "dd MMM yyyy HH:mm")}
                      </span>
                      {sale.customer_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {sale.customer_phone}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Serial: {sale.inventory?.serial_number || "-"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-destructive">
                      {formatCurrency(
                        sale.inventory?.stock_type === "full_set"
                          ? STOCK_PRICES.full_set
                          : STOCK_PRICES.decoder_only
                      )}
                    </p>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => markAsPaid.mutate(sale.id)}
                      disabled={markAsPaid.isPending}
                      className="mt-2 gap-2"
                    >
                      {markAsPaid.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      {t("action.markAsPaid")}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stock Details Modal */}
      {selectedStock && (
        <StockDetailsModal
          open={stockModalOpen}
          onOpenChange={setStockModalOpen}
          inventoryId={selectedStock.id}
        />
      )}
    </div>
  );
};

export default AdminUnpaid;
