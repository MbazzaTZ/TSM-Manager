import { ChangeEvent, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  InventoryItem,
  StockType,
  useAddInventory,
  useInventory,
  useInventoryStats,
  useBulkUpdateInventory,
  useDeleteInventory,
} from "@/hooks/useInventory";
import { useRegions, useTeams } from "@/hooks/useTeams";
import { useCreateSale } from "@/hooks/useSales";
import { toast } from "@/hooks/use-toast";
import StockDetailsModal from "@/components/StockDetailsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Download,
  Loader2,
  Package,
  Plus,
  Search as SearchIcon,
  ShoppingCart,
  Upload,
  Trash2,
  UserCheck,
  Users,
  Edit,
  Filter,
  X,
} from "lucide-react";
import { addPendingUpdate, getPendingUpdates } from "./AdminVerification";

const stockTypeLabels: Record<StockType, string> = {
  full_set: "Full Set",
  decoder_only: "Decoder Only",
};

const statusBadgeMap: Record<string, "sold" | "inHand" | "available"> = {
  sold: "sold",
  in_hand: "inHand",
  in_store: "available",
};

type BulkRow = {
  batch_number: string;
  smartcard: string;
  serial_number: string;
  stock_type: StockType;
  region?: string;
};

const STOCK_TYPE_OPTIONS: { value: StockType; label: string }[] = [
  { value: "full_set", label: "Full Set" },
  { value: "decoder_only", label: "Decoder Only" },
];

