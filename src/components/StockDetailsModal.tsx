import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSaleByInventory, useMarkAsPaid, useUpdateSale } from "@/hooks/useSales";
import { useUpdateInventory, InventoryItem } from "@/hooks/useInventory";
import { useTeams, useRegions } from "@/hooks/useTeams";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Package,
  CreditCard,
  Hash,
  Calendar,
  User,
  Phone,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  X,
  Loader2,
  Tv,
  Clock,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface StockDetailsModalProps {
  item: InventoryItem | null;
  open: boolean;
  onClose: () => void;
}

const StockDetailsModal = ({ item, open, onClose }: StockDetailsModalProps) => {
  const { isAdmin } = useAuth();
  const { data: sale, isLoading: saleLoading } = useSaleByInventory(item?.id);
  const { data: teams } = useTeams();
  const { data: regions } = useRegions();
  const markAsPaid = useMarkAsPaid();
  const updateInventory = useUpdateInventory();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    smartcard: "",
    serial_number: "",
    stock_type: "" as "full_set" | "decoder_only",
    region_id: "",
    assigned_to_team_id: "",
  });

  const startEditing = () => {
    if (item) {
      setEditForm({
        smartcard: item.smartcard,
        serial_number: item.serial_number,
        stock_type: item.stock_type,
        region_id: item.region_id || "",
        assigned_to_team_id: item.assigned_to_team_id || "",
      });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!item) return;

    await updateInventory.mutateAsync({
      id: item.id,
      ...editForm,
      region_id: editForm.region_id || null,
      assigned_to_team_id: editForm.assigned_to_team_id || null,
    });

    setIsEditing(false);
  };

  const handleMarkAsPaid = async () => {
    if (sale) {
      await markAsPaid.mutateAsync(sale.id);
    }
  };

  if (!item) return null;

  const daysUnpaid = sale && !sale.is_paid
    ? differenceInDays(new Date(), new Date(sale.sold_at))
    : 0;

  const daysToPaid = sale && sale.is_paid && sale.paid_at
    ? differenceInDays(new Date(sale.paid_at), new Date(sale.sold_at))
    : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Stock Details
            </DialogTitle>
            {isAdmin && !isEditing && item.status !== "sold" && (
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Badge
              variant={
                item.status === "sold"
                  ? "sold"
                  : item.status === "in_hand"
                  ? "warning"
                  : "success"
              }
              className="text-sm"
            >
              {item.status === "sold"
                ? "Sold"
                : item.status === "in_hand"
                ? "In Field"
                : "Available"}
            </Badge>
            <Badge variant="secondary">
              {item.stock_type === "full_set" ? "Full Set" : "Decoder Only"}
            </Badge>
          </div>

          <Separator />

          {/* Stock Information */}
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Smartcard Number</Label>
                <Input
                  value={editForm.smartcard}
                  onChange={(e) =>
                    setEditForm({ ...editForm, smartcard: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input
                  value={editForm.serial_number}
                  onChange={(e) =>
                    setEditForm({ ...editForm, serial_number: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Stock Type</Label>
                <Select
                  value={editForm.stock_type}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, stock_type: v as "full_set" | "decoder_only" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_set">Full Set</SelectItem>
                    <SelectItem value="decoder_only">Decoder Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Select
                  value={editForm.region_id}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, region_id: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No region</SelectItem>
                    {regions?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned Team</Label>
                <Select
                  value={editForm.assigned_to_team_id}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, assigned_to_team_id: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No team</SelectItem>
                    {teams?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveEdit}
                  className="flex-1"
                  disabled={updateInventory.isPending}
                >
                  {updateInventory.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                <CreditCard className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Smartcard Number</p>
                  <p className="font-mono font-bold text-lg text-foreground">
                    {item.smartcard}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                <Hash className="w-5 h-5 text-info" />
                <div>
                  <p className="text-xs text-muted-foreground">Serial Number</p>
                  <p className="font-mono font-medium text-foreground">
                    {item.serial_number}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
                  <Tv className="w-4 h-4 text-warning" />
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="text-sm font-medium">
                      {item.stock_type === "full_set" ? "Full Set" : "Decoder Only"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Batch</p>
                    <p className="text-sm font-medium">{item.batch_number}</p>
                  </div>
                </div>
              </div>

              {item.regions?.name && (
                <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                  <MapPin className="w-4 h-4 text-success" />
                  <div>
                    <p className="text-xs text-muted-foreground">Region</p>
                    <p className="text-sm font-medium">{item.regions.name}</p>
                  </div>
                </div>
              )}

              {item.teams?.name && (
                <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                  <Users className="w-4 h-4 text-info" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned Team</p>
                    <p className="text-sm font-medium">{item.teams.name}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sale Information */}
          {item.status === "sold" && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Sale Information
                </h4>

                {saleLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : sale ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                      <Hash className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Sale ID</p>
                        <p className="font-mono text-sm">{sale.sale_id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Sold On</p>
                          <p className="text-sm">
                            {format(new Date(sale.sold_at), "dd MMM yyyy")}
                          </p>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg",
                          sale.is_paid
                            ? "bg-success/10"
                            : "bg-destructive/10"
                        )}
                      >
                        {sale.is_paid ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <p
                            className={cn(
                              "text-sm font-medium",
                              sale.is_paid ? "text-success" : "text-destructive"
                            )}
                          >
                            {sale.is_paid ? "Paid" : "Unpaid"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Days Count */}
                    <div
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg",
                        sale.is_paid
                          ? "bg-success/10"
                          : daysUnpaid >= 30
                          ? "bg-destructive/20"
                          : daysUnpaid >= 14
                          ? "bg-warning/20"
                          : "bg-info/10"
                      )}
                    >
                      <Clock className="w-5 h-5" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {sale.is_paid ? "Days to Payment" : "Days Unpaid"}
                        </p>
                        <p
                          className={cn(
                            "text-lg font-bold",
                            sale.is_paid
                              ? "text-success"
                              : daysUnpaid >= 30
                              ? "text-destructive"
                              : daysUnpaid >= 14
                              ? "text-warning"
                              : "text-info"
                          )}
                        >
                          {sale.is_paid ? daysToPaid : daysUnpaid} days
                        </p>
                      </div>
                    </div>

                    {sale.customer_phone && (
                      <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                        <Phone className="w-4 h-4 text-info" />
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Customer Phone
                          </p>
                          <p className="text-sm">{sale.customer_phone}</p>
                        </div>
                      </div>
                    )}

                    {sale.package_type && (
                      <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                        <Tv className="w-4 h-4 text-warning" />
                        <div>
                          <p className="text-xs text-muted-foreground">Package</p>
                          <p className="text-sm capitalize">
                            {sale.package_type.replace("-", " ")}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Admin Actions */}
                    {isAdmin && !sale.is_paid && (
                      <Button
                        onClick={handleMarkAsPaid}
                        className="w-full"
                        variant="success"
                        disabled={markAsPaid.isPending}
                      >
                        {markAsPaid.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Mark as Paid
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sale information not found
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StockDetailsModal;
