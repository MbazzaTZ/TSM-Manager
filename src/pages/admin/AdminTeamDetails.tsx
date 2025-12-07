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

  // Team stats
  const teamStats = useMemo(() => {
    const teamUserIds = teamMembers.map((m) => m.user_id);
    const teamSales = sales?.filter((s) => teamUserIds.includes(s.sold_by_user_id)) || [];
    const teamStock = inventory?.filter((i) => i.assigned_to_team_id === teamId) || [];
    const paidSales = teamSales.filter((s) => s.is_paid).length;
    const unpaidSales = teamSales.filter((s) => !s.is_paid).length;

    return {
      totalMembers: allMembers.length,
      totalSales: teamSales.length,
      paidSales,
      unpaidSales,
      stockInHand: teamStock.filter((i) => i.status === "in_hand").length,
      stockAvailable: teamStock.filter((i) => i.status === "in_store").length,
      conversionRate: teamStock.length > 0 
        ? Math.round((teamSales.length / teamStock.length) * 100) 
        : 0,
    };
  }, [allMembers, sales, inventory, teamId, teamMembers]);

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
        </div>
        <div className="glass rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-4 h-4 text-success" />
            <span className="text-sm text-muted-foreground">Total Sales</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{teamStats.totalSales}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-warning" />
            <span className="text-sm text-muted-foreground">Stock in Hand</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{teamStats.stockInHand}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-info" />
            <span className="text-sm text-muted-foreground">Conversion</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{teamStats.conversionRate}%</p>
        </div>
      </div>

      {/* Sales Progress */}
      <div className="glass rounded-xl p-5 border border-border/50">
        <h3 className="font-semibold text-foreground mb-4">Sales Performance</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Paid Sales</span>
              <span className="text-success font-medium">{teamStats.paidSales}</span>
            </div>
            <Progress 
              value={teamStats.totalSales > 0 ? (teamStats.paidSales / teamStats.totalSales) * 100 : 0} 
              className="h-2" 
            />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Unpaid Sales</span>
              <span className="text-destructive font-medium">{teamStats.unpaidSales}</span>
            </div>
            <Progress 
              value={teamStats.totalSales > 0 ? (teamStats.unpaidSales / teamStats.totalSales) * 100 : 0} 
              className="h-2 [&>div]:bg-destructive" 
            />
          </div>
        </div>
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
