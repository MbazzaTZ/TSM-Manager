// =============================================================
//  ADMIN REPORT (FULLY FIXED - OPTION A - KEEP STRUCTURE SAME)
// =============================================================

import { useState, useRef, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInventory } from "@/hooks/useInventory";
import { useSales } from "@/hooks/useSales";
import { useRegions } from "@/hooks/useTeams";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  FileText,
  Download,
  Mail,
  MessageCircle,
  Target,
  Package,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Loader2,
  Calendar,
  User,
  MapPin,
  Phone,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// =============================================================
//  FIX 1 — Updated TLSummary interface (kept original structure)
// =============================================================
interface TLSummary {
  id: string;
  name: string;
  region: string;

  stockReceived: number;
  stockInHand: number;
  stockSold: number;
  stockUnpaid: number;

  monthlyTarget: number;
  monthlyActual: number;
  salesGap: number;
  performancePercent: number;

  unpaidSales: Array<{
    smartcard: string;
    customerPhone: string;
    soldAt: string;
    packageType: string;
  }>;

  // FIX: Keep debugInventory in interface (Option A)
  debugInventory: any[];
}

// Utility to sanitize TL names
const clean = (v: string) =>
  v
    ?.trim()
    .toLowerCase()
    .replace(/\s+/g, " "); // normalize multiple spaces

