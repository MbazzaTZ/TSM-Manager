import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useInventory, useBulkUpdateInventory } from "@/hooks/useInventory";
import { useCreateSale } from "@/hooks/useSales";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search as SearchIcon,
  Loader2,
  AlertTriangle,
  Eye,
  ShieldCheck,
} from "lucide-react";

export interface PendingStockUpdate {
  id: string;
  inventoryId: string;
  smartcard: string;
  serialNumber: string;
  stockType: string;
  currentStatus: string;
  requestedChanges: {
    stockStatus?: string;
    paymentStatus?: string;
    hasPackage?: string;
    assignToTL?: string;
    assignTLName?: string;
    assignToDSR?: string;
    assignDSRName?: string;
    customerPhone?: string;
  };
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
}

// Helper to get pending updates from localStorage
export const getPendingUpdates = (): PendingStockUpdate[] => {
  try {
    const stored = localStorage.getItem("tsm_pending_updates");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Helper to save pending updates to localStorage
export const savePendingUpdates = (updates: PendingStockUpdate[]) => {
  localStorage.setItem("tsm_pending_updates", JSON.stringify(updates));
};

// Helper to add a new pending update
export const addPendingUpdate = (update: Omit<PendingStockUpdate, "id" | "requestedAt" | "status">) => {
  const updates = getPendingUpdates();
  const newUpdate: PendingStockUpdate = {
    ...update,
    id: `upd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    requestedAt: new Date().toISOString(),
    status: "pending",
  };
  updates.unshift(newUpdate);
  savePendingUpdates(updates);
  return newUpdate;
};

const AdminVerification = () => {
  const { t } = useLanguage();
  const { user, isAdmin } = useAuth();
  const { data: inventory = [] } = useInventory();
  const bulkUpdateInventory = useBulkUpdateInventory();
  const createSale = useCreateSale();

  const [pendingUpdates, setPendingUpdates] = useState<PendingStockUpdate[]>(getPendingUpdates);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUpdate, setSelectedUpdate] = useState<PendingStockUpdate | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter updates
  const filteredUpdates = useMemo(() => {
    const pending = pendingUpdates.filter((u) => u.status === "pending");
    if (!searchTerm.trim()) return pending;
    const term = searchTerm.toLowerCase();
    return pending.filter(
      (u) =>
        u.smartcard?.toLowerCase().includes(term) ||
        u.serialNumber?.toLowerCase().includes(term) ||
        u.requestedByName?.toLowerCase().includes(term)
    );
  }, [pendingUpdates, searchTerm]);

  const recentHistory = useMemo(() => {
    return pendingUpdates
      .filter((u) => u.status !== "pending")
      .slice(0, 20);
  }, [pendingUpdates]);

  const handleApprove = async (update: PendingStockUpdate) => {
    if (!user?.id) {
      toast({ title: "Session required", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      const inventoryItem = inventory.find((i) => i.id === update.inventoryId);
      if (!inventoryItem) {
        toast({ title: "Stock not found", description: "The inventory item may have been deleted.", variant: "destructive" });
        return;
      }

      // Handle TL/DSR assignments
      if (update.requestedChanges.assignToTL || update.requestedChanges.assignToDSR) {
        const assignments = JSON.parse(localStorage.getItem("tsm_assignments") || "{}");
        if (update.requestedChanges.assignToTL) {
          assignments[update.inventoryId] = {
            ...assignments[update.inventoryId],
            tl_id: update.requestedChanges.assignToTL,
            tl_name: update.requestedChanges.assignTLName,
            assigned_at: new Date().toISOString(),
          };
        }
        if (update.requestedChanges.assignToDSR) {
          assignments[update.inventoryId] = {
            ...assignments[update.inventoryId],
            dsr_id: update.requestedChanges.assignToDSR,
            dsr_name: update.requestedChanges.assignDSRName,
            dsr_assigned_at: new Date().toISOString(),
          };
        }
        localStorage.setItem("tsm_assignments", JSON.stringify(assignments));
      }

      // Handle status change
      if (update.requestedChanges.stockStatus === "sold") {
        await createSale.mutateAsync({
          inventory_id: update.inventoryId,
          sold_by_user_id: user.id,
          customer_phone: update.requestedChanges.customerPhone || null,
          has_package: update.requestedChanges.hasPackage !== "no-package",
          package_type: update.requestedChanges.hasPackage !== "no-package" ? update.requestedChanges.hasPackage : null,
          is_paid: update.requestedChanges.paymentStatus === "paid",
        });
      } else if (update.requestedChanges.stockStatus) {
        const teamLeaders = JSON.parse(localStorage.getItem("tsm_team_members") || "[]").filter((m: any) => m.role === "team_leader");
        const tl = teamLeaders.find((t: any) => t.id === update.requestedChanges.assignToTL);

        await bulkUpdateInventory.mutateAsync({
          ids: [update.inventoryId],
          updates: {
            status: update.requestedChanges.stockStatus as any,
            assigned_to_team_id: tl?.team_id || undefined,
          },
        });
      }

      // Update the pending update status
      const updatedList = pendingUpdates.map((u) =>
        u.id === update.id ? { ...u, status: "approved" as const } : u
      );
      savePendingUpdates(updatedList);
      setPendingUpdates(updatedList);

      toast({ title: "Approved!", description: "Stock update has been applied successfully." });
      setDetailDialogOpen(false);
      setSelectedUpdate(null);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to apply update.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = (update: PendingStockUpdate) => {
    const updatedList = pendingUpdates.map((u) =>
      u.id === update.id ? { ...u, status: "rejected" as const } : u
    );
    savePendingUpdates(updatedList);
    setPendingUpdates(updatedList);

    toast({ title: "Rejected", description: "The update request has been rejected." });
    setDetailDialogOpen(false);
    setSelectedUpdate(null);
  };

  const openDetail = (update: PendingStockUpdate) => {
    setSelectedUpdate(update);
    setDetailDialogOpen(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "in_store":
        return "In Store";
      case "in_hand":
        return "In Field";
      case "sold":
        return "Sold";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Stock Update Verification
          </h1>
          <p className="text-muted-foreground text-sm">
            Review and approve stock update requests from team members.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="text-sm">
            <Clock className="h-3 w-3 mr-1" />
            {filteredUpdates.length} Pending
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="glass rounded-xl border border-border/50 p-4">
        <div className="relative w-full md:w-80">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by smartcard, serial, or requester..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Pending Updates */}
      <div className="glass rounded-xl border border-border/50">
        <div className="p-4 border-b border-border/50">
          <h2 className="font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Pending Approvals
          </h2>
        </div>

        {filteredUpdates.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-success/50" />
            <p className="font-medium">No pending requests</p>
            <p className="text-sm">All stock update requests have been processed.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filteredUpdates.map((update) => (
              <div
                key={update.id}
                className="p-4 hover:bg-secondary/20 transition-colors cursor-pointer"
                onClick={() => openDetail(update)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold">
                        {update.smartcard || update.serialNumber}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {update.stockType}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>Requested by: <strong>{update.requestedByName}</strong></span>
                      <span className="mx-2">•</span>
                      <span>{formatDate(update.requestedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <Badge variant="available">{getStatusLabel(update.currentStatus)}</Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant={update.requestedChanges.stockStatus === "sold" ? "sold" : "info"}>
                        {getStatusLabel(update.requestedChanges.stockStatus || update.currentStatus)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openDetail(update); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprove(update);
                      }}
                      disabled={isProcessing}
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReject(update);
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent History */}
      {recentHistory.length > 0 && (
        <div className="glass rounded-xl border border-border/50">
          <div className="p-4 border-b border-border/50">
            <h2 className="font-semibold">Recent History</h2>
          </div>
          <div className="divide-y divide-border/30 max-h-64 overflow-auto">
            {recentHistory.map((update) => (
              <div key={update.id} className="p-3 text-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {update.status === "approved" ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="font-mono">{update.smartcard || update.serialNumber}</span>
                  <span className="text-muted-foreground">by {update.requestedByName}</span>
                </div>
                <Badge variant={update.status === "approved" ? "success" : "destructive"}>
                  {update.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Review Update Request
            </DialogTitle>
            <DialogDescription>
              Review the details and approve or reject this stock update.
            </DialogDescription>
          </DialogHeader>

          {selectedUpdate && (
            <div className="space-y-4 py-4">
              {/* Stock Info */}
              <div className="rounded-lg border border-border/50 p-4 bg-secondary/20">
                <h4 className="text-sm font-semibold mb-2">Stock Information</h4>
                <div className="grid gap-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Smartcard:</span>
                    <span className="font-mono">{selectedUpdate.smartcard || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serial:</span>
                    <span className="font-mono">{selectedUpdate.serialNumber || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span>{selectedUpdate.stockType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Status:</span>
                    <Badge variant="available">{getStatusLabel(selectedUpdate.currentStatus)}</Badge>
                  </div>
                </div>
              </div>

              {/* Requested Changes */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <h4 className="text-sm font-semibold mb-2 text-primary">Requested Changes</h4>
                <div className="grid gap-2 text-sm">
                  {selectedUpdate.requestedChanges.stockStatus && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">New Status:</span>
                      <Badge variant={selectedUpdate.requestedChanges.stockStatus === "sold" ? "sold" : "info"}>
                        {getStatusLabel(selectedUpdate.requestedChanges.stockStatus)}
                      </Badge>
                    </div>
                  )}
                  {selectedUpdate.requestedChanges.assignTLName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assign to TL:</span>
                      <span>{selectedUpdate.requestedChanges.assignTLName}</span>
                    </div>
                  )}
                  {selectedUpdate.requestedChanges.assignDSRName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assign to DSR:</span>
                      <span>{selectedUpdate.requestedChanges.assignDSRName}</span>
                    </div>
                  )}
                  {selectedUpdate.requestedChanges.stockStatus === "sold" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment:</span>
                        <Badge variant={selectedUpdate.requestedChanges.paymentStatus === "paid" ? "success" : "warning"}>
                          {selectedUpdate.requestedChanges.paymentStatus}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Package:</span>
                        <span className="capitalize">{selectedUpdate.requestedChanges.hasPackage === "no-package" ? "No Package" : selectedUpdate.requestedChanges.hasPackage?.replace("-", " ")}</span>
                      </div>
                      {selectedUpdate.requestedChanges.customerPhone && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Customer Phone:</span>
                          <span>{selectedUpdate.requestedChanges.customerPhone}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Request Info */}
              <div className="rounded-lg border border-border/50 p-4 bg-secondary/10">
                <div className="grid gap-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requested By:</span>
                    <span className="font-medium">{selectedUpdate.requestedByName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requested At:</span>
                    <span>{formatDate(selectedUpdate.requestedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1 gap-2"
                  onClick={() => handleApprove(selectedUpdate)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Approve & Apply
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleReject(selectedUpdate)}
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVerification;
