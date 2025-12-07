import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTeams, useRegions, useCreateTeam, useDeleteTeam } from "@/hooks/useTeams";
import { useUsers } from "@/hooks/useUsers";
import { useSales } from "@/hooks/useSales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Trash2,
  Users,
  MapPin,
  ShoppingCart,
  ChevronRight,
  Loader2,
  Search,
  Target,
  Edit,
  Save,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const AdminTeams = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: teams, isLoading } = useTeams();
  const { data: regions } = useRegions();
  const { data: users } = useUsers();
  const { data: sales } = useSales();
  const createTeam = useCreateTeam();
  const deleteTeam = useDeleteTeam();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", region_id: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Sales targets state
  const [salesTargets, setSalesTargets] = useState<Record<string, number>>({});
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [targetValue, setTargetValue] = useState("");
  const [showTargetManager, setShowTargetManager] = useState(false);

  // Load sales targets from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("tsm_sales_targets");
      if (stored) {
        setSalesTargets(JSON.parse(stored));
      }
    } catch {
      console.error("Failed to load sales targets");
    }
  }, []);

  // Save sales targets to localStorage
  const saveTarget = (tlId: string, target: number) => {
    const updated = { ...salesTargets, [tlId]: target };
    setSalesTargets(updated);
    localStorage.setItem("tsm_sales_targets", JSON.stringify(updated));
    setEditingTarget(null);
    setTargetValue("");
  };

  // Get team members from localStorage
  const getLocalMembers = (teamId: string) => {
    try {
      const stored = localStorage.getItem("tsm_team_members");
      const members = stored ? JSON.parse(stored) : [];
      return members.filter((m: any) => m.team_id === teamId);
    } catch {
      return [];
    }
  };

  // Get ALL team leaders from localStorage (for targets management)
  const getAllTeamLeaders = () => {
    try {
      const stored = localStorage.getItem("tsm_team_members");
      const members = stored ? JSON.parse(stored) : [];
      return members.filter((m: any) => m.role === "team_leader");
    } catch {
      return [];
    }
  };

  // Get TL's sales for current month
  const getTLMonthlySales = (tlId: string) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get DSRs under this TL
    try {
      const stored = localStorage.getItem("tsm_team_members");
      const members = stored ? JSON.parse(stored) : [];
      const dsrs = members.filter((m: any) => m.team_leader_id === tlId && m.role === "dsr");
      const dsrIds = dsrs.map((d: any) => d.id);
      
      // Count sales from DSRs under this TL
      const monthlySales = sales?.filter((s) => {
        const saleDate = new Date(s.created_at);
        return saleDate >= startOfMonth && dsrIds.includes(s.sold_by_user_id);
      });
      
      return monthlySales?.length || 0;
    } catch {
      return 0;
    }
  };

  // Calculate team stats
  const getTeamStats = (teamId: string) => {
    const teamUsers = users?.filter((u) => u.team_id === teamId) || [];
    const localMembers = getLocalMembers(teamId);
    const totalMembers = teamUsers.length + localMembers.length;

    const teamUserIds = teamUsers.map((u) => u.user_id);
    const teamSales = sales?.filter((s) => teamUserIds.includes(s.sold_by_user_id)) || [];

    return {
      members: totalMembers,
      sales: teamSales.length,
      paid: teamSales.filter((s) => s.is_paid).length,
      unpaid: teamSales.filter((s) => !s.is_paid).length,
    };
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;

    const result = await createTeam.mutateAsync(form);
    setOpen(false);
    setForm({ name: "", region_id: "" });

    // Redirect to team details page
    if (result?.id) {
      navigate(`/admin/teams/${result.id}`);
    }
  };

  const handleDelete = async (teamId: string) => {
    await deleteTeam.mutateAsync(teamId);
    setDeleteConfirm(null);
  };

  // Filter teams by search
  const filteredTeams = teams?.filter(
    (team) =>
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.regions?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-foreground">{t("admin.teams")}</h1>
          <p className="text-muted-foreground text-sm">
            Manage teams and their members
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Team Name</Label>
                <Input
                  placeholder="Enter team name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Select
                  value={form.region_id}
                  onValueChange={(v) => setForm({ ...form, region_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreate}
                className="w-full"
                disabled={!form.name.trim() || createTeam.isPending}
              >
                {createTeam.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Create Team
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search teams..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4 border border-border/50 text-center">
          <p className="text-2xl font-bold text-foreground">{teams?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Total Teams</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border/50 text-center">
          <p className="text-2xl font-bold text-foreground">{regions?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Regions</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border/50 text-center">
          <p className="text-2xl font-bold text-foreground">
            {users?.filter((u) => u.team_id).length || 0}
          </p>
          <p className="text-xs text-muted-foreground">Assigned Users</p>
        </div>
        <div 
          className="glass rounded-xl p-4 border border-border/50 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setShowTargetManager(!showTargetManager)}
        >
          <div className="flex items-center justify-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <p className="text-2xl font-bold text-foreground">{getAllTeamLeaders().length}</p>
          </div>
          <p className="text-xs text-muted-foreground">TL Targets</p>
        </div>
      </div>

      {/* Sales Target Manager Panel */}
      {showTargetManager && (
        <div className="glass rounded-xl p-6 border border-border/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Monthly Sales Targets</h3>
                <p className="text-sm text-muted-foreground">Set targets for each Team Leader</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowTargetManager(false)}>
              Close
            </Button>
          </div>

          <div className="border-t border-border/50 pt-4">
            {getAllTeamLeaders().length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No Team Leaders found. Add Team Leaders first.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {getAllTeamLeaders().map((tl: any) => {
                  const currentTarget = salesTargets[tl.id] || 0;
                  const currentSales = getTLMonthlySales(tl.id);
                  const progress = currentTarget > 0 ? Math.min(100, Math.round((currentSales / currentTarget) * 100)) : 0;
                  
                  return (
                    <div key={tl.id} className="p-4 bg-secondary/30 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-foreground">{tl.name}</p>
                          <p className="text-xs text-muted-foreground">{tl.region || "No Region"}</p>
                        </div>
                        {editingTarget === tl.id ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const val = parseInt(targetValue) || 0;
                              saveTarget(tl.id, val);
                            }}
                          >
                            <Save className="w-4 h-4 text-success" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingTarget(tl.id);
                              setTargetValue(currentTarget.toString());
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      {editingTarget === tl.id ? (
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            type="number"
                            placeholder="Enter target"
                            value={targetValue}
                            onChange={(e) => setTargetValue(e.target.value)}
                            className="h-8"
                            min={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const val = parseInt(targetValue) || 0;
                                saveTarget(tl.id, val);
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">
                              {currentSales} / {currentTarget} sales
                            </span>
                            <span className={cn(
                              "font-medium",
                              progress >= 100 ? "text-success" : progress >= 50 ? "text-warning" : "text-muted-foreground"
                            )}>
                              {progress}%
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Teams Grid */}
      {filteredTeams?.length === 0 ? (
        <div className="text-center py-12 glass rounded-xl border border-border/50">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No teams found</p>
          <p className="text-sm text-muted-foreground">Create a new team to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeams?.map((team) => {
            const stats = getTeamStats(team.id);
            const salesPerformance =
              stats.sales > 0 ? Math.round((stats.paid / stats.sales) * 100) : 0;

            return (
              <div
                key={team.id}
                className="glass-hover rounded-xl p-4 border border-border/50 cursor-pointer transition-all duration-200 hover:border-primary/50"
                onClick={() => navigate(`/admin/teams/${team.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">{team.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{team.regions?.name || "No region"}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(team.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 bg-secondary/50 rounded-lg">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="w-3 h-3 text-primary" />
                      <span className="font-bold text-foreground">{stats.members}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Members</p>
                  </div>
                  <div className="text-center p-2 bg-secondary/50 rounded-lg">
                    <div className="flex items-center justify-center gap-1">
                      <ShoppingCart className="w-3 h-3 text-success" />
                      <span className="font-bold text-foreground">{stats.sales}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Sales</p>
                  </div>
                  <div className="text-center p-2 bg-secondary/50 rounded-lg">
                    <span
                      className={cn(
                        "font-bold",
                        stats.unpaid > 0 ? "text-destructive" : "text-success"
                      )}
                    >
                      {stats.unpaid}
                    </span>
                    <p className="text-xs text-muted-foreground">Unpaid</p>
                  </div>
                </div>

                {/* Performance Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Payment Rate</span>
                    <span
                      className={cn(
                        "font-medium",
                        salesPerformance >= 80
                          ? "text-success"
                          : salesPerformance >= 50
                          ? "text-warning"
                          : "text-destructive"
                      )}
                    >
                      {salesPerformance}%
                    </span>
                  </div>
                  <Progress value={salesPerformance} className="h-1.5" />
                </div>

                {/* View Details */}
                <div className="flex items-center justify-end mt-3 text-sm text-primary">
                  <span>View Details</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All team assignments will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminTeams;
