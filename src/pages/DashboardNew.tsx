import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  ShoppingCart,
  Hand,
  AlertTriangle,
  Tv,
  MonitorSmartphone,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  MapPin,
  ChevronRight,
  Eye,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MetricCard from "@/components/MetricCard";
import LeaderboardCard from "@/components/LeaderboardCard";
import StockDetailsModal from "@/components/StockDetailsModal";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInventoryStats, useInventory, InventoryItem } from "@/hooks/useInventory";
import {
  useSales,
  useUnpaidCount,
  useUnpaidSales,
  useDailySales,
  useWeeklySales,
  useRegionalSales,
} from "@/hooks/useSales";
import { useLeaderboard } from "@/hooks/useUsers";
import { useTeams, useRegions } from "@/hooks/useTeams";
import { useRealtimeAlerts, useRealtimeInventory } from "@/hooks/useRealtime";
import { cn } from "@/lib/utils";
import { differenceInDays, format } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--info))"];

const Dashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: stats } = useInventoryStats();
  const { data: inventory } = useInventory();
  const { data: unpaidCount } = useUnpaidCount();
  const { data: sales } = useSales();
  const { data: unpaidSales } = useUnpaidSales();
  const { data: leaderboard } = useLeaderboard();
  const { data: teams } = useTeams();
  const { data: regions } = useRegions();
  const { data: dailySales } = useDailySales(7);
  const { data: weeklySales } = useWeeklySales();
  const { data: regionalSales } = useRegionalSales();

  // Stock details modal
  const [selectedStock, setSelectedStock] = useState<InventoryItem | null>(null);
  const [stockModalOpen, setStockModalOpen] = useState(false);

  // Get TL/DSR from localStorage
  const [members] = useState(() => {
    try {
      const stored = localStorage.getItem("tsm_team_members");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const teamLeadersCount = members.filter((m: any) => m.role === "team_leader").length;
  const dsrsCount = members.filter((m: any) => m.role === "dsr").length;

  useRealtimeAlerts();
  useRealtimeInventory();

  const metrics = stats || {
    available: 0,
    sold: 0,
    inHand: 0,
    fullSet: { available: 0, sold: 0, inHand: 0 },
    decoderOnly: { available: 0, sold: 0, inHand: 0 },
  };

  const totalSales = sales?.length ?? 0;
  const paidSales = sales?.filter((s) => s.is_paid).length ?? 0;

  // Calculate unpaid days for each sale
  const unpaidWithDays = useMemo(() => {
    if (!unpaidSales) return [];
    return unpaidSales.map((sale) => ({
      ...sale,
      daysUnpaid: differenceInDays(new Date(), new Date(sale.sold_at)),
    })).sort((a, b) => b.daysUnpaid - a.daysUnpaid);
  }, [unpaidSales]);

  // Stock flow data
  const totalStock = metrics.available + metrics.inHand + metrics.sold;

  // Pie chart data
  const pieChartData = [
    { name: "Available", value: metrics.available },
    { name: "In Field", value: metrics.inHand },
    { name: "Sold", value: metrics.sold },
  ];

  // Format daily sales for chart
  const formattedDailySales = useMemo(() => {
    return dailySales?.map((d) => ({
      ...d,
      date: format(new Date(d.date), "EEE"),
    })) || [];
  }, [dailySales]);

  const handleStockClick = (item: InventoryItem) => {
    setSelectedStock(item);
    setStockModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t("dashboard.title")}
          </h1>
          <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>

        {/* Main KPI Cards - Clickable */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div 
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => navigate("/admin/inventory")}
          >
            <MetricCard
              title={t("dashboard.totalStock")}
              value={totalStock}
              icon={Package}
              variant="primary"
            />
          </div>
          <div 
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => navigate("/admin/inventory")}
          >
            <MetricCard
              title={t("dashboard.inHand")}
              value={metrics.inHand}
              icon={Hand}
              variant="warning"
            />
          </div>
          <div 
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => navigate("/admin/inventory")}
          >
            <MetricCard
              title={t("dashboard.sold")}
              value={metrics.sold}
              icon={ShoppingCart}
              variant="success"
            />
          </div>
          <div 
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => navigate("/admin/unpaid")}
          >
            <MetricCard
              title="Paid Sales"
              value={paidSales}
              icon={CheckCircle}
              variant="success"
            />
          </div>
          <div 
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => navigate("/admin/unpaid")}
          >
            <MetricCard
              title={t("dashboard.unpaidStock")}
              value={unpaidCount || 0}
              icon={AlertTriangle}
              variant="danger"
            />
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Sales Trend */}
          <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Daily Sales (Last 7 Days)</h3>
              <Badge variant="secondary">Trend</Badge>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedDailySales}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorSales)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stock Distribution Pie */}
          <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Stock Distribution</h3>
              <Badge variant="secondary">Overview</Badge>
            </div>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {pieChartData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="text-sm text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weekly Sales Bar Chart */}
        <div className="glass rounded-2xl p-6 mb-8 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Weekly Sales Comparison</h3>
            <Badge variant="secondary">Last 4 Weeks</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklySales || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="fullSet" name="Full Set" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="decoderOnly" name="Decoder Only" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock Type Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div
            className="glass rounded-2xl p-6 animate-slide-up cursor-pointer transition-all hover:border-primary/50"
            style={{ animationDelay: "0.25s" }}
            onClick={() => navigate("/admin/inventory")}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl gradient-info">
                <Tv className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Full Set</h3>
                <p className="text-sm text-muted-foreground">Decoder + Dish + LNB</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-secondary/50 rounded-xl">
                <p className="text-2xl font-bold text-primary">{metrics.fullSet.available}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("dashboard.available")}</p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-xl">
                <p className="text-2xl font-bold text-success">{metrics.fullSet.sold}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("dashboard.sold")}</p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-xl">
                <p className="text-2xl font-bold text-warning">{metrics.fullSet.inHand}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("dashboard.inHand")}</p>
              </div>
            </div>
          </div>

          <div
            className="glass rounded-2xl p-6 animate-slide-up cursor-pointer transition-all hover:border-primary/50"
            style={{ animationDelay: "0.3s" }}
            onClick={() => navigate("/admin/inventory")}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-secondary">
                <MonitorSmartphone className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Decoder Only</h3>
                <p className="text-sm text-muted-foreground">Decoder peke yake</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-secondary/50 rounded-xl">
                <p className="text-2xl font-bold text-primary">{metrics.decoderOnly.available}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("dashboard.available")}</p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-xl">
                <p className="text-2xl font-bold text-success">{metrics.decoderOnly.sold}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("dashboard.sold")}</p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-xl">
                <p className="text-2xl font-bold text-warning">{metrics.decoderOnly.inHand}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("dashboard.inHand")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Regional Performance */}
        <div className="glass rounded-2xl p-6 mb-8 animate-slide-up" style={{ animationDelay: "0.35s" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Regional Performance
            </h3>
            <Badge variant="secondary">{regionalSales?.length || 0} Regions</Badge>
          </div>
          
          {regionalSales && regionalSales.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {regionalSales.slice(0, 8).map((region) => (
                <div
                  key={region.id}
                  className="p-4 rounded-xl border border-border/50 bg-secondary/20 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-foreground">{region.name}</h4>
                    <Badge
                      variant={
                        region.performanceRate >= 80
                          ? "success"
                          : region.performanceRate >= 50
                          ? "warning"
                          : "destructive"
                      }
                    >
                      {region.performanceRate}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="text-center p-2 bg-background/50 rounded-lg">
                      <p className="text-lg font-bold text-foreground">{region.totalSales}</p>
                      <p className="text-xs text-muted-foreground">Sales</p>
                    </div>
                    <div className="text-center p-2 bg-background/50 rounded-lg">
                      <p className="text-lg font-bold text-destructive">{region.unpaidSales}</p>
                      <p className="text-xs text-muted-foreground">Unpaid</p>
                    </div>
                  </div>
                  <Progress value={region.performanceRate} className="h-1.5" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No regional data available</p>
            </div>
          )}
        </div>

        {/* Leaderboard + Team Stats + Unpaid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Leaderboard */}
          <div className="lg:col-span-1 animate-slide-up" style={{ animationDelay: "0.4s" }}>
            <LeaderboardCard title={t("dashboard.leaderboard")} items={leaderboard || []} />
          </div>

          {/* Team Stats */}
          <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "0.45s" }}>
            <h3 className="font-semibold text-foreground mb-4">Team Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div
                className="text-center p-4 bg-secondary/30 rounded-xl cursor-pointer hover:bg-secondary/50 transition-colors"
                onClick={() => navigate("/admin/users")}
              >
                <Users className="h-6 w-6 mx-auto mb-2 text-info" />
                <p className="text-2xl font-bold text-foreground">{teamLeadersCount}</p>
                <p className="text-xs text-muted-foreground">Team Leaders</p>
              </div>
              <div
                className="text-center p-4 bg-secondary/30 rounded-xl cursor-pointer hover:bg-secondary/50 transition-colors"
                onClick={() => navigate("/admin/teams")}
              >
                <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold text-foreground">{teams?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Teams</p>
              </div>
              <div
                className="text-center p-4 bg-secondary/30 rounded-xl cursor-pointer hover:bg-secondary/50 transition-colors"
                onClick={() => navigate("/admin/users")}
              >
                <Users className="h-6 w-6 mx-auto mb-2 text-success" />
                <p className="text-2xl font-bold text-foreground">{dsrsCount}</p>
                <p className="text-xs text-muted-foreground">DSRs</p>
              </div>
              <div className="text-center p-4 bg-secondary/30 rounded-xl">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-warning" />
                <p className="text-2xl font-bold text-foreground">{regions?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Regions</p>
              </div>
            </div>
          </div>

          {/* Unpaid with Days Count */}
          <div
            className="glass rounded-2xl p-6 animate-slide-up cursor-pointer"
            style={{ animationDelay: "0.5s" }}
            onClick={() => navigate("/admin/unpaid")}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-5 w-5 text-destructive" />
                Unpaid Sales
              </h3>
              <Badge variant="destructive">{unpaidWithDays.length} unpaid</Badge>
            </div>

            <div className="space-y-3 max-h-64 overflow-auto">
              {unpaidWithDays.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-success/50" />
                  <p>All sales are paid!</p>
                </div>
              ) : (
                unpaidWithDays.slice(0, 5).map((sale) => (
                  <div
                    key={sale.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-secondary/50",
                      sale.daysUnpaid > 30
                        ? "border-destructive/50 bg-destructive/5"
                        : sale.daysUnpaid > 14
                        ? "border-warning/50 bg-warning/5"
                        : "border-border/50 bg-secondary/30"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      const item = inventory?.find((i) => i.id === sale.inventory_id);
                      if (item) handleStockClick(item);
                    }}
                  >
                    <div>
                      <p className="font-mono text-sm font-medium text-foreground">
                        {sale.inventory?.smartcard || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sale.inventory?.stock_type === "full_set" ? "Full Set" : "Decoder Only"}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <p
                          className={cn(
                            "text-lg font-bold",
                            sale.daysUnpaid > 30
                              ? "text-destructive"
                              : sale.daysUnpaid > 14
                              ? "text-warning"
                              : "text-foreground"
                          )}
                        >
                          {sale.daysUnpaid}
                        </p>
                        <p className="text-xs text-muted-foreground">days</p>
                      </div>
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))
              )}
            </div>

            {unpaidWithDays.length > 5 && (
              <p className="text-center text-sm text-primary mt-3 flex items-center justify-center gap-1">
                View all {unpaidWithDays.length} unpaid sales
                <ChevronRight className="w-4 h-4" />
              </p>
            )}
          </div>
        </div>

        {/* Recent Stock - Clickable */}
        <div className="glass rounded-2xl p-6 mb-8 animate-slide-up" style={{ animationDelay: "0.55s" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Recent Stock</h3>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/inventory")}>
              View All
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Smartcard</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Serial Number</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Type</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {inventory?.slice(0, 5).map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border/30 hover:bg-secondary/30 cursor-pointer"
                    onClick={() => handleStockClick(item)}
                  >
                    <td className="py-2 px-3 font-mono text-foreground">{item.smartcard}</td>
                    <td className="py-2 px-3 font-mono text-muted-foreground">{item.serial_number}</td>
                    <td className="py-2 px-3">
                      <Badge variant="secondary" className="text-xs">
                        {item.stock_type === "full_set" ? "FS" : "DO"}
                      </Badge>
                    </td>
                    <td className="py-2 px-3">
                      <Badge
                        variant={
                          item.status === "sold"
                            ? "sold"
                            : item.status === "in_hand"
                            ? "warning"
                            : "success"
                        }
                      >
                        {item.status === "sold"
                          ? "Sold"
                          : item.status === "in_hand"
                          ? "In Field"
                          : "Available"}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time Badge */}
        <div className="flex justify-center animate-slide-up" style={{ animationDelay: "0.6s" }}>
          <Badge variant="sold" className="flex items-center gap-2 px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            {t("dashboard.realtime")}
          </Badge>
        </div>
      </main>
      <Footer />

      {/* Stock Details Modal */}
      <StockDetailsModal
        item={selectedStock}
        open={stockModalOpen}
        onClose={() => {
          setStockModalOpen(false);
          setSelectedStock(null);
        }}
      />
    </div>
  );
};

export default Dashboard;
