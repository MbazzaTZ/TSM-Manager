import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle2, Clock, Phone, User, Users, MapPin, Receipt } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { InventoryItem } from "@/hooks/useInventory";
import { Sale } from "@/hooks/useSales";

interface SearchResult extends InventoryItem {
  sale?: Sale | null;
}

interface SearchResultCardProps {
  result: SearchResult;
}

const SearchResultCard = ({ result }: SearchResultCardProps) => {
  const { t } = useLanguage();
  
  const getStatusIcon = () => {
    switch (result.status) {
      case "sold": return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "in_hand": return <Package className="w-5 h-5 text-warning" />;
      default: return <Clock className="w-5 h-5 text-primary" />;
    }
  };

  const getStatusText = () => {
    switch (result.status) {
      case "sold": return t("status.sold");
      case "in_hand": return t("status.inHand");
      default: return t("status.available");
    }
  };

  return (
    <div className="glass-hover rounded-2xl p-6 animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <span className="font-mono text-xl font-bold text-foreground">{result.smartcard || "-"}</span>
            <p className="text-sm text-muted-foreground font-mono">{result.serial_number}</p>
          </div>
        </div>
        <Badge variant={result.status === "sold" ? "sold" : result.status === "in_hand" ? "inHand" : "available"}>{getStatusText()}</Badge>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant={result.stock_type === "full_set" ? "info" : "secondary"}>{result.stock_type === "full_set" ? t("stock.fullSet") : t("stock.decoderOnly")}</Badge>
        {result.sale?.has_package && result.sale?.package_type && (
          <Badge variant="sold" className="capitalize">{result.sale.package_type.replace("-", " ")}</Badge>
        )}
        {result.sale?.has_package === false && (
          <Badge variant="inHand">{t("status.noPackage")}</Badge>
        )}
      </div>

      {result.status !== "in_store" && (
        <div className="space-y-2 pt-4 border-t border-border/50">
          {result.regions?.name && <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-warning" /><span className="text-muted-foreground">{result.regions.name}</span></div>}
          {result.teams?.name && <div className="flex items-center gap-2 text-sm"><Users className="w-4 h-4 text-info" /><span className="text-muted-foreground">{t("common.team")}: {result.teams.name}</span></div>}
          {result.sale && (
            <>
              <div className="flex items-center gap-2 text-sm"><Receipt className="w-4 h-4" /><span className={result.sale.is_paid ? "text-success" : "text-destructive font-medium"}>{t("common.payment")}: {result.sale.is_paid ? t("status.paid") : t("status.unpaid")}</span></div>
              <div className="flex items-center gap-2 text-sm"><span className="font-mono text-muted-foreground">SaleID: {result.sale.sale_id}</span></div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchResultCard;