const AdminInventory = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: inventory = [], isLoading } = useInventory();
  const { data: stats } = useInventoryStats();
  const { data: regions = [] } = useRegions();
  const { data: teams = [] } = useTeams();
  const addInventory = useAddInventory();
  const bulkUpdateInventory = useBulkUpdateInventory();
  const deleteInventory = useDeleteInventory();
  const createSale = useCreateSale();

  // Get TL/DSR members from localStorage
  const [members] = useState(() => {
    try {
      const stored = localStorage.getItem("tsm_team_members");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const teamLeaders = members.filter((m: any) => m.role === "team_leader");
  const dsrs = members.filter((m: any) => m.role === "dsr");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterByTL, setFilterByTL] = useState("");
  const [filterByRegion, setFilterByRegion] = useState("");
  const [filterByStatus, setFilterByStatus] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isParsingBulk, setIsParsingBulk] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [bulkFileKey, setBulkFileKey] = useState(0);
  const [selectedStock, setSelectedStock] = useState<InventoryItem | null>(null);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [stockDetailsModalOpen, setStockDetailsModalOpen] = useState(false);
  const [stockDetailsId, setStockDetailsId] = useState<string | null>(null);
  const [saleForm, setSaleForm] = useState({
    customerPhone: "",
    hasPackage: "no-package" as "access" | "family" | "compact" | "compact-plus" | "premium" | "no-package",
    paymentStatus: "paid" as "paid" | "unpaid",
  });
  const [manualForm, setManualForm] = useState({
    batch_number: "",
    smartcard: "",
    serial_number: "",
    stock_type: "full_set" as StockType,
    region_id: "",
  });

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignTLDialogOpen, setAssignTLDialogOpen] = useState(false);
  const [assignDSRDialogOpen, setAssignDSRDialogOpen] = useState(false);
  const [selectedTL, setSelectedTL] = useState("");
  const [selectedDSR, setSelectedDSR] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");

  // Floating Add Sale dialog state
  const [floatingSaleOpen, setFloatingSaleOpen] = useState(false);
  const [floatingSearch, setFloatingSearch] = useState("");
  const [floatingSearchResult, setFloatingSearchResult] = useState<InventoryItem | null>(null);
  const [floatingSearched, setFloatingSearched] = useState(false);
  const [floatingSaleForm, setFloatingSaleForm] = useState({
    assignToTL: "",
    assignToDSR: "",
    stockStatus: "sold" as "in_store" | "in_hand" | "sold",
    paymentStatus: "paid" as "paid" | "unpaid",
    hasPackage: "no-package" as "access" | "family" | "compact" | "compact-plus" | "premium" | "no-package",
    customerPhone: "",
  });

  // Update Stock dialog state (for non-admin or request approval)
  const [updateStockDialogOpen, setUpdateStockDialogOpen] = useState(false);
  const [updateStockSearch, setUpdateStockSearch] = useState("");
  const [updateStockResult, setUpdateStockResult] = useState<InventoryItem | null>(null);
  const [updateStockSearched, setUpdateStockSearched] = useState(false);
  const [updateStockForm, setUpdateStockForm] = useState({
    assignToTL: "",
    assignToDSR: "",
    stockStatus: "" as "" | "in_store" | "in_hand" | "sold",
    paymentStatus: "paid" as "paid" | "unpaid",
    hasPackage: "no-package" as "access" | "family" | "compact" | "compact-plus" | "premium" | "no-package",
    customerPhone: "",
  });

  const regionLookup = useMemo(() => {
    const map = new Map<string, string>();
    regions.forEach((region) => {
      map.set(region.id.toLowerCase(), region.id);
      map.set(region.name.toLowerCase(), region.id);
    });
    return map;
  }, [regions]);

  // Download sample CSV template
  const downloadSampleTemplate = () => {
    const sampleData = [
      ["batch_number", "smartcard", "serial_number", "stock_type", "region"],
      ["BATCH001", "7025123456", "SN001234567", "Full Set", "Dar es Salaam"],
      ["BATCH001", "7025123457", "SN001234568", "Full Set", "Dar es Salaam"],
      ["BATCH002", "7025123458", "SN001234569", "Decoder Only", "Arusha"],
      ["BATCH002", "7025123459", "SN001234570", "DO", "Mwanza"],
      ["BATCH003", "7025123460", "SN001234571", "FS", "Dodoma"],
    ];
    
    const csvContent = sampleData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "stock_upload_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({ title: "Template Downloaded", description: "Fill in the template and upload it back." });
  };

  const filteredInventory = useMemo(() => {
    let result = inventory;
    
    // Search filter
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter((item) => {
        return (
          item.smartcard?.toLowerCase().includes(term) ||
          item.serial_number?.toLowerCase().includes(term) ||
          item.batch_number?.toLowerCase().includes(term) ||
          item.regions?.name?.toLowerCase().includes(term) ||
          item.assigned_to_tl?.toLowerCase().includes(term) ||
          item.assigned_to_dsr?.toLowerCase().includes(term)
        );
      });
    }
    
    // Filter by TL
    if (filterByTL) {
      const tl = teamLeaders.find((t: any) => t.id === filterByTL);
      if (tl) {
        result = result.filter((item) => 
          item.assigned_to_tl?.toLowerCase() === tl.name.toLowerCase()
        );
      }
    }
    
    // Filter by Region
    if (filterByRegion) {
      result = result.filter((item) => item.region_id === filterByRegion);
    }
    
    // Filter by Status
    if (filterByStatus) {
      result = result.filter((item) => item.status === filterByStatus);
    }
    
    return result;
  }, [inventory, searchTerm, filterByTL, filterByRegion, filterByStatus, teamLeaders]);

  const totalStock = inventory.length;
  const totalAvailable = stats?.available ?? inventory.filter((item) => item.status === "in_store").length;
  const totalInHand = stats?.inHand ?? inventory.filter((item) => item.status === "in_hand").length;
  const totalSold = stats?.sold ?? inventory.filter((item) => item.status === "sold").length;

  // Selection handlers
  const isAllSelected = filteredInventory.length > 0 && filteredInventory.every(item => selectedIds.has(item.id));
  const isSomeSelected = selectedIds.size > 0;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInventory.map(item => item.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Assign to TL handler
  const handleAssignToTL = async () => {
    if (!selectedTL || selectedIds.size === 0) {
      toast({ title: "Error", description: "Select a Team Leader", variant: "destructive" });
      return;
    }

    const tl = teamLeaders.find((t: any) => t.id === selectedTL);
    
    // Update inventory status to in_hand and store TL info in metadata
    await bulkUpdateInventory.mutateAsync({
      ids: Array.from(selectedIds),
      updates: {
        status: "in_hand" as any,
        assigned_to_team_id: tl?.team_id || null,
      },
    });

    // Store assignment in localStorage for tracking
    const assignments = JSON.parse(localStorage.getItem("tsm_assignments") || "{}");
    Array.from(selectedIds).forEach(id => {
      assignments[id] = { tl_id: selectedTL, tl_name: tl?.name, assigned_at: new Date().toISOString() };
    });
    localStorage.setItem("tsm_assignments", JSON.stringify(assignments));

    setAssignTLDialogOpen(false);
    setSelectedTL("");
    clearSelection();
  };

  // Assign to DSR handler
  const handleAssignToDSR = async () => {
    if (!selectedDSR || selectedIds.size === 0) {
      toast({ title: "Error", description: "Select a DSR", variant: "destructive" });
      return;
    }

    const dsr = dsrs.find((d: any) => d.id === selectedDSR);
    
    // Store DSR assignment in localStorage for tracking
    const assignments = JSON.parse(localStorage.getItem("tsm_assignments") || "{}");
    Array.from(selectedIds).forEach(id => {
      assignments[id] = { 
        ...assignments[id],
        dsr_id: selectedDSR, 
        dsr_name: dsr?.name, 
        dsr_assigned_at: new Date().toISOString() 
      };
    });
    localStorage.setItem("tsm_assignments", JSON.stringify(assignments));

    toast({ title: "Assigned to DSR", description: `${selectedIds.size} item(s) assigned to ${dsr?.name}` });
    setAssignDSRDialogOpen(false);
    setSelectedDSR("");
    clearSelection();
  };

  // Delete handler
  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} item(s)? This cannot be undone.`)) {
      return;
    }

    await deleteInventory.mutateAsync(Array.from(selectedIds));
    clearSelection();
  };

  // Floating Add Sale handlers
  const handleFloatingSearch = () => {
    const term = floatingSearch.trim().toLowerCase();
    if (!term) {
      toast({ title: "Enter smartcard number", variant: "destructive" });
      return;
    }
    // Exact match search
    const found = inventory.find(
      (item) => item.smartcard?.toLowerCase() === term || item.serial_number?.toLowerCase() === term
    );
    setFloatingSearchResult(found || null);
    setFloatingSearched(true);
    if (found) {
      // Pre-fill form based on current state
      setFloatingSaleForm({
        assignToTL: "",
        assignToDSR: "",
        stockStatus: "sold",
        paymentStatus: "paid",
        hasPackage: "no-package",
        customerPhone: "",
      });
    }
  };

  const handleFloatingSaleSubmit = async () => {
    if (!floatingSearchResult) return;
    if (!user?.id) {
      toast({ title: "User session required", description: "Please sign in again.", variant: "destructive" });
      return;
    }

    try {
      // Update assignments in localStorage
      if (floatingSaleForm.assignToTL || floatingSaleForm.assignToDSR) {
        const assignments = JSON.parse(localStorage.getItem("tsm_assignments") || "{}");
        if (floatingSaleForm.assignToTL) {
          const tl = teamLeaders.find((t: any) => t.id === floatingSaleForm.assignToTL);
          assignments[floatingSearchResult.id] = {
            ...assignments[floatingSearchResult.id],
            tl_id: floatingSaleForm.assignToTL,
            tl_name: tl?.name,
            assigned_at: new Date().toISOString(),
          };
        }
        if (floatingSaleForm.assignToDSR) {
          const dsr = dsrs.find((d: any) => d.id === floatingSaleForm.assignToDSR);
          assignments[floatingSearchResult.id] = {
            ...assignments[floatingSearchResult.id],
            dsr_id: floatingSaleForm.assignToDSR,
            dsr_name: dsr?.name,
            dsr_assigned_at: new Date().toISOString(),
          };
        }
        localStorage.setItem("tsm_assignments", JSON.stringify(assignments));
      }

      // If marking as sold, create sale record
      if (floatingSaleForm.stockStatus === "sold") {
        await createSale.mutateAsync({
          inventory_id: floatingSearchResult.id,
          sold_by_user_id: user.id,
          customer_phone: floatingSaleForm.customerPhone.trim() || null,
          has_package: floatingSaleForm.hasPackage !== "no-package",
          is_paid: floatingSaleForm.paymentStatus === "paid",
          package_type: floatingSaleForm.hasPackage !== "no-package" ? floatingSaleForm.hasPackage : null,
        });
      } else {
        // Just update status without creating a sale
        await bulkUpdateInventory.mutateAsync({
          ids: [floatingSearchResult.id],
          updates: {
            status: floatingSaleForm.stockStatus as any,
            assigned_to_team_id: floatingSaleForm.assignToTL ? teamLeaders.find((t: any) => t.id === floatingSaleForm.assignToTL)?.team_id : undefined,
          },
        });
      }

      toast({ title: "Success", description: "Stock updated successfully!" });
      setFloatingSaleOpen(false);
      resetFloatingSaleDialog();
    } catch (error) {
      // error handled by hook
    }
  };

  const resetFloatingSaleDialog = () => {
    setFloatingSearch("");
    setFloatingSearchResult(null);
    setFloatingSearched(false);
    setFloatingSaleForm({
      assignToTL: "",
      assignToDSR: "",
      stockStatus: "sold",
      paymentStatus: "paid",
      hasPackage: "no-package",
      customerPhone: "",
    });
  };

  // Update Stock handlers
  const handleUpdateStockSearch = () => {
    const term = updateStockSearch.trim().toLowerCase();
    if (!term) {
      toast({ title: "Enter smartcard or serial number", variant: "destructive" });
      return;
    }
    const found = inventory.find(
      (item) => item.smartcard?.toLowerCase() === term || item.serial_number?.toLowerCase() === term
    );
    setUpdateStockResult(found || null);
    setUpdateStockSearched(true);
    if (found) {
      setUpdateStockForm({
        assignToTL: "",
        assignToDSR: "",
        stockStatus: "",
        paymentStatus: "paid",
        hasPackage: "no-package",
        customerPhone: "",
      });
    }
  };

  const handleUpdateStockSubmit = async () => {
    if (!updateStockResult) return;
    if (!user?.id) {
      toast({ title: "Session required", variant: "destructive" });
      return;
    }

    // Check if user is admin - if so, apply directly
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const isUserAdmin = roleData?.role === "admin";
    const userName = user.email || "Unknown User";

    const tl = teamLeaders.find((t: any) => t.id === updateStockForm.assignToTL);
    const dsr = dsrs.find((d: any) => d.id === updateStockForm.assignToDSR);

    if (isUserAdmin) {
      // Admin: Apply directly
      try {
        // Handle assignments
        if (updateStockForm.assignToTL || updateStockForm.assignToDSR) {
          const assignments = JSON.parse(localStorage.getItem("tsm_assignments") || "{}");
          if (updateStockForm.assignToTL && updateStockForm.assignToTL !== "none") {
            assignments[updateStockResult.id] = {
              ...assignments[updateStockResult.id],
              tl_id: updateStockForm.assignToTL,
              tl_name: tl?.name,
              assigned_at: new Date().toISOString(),
            };
          }
          if (updateStockForm.assignToDSR && updateStockForm.assignToDSR !== "none") {
            assignments[updateStockResult.id] = {
              ...assignments[updateStockResult.id],
              dsr_id: updateStockForm.assignToDSR,
              dsr_name: dsr?.name,
              dsr_assigned_at: new Date().toISOString(),
            };
          }
          localStorage.setItem("tsm_assignments", JSON.stringify(assignments));
        }

        // Handle status change
        if (updateStockForm.stockStatus === "sold") {
          await createSale.mutateAsync({
            inventory_id: updateStockResult.id,
            sold_by_user_id: user.id,
            customer_phone: updateStockForm.customerPhone.trim() || null,
            has_package: updateStockForm.hasPackage !== "no-package",
            is_paid: updateStockForm.paymentStatus === "paid",
            package_type: updateStockForm.hasPackage !== "no-package" ? updateStockForm.hasPackage : null,
          });
        } else if (updateStockForm.stockStatus && updateStockForm.stockStatus !== "") {
          await bulkUpdateInventory.mutateAsync({
            ids: [updateStockResult.id],
            updates: {
              status: updateStockForm.stockStatus as any,
              assigned_to_team_id: tl?.team_id || undefined,
            },
          });
        }

        toast({ title: "Success", description: "Stock updated successfully!" });
        setUpdateStockDialogOpen(false);
        resetUpdateStockDialog();
      } catch (error) {
        // handled by hooks
      }
    } else {
      // Non-admin: Create pending request for approval
      addPendingUpdate({
        inventoryId: updateStockResult.id,
        smartcard: updateStockResult.smartcard || "",
        serialNumber: updateStockResult.serial_number || "",
        stockType: stockTypeLabels[updateStockResult.stock_type],
        currentStatus: updateStockResult.status,
        requestedChanges: {
          stockStatus: updateStockForm.stockStatus || undefined,
          paymentStatus: updateStockForm.stockStatus === "sold" ? updateStockForm.paymentStatus : undefined,
          hasPackage: updateStockForm.stockStatus === "sold" ? updateStockForm.hasPackage : undefined,
          assignToTL: updateStockForm.assignToTL !== "none" ? updateStockForm.assignToTL : undefined,
          assignTLName: tl?.name,
          assignToDSR: updateStockForm.assignToDSR !== "none" ? updateStockForm.assignToDSR : undefined,
          assignDSRName: dsr?.name,
          customerPhone: updateStockForm.customerPhone || undefined,
        },
        requestedBy: user.id,
        requestedByName: userName,
      });

      toast({
        title: "Request Submitted",
        description: "Your update request has been submitted for admin approval.",
      });
      setUpdateStockDialogOpen(false);
      resetUpdateStockDialog();
    }
  };

  const resetUpdateStockDialog = () => {
    setUpdateStockSearch("");
    setUpdateStockResult(null);
    setUpdateStockSearched(false);
    setUpdateStockForm({
      assignToTL: "",
      assignToDSR: "",
      stockStatus: "",
      paymentStatus: "paid",
      hasPackage: "no-package",
      customerPhone: "",
    });
  };

  const resetManualForm = () => {
    setManualForm({ batch_number: "", smartcard: "", serial_number: "", stock_type: "full_set", region_id: "" });
  };

  const handleManualSubmit = async () => {
    if (!manualForm.smartcard && !manualForm.serial_number) {
      toast({ title: "Smartcard or serial required", variant: "destructive" });
      return;
    }

    try {
      await addInventory.mutateAsync([
        {
          batch_number: manualForm.batch_number,
          smartcard: manualForm.smartcard,
          serial_number: manualForm.serial_number,
          stock_type: manualForm.stock_type,
          region_id: manualForm.region_id || null,
          status: "in_store",
          assigned_to_team_id: null,
          assigned_to_user_id: null,
        },
      ]);
      setIsAddDialogOpen(false);
      resetManualForm();
    } catch (error) {
      // toast handled in hook
    }
  };

  const normaliseType = (value: string): StockType | null => {
    const normalised = value.trim().toLowerCase();
    // Full Set variations
    if (["full_set", "full set", "full", "fs", "fullset", "f"].includes(normalised)) return "full_set";
    // Decoder Only variations
    if (["decoder_only", "decoder only", "decoder", "do", "decoderonly", "d"].includes(normalised)) return "decoder_only";
    return null;
  };

  const parseCsvLine = (line: string) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        const nextChar = line[i + 1];
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  const handleBulkFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsingBulk(true);
    setBulkErrors([]);
    setBulkRows([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) ?? "";
        const lines = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        if (lines.length < 2) {
          setBulkErrors(["File must include a header row and at least one data row."]);
          return;
        }

        const rawHeaders = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
        const headerAliases: Record<string, string[]> = {
          batch_number: ["batch_number", "batch", "batch number"],
          smartcard: ["smartcard", "smartcard_number", "smart card"],
          serial_number: ["serial_number", "serial", "serial number"],
          stock_type: ["stock_type", "type"],
          region: ["region", "region_id", "region name"],
        };

        const getValue = (row: string[], key: keyof typeof headerAliases) => {
          for (const alias of headerAliases[key]) {
            const index = rawHeaders.indexOf(alias);
            if (index !== -1) {
              return row[index] ?? "";
            }
          }
          return "";
        };

        const parsed: BulkRow[] = [];
        const errors: string[] = [];

        lines.slice(1).forEach((line, lineIndex) => {
          const row = parseCsvLine(line);
          if (row.every((cell) => cell.trim().length === 0)) return;

          const serial = getValue(row, "serial_number").trim();
          const smartcard = getValue(row, "smartcard").trim();
          const batch = getValue(row, "batch_number").trim();
          const typeRaw = getValue(row, "stock_type");
          const region = getValue(row, "region").trim();
          const type = normaliseType(typeRaw);

          const rowNumber = lineIndex + 2;

          if (!serial && !smartcard) {
            errors.push(`Row ${rowNumber}: Serial or smartcard is required.`);
            return;
          }

          if (!type) {
            errors.push(`Row ${rowNumber}: Unknown stock type "${typeRaw}".`);
            return;
          }

          parsed.push({ batch_number: batch, serial_number: serial, smartcard, stock_type: type, region });
        });

        setBulkRows(parsed);
        setBulkErrors(errors);
      } catch (error) {
        console.error(error);
        setBulkErrors(["Failed to parse file. Ensure the file is CSV encoded in UTF-8."]);
      } finally {
        setIsParsingBulk(false);
      }
    };

    reader.readAsText(file);
  };

  const handleBulkUpload = async () => {
    if (bulkRows.length === 0) {
      toast({ title: "No valid rows to import", variant: "destructive" });
      return;
    }

    const unknownRegions = new Set<string>();

    const payload = bulkRows.map((row) => {
      let regionId: string | null = null;
      if (row.region) {
        const lookupKey = row.region.toLowerCase();
        regionId = regionLookup.get(lookupKey) ?? null;
        if (!regionId) {
          unknownRegions.add(row.region);
        }
      }

      return {
        batch_number: row.batch_number,
        smartcard: row.smartcard,
        serial_number: row.serial_number,
        stock_type: row.stock_type,
        region_id: regionId,
        status: "in_store" as const,
        assigned_to_team_id: null,
        assigned_to_user_id: null,
      };
    });

    if (unknownRegions.size > 0) {
      toast({
        title: "Unknown regions detected",
        description: `Please add or correct: ${Array.from(unknownRegions).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    try {
      await addInventory.mutateAsync(payload);
      setBulkRows([]);
      setBulkErrors([]);
      setBulkFileKey((key) => key + 1);
      setIsBulkDialogOpen(false);
    } catch (error) {
      // toast handled in hook
    }
  };

  const openSaleDialog = (item: InventoryItem) => {
    setSelectedStock(item);
    setSaleForm({ customerPhone: "", hasPackage: "no-package", paymentStatus: "paid" });
    setSaleDialogOpen(true);
  };

  const handleSaleSubmit = async () => {
    if (!selectedStock) return;
    if (!user?.id) {
      toast({ title: "User session required", description: "Please sign in again and retry.", variant: "destructive" });
      return;
    }

    try {
      await createSale.mutateAsync({
        inventory_id: selectedStock.id,
        sold_by_user_id: user.id,
        customer_phone: saleForm.customerPhone.trim() || null,
        has_package: saleForm.hasPackage !== "no-package",
        is_paid: saleForm.paymentStatus === "paid",
        package_type: saleForm.hasPackage !== "no-package" ? saleForm.hasPackage : null,
      });
      setSaleDialogOpen(false);
      setSelectedStock(null);
    } catch (error) {
      // handled by hook toast
    }
  };

  const closeSaleDialog = (open: boolean) => {
    setSaleDialogOpen(open);
    if (!open) {
      setSelectedStock(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("admin.inventory")}</h1>
          <p className="text-muted-foreground text-sm">Track incoming stock, assignments, and sales conversions.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={isBulkDialogOpen} onOpenChange={(open) => {
            setIsBulkDialogOpen(open);
            if (!open) {
              setBulkRows([]);
              setBulkErrors([]);
              setBulkFileKey((key) => key + 1);
              setIsParsingBulk(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk upload stock</DialogTitle>
                <DialogDescription>Provide a UTF-8 CSV with columns: batch_number, smartcard, serial_number, stock_type, region.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Download Template Section */}
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Need a template?</p>
                      <p className="text-xs text-muted-foreground">Download a sample CSV with the correct format and example data.</p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2" onClick={downloadSampleTemplate}>
                      <Download className="h-4 w-4" />
                      Download Template
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Select file</Label>
                  <Input key={bulkFileKey} type="file" accept=".csv" onChange={handleBulkFile} disabled={isParsingBulk || addInventory.isPending} />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Stock type:</strong> Full Set, FS, Decoder Only, or DO</p>
                    <p><strong>Region:</strong> Region name (e.g., Dar es Salaam, Arusha, Mwanza)</p>
                  </div>
                </div>

                {isParsingBulk && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Parsing file...
                  </div>
                )}

                {bulkRows.length > 0 && (
                  <div className="rounded-lg border border-border/50 p-4">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>{bulkRows.length} rows ready</span>
                      <span className="text-muted-foreground">Preview below</span>
                    </div>
                    <div className="mt-3 max-h-56 overflow-auto border border-border/40 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-secondary/40 text-muted-foreground">
                          <tr>
                            <th className="p-2 text-left">Batch</th>
                            <th className="p-2 text-left">Smartcard</th>
                            <th className="p-2 text-left">Serial</th>
                            <th className="p-2 text-left">Type</th>
                            <th className="p-2 text-left">Region</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkRows.slice(0, 20).map((row, index) => (
                            <tr key={`${row.serial_number}-${index}`} className="border-t border-border/30">
                              <td className="p-2 font-mono text-xs">{row.batch_number || "-"}</td>
                              <td className="p-2 font-mono text-xs">{row.smartcard || "-"}</td>
                              <td className="p-2 font-mono text-xs">{row.serial_number}</td>
                              <td className="p-2 text-xs">{stockTypeLabels[row.stock_type]}</td>
                              <td className="p-2 text-xs">{row.region || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {bulkErrors.length > 0 && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                    <p className="font-semibold mb-2">Review {bulkErrors.length} issue(s):</p>
                    <ul className="space-y-1 list-disc pl-4">
                      {bulkErrors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={bulkRows.length === 0 || isParsingBulk || addInventory.isPending}
                  onClick={handleBulkUpload}
                >
                  {addInventory.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Import stock
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              resetManualForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t("action.add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add single stock item</DialogTitle>
                <DialogDescription>Match the incoming hardware with an optional batch number for traceability.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="batch_number">Batch Number</Label>
                  <Input
                    id="batch_number"
                    value={manualForm.batch_number}
                    onChange={(event) => setManualForm((prev) => ({ ...prev, batch_number: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="smartcard">Smartcard</Label>
                  <Input
                    id="smartcard"
                    placeholder="Optional"
                    value={manualForm.smartcard}
                    onChange={(event) => setManualForm((prev) => ({ ...prev, smartcard: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="serial">Serial Number</Label>
                  <Input
                    id="serial"
                    placeholder="Required if smartcard missing"
                    value={manualForm.serial_number}
                    onChange={(event) => setManualForm((prev) => ({ ...prev, serial_number: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Stock Type</Label>
                  <Select value={manualForm.stock_type} onValueChange={(value) => setManualForm((prev) => ({ ...prev, stock_type: value as StockType }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STOCK_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Region</Label>
                  <Select value={manualForm.region_id} onValueChange={(value) => setManualForm((prev) => ({ ...prev, region_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chagua mkoa" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((region) => (
                        <SelectItem key={region.id} value={region.id}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" disabled={addInventory.isPending} onClick={handleManualSubmit}>
                  {addInventory.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  {t("action.save")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass rounded-xl border border-border/50 p-4">
          <p className="text-sm text-muted-foreground">Total Stock</p>
          <p className="text-2xl font-bold text-foreground">{totalStock}</p>
          <p className="text-xs text-muted-foreground mt-1">All inventory entries</p>
        </div>
        <div className="glass rounded-xl border border-border/50 p-4">
          <p className="text-sm text-muted-foreground">Available</p>
          <p className="text-2xl font-bold text-primary">{totalAvailable}</p>
          <p className="text-xs text-muted-foreground mt-1">Awaiting allocation</p>
        </div>
        <div className="glass rounded-xl border border-border/50 p-4">
          <p className="text-sm text-muted-foreground">In Field</p>
          <p className="text-2xl font-bold text-warning">{totalInHand}</p>
          <p className="text-xs text-muted-foreground mt-1">Assigned to teams</p>
        </div>
        <div className="glass rounded-xl border border-border/50 p-4">
          <p className="text-sm text-muted-foreground">Sold</p>
          <p className="text-2xl font-bold text-success">{totalSold}</p>
          <p className="text-xs text-muted-foreground mt-1">Marked as closed sales</p>
        </div>
      </div>

      <div className="glass rounded-xl border border-border/50">
        <div className="flex flex-col gap-3 border-b border-border/50 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>{filteredInventory.length} row(s) shown</span>
              {selectedIds.size > 0 && (
                <Badge variant="info" className="ml-2">{selectedIds.size} selected</Badge>
              )}
            </div>
            <div className="relative w-full md:w-72">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search smartcard, serial, batch, or region"
                className="pl-9"
              />
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Filter:</span>
            </div>
            
            {/* Filter by TL */}
            <Select value={filterByTL} onValueChange={setFilterByTL}>
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue placeholder="All TLs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All TLs</SelectItem>
                {teamLeaders.map((tl: any) => (
                  <SelectItem key={tl.id} value={tl.id}>{tl.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Filter by Region */}
            <Select value={filterByRegion} onValueChange={setFilterByRegion}>
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Regions</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Filter by Status */}
            <Select value={filterByStatus} onValueChange={setFilterByStatus}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="in_store">In Store</SelectItem>
                <SelectItem value="in_hand">In Hand</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Clear Filters */}
            {(filterByTL || filterByRegion || filterByStatus) && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2"
                onClick={() => {
                  setFilterByTL("");
                  setFilterByRegion("");
                  setFilterByStatus("");
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-secondary/30 rounded-lg">
              <span className="text-sm font-medium mr-2">{selectedIds.size} selected:</span>
              
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setAssignTLDialogOpen(true)}>
                <UserCheck className="h-4 w-4" /> Assign to TL
              </Button>
              
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setAssignDSRDialogOpen(true)}>
                <Users className="h-4 w-4" /> Assign to DSR
              </Button>
              
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={handleDelete}
                disabled={deleteInventory.isPending}
              >
                {deleteInventory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </Button>
              
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t("common.loading")}
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No inventory matches your filters.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40">
                <tr>
                  <th className="p-3 w-12">
                    <Checkbox 
                      checked={isAllSelected} 
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="p-3 text-left">Smartcard</th>
                  <th className="p-3 text-left">Serial</th>
                  <th className="p-3 text-left">Batch</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Region</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Updated</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <tr key={item.id} className={`border-t border-border/30 ${selectedIds.has(item.id) ? 'bg-primary/5' : ''}`}>
                    <td className="p-3">
                      <Checkbox 
                        checked={selectedIds.has(item.id)} 
                        onCheckedChange={() => handleSelectOne(item.id)}
                        aria-label={`Select ${item.smartcard || item.serial_number}`}
                      />
                    </td>
                    <td className="p-3 font-mono text-xs md:text-sm">
                      <span 
                        className="cursor-pointer hover:text-primary transition-colors underline decoration-dotted"
                        onClick={() => {
                          setStockDetailsId(item.id);
                          setStockDetailsModalOpen(true);
                        }}
                      >
                        {item.smartcard || "-"}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs md:text-sm text-muted-foreground">{item.serial_number || "-"}</td>
                    <td className="p-3 font-mono text-xs md:text-sm text-muted-foreground">{item.batch_number || "-"}</td>
                    <td className="p-3 text-xs md:text-sm">
                      <Badge variant={item.stock_type === "full_set" ? "info" : "secondary"}>{stockTypeLabels[item.stock_type]}</Badge>
                    </td>
                    <td className="p-3 text-xs md:text-sm text-muted-foreground">{item.regions?.name || "-"}</td>
                    <td className="p-3 text-xs md:text-sm">
                      <Badge variant={statusBadgeMap[item.status] ?? "available"}>{item.status}</Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(item.updated_at).toLocaleDateString()}</td>
                    <td className="p-3 text-right">
                      {item.status === "sold" ? (
                        <Badge variant="success" className="inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Sold
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-2"
                          onClick={() => openSaleDialog(item)}
                          disabled={createSale.isPending}
                        >
                          {createSale.isPending && selectedStock?.id === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Mark sold
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={saleDialogOpen} onOpenChange={closeSaleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mark stock as sold</DialogTitle>
            <DialogDescription>Fill in the sale details so the stock updates and a sale record is generated.</DialogDescription>
          </DialogHeader>
          {selectedStock && (
            <div className="space-y-5">
              <div className="rounded-lg border border-border/50 bg-secondary/20 p-4 text-sm">
                <p className="font-semibold text-foreground">{stockTypeLabels[selectedStock.stock_type]}</p>
                <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                  <span>Smartcard: {selectedStock.smartcard || "-"}</span>
                  <span>Serial: {selectedStock.serial_number || "-"}</span>
                  <span>Region: {selectedStock.regions?.name || "-"}</span>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="customer_phone">Customer phone</Label>
                <Input
                  id="customer_phone"
                  placeholder="Optional"
                  value={saleForm.customerPhone}
                  onChange={(event) => setSaleForm((prev) => ({ ...prev, customerPhone: event.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label>Package</Label>
                <Select value={saleForm.hasPackage} onValueChange={(value) => setSaleForm((prev) => ({ ...prev, hasPackage: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-package">No Package</SelectItem>
                    <SelectItem value="access">Access</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="compact-plus">Compact Plus</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Payment status</Label>
                <Select value={saleForm.paymentStatus} onValueChange={(value) => setSaleForm((prev) => ({ ...prev, paymentStatus: value as "paid" | "unpaid" }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" disabled={createSale.isPending} onClick={handleSaleSubmit}>
                {createSale.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Confirm sale
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign to TL Dialog */}
      <Dialog open={assignTLDialogOpen} onOpenChange={setAssignTLDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" /> Assign to Team Leader
            </DialogTitle>
            <DialogDescription>
              Assign {selectedIds.size} item(s) to a Team Leader. This will mark them as "In Field".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Select Team Leader</Label>
              <Select value={selectedTL} onValueChange={setSelectedTL}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a TL..." />
                </SelectTrigger>
                <SelectContent>
                  {teamLeaders.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No Team Leaders found. Add them in Members page.
                    </div>
                  ) : (
                    teamLeaders.map((tl: any) => (
                      <SelectItem key={tl.id} value={tl.id}>
                        {tl.name} {tl.phone && `(${tl.phone})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-secondary/30 p-3 text-sm">
              <p className="text-muted-foreground">
                <strong>{selectedIds.size}</strong> item(s) will be assigned to this TL.
              </p>
            </div>
            <Button 
              className="w-full" 
              disabled={!selectedTL || bulkUpdateInventory.isPending}
              onClick={handleAssignToTL}
            >
              {bulkUpdateInventory.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="mr-2 h-4 w-4" />
              )}
              Assign to TL
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign to DSR Dialog */}
      <Dialog open={assignDSRDialogOpen} onOpenChange={setAssignDSRDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Assign to DSR
            </DialogTitle>
            <DialogDescription>
              Assign {selectedIds.size} item(s) to a DSR for field sales.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Select DSR</Label>
              <Select value={selectedDSR} onValueChange={setSelectedDSR}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a DSR..." />
                </SelectTrigger>
                <SelectContent>
                  {dsrs.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No DSRs found. Add them in Members page.
                    </div>
                  ) : (
                    dsrs.map((dsr: any) => (
                      <SelectItem key={dsr.id} value={dsr.id}>
                        {dsr.name} {dsr.phone && `(${dsr.phone})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-secondary/30 p-3 text-sm">
              <p className="text-muted-foreground">
                <strong>{selectedIds.size}</strong> item(s) will be assigned to this DSR.
              </p>
            </div>
            <Button 
              className="w-full" 
              disabled={!selectedDSR}
              onClick={handleAssignToDSR}
            >
              <Users className="mr-2 h-4 w-4" />
              Assign to DSR
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Add Sale Button */}
      <Button
        onClick={() => setFloatingSaleOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 p-0"
        size="icon"
      >
        <ShoppingCart className="h-6 w-6" />
      </Button>

      {/* Floating Add Sale Dialog */}
      <Dialog open={floatingSaleOpen} onOpenChange={(open) => {
        setFloatingSaleOpen(open);
        if (!open) resetFloatingSaleDialog();
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Quick Add Sale
            </DialogTitle>
            <DialogDescription>
              Search by smartcard number, verify stock, and record the sale.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Search Section */}
            <div className="space-y-2">
              <Label>Search Smartcard / Serial</Label>
              <div className="flex gap-2">
                <Input
                  value={floatingSearch}
                  onChange={(e) => setFloatingSearch(e.target.value)}
                  placeholder="Enter smartcard or serial number..."
                  onKeyDown={(e) => e.key === "Enter" && handleFloatingSearch()}
                />
                <Button onClick={handleFloatingSearch} variant="secondary">
                  <SearchIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search Result */}
            {floatingSearched && (
              <div className="space-y-4">
                {floatingSearchResult ? (
                  <>
                    {/* Found Stock Details */}
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-primary">Stock Found</span>
                        <Badge variant={statusBadgeMap[floatingSearchResult.status] ?? "available"}>
                          {floatingSearchResult.status}
                        </Badge>
                      </div>
                      <div className="grid gap-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Smartcard:</span>
                          <span className="font-mono">{floatingSearchResult.smartcard || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Serial:</span>
                          <span className="font-mono">{floatingSearchResult.serial_number || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Batch:</span>
                          <span className="font-mono">{floatingSearchResult.batch_number || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <span>{stockTypeLabels[floatingSearchResult.stock_type]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Region:</span>
                          <span>{floatingSearchResult.regions?.name || "-"}</span>
                        </div>
                      </div>
                    </div>

                    {floatingSearchResult.status === "sold" ? (
                      <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-center">
                        <CheckCircle2 className="h-8 w-8 text-warning mx-auto mb-2" />
                        <p className="font-medium text-warning">This stock is already sold!</p>
                      </div>
                    ) : (
                      <>
                        {/* Assignment Section */}
                        <div className="space-y-3 rounded-lg border border-border/50 p-4">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <UserCheck className="h-4 w-4" /> Assignment (Optional)
                          </h4>
                          
                          <div className="grid gap-2">
                            <Label className="text-xs">Assign to Team Leader</Label>
                            <Select value={floatingSaleForm.assignToTL} onValueChange={(v) => setFloatingSaleForm(f => ({ ...f, assignToTL: v }))}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select TL (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-- None --</SelectItem>
                                {teamLeaders.map((tl: any) => (
                                  <SelectItem key={tl.id} value={tl.id}>
                                    {tl.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid gap-2">
                            <Label className="text-xs">Assign to DSR</Label>
                            <Select value={floatingSaleForm.assignToDSR} onValueChange={(v) => setFloatingSaleForm(f => ({ ...f, assignToDSR: v }))}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select DSR (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-- None --</SelectItem>
                                {dsrs.map((dsr: any) => (
                                  <SelectItem key={dsr.id} value={dsr.id}>
                                    {dsr.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Status Section */}
                        <div className="space-y-3 rounded-lg border border-border/50 p-4">
                          <h4 className="text-sm font-semibold">Update Status</h4>

                          <div className="grid gap-2">
                            <Label className="text-xs">Stock Status</Label>
                            <Select value={floatingSaleForm.stockStatus} onValueChange={(v) => setFloatingSaleForm(f => ({ ...f, stockStatus: v as any }))}>
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="in_store">In Store (Available)</SelectItem>
                                <SelectItem value="in_hand">In Field (Assigned)</SelectItem>
                                <SelectItem value="sold">Sold</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {floatingSaleForm.stockStatus === "sold" && (
                            <>
                              <div className="grid gap-2">
                                <Label className="text-xs">Payment Status</Label>
                                <Select value={floatingSaleForm.paymentStatus} onValueChange={(v) => setFloatingSaleForm(f => ({ ...f, paymentStatus: v as any }))}>
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="unpaid">Unpaid</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="grid gap-2">
                                <Label className="text-xs">Package</Label>
                                <Select value={floatingSaleForm.hasPackage} onValueChange={(v) => setFloatingSaleForm(f => ({ ...f, hasPackage: v as any }))}>
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="no-package">No Package</SelectItem>
                                    <SelectItem value="access">Access</SelectItem>
                                    <SelectItem value="family">Family</SelectItem>
                                    <SelectItem value="compact">Compact</SelectItem>
                                    <SelectItem value="compact-plus">Compact Plus</SelectItem>
                                    <SelectItem value="premium">Premium</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="grid gap-2">
                                <Label className="text-xs">Customer Phone (Optional)</Label>
                                <Input
                                  className="h-9"
                                  value={floatingSaleForm.customerPhone}
                                  onChange={(e) => setFloatingSaleForm(f => ({ ...f, customerPhone: e.target.value }))}
                                  placeholder="e.g., 0712345678"
                                />
                              </div>
                            </>
                          )}
                        </div>

                        {/* Submit Button */}
                        <Button
                          className="w-full"
                          onClick={handleFloatingSaleSubmit}
                          disabled={createSale.isPending || bulkUpdateInventory.isPending}
                        >
                          {(createSale.isPending || bulkUpdateInventory.isPending) ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}
                          {floatingSaleForm.stockStatus === "sold" ? "Confirm Sale" : "Update Stock"}
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
                    <SearchIcon className="h-8 w-8 text-destructive mx-auto mb-2" />
                    <p className="font-medium text-destructive">No stock found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      No inventory matches "{floatingSearch}". Check the number and try again.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Update Stock Button */}
      <Button
        onClick={() => setUpdateStockDialogOpen(true)}
        variant="secondary"
        className="fixed bottom-6 right-24 h-14 w-14 rounded-full shadow-lg z-50 p-0"
        size="icon"
      >
        <Edit className="h-6 w-6" />
      </Button>

      {/* Update Stock Dialog */}
      <Dialog open={updateStockDialogOpen} onOpenChange={(open) => {
        setUpdateStockDialogOpen(open);
        if (!open) resetUpdateStockDialog();
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" /> Update Stock
            </DialogTitle>
            <DialogDescription>
              Search for stock and request updates. Non-admin changes require approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Search Section */}
            <div className="space-y-2">
              <Label>Search Smartcard / Serial</Label>
              <div className="flex gap-2">
                <Input
                  value={updateStockSearch}
                  onChange={(e) => setUpdateStockSearch(e.target.value)}
                  placeholder="Enter smartcard or serial number..."
                  onKeyDown={(e) => e.key === "Enter" && handleUpdateStockSearch()}
                />
                <Button onClick={handleUpdateStockSearch} variant="secondary">
                  <SearchIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search Result */}
            {updateStockSearched && (
              <div className="space-y-4">
                {updateStockResult ? (
                  <>
                    {/* Found Stock Details */}
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-primary">Stock Found</span>
                        <Badge variant={statusBadgeMap[updateStockResult.status] ?? "available"}>
                          {updateStockResult.status}
                        </Badge>
                      </div>
                      <div className="grid gap-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Smartcard:</span>
                          <span className="font-mono">{updateStockResult.smartcard || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Serial:</span>
                          <span className="font-mono">{updateStockResult.serial_number || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Batch:</span>
                          <span className="font-mono">{updateStockResult.batch_number || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <span>{stockTypeLabels[updateStockResult.stock_type]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Region:</span>
                          <span>{updateStockResult.regions?.name || "-"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Assignment Section */}
                    <div className="space-y-3 rounded-lg border border-border/50 p-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <UserCheck className="h-4 w-4" /> Assignment (Optional)
                      </h4>
                      
                      <div className="grid gap-2">
                        <Label className="text-xs">Assign to Team Leader</Label>
                        <Select value={updateStockForm.assignToTL} onValueChange={(v) => setUpdateStockForm(f => ({ ...f, assignToTL: v }))}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select TL (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- None --</SelectItem>
                            {teamLeaders.map((tl: any) => (
                              <SelectItem key={tl.id} value={tl.id}>
                                {tl.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-xs">Assign to DSR</Label>
                        <Select value={updateStockForm.assignToDSR} onValueChange={(v) => setUpdateStockForm(f => ({ ...f, assignToDSR: v }))}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select DSR (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- None --</SelectItem>
                            {dsrs.map((dsr: any) => (
                              <SelectItem key={dsr.id} value={dsr.id}>
                                {dsr.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Status Section */}
                    <div className="space-y-3 rounded-lg border border-border/50 p-4">
                      <h4 className="text-sm font-semibold">Update Status</h4>

                      <div className="grid gap-2">
                        <Label className="text-xs">Stock Status</Label>
                        <Select value={updateStockForm.stockStatus} onValueChange={(v) => setUpdateStockForm(f => ({ ...f, stockStatus: v as any }))}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select new status..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no_change">-- No Change --</SelectItem>
                            <SelectItem value="in_store">In Store (Available)</SelectItem>
                            <SelectItem value="in_hand">In Field (Assigned)</SelectItem>
                            <SelectItem value="sold">Sold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {updateStockForm.stockStatus === "sold" && (
                        <>
                          <div className="grid gap-2">
                            <Label className="text-xs">Payment Status</Label>
                            <Select value={updateStockForm.paymentStatus} onValueChange={(v) => setUpdateStockForm(f => ({ ...f, paymentStatus: v as any }))}>
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="unpaid">Unpaid</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid gap-2">
                            <Label className="text-xs">Package</Label>
                            <Select value={updateStockForm.hasPackage} onValueChange={(v) => setUpdateStockForm(f => ({ ...f, hasPackage: v as any }))}>
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="no-package">No Package</SelectItem>
                                <SelectItem value="access">Access</SelectItem>
                                <SelectItem value="family">Family</SelectItem>
                                <SelectItem value="compact">Compact</SelectItem>
                                <SelectItem value="compact-plus">Compact Plus</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid gap-2">
                            <Label className="text-xs">Customer Phone (Optional)</Label>
                            <Input
                              className="h-9"
                              value={updateStockForm.customerPhone}
                              onChange={(e) => setUpdateStockForm(f => ({ ...f, customerPhone: e.target.value }))}
                              placeholder="e.g., 0712345678"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Info Banner */}
                    <div className="rounded-lg bg-secondary/30 p-3 text-sm text-muted-foreground">
                      <p>
                        <strong>Note:</strong> If you are not an admin, your update will be submitted for approval.
                      </p>
                    </div>

                    {/* Submit Button */}
                    <Button
                      className="w-full"
                      onClick={handleUpdateStockSubmit}
                      disabled={createSale.isPending || bulkUpdateInventory.isPending || (!updateStockForm.stockStatus && !updateStockForm.assignToTL && !updateStockForm.assignToDSR)}
                    >
                      {(createSale.isPending || bulkUpdateInventory.isPending) ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Submit Update
                    </Button>
                  </>
                ) : (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
                    <SearchIcon className="h-8 w-8 text-destructive mx-auto mb-2" />
                    <p className="font-medium text-destructive">No stock found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      No inventory matches "{updateStockSearch}". Check the number and try again.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Details Modal */}
      {stockDetailsId && (
        <StockDetailsModal
          open={stockDetailsModalOpen}
          onOpenChange={setStockDetailsModalOpen}
          inventoryId={stockDetailsId}
        />
      )}
    </div>
  );
};

export default AdminInventory;
