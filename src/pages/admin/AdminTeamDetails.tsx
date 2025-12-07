import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTeams, useRegions } from "@/hooks/useTeams";
import { useUsers, useUpdateUserTeam } from "@/hooks/useUsers";
import { useSales } from "@/hooks/useSales";
import { useInventory } from "@/hooks/useInventory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Package,
  ShoppingCart,
  TrendingUp,
  MapPin,
  Loader2,
  UserMinus,
  Phone,
  Target,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AdminTeamDetails = () => {
  const { t } = useLanguage();
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: regions } = useRegions();
  const { data: users } = useUsers();
  const { data: sales } = useSales();
  const { data: inventory } = useInventory();
  const updateUserTeam = useUpdateUserTeam();

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Get team details
  const team = useMemo(() => teams?.find((t) => t.id === teamId), [teams, teamId]);
  const region = useMemo(
    () => regions?.find((r) => r.id === team?.region_id),
    [regions, team]
  );

  // Get team members from localStorage (TL/DSR)
  const localMembers = useMemo(() => {
    try {
      const stored = localStorage.getItem("tsm_team_members");
      const members = stored ? JSON.parse(stored) : [];
      return members.filter((m: any) => m.team_id === teamId);
    } catch {
      return [];
    }
  }, [teamId]);

  // Get database users assigned to this team
  const teamMembers = useMemo(() => {
    return users?.filter((u) => u.team_id === teamId) || [];
  }, [users, teamId]);

  // Get all members (combined)
  const allMembers = useMemo(() => {
    const dbMembers = teamMembers.map((m) => ({
      id: m.id,
      name: m.full_name,
      phone: m.phone,
      role: m.role || "dsr",
      source: "database" as const,
    }));
    const localMems = localMembers.map((m: any) => ({
      id: m.id,
      name: m.name,
      phone: m.phone,
      role: m.role,
      source: "local" as const,
    }));
    return [...dbMembers, ...localMems];
  }, [teamMembers, localMembers]);

  // Get available users not in any team
  const availableUsers = useMemo(() => {
    return users?.filter((u) => !u.team_id && (u.role === "dsr" || u.role === "team_leader")) || [];
  }, [users]);

  // Team stats - calculate based on actual inventory and sales data
  const teamStats = useMemo(() => {
    // Get TLs in this team from local storage
    const teamTLs = localMembers.filter((m: any) => m.role === "team_leader");
    const teamTLNames = teamTLs.map((tl: any) => tl.name.toLowerCase());
    
    // Get all inventory assigned to TLs in this team
    const teamInventory = inventory?.filter((item) => 
      item.assigned_to_tl && teamTLNames.includes(item.assigned_to_tl.toLowerCase())
    ) || [];
    
    // Stock metrics
    const stockReceived = teamInventory.length;
    const stockInHand = teamInventory.filter((i) => i.status === "in_hand").length;
    const stockSold = teamInventory.filter((i) => i.status === "sold").length;
    
    // Get sales data for team inventory
    const teamInventoryIds = teamInventory.map((i) => i.id);
    const teamSales = sales?.filter((s) => teamInventoryIds.includes(s.inventory_id)) || [];
    const paidSales = teamSales.filter((s) => s.is_paid).length;
    const unpaidSales = teamSales.filter((s) => !s.is_paid).length;
    
    // Calculate conversion rate
    const conversionRate = stockReceived > 0 
      ? Math.round((stockSold / stockReceived) * 100) 
      : 0;
    
    // Get sales targets and calculate monthly performance
    let salesTargets: Record<string, number> = {};
    try {
      const stored = localStorage.getItem("tsm_sales_targets");
      salesTargets = stored ? JSON.parse(stored) : {};
    } catch {
      salesTargets = {};
    }
    
    // Monthly target (sum of all TL targets)
    const monthlyTarget = teamTLs.reduce((sum: number, tl: any) => {
      return sum + (salesTargets[tl.id] || 20);
    }, 0);
    
    // Monthly actual sales
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlySales = teamSales.filter((s) => new Date(s.created_at) >= startOfMonth);
    const monthlyActual = monthlySales.length;
    const salesGap = monthlyTarget - monthlyActual;
    const targetProgress = monthlyTarget > 0 ? Math.round((monthlyActual / monthlyTarget) * 100) : 0;

    return {
      totalMembers: allMembers.length,
      totalTLs: teamTLs.length,
      stockReceived,
      stockInHand,
      stockSold,
      totalSales: teamSales.length,
      paidSales,
      unpaidSales,
      conversionRate,
      monthlyTarget,
      monthlyActual,
      salesGap,
      targetProgress,
    };
  }, [allMembers, sales, inventory, localMembers]);

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    const user = users?.find((u) => u.id === selectedUserId);
    if (!user) return;

    await updateUserTeam.mutateAsync({
      profileId: user.id,
      teamId: teamId!,
    });

    setAddMemberOpen(false);
    setSelectedUserId("");
  };

  const handleRemoveMember = async (memberId: string, source: "database" | "local") => {
    if (source === "database") {
      await updateUserTeam.mutateAsync({
        profileId: memberId,
        teamId: null,
      });
    } else {
      // Remove from localStorage
      try {
        const stored = localStorage.getItem("tsm_team_members");
        const members = stored ? JSON.parse(stored) : [];
        const updated = members.filter((m: any) => m.id !== memberId);
        localStorage.setItem("tsm_team_members", JSON.stringify(updated));
        window.location.reload(); // Refresh to show changes
      } catch (e) {
        console.error("Error removing local member:", e);
      }
    }
  };

  if (teamsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Team not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/teams")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Teams
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/teams")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{region?.name || "No region assigned"}</span>
          </div>
        </div>
        <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Member to Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No available members
                    </div>
                  ) : (
                    availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <span>{user.full_name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {user.role === "team_leader" ? "TL" : "DSR"}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddMember}
                className="w-full"
                disabled={!selectedUserId || updateUserTeam.isPending}
              >
                {updateUserTeam.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Add to Team
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Members</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{teamStats.totalMembers}</p>
          <p className="text-xs text-muted-foreground">{teamStats.totalTLs} TL(s)</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-info" />
            <span className="text-sm text-muted-foreground">Stock Received</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{teamStats.stockReceived}</p>
          <p className="text-xs text-muted-foreground">{teamStats.stockInHand} in hand</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-sm text-muted-foreground">Stock Sold</span>
          </div>
          <p className="text-2xl font-bold text-success">{teamStats.stockSold}</p>
          <p className="text-xs text-muted-foreground">{teamStats.paidSales} paid</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-muted-foreground">Unpaid</span>
          </div>
          <p className="text-2xl font-bold text-destructive">{teamStats.unpaidSales}</p>
          <p className="text-xs text-muted-foreground">{teamStats.conversionRate}% conversion</p>
        </div>
      </div>

      {/* Monthly Target Progress */}
      <div className="glass rounded-xl p-5 border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Monthly Target Progress</h3>
          </div>
          <Badge 
            variant={teamStats.targetProgress >= 100 ? "success" : teamStats.targetProgress >= 50 ? "warning" : "destructive"}
          >
            {teamStats.targetProgress}%
          </Badge>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-secondary/30 rounded-lg">
            <p className="text-2xl font-bold text-primary">{teamStats.monthlyTarget}</p>
            <p className="text-xs text-muted-foreground">Target</p>
          </div>
          <div className="text-center p-3 bg-secondary/30 rounded-lg">
            <p className="text-2xl font-bold text-foreground">{teamStats.monthlyActual}</p>
            <p className="text-xs text-muted-foreground">Actual</p>
          </div>
          <div className="text-center p-3 bg-secondary/30 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              {teamStats.salesGap > 0 ? (
                <TrendingDown className="w-4 h-4 text-destructive" />
              ) : (
                <TrendingUp className="w-4 h-4 text-success" />
              )}
              <p className={cn(
                "text-2xl font-bold",
                teamStats.salesGap > 0 ? "text-destructive" : "text-success"
              )}>
                {Math.abs(teamStats.salesGap)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {teamStats.salesGap > 0 ? "Gap" : "Surplus"}
            </p>
          </div>
        </div>
        
        <Progress 
          value={Math.min(teamStats.targetProgress, 100)} 
          className="h-3" 
        />
      </div>

      {/* Team Members */}
      <div className="glass rounded-xl p-5 border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Team Members</h3>
          <Badge variant="secondary">{allMembers.length} members</Badge>
        </div>

        {allMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No members in this team yet</p>
            <p className="text-sm">Click "Add Member" to add team members</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {allMembers.map((member) => (
              <div
                key={member.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  member.role === "team_leader"
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/50 bg-secondary/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      member.role === "team_leader"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    )}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{member.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {member.phone && (
                        <>
                          <Phone className="w-3 h-3" />
                          <span>{member.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={member.role === "team_leader" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {member.role === "team_leader" ? "TL" : "DSR"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveMember(member.id, member.source)}
                  >
                    <UserMinus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTeamDetails;
