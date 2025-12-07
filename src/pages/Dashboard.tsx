import { useState, useMemo, useEffect } from "react";
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
  ArrowRight,
  Clock,
  PieChart,
  Bell,
  CreditCard,
  PackageCheck,
  X,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MetricCard from "@/components/MetricCard";
import LeaderboardCard from "@/components/LeaderboardCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInventoryStats, useInventory } from "@/hooks/useInventory";
import { useSales, useUnpaidCount, useUnpaidSales } from "@/hooks/useSales";
import { useLeaderboard, useUsers } from "@/hooks/useUsers";
import { useTeams, useRegions } from "@/hooks/useTeams";
import { useRealtimeAlerts, useRealtimeInventory } from "@/hooks/useRealtime";
import { cn } from "@/lib/utils";
import { differenceInDays, format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

// Notification type
interface Notification {
  id: string;
  type: "sale" | "payment" | "package";
  message: string;
  detail?: string;
  timestamp: Date;
  read: boolean;
}

const Dashboard = () => {
  const { t } = useLanguage();
  const { data: stats } = useInventoryStats();
  const { data: inventory } = useInventory();
  const { data: unpaidCount } = useUnpaidCount();
  const { data: sales } = useSales();
  const { data: unpaidSales } = useUnpaidSales();
  const { data: leaderboard } = useLeaderboard();
  const { data: users } = useUsers();
  const { data: teams } = useTeams();
  const { data: regions } = useRegions();

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

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

  // Real-time notifications listener
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sales" },
        (payload) => {
          const sale = payload.new as any;
          const newNotif: Notification = {
            id: `sale-${sale.id}`,
            type: "sale",
            message: "New Sale Recorded!",
            detail: `Customer: ${sale.customer_phone || "Unknown"}`,
            timestamp: new Date(),
            read: false,
          };
          setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sales" },
        (payload) => {
          const sale = payload.new as any;
          const oldSale = payload.old as any;
          
          // Payment received
          if (!oldSale.is_paid && sale.is_paid) {
            const newNotif: Notification = {
              id: `payment-${sale.id}-${Date.now()}`,
              type: "payment",
              message: "Payment Received!",
              detail: `Customer: ${sale.customer_phone || "Unknown"}`,
              timestamp: new Date(),
              read: false,
            };
            setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
          }
          
          // Package updated
          if (oldSale.package_type !== sale.package_type && sale.package_type) {
            const newNotif: Notification = {
              id: `package-${sale.id}-${Date.now()}`,
              type: "package",
              message: "Package Updated!",
              detail: `New package: ${sale.package_type?.replace("-", " ")}`,
              timestamp: new Date(),
              read: false,
            };
            setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const metrics = stats || {
    available: 0,
    sold: 0,
    inHand: 0,
    fullSet: { available: 0, sold: 0, inHand: 0 },
    decoderOnly: { available: 0, sold: 0, inHand: 0 },
  };

  const totalSales = sales?.length ?? 0;
  const paidSales = sales?.filter((s) => s.is_paid).length ?? 0;

  // Recent sales (last 10)
  const recentSales = useMemo(() => {
    if (!sales) return [];
    return [...sales]
      .sort((a, b) => new Date(b.sold_at).getTime() - new Date(a.sold_at).getTime())
      .slice(0, 10);
  }, [sales]);

  // Recent payments (last 10 paid sales)
  const recentPayments = useMemo(() => {
    if (!sales) return [];
    return [...sales]
      .filter((s) => s.is_paid && s.paid_at)
      .sort((a, b) => new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime())
      .slice(0, 10);
  }, [sales]);

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
  const stockFlowData = [
    { name: "Total Stock", value: totalStock, color: "bg-primary" },
    { name: "Available", value: metrics.available, color: "bg-info" },
    { name: "In Field", value: metrics.inHand, color: "bg-warning" },
    { name: "Sold", value: metrics.sold, color: "bg-success" },
  ];
  const maxFlowValue = Math.max(...stockFlowData.map((d) => d.value), 1);

  // Stock distribution for pie-like display
  const stockDistribution = [
    { label: "Available", value: metrics.available, percent: totalStock > 0 ? Math.round((metrics.available / totalStock) * 100) : 0, color: "text-primary" },
    { label: "In Field", value: metrics.inHand, percent: totalStock > 0 ? Math.round((metrics.inHand / totalStock) * 100) : 0, color: "text-warning" },
    { label: "Sold", value: metrics.sold, percent: totalStock > 0 ? Math.round((metrics.sold / totalStock) * 100) : 0, color: "text-success" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header with Notification Bell */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                {t("dashboard.title")}
              </h1>
              <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
            </div>
            
            {/* Notification Bell */}
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                className="relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {/* Notification Panel */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 glass rounded-xl border border-border/50 shadow-xl z-50 max-h-96 overflow-hidden">
                  <div className="p-3 border-b border-border/50 flex items-center justify-between">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Notifications
                    </h3>
                    <div className="flex items-center gap-2">
                      {notifications.length > 0 && (
                        <>
                          <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs">
                            Mark all read
                          </Button>
                          <Button variant="ghost" size="sm" onClick={clearNotifications} className="text-xs text-destructive">
                            Clear
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowNotifications(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="overflow-y-auto max-h-72">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No notifications yet</p>
                        <p className="text-xs mt-1">New sales and payments will appear here</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={cn(
                            "p-3 border-b border-border/30 hover:bg-secondary/50 transition-colors",
                            !notif.read && "bg-primary/5"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              notif.type === "sale" && "bg-success/20",
                              notif.type === "payment" && "bg-info/20",
                              notif.type === "package" && "bg-warning/20"
                            )}>
                              {notif.type === "sale" && <ShoppingCart className="h-4 w-4 text-success" />}
                              {notif.type === "payment" && <CreditCard className="h-4 w-4 text-info" />}
                              {notif.type === "package" && <PackageCheck className="h-4 w-4 text-warning" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-foreground">{notif.message}</p>
                              {notif.detail && (
                                <p className="text-xs text-muted-foreground truncate">{notif.detail}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(notif.timestamp, { addSuffix: true })}
                              </p>
                            </div>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPI Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="animate-slide-up" style={{ animationDelay: "0.05s" }}>
            <MetricCard
              title={t("dashboard.available")}
              value={metrics.available}
              icon={Package}
              variant="primary"
              subtitle={t("dashboard.allStock")}
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <MetricCard
              title={t("dashboard.sold")}
              value={metrics.sold}
              icon={ShoppingCart}
              variant="success"
              subtitle={t("dashboard.thisMonth")}
              trend={{ value: 12, isPositive: true }}
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "0.15s" }}>
            <MetricCard
              title={t("dashboard.inHand")}
              value={metrics.inHand}
              icon={Hand}
              variant="warning"
              subtitle={t("dashboard.forDSRs")}
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <MetricCard
              title={t("dashboard.unpaid")}
              value={unpaidCount || 0}
              icon={AlertTriangle}
              variant="danger"
              subtitle={t("dashboard.needsFollowup")}
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "0.25s" }}>
            <MetricCard
              title="Paid Sales"
              value={paidSales}
              icon={CheckCircle}
              variant="success"
            />
          </div>
        </div>

        {/* Stock Type Breakdown */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div
            className="glass rounded-2xl p-6 animate-slide-up"
            style={{ animationDelay: "0.35s" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl gradient-info">
                <Tv className="w-5 h-5 text-info-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Full Set
                </h3>
                <p className="text-sm text-muted-foreground">
                  Decoder + Dish + LNB
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-secondary/50 rounded-xl">
                <p className="text-2xl font-bold text-primary">
                  {metrics.fullSet.available}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("dashboard.available")}
                </p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-xl">
                <p className="text-2xl font-bold text-success">
                  {metrics.fullSet.sold}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("dashboard.sold")}
                </p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-xl">
                <p className="text-2xl font-bold text-warning">
                  {metrics.fullSet.inHand}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("dashboard.inHand")}
                </p>
              </div>
            </div>
          </div>

          <div
            className="glass rounded-2xl p-6 animate-slide-up"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-secondary">
                <MonitorSmartphone className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Decoder Only
                </h3>
                <p className="text-sm text-muted-foreground">
                  Decoder peke yake
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-secondary/50 rounded-xl">
                <p className="text-2xl font-bold text-primary">
                  {metrics.decoderOnly.available}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("dashboard.available")}
                </p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-xl">
                <p className="text-2xl font-bold text-success">
                  {metrics.decoderOnly.sold}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("dashboard.sold")}
                </p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-xl">
                <p className="text-2xl font-bold text-warning">
                  {metrics.decoderOnly.inHand}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("dashboard.inHand")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Flow + Leaderboard */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Stock Flow Chart */}
          <div
            className="glass rounded-2xl p-6 animate-slide-up"
            style={{ animationDelay: "0.45s" }}
          >
            <div className="mb-6">
              <h3 className="font-semibold text-foreground">Stock Movement</h3>
              <p className="text-sm text-muted-foreground">
                Inventory → Field → Sales
              </p>
            </div>

            <div className="space-y-4">
              {stockFlowData.map((item, index) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {index > 0 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className="text-sm text-foreground">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {item.value.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={(item.value / maxFlowValue) * 100}
                    className="h-3"
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-border/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Conversion Rate</span>
                <span className="font-bold text-success">
                  {stockFlowData[0].value > 0
                    ? Math.round(
                        (metrics.sold / stockFlowData[0].value) * 100
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div
            className="lg:col-span-2 animate-slide-up"
            style={{ animationDelay: "0.5s" }}
          >
            <LeaderboardCard
              title={t("dashboard.leaderboard")}
              items={leaderboard || []}
            />
          </div>
        </div>

        {/* Team Stats */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-slide-up"
          style={{ animationDelay: "0.55s" }}
        >
          <div className="glass rounded-xl p-4 border border-border/50 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-info" />
            <p className="text-2xl font-bold text-foreground">
              {teamLeadersCount}
            </p>
            <p className="text-xs text-muted-foreground">Team Leaders</p>
          </div>
          <div className="glass rounded-xl p-4 border border-border/50 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">
              {teams?.length ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Teams</p>
          </div>
          <div className="glass rounded-xl p-4 border border-border/50 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-success" />
            <p className="text-2xl font-bold text-foreground">
              {dsrsCount}
            </p>
            <p className="text-xs text-muted-foreground">DSRs</p>
          </div>
          <div className="glass rounded-xl p-4 border border-border/50 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-warning" />
            <p className="text-2xl font-bold text-foreground">
              {regions?.length ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Regions</p>
          </div>
        </div>

        {/* Stock Distribution Chart */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div
            className="glass rounded-2xl p-6 animate-slide-up"
            style={{ animationDelay: "0.6s" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <PieChart className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Stock Distribution</h3>
            </div>
            
            {/* Visual representation */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {stockDistribution.reduce((acc, item, index) => {
                    const offset = acc.offset;
                    const strokeDasharray = `${item.percent} ${100 - item.percent}`;
                    const colors = ["stroke-primary", "stroke-warning", "stroke-success"];
                    acc.elements.push(
                      <circle
                        key={item.label}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        strokeWidth="20"
                        className={colors[index]}
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={-offset}
                      />
                    );
                    acc.offset += item.percent;
                    return acc;
                  }, { elements: [] as JSX.Element[], offset: 0 }).elements}
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
            <div className="grid grid-cols-3 gap-2">
              {stockDistribution.map((item) => (
                <div key={item.label} className="text-center p-2 rounded-lg bg-secondary/30">
                  <p className={cn("text-lg font-bold", item.color)}>{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-xs font-medium text-foreground">{item.percent}%</p>
                </div>
              ))}
            </div>
          </div>

          {/* Unpaid with Days Count */}
          <div
            className="glass rounded-2xl p-6 animate-slide-up"
            style={{ animationDelay: "0.65s" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-destructive" />
                <h3 className="font-semibold text-foreground">Unpaid Sales (Days)</h3>
              </div>
              <Badge variant="destructive">{unpaidWithDays.length} unpaid</Badge>
            </div>

            <div className="space-y-3 max-h-64 overflow-auto">
              {unpaidWithDays.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-success/50" />
                  <p>All sales are paid!</p>
                </div>
              ) : (
                unpaidWithDays.slice(0, 10).map((sale) => (
                  <div
                    key={sale.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      sale.daysUnpaid > 30
                        ? "border-destructive/50 bg-destructive/5"
                        : sale.daysUnpaid > 14
                        ? "border-warning/50 bg-warning/5"
                        : "border-border/50 bg-secondary/30"
                    )}
                  >
                    <div>
                      <p className="font-mono text-sm font-medium">
                        {sale.inventory?.smartcard || sale.inventory?.serial_number || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sale.inventory?.stock_type === "full_set" ? "Full Set" : "Decoder Only"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-lg font-bold",
                        sale.daysUnpaid > 30
                          ? "text-destructive"
                          : sale.daysUnpaid > 14
                          ? "text-warning"
                          : "text-foreground"
                      )}>
                        {sale.daysUnpaid}
                      </p>
                      <p className="text-xs text-muted-foreground">days</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {unpaidWithDays.length > 10 && (
              <p className="text-center text-sm text-muted-foreground mt-3">
                +{unpaidWithDays.length - 10} more unpaid sales
              </p>
            )}
          </div>
        </div>

        {/* Recent Sales & Recent Payments Tables */}
        <div className="grid md:grid-cols-2 gap-6 mb-8 animate-slide-up" style={{ animationDelay: "0.55s" }}>
          {/* Recent Sales Table */}
          <div className="glass rounded-2xl p-5 border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-success" />
                <h3 className="font-semibold text-foreground">Recent Sales</h3>
              </div>
              <Badge variant="secondary">{recentSales.length} sales</Badge>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Smartcard</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Customer</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Package</th>
                    <th className="text-center py-2 px-2 text-muted-foreground font-medium">Status</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No sales yet
                      </td>
                    </tr>
                  ) : (
                    recentSales.map((sale) => (
                      <tr key={sale.id} className="border-b border-border/30 hover:bg-secondary/30">
                        <td className="py-2 px-2 font-mono text-xs">
                          {sale.inventory?.smartcard || "-"}
                        </td>
                        <td className="py-2 px-2 text-xs truncate max-w-[100px]">
                          {sale.customer_phone || "-"}
                        </td>
                        <td className="py-2 px-2">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {sale.package_type?.replace("-", " ") || "N/A"}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-center">
                          {sale.is_paid ? (
                            <Badge variant="success" className="text-xs">Paid</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">Unpaid</Badge>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right text-xs text-muted-foreground">
                          {format(new Date(sale.sold_at), "MMM d")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Payments Table */}
          <div className="glass rounded-2xl p-5 border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-info" />
                <h3 className="font-semibold text-foreground">Recent Payments</h3>
              </div>
              <Badge variant="info">{recentPayments.length} payments</Badge>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Smartcard</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Customer</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Type</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Paid On</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        No payments yet
                      </td>
                    </tr>
                  ) : (
                    recentPayments.map((sale) => (
                      <tr key={sale.id} className="border-b border-border/30 hover:bg-secondary/30">
                        <td className="py-2 px-2 font-mono text-xs">
                          {sale.inventory?.smartcard || "-"}
                        </td>
                        <td className="py-2 px-2 text-xs truncate max-w-[100px]">
                          {sale.customer_phone || "-"}
                        </td>
                        <td className="py-2 px-2">
                          <Badge variant={sale.inventory?.stock_type === "full_set" ? "info" : "secondary"} className="text-xs">
                            {sale.inventory?.stock_type === "full_set" ? "Full Set" : "Decoder"}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-right text-xs text-muted-foreground">
                          {sale.paid_at ? format(new Date(sale.paid_at), "MMM d, HH:mm") : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Real-time Badge */}
        <div
          className="flex justify-center animate-slide-up"
          style={{ animationDelay: "0.6s" }}
        >
          <Badge variant="sold" className="flex items-center gap-2 px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            {t("dashboard.realtime")}
          </Badge>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
