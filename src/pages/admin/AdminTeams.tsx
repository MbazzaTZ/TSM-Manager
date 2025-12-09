import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTeams, useRegions, useCreateTeam, useDeleteTeam } from "@/hooks/useTeams";
import { useUsers } from "@/hooks/useUsers";
import { useSales } from "@/hooks/useSales";
import { supabase } from "@/integrations/supabase/client";
import type { Sale } from "@/integrations/supabase/types";

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
import { cn } from "@/lib/utils";

/* ----------------------------------------------------------------------
   Admin Teams With Full Monthly Target System (Supabase Version)
---------------------------------------------------------------------- */

const AdminTeams = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { data: teams, isLoading } = useTeams();
  const { data: regions } = useRegions();
  const { data: users } = useUsers();
  const { data: sales } = useSales() as { data: Sale[] };

  const createTeam = useCreateTeam();
  const deleteTeam = useDeleteTeam();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", region_id: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  /* ----------------------------------------------------------------------
     MONTHLY TARGET STATE + SUPABASE STORAGE
  ---------------------------------------------------------------------- */
  const [tlTargets, setTlTargets] = useState<Record<string, number>>({});
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [targetValue, setTargetValue] = useState<string>("");
  const [showTargetManager, setShowTargetManager] = useState(false);

  const monthKey = new Date().toISOString().slice(0, 7); // "2025-12"

  /* ----------------------------------------------------------------------
     Load Team Leaders From Local Storage
  ---------------------------------------------------------------------- */
  const getLocalTeamLeaders = () => {
    try {
      const stored = localStorage.getItem("tsm_team_members");
      const members = stored ? JSON.parse(stored) : [];
      return members.filter((m: any) => m.role === "team_leader");
    } catch {
      return [];
    }
  };

  /* ----------------------------------------------------------------------
     Fetch Monthly Targets From Supabase
  ---------------------------------------------------------------------- */
  const fetchMonthlyTargets = async () => {
    const { data, error } = await supabase
      .from("monthly_targets")
      .select("tl_id, target")
      .eq("month_year", monthKey);

    if (error) {
      console.error("Error loading monthly targets:", error);
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

  /* ----------------------------------------------------------------------
     Save or Update Target in Supabase (UPSERT)
  ---------------------------------------------------------------------- */
  const saveTarget = async (tlId: string, target: number) => {
    const { error } = await supabase
      .from("monthly_targets")
      .upsert(
        { tl_id: tlId, month_year: monthKey, target },
        { onConflict: "tl_id,month_year" }
      );

    if (error) {
      console.error("Failed to save target:", error);
      return;
    }

    // Update UI
    const updated = { ...tlTargets, [tlId]: target };
    setTlTargets(updated);

    setEditingTarget(null);
    setTargetValue("");
  };

  /* ----------------------------------------------------------------------
     Set SAME TARGET For All TLs
  ---------------------------------------------------------------------- */
  const setDefaultTargetForAll = async (val: number) => {
    const tls = getLocalTeamLeaders();

    const payload = tls.map((tl: any) => ({
      tl_id: tl.id,
      month_year: monthKey,
      target: val,
    }));

    const { error } = await supabase
      .from("monthly_targets")
      .upsert(payload, { onConflict: "tl_id,month_year" });

    if (error) {
      console.error("Error saving batch target:", error);
      return;
    }

    fetchMonthlyTargets();
  };

  /* ----------------------------------------------------------------------
     Calculate TL Monthly Sales Correctly Based on Your SQL Schema
     SALE USER FIELD: user_id
  ---------------------------------------------------------------------- */
  const getTLMonthlySales = (tlId: string) => {
    const stored = localStorage.getItem("tsm_team_members");
    const members = stored ? JSON.parse(stored) : [];

    // Get DSRs under this TL
    const dsrList = members.filter(
      (m: any) => m.team_leader_id === tlId && m.role === "dsr"
    );
    const dsrIds = dsrList.map((u: any) => u.id);

    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const monthlySales = sales?.filter((s) => {
      const saleDate = new Date(s.created_at);
      return saleDate >= start && dsrIds.includes(s.user_id);
    });

    return monthlySales?.length || 0;
  };

  /* ----------------------------------------------------------------------
     Basic Team Stats
  ---------------------------------------------------------------------- */
  const getTeamStats = (teamId: string) => {
    const teamUsers = users?.filter((u) => u.team_id === teamId) || [];

    const teamUserIds = teamUsers.map((u) => u.user_id);

    const teamSales = sales?.filter((s) => teamUserIds.includes(s.user_id)) || [];

    return {
      members: teamUsers.length,
      sales: teamSales.length,
      paid: teamSales.filter((s) => s.is_paid).length,
      unpaid: teamSales.filter((s) => !s.is_paid).length,
    };
  };

  /* ----------------------------------------------------------------------
     Create Team
  ---------------------------------------------------------------------- */
  const handleCreate = async () => {
    if (!form.name.trim()) return;

    const result = await createTeam.mutateAsync(form);
    setOpen(false);
    setForm({ name: "", region_id: "" });

    if (result?.id) {
      navigate(`/admin/teams/${result.id}`);
    }
  };

  /* ----------------------------------------------------------------------
     Delete Team
  ---------------------------------------------------------------------- */
  const handleDelete = async (id: string) => {
    await deleteTeam.mutateAsync(id);
    setDeleteConfirm(null);
  };

  /* ----------------------------------------------------------------------
     Filter Teams
  ---------------------------------------------------------------------- */
  const filteredTeams = teams?.filter(
    (team) =>
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.regions?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ----------------------------------------------------------------------
      LOADING STATE
  ---------------------------------------------------------------------- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ----------------------------------------------------------------------
      RENDER PAGE
  ---------------------------------------------------------------------- */
  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Teams Management</h1>
          <p className="text-muted-foreground text-sm">
            Manage teams, members & monthly targets
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
              <DialogTitle>Create Team</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Team Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter team name"
                />
              </div>

              <div>
                <Label>Region</Label>
                <select
                  className="w-full border p-2 rounded"
                  value={form.region_id}
                  onChange={(e) => setForm({ ...form, region_id: e.target.value })}
                >
                  <option value="">Select region</option>
                  {regions?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button onClick={handleCreate} disabled={!form.name.trim()}>
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* SEARCH BAR */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search teams..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* TEAM TARGET MANAGER */}
      <div
        className="glass rounded-xl p-4 border cursor-pointer hover:border-primary/50"
        onClick={() => setShowTargetManager(!showTargetManager)}
      >
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <span className="font-semibold">Monthly Targets</span>
        </div>
      </div>

      {/* MONTHLY TARGET CARD */}
      {showTargetManager && (
        <div className="glass p-6 border rounded-xl space-y-4">

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Team Leader Monthly Targets</h2>

            <Button
              variant="outline"
              onClick={() => {
                const val = prompt("Enter default target for ALL TLs:");
                if (val) setDefaultTargetForAll(parseInt(val));
              }}
            >
              Set All Targets
            </Button>
          </div>

          {getLocalTeamLeaders().length === 0 ? (
            <p className="text-muted-foreground">No team leaders found.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

              {getLocalTeamLeaders().map((tl: any) => {
                const target = tlTargets[tl.id] || 0;
                const achieved = getTLMonthlySales(tl.id);

                const progress =
                  target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;

                return (
                  <div key={tl.id} className="border p-4 rounded-xl bg-secondary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{tl.name}</p>
                        <p className="text-xs text-muted-foreground">{tl.region}</p>
                      </div>

                      {editingTarget === tl.id ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => saveTarget(tl.id, parseInt(targetValue))}
                        >
                          <Save className="w-4 h-4 text-green-500" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingTarget(tl.id);
                            setTargetValue(target.toString());
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {editingTarget === tl.id ? (
                      <Input
                        className="mt-3"
                        type="number"
                        value={targetValue}
                        onChange={(e) => setTargetValue(e.target.value)}
                      />
                    ) : (
                      <>
                        <div className="flex justify-between text-xs mt-3">
                          <span>
                            {achieved} / {target} sales
                          </span>
                          <span
                            className={cn(
                              progress >= 100
                                ? "text-green-500"
                                : progress >= 50
                                ? "text-yellow-500"
                                : "text-red-500"
                            )}
                          >
                            {progress}%
                          </span>
                        </div>

                        <Progress value={progress} className="h-2 mt-1" />
                      </>
                    )}
                  </div>
                );
              })}

            </div>
          )}
        </div>
      )}

      {/* TEAMS GRID */}
      {filteredTeams?.length === 0 ? (
        <div className="text-center py-10 border rounded-xl">
          <Users className="w-12 h-12 mx-auto text-muted-foreground" />
          <p>No teams found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((team) => {
            const stats = getTeamStats(team.id);
            const paymentRate =
              stats.sales > 0 ? Math.round((stats.paid / stats.sales) * 100) : 0;

            return (
              <div
                key={team.id}
                className="border rounded-xl p-4 bg-secondary/10 hover:border-primary cursor-pointer"
                onClick={() => navigate(`/admin/teams/${team.id}`)}
              >
                <div className="flex justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{team.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" /> {team.regions?.name}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(team.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-secondary/30 p-2 rounded">
                    <strong>{stats.members}</strong>
                    <p className="text-xs">Members</p>
                  </div>
                  <div className="bg-secondary/30 p-2 rounded">
                    <strong>{stats.sales}</strong>
                    <p className="text-xs">Sales</p>
                  </div>
                  <div className="bg-secondary/30 p-2 rounded">
                    <strong className={stats.unpaid > 0 ? "text-red-500" : ""}>
                      {stats.unpaid}
                    </strong>
                    <p className="text-xs">Unpaid</p>
                  </div>
                </div>

                <div className="text-xs flex justify-between mb-1">
                  <span>Payment Rate</span>
                  <span
                    className={
                      paymentRate >= 80
                        ? "text-green-500"
                        : paymentRate >= 50
                        ? "text-yellow-500"
                        : "text-red-500"
                    }
                  >
                    {paymentRate}%
                  </span>
                </div>

                <Progress value={paymentRate} className="h-2" />

                <div className="flex items-center justify-end mt-3 text-primary">
                  View Details <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white p-6 rounded-xl w-80">
            <h3 className="font-semibold mb-2">Delete Team?</h3>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                className="bg-red-500 text-white"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminTeams;
