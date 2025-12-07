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
  Share2,
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
}

const AdminReport = () => {
  const { t } = useLanguage();
  const { data: inventory = [] } = useInventory();
  const { data: sales = [] } = useSales();
  const { data: regions = [] } = useRegions();
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [selectedTL, setSelectedTL] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  // Get team members from localStorage
  const members = useMemo(() => {
    try {
      const stored = localStorage.getItem("tsm_team_members");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Get sales targets from localStorage
  const salesTargets = useMemo(() => {
    try {
      const stored = localStorage.getItem("tsm_sales_targets");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, []);

  const teamLeaders = members.filter((m: any) => m.role === "team_leader");
  const regionMap = new Map(regions.map((r) => [r.id, r.name]));

  // Calculate TL Summary
  const getTLSummary = (tlId: string): TLSummary | null => {
    const tl = teamLeaders.find((t: any) => t.id === tlId);
    if (!tl) return null;

    const tlName = tl.name.toLowerCase();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all inventory assigned to this TL
    const tlInventory = inventory.filter(
      (item) => item.assigned_to_tl?.toLowerCase() === tlName
    );

    // Stock metrics
    const stockReceived = tlInventory.length;
    const stockInHand = tlInventory.filter((item) => item.status === "in_hand").length;
    const stockSold = tlInventory.filter((item) => item.status === "sold").length;

    // Get sales for this TL's inventory
    const tlSales = sales.filter((sale) => {
      const inv = inventory.find((i) => i.id === sale.inventory_id);
      return inv?.assigned_to_tl?.toLowerCase() === tlName;
    });

    // Monthly sales
    const monthlySales = tlSales.filter(
      (sale) => new Date(sale.created_at) >= startOfMonth
    );
    const monthlyActual = monthlySales.length;

    // Unpaid sales
    const unpaidSales = tlSales.filter((sale) => !sale.is_paid);
    const stockUnpaid = unpaidSales.length;

    // Target
    const monthlyTarget = salesTargets[tlId] || 20;
    const salesGap = monthlyTarget - monthlyActual;
    const performancePercent = monthlyTarget > 0 
      ? Math.round((monthlyActual / monthlyTarget) * 100) 
      : 0;

    // Unpaid details
    const unpaidDetails = unpaidSales.map((sale) => {
      const inv = inventory.find((i) => i.id === sale.inventory_id);
      return {
        smartcard: inv?.smartcard || "N/A",
        customerPhone: sale.customer_phone || "N/A",
        soldAt: new Date(sale.sold_at || sale.created_at).toLocaleDateString(),
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
      monthlyTarget,
      monthlyActual,
      salesGap,
      performancePercent,
      unpaidSales: unpaidDetails,
    };
  };

  const currentTLSummary = selectedTL ? getTLSummary(selectedTL) : null;

  // Export to Image
  const exportToImage = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
      });
      
      const link = document.createElement("a");
      link.download = `TL_Report_${currentTLSummary?.name || "All"}_${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Export to image failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`TL_Report_${currentTLSummary?.name || "All"}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Export to PDF failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Share via WhatsApp
  const shareWhatsApp = () => {
    if (!currentTLSummary) return;
    
    const message = `
📊 *TSM Manager - TL Performance Report*
━━━━━━━━━━━━━━━━━━━━━

👤 *Team Leader:* ${currentTLSummary.name}
📍 *Region:* ${currentTLSummary.region}
📅 *Date:* ${new Date().toLocaleDateString()}

📦 *Stock Summary:*
• Received: ${currentTLSummary.stockReceived}
• In Hand: ${currentTLSummary.stockInHand}
• Sold: ${currentTLSummary.stockSold}
• Unpaid: ${currentTLSummary.stockUnpaid}

🎯 *Monthly Performance:*
• Target: ${currentTLSummary.monthlyTarget}
• Actual: ${currentTLSummary.monthlyActual}
• Gap: ${currentTLSummary.salesGap > 0 ? currentTLSummary.salesGap : "✅ Target Met!"}
• Progress: ${currentTLSummary.performancePercent}%

${currentTLSummary.unpaidSales.length > 0 ? `
⚠️ *Unpaid Sales (${currentTLSummary.unpaidSales.length}):*
${currentTLSummary.unpaidSales.slice(0, 5).map((s, i) => 
  `${i + 1}. SC: ${s.smartcard} | ${s.customerPhone}`
).join("\n")}
${currentTLSummary.unpaidSales.length > 5 ? `... and ${currentTLSummary.unpaidSales.length - 5} more` : ""}
` : ""}
━━━━━━━━━━━━━━━━━━━━━
_Generated by TSM Manager_
    `.trim();
    
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  // Share via Email
  const shareEmail = () => {
    if (!currentTLSummary) return;
    
    const subject = `TSM Manager - TL Performance Report: ${currentTLSummary.name}`;
    const body = `
TSM Manager - TL Performance Report

Team Leader: ${currentTLSummary.name}
Region: ${currentTLSummary.region}
Date: ${new Date().toLocaleDateString()}

STOCK SUMMARY:
- Received: ${currentTLSummary.stockReceived}
- In Hand: ${currentTLSummary.stockInHand}
- Sold: ${currentTLSummary.stockSold}
- Unpaid: ${currentTLSummary.stockUnpaid}

MONTHLY PERFORMANCE:
- Target: ${currentTLSummary.monthlyTarget}
- Actual: ${currentTLSummary.monthlyActual}
- Gap: ${currentTLSummary.salesGap > 0 ? currentTLSummary.salesGap : "Target Met!"}
- Progress: ${currentTLSummary.performancePercent}%

${currentTLSummary.unpaidSales.length > 0 ? `
UNPAID SALES (${currentTLSummary.unpaidSales.length}):
${currentTLSummary.unpaidSales.map((s, i) => 
  `${i + 1}. Smartcard: ${s.smartcard} | Phone: ${s.customerPhone} | Date: ${s.soldAt}`
).join("\n")}
` : "No unpaid sales"}

---
Generated by TSM Manager
    `.trim();
    
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank");
  };

  // Insights generation
  const getInsights = (summary: TLSummary) => {
    const insights: { type: "success" | "warning" | "danger"; message: string }[] = [];
    
    if (summary.performancePercent >= 100) {
      insights.push({ type: "success", message: "🎉 Target achieved! Great performance this month." });
    } else if (summary.performancePercent >= 75) {
      insights.push({ type: "warning", message: `📈 Good progress! Need ${summary.salesGap} more sales to hit target.` });
    } else if (summary.performancePercent >= 50) {
      insights.push({ type: "warning", message: `⚠️ Halfway there. ${summary.salesGap} sales needed to reach target.` });
    } else {
      insights.push({ type: "danger", message: `🚨 Behind target. ${summary.salesGap} sales needed urgently.` });
    }
    
    if (summary.stockUnpaid > 0) {
      const unpaidRate = Math.round((summary.stockUnpaid / summary.stockSold) * 100);
      if (unpaidRate > 30) {
        insights.push({ type: "danger", message: `💰 High unpaid rate (${unpaidRate}%). Focus on collections.` });
      } else if (unpaidRate > 15) {
        insights.push({ type: "warning", message: `💵 ${summary.stockUnpaid} unpaid sales need follow-up.` });
      }
    }
    
    if (summary.stockInHand > summary.stockSold) {
      insights.push({ type: "warning", message: `📦 ${summary.stockInHand} units still in hand. Push conversions.` });
    }
    
    return insights;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            TL Performance Report
          </h1>
          <p className="text-muted-foreground text-sm">
            Generate and share team leader performance summaries
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedTL} onValueChange={setSelectedTL}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Team Leader" />
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
      </div>

      {!selectedTL ? (
        <div className="glass rounded-xl border border-border/50 p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-2">Select a Team Leader</h3>
          <p className="text-muted-foreground">Choose a TL from the dropdown to generate their performance report</p>
        </div>
      ) : currentTLSummary ? (
        <>
          {/* Export Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={exportToImage}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Save as Image
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={exportToPDF}
              disabled={isExporting}
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-green-500 hover:text-green-400"
              onClick={shareWhatsApp}
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={shareEmail}
            >
              <Mail className="w-4 h-4" />
              Email
            </Button>
          </div>

          {/* Report Card */}
          <div ref={reportRef} className="bg-background rounded-xl border border-border/50 overflow-hidden">
            {/* Report Header */}
            <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{currentTLSummary.name}</h2>
                    <div className="flex items-center gap-3 text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {currentTLSummary.region}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <img src="/logo-icon.png" alt="TSM" className="w-12 h-12 opacity-80" />
                  <p className="text-xs text-muted-foreground mt-1">TSM Manager</p>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-secondary/30 rounded-xl p-4 text-center">
                <Package className="w-6 h-6 mx-auto mb-2 text-info" />
                <p className="text-2xl font-bold text-foreground">{currentTLSummary.stockReceived}</p>
                <p className="text-xs text-muted-foreground">Stock Received</p>
              </div>
              <div className="bg-secondary/30 rounded-xl p-4 text-center">
                <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-warning" />
                <p className="text-2xl font-bold text-foreground">{currentTLSummary.stockInHand}</p>
                <p className="text-xs text-muted-foreground">In Hand</p>
              </div>
              <div className="bg-secondary/30 rounded-xl p-4 text-center">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-success" />
                <p className="text-2xl font-bold text-success">{currentTLSummary.stockSold}</p>
                <p className="text-xs text-muted-foreground">Stock Sold</p>
              </div>
              <div className="bg-secondary/30 rounded-xl p-4 text-center">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-destructive" />
                <p className="text-2xl font-bold text-destructive">{currentTLSummary.stockUnpaid}</p>
                <p className="text-xs text-muted-foreground">Unpaid</p>
              </div>
            </div>

            {/* Target vs Actual */}
            <div className="px-6 pb-6">
              <div className="bg-secondary/20 rounded-xl p-5 border border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Monthly Performance</h3>
                  </div>
                  <Badge 
                    variant={currentTLSummary.performancePercent >= 100 ? "success" : currentTLSummary.performancePercent >= 50 ? "warning" : "destructive"}
                    className="text-sm"
                  >
                    {currentTLSummary.performancePercent}%
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{currentTLSummary.monthlyTarget}</p>
                    <p className="text-xs text-muted-foreground">Target</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-foreground">{currentTLSummary.monthlyActual}</p>
                    <p className="text-xs text-muted-foreground">Actual</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {currentTLSummary.salesGap > 0 ? (
                        <TrendingDown className="w-5 h-5 text-destructive" />
                      ) : (
                        <TrendingUp className="w-5 h-5 text-success" />
                      )}
                      <p className={cn(
                        "text-3xl font-bold",
                        currentTLSummary.salesGap > 0 ? "text-destructive" : "text-success"
                      )}>
                        {Math.abs(currentTLSummary.salesGap)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {currentTLSummary.salesGap > 0 ? "Gap" : "Surplus"}
                    </p>
                  </div>
                </div>
                
                <Progress 
                  value={Math.min(currentTLSummary.performancePercent, 100)} 
                  className="h-3"
                />
              </div>
            </div>

            {/* Insights */}
            <div className="px-6 pb-6">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Insights
              </h3>
              <div className="space-y-2">
                {getInsights(currentTLSummary).map((insight, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "p-3 rounded-lg text-sm",
                      insight.type === "success" && "bg-success/10 text-success border border-success/20",
                      insight.type === "warning" && "bg-warning/10 text-warning border border-warning/20",
                      insight.type === "danger" && "bg-destructive/10 text-destructive border border-destructive/20"
                    )}
                  >
                    {insight.message}
                  </div>
                ))}
              </div>
            </div>

            {/* Unpaid Table */}
            {currentTLSummary.unpaidSales.length > 0 && (
              <div className="px-6 pb-6">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Unpaid Sales ({currentTLSummary.unpaidSales.length})
                </h3>
                <div className="border border-border/50 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/30">
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">Smartcard</TableHead>
                        <TableHead className="text-xs">Customer Phone</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Package</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentTLSummary.unpaidSales.map((sale, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="text-xs font-mono">{sale.smartcard}</TableCell>
                          <TableCell className="text-xs">
                            <a 
                              href={`tel:${sale.customerPhone}`} 
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <Phone className="w-3 h-3" />
                              {sale.customerPhone}
                            </a>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{sale.soldAt}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {sale.packageType}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-6 py-4 bg-secondary/20 border-t border-border/50 text-center">
              <p className="text-xs text-muted-foreground">
                Generated by TSM Stock Control Management System • {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="glass rounded-xl border border-border/50 p-12 text-center">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-destructive opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-2">TL Not Found</h3>
          <p className="text-muted-foreground">Could not load data for this team leader</p>
        </div>
      )}
    </div>
  );
};

export default AdminReport;