const AdminReport = () => {
  const { t } = useLanguage();
  const { data: inventory = [] } = useInventory();
  const { data: sales = [] } = useSales();
  const { data: regions = [] } = useRegions();

  const reportRef = useRef<HTMLDivElement>(null);

  const [selectedTL, setSelectedTL] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  // Team members
  const members = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("tsm_team_members") || "[]");
    } catch {
      return [];
    }
  }, []);

  // Targets
  const salesTargets = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("tsm_sales_targets") || "{}");
    } catch {
      return {};
    }
  }, []);

  const teamLeaders = members.filter((m: any) => m.role === "team_leader");
  const regionMap = new Map(regions.map((r) => [r.id, r.name]));

  // =============================================================
  //  FIX 2–4 — Correct TL summary logic + robust name matching
  // =============================================================
  const getTLSummary = (tlId: string): TLSummary | null => {
    const tl = teamLeaders.find((t: any) => t.id === tlId);
    if (!tl) return null;

    const tlNameClean = clean(tl.name);

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    // =============================================================
    // FIX: Correct name-based matching (Option A)
    // =============================================================
    const tlInventory = inventory.filter((item) => {
      const invTL = clean(item.assigned_to_tl || "");
      return invTL === tlNameClean;
    });

    const stockReceived = tlInventory.length;
    const stockInHand = tlInventory.filter((i) => i.status === "in_hand").length;
    const stockSold = tlInventory.filter((i) => i.status === "sold").length;

    // Sales belonging to this TL
    const tlSales = sales.filter((sale) => {
      const inv = inventory.find((i) => i.id === sale.inventory_id);
      if (!inv) return false;

      const invTL = clean(inv.assigned_to_tl || "");
      return invTL === tlNameClean;
    });

    const monthlySales = tlSales.filter(
      (sale) => new Date(sale.created_at) >= start
    );

    const monthlyActual = monthlySales.length;

    const unpaidSales = tlSales.filter((s) => !s.is_paid);
    const stockUnpaid = unpaidSales.length;

    const target = salesTargets[tlId] || 20;

    const salesGap = target - monthlyActual;

    // =============================================================
    // FIX 5 — avoid NaN: divide-by-zero safe
    // =============================================================
    const performancePercent =
      target > 0 ? Math.round((monthlyActual / target) * 100) : 0;

    const unpaidDetails = unpaidSales.map((sale) => {
      const inv = inventory.find((i) => i.id === sale.inventory_id);

      return {
        smartcard: inv?.smartcard || "N/A",
        customerPhone: sale.customer_phone || "N/A",
        soldAt: new Date(
          sale.sold_at || sale.created_at
        ).toLocaleDateString(),
        packageType: sale.package_type || "No Package",
      };
    });

    return {
      id: tl.id,
      name: tl.name,
      region: regionMap.get(tl.region_id) || tl.region || "N/A",

      stockReceived,
      stockInHand,
      stockSold,
      stockUnpaid,

      monthlyTarget: target,
      monthlyActual,
      salesGap,
      performancePercent,

      unpaidSales: unpaidDetails,

      debugInventory: tlInventory, // KEEP VISIBLE (Option A)
    };
  };

  const summary = selectedTL ? getTLSummary(selectedTL) : null;

  // =============================================================
  //  FIX 6 — html2canvas export with CORS + scroll fix + long page fix
  // =============================================================
  const exportToImage = async () => {
    if (!reportRef.current) return;

    setIsExporting(true);

    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#111", // prevents white bars
        useCORS: true,
        scale: 2,
        scrollY: -window.scrollY, // FIX: full capture
        windowWidth: document.documentElement.offsetWidth,
      });

      const link = document.createElement("a");
      link.download = `TL_Report_${summary?.name}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    if (!reportRef.current) return;

    setIsExporting(true);

    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#111",
        useCORS: true,
        scale: 2,
        scrollY: -window.scrollY,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;

      // FIX: support long pages by adding new PDF pages
      if (height < 297) {
        pdf.addImage(imgData, "PNG", 0, 0, width, height);
      } else {
        let y = 0;
        while (y < height) {
          pdf.addImage(imgData, "PNG", 0, -y, width, height);
          y += 297;

          if (y < height) pdf.addPage();
        }
      }

      pdf.save(`TL_Report_${summary?.name}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  // =============================================================
  // FIX 7 — WhatsApp formatting fixes
  // =============================================================
  const shareWhatsApp = () => {
    if (!summary) return;

    const msg = `
📊 *TSM TL Report*
━━━━━━━━━━━━━━━
👤 *${summary.name}*
📍 Region: ${summary.region}
📅 ${new Date().toLocaleDateString()}

📦 *Stock Summary*
• Received: ${summary.stockReceived}
• In hand: ${summary.stockInHand}
• Sold: ${summary.stockSold}
• Unpaid: ${summary.stockUnpaid}

🎯 *Performance*
• Target: ${summary.monthlyTarget}
• Actual: ${summary.monthlyActual}
• Gap: ${summary.salesGap}
• Progress: ${summary.performancePercent}%

━━━━━━━━━━━━━━━
_Generated by TSM Manager_
    `.trim();

    window.open(
      `https://wa.me/?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
  };

  // Email share
  const shareEmail = () => {
    if (!summary) return;

    const subject = `TSM TL Report - ${summary.name}`;
    const body = `Team Leader: ${summary.name}

Region: ${summary.region}
Date: ${new Date().toLocaleDateString()}

Stock:
Received: ${summary.stockReceived}
In Hand: ${summary.stockInHand}
Sold: ${summary.stockSold}
Unpaid: ${summary.stockUnpaid}

Performance:
Target: ${summary.monthlyTarget}
Actual: ${summary.monthlyActual}
Gap: ${summary.salesGap}
Progress: ${summary.performancePercent}%

Generated by TSM Manager`;

    window.open(
      `mailto:?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`
    );
  };

  // =============================================================
  // Insights (unchanged except bug fixes)
  // =============================================================
  const getInsights = (s: TLSummary) => {
    const list: any[] = [];

    if (s.performancePercent >= 100) {
      list.push({
        type: "success",
        message: "🎉 Excellent! Target achieved.",
      });
    } else if (s.performancePercent >= 75) {
      list.push({
        type: "warning",
        message: `📈 Good progress. ${s.salesGap} more needed.`,
      });
    } else if (s.performancePercent >= 50) {
      list.push({
        type: "warning",
        message: `⚠️ Halfway to target.`,
      });
    } else {
      list.push({
        type: "danger",
        message: `🚨 Behind schedule. ${s.salesGap} needed.`,
      });
    }

    if (s.stockUnpaid > 0) {
      const unpaidRate = Math.round(
        (s.stockUnpaid / Math.max(s.stockSold, 1)) * 100
      );

      if (unpaidRate >= 30)
        list.push({
          type: "danger",
          message: `💰 High unpaid rate (${unpaidRate}%).`,
        });
      else if (unpaidRate >= 15)
        list.push({
          type: "warning",
          message: `💵 Follow-up needed for unpaid customers.`,
        });
    }

    return list;
  };

  // =============================================================
  // UI BELOW (kept exactly same — only repaired)
  // =============================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            TL Performance Report
          </h1>
        </div>

        <Select value={selectedTL} onValueChange={setSelectedTL}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Choose Team Leader" />
          </SelectTrigger>
          <SelectContent>
            {teamLeaders.map((tl: any) => (
              <SelectItem key={tl.id} value={tl.id}>
                {tl.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedTL ? (
        <div className="p-12 border rounded-xl text-center">
          <FileText className="w-16 h-16 opacity-40 mx-auto mb-3" />
          <p>Select TL to view report</p>
        </div>
      ) : summary ? (
        <>
          {/* Export Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportToImage}>
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Image
            </Button>

            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <FileText className="w-4 h-4" />
              PDF
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="text-green-500"
              onClick={shareWhatsApp}
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>

            <Button variant="outline" size="sm" onClick={shareEmail}>
              <Mail className="w-4 h-4" />
              Email
            </Button>
          </div>

          {/* REPORT CARD */}
          <div
            ref={reportRef}
            className="border rounded-xl mt-3 bg-background overflow-hidden"
          >
            {/* =============================================================
                DEBUG INVENTORY — Option A (kept visible)
            ============================================================= */}
            <div className="p-4 bg-yellow-50 border-b text-xs">
              <strong>Debug Inventory for {summary.name}:</strong>
              <ul className="max-h-32 overflow-y-auto mt-2">
                {summary.debugInventory.map((inv, i) => (
                  <li key={inv.id}>
                    #{i + 1} — SC: {inv.smartcard} — Status: {inv.status} — TL:
                    {inv.assigned_to_tl}
                  </li>
                ))}
                {summary.debugInventory.length === 0 && (
                  <li>No inventory matched TL name.</li>
                )}
              </ul>
            </div>

            {/* HEADER */}
            <div className="p-6 bg-primary/10 border-b flex justify-between">
              <div className="flex gap-3">
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{summary.name}</h2>
                  <div className="text-sm text-muted-foreground flex gap-4">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {summary.region}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date().toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <img
                src="/logo-icon.png"
                className="w-12 opacity-60"
                alt="TSM"
              />
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
              <Stat icon={<Package className="text-info" />} label="Received" value={summary.stockReceived} />
              <Stat icon={<ShoppingCart className="text-warning" />} label="In Hand" value={summary.stockInHand} />
              <Stat icon={<CheckCircle2 className="text-success" />} label="Sold" value={summary.stockSold} />
              <Stat icon={<AlertTriangle className="text-destructive" />} label="Unpaid" value={summary.stockUnpaid} />
            </div>

            {/* PERFORMANCE */}
            <div className="px-6 pb-6">
              <div className="p-5 border rounded-xl bg-secondary/20">
                <div className="flex justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Monthly Performance</h3>
                  </div>
                  <Badge>{summary.performancePercent}%</Badge>
                </div>

                <div className="grid grid-cols-3 text-center gap-4 mb-4">
                  <Mini label="Target" value={summary.monthlyTarget} />
                  <Mini label="Actual" value={summary.monthlyActual} />
                  <Mini
                    label={summary.salesGap >= 0 ? "Gap" : "Surplus"}
                    value={Math.abs(summary.salesGap)}
                    icon={
                      summary.salesGap >= 0 ? (
                        <TrendingDown className="w-5 h-5 text-destructive" />
                      ) : (
                        <TrendingUp className="w-5 h-5 text-success" />
                      )
                    }
                  />
                </div>

                <Progress value={Math.min(summary.performancePercent, 100)} className="h-3" />
              </div>
            </div>

            {/* INSIGHTS */}
            <div className="px-6 pb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Insights
              </h3>

              <div className="space-y-2">
                {getInsights(summary).map((ins, i) => (
                  <div
                    key={i}
                    className={cn(
                      "p-3 rounded-md border text-sm",
                      ins.type === "success" &&
                        "bg-success/10 border-success/20 text-success",
                      ins.type === "warning" &&
                        "bg-warning/10 border-warning/20 text-warning",
                      ins.type === "danger" &&
                        "bg-destructive/10 border-destructive/20 text-destructive"
                    )}
                  >
                    {ins.message}
                  </div>
                ))}
              </div>
            </div>

            {/* UNPAID TABLE */}
            {summary.unpaidSales.length > 0 && (
              <div className="px-6 pb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Unpaid Sales ({summary.unpaidSales.length})
                </h3>

                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/30">
                        <TableHead>#</TableHead>
                        <TableHead>Smartcard</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Package</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {summary.unpaidSales.map((u, i) => (
                        <TableRow key={i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-mono">{u.smartcard}</TableCell>
                          <TableCell>
                            <a href={`tel:${u.customerPhone}`} className="text-primary flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {u.customerPhone}
                            </a>
                          </TableCell>
                          <TableCell>{u.soldAt}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{u.packageType}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* FOOTER */}
            <div className="p-4 text-center text-xs bg-secondary/20 border-t">
              Generated by TSM Manager • {new Date().toLocaleString()}
            </div>
          </div>
        </>
      ) : (
        <div className="p-12 text-center border rounded-xl">
          <XCircle className="w-16 h-16 opacity-40 mx-auto mb-2 text-destructive" />
          TL Not Found
        </div>
      )}
    </div>
  );
};

// UI helpers
const Stat = ({ icon, label, value }: any) => (
  <div className="text-center p-4 rounded-xl bg-secondary/30">
    <div className="mb-2 w-6 h-6 mx-auto">{icon}</div>
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

const Mini = ({ label, value, icon }: any) => (
  <div className="text-center">
    <div className="flex items-center justify-center gap-1">
      {icon}
      <p className="text-3xl font-bold">{value}</p>
    </div>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default AdminReport;
