import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  ShoppingCart,
  Hand,
  AlertTriangle,
  Users,
  CheckCircle,
  Loader2,
  Download,
  UserPlus,
  BadgePlus,
  FileBarChart,
  Clock,
  PieChart,
  TrendingUp,
  MapPin,
} from "lucide-react";
import MetricCard from "@/components/MetricCard";
import LeaderboardCard from "@/components/LeaderboardCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInventoryStats } from "@/hooks/useInventory";
import { useSales, useUnpaidCount, useUnpaidSales, useRegionalSales } from "@/hooks/useSales";
import { useLeaderboard, useUsers } from "@/hooks/useUsers";
import { useTeams, useRegions } from "@/hooks/useTeams";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";

const AdminOverview = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useInventoryStats();
  const { data: unpaidCount } = useUnpaidCount();
  const { data: sales } = useSales();
  const { data: unpaidSales } = useUnpaidSales();
  const { data: leaderboard } = useLeaderboard();
  const { data: users } = useUsers();
  const { data: teams } = useTeams();
  const { data: regions } = useRegions();
  const { data: regionalSales } = useRegionalSales();

  // Get TL/DSR from localStorage
  const [members] = useState(() => {
    try {
      const stored = localStorage.getItem("tsm_team_members");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const metrics = stats || {
    available: 0,
    sold: 0,
    inHand: 0,
    fullSet: { available: 0, sold: 0, inHand: 0 },
    decoderOnly: { available: 0, sold: 0, inHand: 0 },
  };

  const totalSales = sales?.length ?? 0;
  const paidSales = sales?.filter((s) => s.is_paid).length ?? 0;
  const totalTeams = teams?.length ?? 0;
  const totalTLs = members.filter((m: any) => m.role === "team_leader").length;
  const totalDSRs = members.filter((m: any) => m.role === "dsr").length;
  const totalStock = metrics.available + metrics.inHand + metrics.sold;

  // Calculate unpaid days for each sale
  const unpaidWithDays = useMemo(() => {
    if (!unpaidSales) return [];
    return unpaidSales.map((sale) => ({
      ...sale,
      daysUnpaid: differenceInDays(new Date(), new Date(sale.sold_at)),
    })).sort((a, b) => b.daysUnpaid - a.daysUnpaid);
  }, [unpaidSales]);

  // Stock distribution
  const stockDistribution = [
    { label: "Available", value: metrics.available, percent: totalStock > 0 ? Math.round((metrics.available / totalStock) * 100) : 0, color: "text-primary", bg: "bg-primary" },
    { label: "In Field", value: metrics.inHand, percent: totalStock > 0 ? Math.round((metrics.inHand / totalStock) * 100) : 0, color: "text-warning", bg: "bg-warning" },
    { label: "Sold", value: metrics.sold, percent: totalStock > 0 ? Math.round((metrics.sold / totalStock) * 100) : 0, color: "text-success", bg: "bg-success" },
  ];

  if (statsLoading) {
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
          <h1 className="text-2xl font-bold text-foreground">{t("admin.overview")}</h1>
          <p className="text-muted-foreground text-sm">
            Real-time overview of stock, sales, and team performance
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>Last updated</p>
          <p className="font-medium text-foreground">{new Date().toLocaleString()}</p>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Stock"
          value={metrics.available + metrics.inHand + metrics.sold}
          icon={Package}
          variant="primary"
        />
        <MetricCard title="Stock In Hand" value={metrics.inHand} icon={Hand} variant="info" />
        <MetricCard
          title="Total Sales"
          value={totalSales}
          icon={ShoppingCart}
          variant="success"
          trend={{ value: 12, isPositive: true }}
        />
        <MetricCard title="Paid Sales" value={paidSales} icon={CheckCircle} variant="success" />
        <MetricCard title="Unpaid Sales" value={unpaidCount || 0} icon={AlertTriangle} variant="danger" />
      </div>

      {/* Team Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Team Leaders" value={totalTLs} icon={Users} variant="info" />
        <MetricCard title="Teams" value={totalTeams} icon={Users} />
        <MetricCard title="DSRs" value={totalDSRs} icon={Users} variant="success" />
        <MetricCard title="Regions" value={regions?.length ?? 0} icon={Users} variant="warning" />
      </div>

      {/* Regional Performance - Real Data */}
      {regionalSales && regionalSales.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Regional Performance</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {regionalSales.map((region) => {
              const regionTeams = teams?.filter((t) => t.region_id === region.id) ?? [];

              return (
                <div
                  key={region.id}
                  className="glass rounded-xl p-4 border border-border/50 transition-all duration-300 hover:border-primary/30 cursor-pointer"
                  onClick={() => navigate("/admin/teams")}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-foreground">{region.name}</h4>
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

                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    <div className="p-2 rounded-lg bg-secondary/50">
                      <p className="text-lg font-bold text-foreground">{regionTeams.length}</p>
                      <p className="text-xs text-muted-foreground">Teams</p>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/50">
                      <p className="text-lg font-bold text-success">{region.totalSales}</p>
                      <p className="text-xs text-muted-foreground">Sales</p>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/50">
                      <p className="text-lg font-bold text-destructive">{region.unpaidSales}</p>
                      <p className="text-xs text-muted-foreground">Unpaid</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Payment Rate</span>
                      <span
                        className={cn(
                          "font-bold",
                          region.performanceRate >= 80
                            ? "text-success"
                            : region.performanceRate >= 50
                            ? "text-warning"
                            : "text-destructive"
                        )}
                      >
                        {region.performanceRate}%
                      </span>
                    </div>
                    <Progress value={region.performanceRate} className="h-2" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Distribution Chart */}
        <div className="glass rounded-xl p-5 border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Stock Distribution</h3>
          </div>
          
          {/* Visual Chart */}
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="12" className="text-muted/20" />
                {stockDistribution.map((item, idx) => {
                  const offset = stockDistribution.slice(0, idx).reduce((acc, curr) => acc + curr.percent, 0);
                  return (
                    <circle
                      key={item.label}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      strokeWidth="12"
                      strokeDasharray={`${item.percent * 2.51} 251`}
                      strokeDashoffset={-offset * 2.51}
                      className={cn(
                        item.label === "Available" ? "stroke-primary" :
                        item.label === "In Field" ? "stroke-warning" : "stroke-success"
                      )}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{totalStock}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="space-y-2">
            {stockDistribution.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", item.bg)} />
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{item.value}</span>
                  <span className="text-xs text-muted-foreground">({item.percent}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="lg:col-span-1">
          <LeaderboardCard title={t("dashboard.leaderboard")} items={leaderboard || []} />
        </div>

        {/* Quick Actions Panel */}
        <div className="glass rounded-xl p-5 border border-border/50">
          <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-primary/10 hover:border-primary/50"
              onClick={() => navigate("/admin/inventory")}
            >
              <Package className="h-5 w-5 text-primary" />
              <span className="text-xs">Assign Stock</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-primary/10 hover:border-primary/50"
              onClick={() => navigate("/admin/users?create=tl")}
            >
              <UserPlus className="h-5 w-5 text-success" />
              <span className="text-xs">Create TL</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-primary/10 hover:border-primary/50"
              onClick={() => navigate("/admin/teams")}
            >
              <Users className="h-5 w-5 text-info" />
              <span className="text-xs">Create Team</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-primary/10 hover:border-primary/50"
              onClick={() => navigate("/admin/users?create=dsr")}
            >
              <BadgePlus className="h-5 w-5 text-warning" />
              <span className="text-xs">Create DSR</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-primary/10 hover:border-primary/50"
              onClick={() => navigate("/admin/inventory")}
            >
              <ShoppingCart className="h-5 w-5 text-success" />
              <span className="text-xs">Add Sale</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-primary/10 hover:border-primary/50"
              onClick={() => navigate("/admin/unpaid")}
            >
              <FileBarChart className="h-5 w-5 text-primary" />
              <span className="text-xs">Reports</span>
            </Button>
          </div>

          <div className="mt-4 pt-4 border-t border-border/50">
            <h4 className="text-sm font-medium text-foreground mb-3">Export Center</h4>
            <div className="space-y-2">
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                <Download className="h-4 w-4 mr-2" />
                Export Sales
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                <Download className="h-4 w-4 mr-2" />
                Export Stock
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                <Download className="h-4 w-4 mr-2" />
                Export Performance
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-5 border border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl gradient-info">
              <Package className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Full Set</h3>
              <p className="text-sm text-muted-foreground">Decoder + Dish + LNB</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-secondary/50 rounded-xl">
              <p className="text-2xl font-bold text-primary">{metrics.fullSet.available}</p>
              <p className="text-xs text-muted-foreground">Available</p>
            </div>
            <div className="text-center p-3 bg-secondary/50 rounded-xl">
              <p className="text-2xl font-bold text-success">{metrics.fullSet.sold}</p>
              <p className="text-xs text-muted-foreground">Sold</p>
            </div>
            <div className="text-center p-3 bg-secondary/50 rounded-xl">
              <p className="text-2xl font-bold text-warning">{metrics.fullSet.inHand}</p>
              <p className="text-xs text-muted-foreground">In Hand</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-5 border border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-secondary">
              <Package className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Decoder Only</h3>
              <p className="text-sm text-muted-foreground">Decoder peke yake</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-secondary/50 rounded-xl">
              <p className="text-2xl font-bold text-primary">{metrics.decoderOnly.available}</p>
              <p className="text-xs text-muted-foreground">Available</p>
            </div>
            <div className="text-center p-3 bg-secondary/50 rounded-xl">
              <p className="text-2xl font-bold text-success">{metrics.decoderOnly.sold}</p>
              <p className="text-xs text-muted-foreground">Sold</p>
            </div>
            <div className="text-center p-3 bg-secondary/50 rounded-xl">
              <p className="text-2xl font-bold text-warning">{metrics.decoderOnly.inHand}</p>
              <p className="text-xs text-muted-foreground">In Hand</p>
            </div>
          </div>
        </div>
      </div>

      {/* Unpaid Sales with Days Count */}
      {unpaidWithDays.length > 0 && (
        <div className="glass rounded-xl p-5 border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-destructive" />
              <h3 className="font-semibold text-foreground">Unpaid Sales - Days Outstanding</h3>
            </div>
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {unpaidWithDays.length} Unpaid
            </Badge>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Smartcard</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Customer</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Package</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Sold Date</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Days Unpaid</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {unpaidWithDays.slice(0, 10).map((sale) => (
                  <tr key={sale.id} className="border-b border-border/30 hover:bg-secondary/30">
                    <td className="py-2 px-3 font-mono text-foreground">{sale.inventory?.smartcard || sale.smartcard_number || "-"}</td>
                    <td className="py-2 px-3 text-foreground">{sale.customer_phone || sale.customer_name || "-"}</td>
                    <td className="py-2 px-3">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {sale.package_type?.replace("-", " ") || "N/A"}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {new Date(sale.sold_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold",
                        sale.daysUnpaid >= 30 ? "bg-destructive/20 text-destructive" :
                        sale.daysUnpaid >= 14 ? "bg-warning/20 text-warning" :
                        "bg-info/20 text-info"
                      )}>
                        <Clock className="h-3 w-3" />
                        {sale.daysUnpaid} days
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {sale.daysUnpaid >= 30 ? (
                        <Badge variant="destructive">Critical</Badge>
                      ) : sale.daysUnpaid >= 14 ? (
                        <Badge className="bg-warning text-warning-foreground">Warning</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {unpaidWithDays.length > 10 && (
            <div className="mt-4 text-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate("/admin/unpaid")}
              >
                View All {unpaidWithDays.length} Unpaid Sales
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Live status badge */}
      <div className="flex justify-center">
        <Badge variant="sold" className="flex items-center gap-2 px-4 py-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          {t("dashboard.realtime")}
        </Badge>
      </div>
    </div>
  );
};

export default AdminOverview;
