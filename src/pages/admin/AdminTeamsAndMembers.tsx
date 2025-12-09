import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTeams, useRegions, useCreateTeam, useDeleteTeam } from "@/hooks/useTeams";
import { useUsers } from "@/hooks/useUsers";
import { useSales } from "@/hooks/useSales";
import type { Sale } from "@/integrations/supabase/types";

import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  Users,
  Trash2,
  Loader2,
  Search,
  Target,
  Edit,
  Save,
} from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";


// Unified Team & Member Management Page
const AdminTeamsAndMembers = () => {
  const { t } = useLanguage();
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: regions } = useRegions();
  const { data: users } = useUsers();
  const { data: sales } = useSales() as { data: Sale[] };

  const createTeam = useCreateTeam();
  const deleteTeam = useDeleteTeam();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", region_id: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Member Management
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    phone: "",
    role: "dsr",
    team_id: "",
  });

  // Monthly Targets State
  const [tlTargets, setTlTargets] = useState<Record<string, number>>({});
  const [editingTL, setEditingTL] = useState<string | null>(null);
  const [targetValue, setTargetValue] = useState("");
  const monthKey = new Date().toISOString().slice(0, 7); // e.g., 2025-12


  /* ---------------------------------------------------------
      LOAD MONTHLY TARGETS FROM SUPABASE
  --------------------------------------------------------- */
  const fetchMonthlyTargets = async () => {
    const { data, error } = await supabase
      .from("monthly_targets")
      .select("tl_id, target")
      .eq("month_year", monthKey);

    if (error) {
      console.error("Error loading targets:", error);
      return;
    }

    const mapped: Record<string, number> = {};
    data.forEach((row: any) => {
      mapped[row.tl_id] = row.target;
    });
    setTlTargets(mapped);
  };

  useEffect(() => {
    fetchMonthlyTargets();
  }, [monthKey]);


  /* ---------------------------------------------------------
      SAVE OR UPDATE TL TARGET
  --------------------------------------------------------- */
  const saveTarget = async (tlId: string, target: number) => {
    const { error } = await supabase
      .from("monthly_targets")
      .upsert(
        { tl_id: tlId, month_year: monthKey, target },
        { onConflict: "tl_id,month_year" }
      );

    if (error) {
      console.error("Target save error:", error);
      return;
    }

    setTlTargets((prev) => ({ ...prev, [tlId]: target }));
    setEditingTL(null);
  };


  /* ---------------------------------------------------------
      TEAM SALES CALCULATION (TL + DSR)
  --------------------------------------------------------- */
  const getTeamMonthlySales = (teamId: string) => {
    if (!users || !sales) return 0;

    const teamUsers = users.filter((u) => u.team_id === teamId);
    const userIds = teamUsers.map((u) => u.user_id);

    const startMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const teamSales = sales.filter((s) => {
      const saleDate = new Date(s.created_at);
      return userIds.includes(s.user_id) && saleDate >= startMonth;
    });

    return teamSales.length;
  };


  /* ---------------------------------------------------------
      GET TEAM LEADER FOR TEAM
  --------------------------------------------------------- */
  const getTeamLeader = (teamId: string) =>
    users?.find((u) => u.team_id === teamId && u.role === "team_leader");


  /* ---------------------------------------------------------
      FILTER TEAMS
  --------------------------------------------------------- */
  const filteredTeams = teams?.filter(
    (team) =>
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.regions?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );


  /* ---------------------------------------------------------
      CREATE TEAM
  --------------------------------------------------------- */
  const handleCreateTeam = async () => {
    if (!form.name.trim()) return;

    await createTeam.mutateAsync(form);
    setOpen(false);
    setForm({ name: "", region_id: "" });
  };


  /* ---------------------------------------------------------
      ADD MEMBER (placeholder)
  --------------------------------------------------------- */
  const handleAddMember = () => {
    // TODO: Implement backend member creation
    setMemberDialogOpen(false);
    setNewMember({ name: "", phone: "", role: "dsr", team_id: selectedTeamId || "" });
  };


  /* ---------------------------------------------------------
      LOADING UI
  --------------------------------------------------------- */
  if (teamsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  /* ---------------------------------------------------------
      PAGE UI
  --------------------------------------------------------- */
  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Teams & Members</h1>
          <p className="text-muted-foreground text-sm">Manage teams, TL & DSR members + monthly targets</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Team</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Team Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Region</Label>
                <Select value={form.region_id} onValueChange={(v) => setForm({ ...form, region_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCreateTeam}
                className="w-full"
                disabled={!form.name.trim() || createTeam.isPending}
              >
                {createTeam.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>


      {/* SEARCH */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search teams..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>


      {/* TEAMS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTeams?.map((team) => {
          const teamLeader = getTeamLeader(team.id);
          const teamMembers = users?.filter((u) => u.team_id === team.id) || [];
          const monthlySales = getTeamMonthlySales(team.id);

          const target = teamLeader ? tlTargets[teamLeader.user_id] || 0 : 0;
          const progress = target > 0 ? Math.min(100, Math.round((monthlySales / target) * 100)) : 0;

          return (
            <div key={team.id} className="glass rounded-xl p-4 border border-border/50">

              {/* TEAM HEADER */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-lg">{team.name}</h2>
                  <p className="text-xs text-muted-foreground">Region: {team.regions?.name}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setSelectedTeamId(team.id)}>
                  <Users className="w-4 h-4 mr-1" /> View Members
                </Button>
              </div>


              {/* MONTHLY TARGET FOR THIS TEAM (Option B placement) */}
              {teamLeader && (
                <div className="p-3 rounded-lg bg-secondary/20 border mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Monthly Target for TL: {teamLeader.full_name}</p>
                      <p className="text-xs text-muted-foreground">{monthKey}</p>
                    </div>

                    {editingTL === teamLeader.user_id ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => saveTarget(teamLeader.user_id, parseInt(targetValue))}
                      >
                        <Save className="w-4 h-4 text-green-500" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingTL(teamLeader.user_id);
                          setTargetValue(target.toString());
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {editingTL === teamLeader.user_id ? (
                    <Input
                      className="mt-2"
                      value={targetValue}
                      type="number"
                      onChange={(e) => setTargetValue(e.target.value)}
                    />
                  ) : (
                    <>
                      <div className="flex justify-between text-xs mt-2">
                        <span>{monthlySales} / {target} sales</span>
                        <span
                          className={cn(
                            progress >= 100 ? "text-green-500" :
                            progress >= 50 ? "text-yellow-500" : "text-red-500"
                          )}
                        >
                          {progress}%
                        </span>
                      </div>
                      <Progress value={progress} className="h-2 mt-1" />
                    </>
                  )}
                </div>
              )}


              {/* MEMBERS LIST */}
              {selectedTeamId === team.id && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Members ({teamMembers.length})</span>
                    <Button size="sm" onClick={() => setMemberDialogOpen(true)}>
                      <Plus className="w-3 h-3 mr-1" /> Add Member
                    </Button>
                  </div>

                  <ul className="divide-y divide-border/50">
                    {teamMembers.length === 0 ? (
                      <li className="text-muted-foreground text-sm py-2">No members assigned.</li>
                    ) : (
                      teamMembers.map((member) => (
                        <li key={member.id} className="flex items-center justify-between py-2">
                          <span>
                            {member.full_name}
                            <Badge className="ml-2">{member.role}</Badge>
                          </span>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </li>
                      ))
                    )}
                  </ul>

                  {/* ADD MEMBER DIALOG */}
                  <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Member</DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div>
                          <Label>Name</Label>
                          <Input
                            value={newMember.name}
                            onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label>Phone</Label>
                          <Input
                            value={newMember.phone}
                            onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label>Role</Label>
                          <Select
                            value={newMember.role}
                            onValueChange={(v) => setNewMember({ ...newMember, role: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="team_leader">Team Leader</SelectItem>
                              <SelectItem value="dsr">DSR</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button className="w-full" onClick={handleAddMember}>
                          Add Member
                        </Button>
                      </div>

                    </DialogContent>
                  </Dialog>

                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
};

export default AdminTeamsAndMembers;
