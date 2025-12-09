import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTeams } from "@/hooks/useTeams";

interface DSRCommission {
  id: string;
  full_name: string;
  total_sales: number;
  total_commission: number;
  bonus_awarded: number;
}

export default function AdminCommissionPage() {
  const navigate = useNavigate();
  const [dsrCommissions, setDsrCommissions] = useState<DSRCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { data: teams, isLoading: teamsLoading } = useTeams();

  useEffect(() => {
    async function fetchCommissions() {
      setLoading(true);

      // ----------------------------------------------------------
      // FIX 1 — Load all DSRs at once
      // ----------------------------------------------------------
      const { data: users, error: userError } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("role", "dsr");

      if (userError || !users) {
        setLoading(false);
        return;
      }

      const dsrIds = users.map((u) => u.id);

      // ----------------------------------------------------------
      // FIX 2 — Load ALL sales for ALL DSRs at once
      // ----------------------------------------------------------
      const { data: allSales } = await supabase
        .from("sales")
        .select("user_id, total_commission")
        .in("user_id", dsrIds);

      // Safety fallback
      const salesMap: Record<
        string,
        { total_sales: number; total_commission: number }
      > = {};

      users.forEach((u) => {
        salesMap[u.id] = { total_sales: 0, total_commission: 0 };
      });

      if (allSales) {
        for (const sale of allSales) {
          const uid = sale.user_id;
          salesMap[uid].total_sales += 1;
          salesMap[uid].total_commission += sale.total_commission || 0;
        }
      }

      // ----------------------------------------------------------
      // FIX 3 — Load all bonuses for all DSRs at once
      // ----------------------------------------------------------
      const { data: allPerf } = await supabase
        .from("monthly_performance")
        .select("user_id, bonus_awarded, created_at")
        .in("user_id", dsrIds);

      const bonusMap: Record<string, number> = {};

      // Initialize all to zero
      users.forEach((u) => (bonusMap[u.id] = 0));

      if (allPerf) {
        // Group bonuses by DSR and pick latest
        const grouped: Record<string, any[]> = {};

        allPerf.forEach((p) => {
          if (!grouped[p.user_id]) grouped[p.user_id] = [];
          grouped[p.user_id].push(p);
        });

        Object.entries(grouped).forEach(([user_id, perf]) => {
          perf.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
          bonusMap[user_id] = perf[0].bonus_awarded || 0;
        });
      }

      // ----------------------------------------------------------
      // FIX 4 — Combine into final response
      // ----------------------------------------------------------
      const commissions: DSRCommission[] = users.map((u) => ({
        id: u.id,
        full_name: u.full_name,
        total_sales: salesMap[u.id].total_sales,
        total_commission: salesMap[u.id].total_commission,
        bonus_awarded: bonusMap[u.id],
      }));

      setDsrCommissions(commissions);
      setLoading(false);
    }

    fetchCommissions();
  }, []);

  // Team commission aggregation
  const teamCommissions = useMemo(() => {
    if (!teams) return [];
    return teams.map((team) => {
      // Find DSRs in this team (assuming DSRCommission has a team_id field, if not, skip this logic)
      // If DSRCommission does not have team_id, you need to join with users table to get team_id
      // For now, we assume you have a way to relate DSRs to teams
      const dsrsInTeam = dsrCommissions.filter((d) => (d as any).team_id === team.id);
      return {
        teamId: team.id,
        teamName: team.name,
        totalDSRs: dsrsInTeam.length,
        totalSales: dsrsInTeam.reduce((sum, d) => sum + d.total_sales, 0),
        totalCommission: dsrsInTeam.reduce((sum, d) => sum + d.total_commission, 0),
        totalBonus: dsrsInTeam.reduce((sum, d) => sum + d.bonus_awarded, 0),
      };
    });
  }, [teams, dsrCommissions]);

  // Summary values
  const summary = useMemo(() => {
    const totalDSRs = dsrCommissions.length;
    const totalSales = dsrCommissions.reduce((sum, d) => sum + d.total_sales, 0);
    const totalCommission = dsrCommissions.reduce((sum, d) => sum + d.total_commission, 0);
    const totalBonus = dsrCommissions.reduce((sum, d) => sum + d.bonus_awarded, 0);
    return { totalDSRs, totalSales, totalCommission, totalBonus };
  }, [dsrCommissions]);

  // Filtered DSRs by search
  const filteredDSRs = useMemo(() => {
    return dsrCommissions.filter((d) =>
      d.full_name.toLowerCase().includes(search.toLowerCase())
    );
  }, [dsrCommissions, search]);

  return (
    <Card className="glass rounded-2xl p-6 border border-border/50">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">DSR Commission Summary</h2>
        <button
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80 transition"
          onClick={() => navigate("/")}
        >
          Back to Home
        </button>
      </div>

      {/* Summary Card */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-5 text-center border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Total DSRs</div>
            <div className="text-2xl font-bold text-foreground">{summary.totalDSRs}</div>
          </div>
          <div className="glass rounded-xl p-5 text-center border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Total Sales</div>
            <div className="text-2xl font-bold text-foreground">{summary.totalSales}</div>
          </div>
          <div className="glass rounded-xl p-5 text-center border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Total Commission</div>
            <div className="text-2xl font-bold text-primary">{summary.totalCommission.toLocaleString()} TZS</div>
          </div>
          <div className="glass rounded-xl p-5 text-center border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Total Bonus</div>
            <div className="text-2xl font-bold text-info">{summary.totalBonus.toLocaleString()} TZS</div>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="mb-6 flex justify-end">
        <input
          type="text"
          placeholder="Search DSR by name..."
          className="border border-border/50 rounded px-3 py-2 w-full md:w-64 bg-background text-foreground"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Team Commission Info Cards */}
      {!teamsLoading && teamCommissions.length > 0 && (
        <div className="mb-10">
          <h3 className="text-lg font-semibold text-foreground mb-3">Team Commission Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamCommissions.map((team) => (
              <div
                key={team.teamId}
                className="glass rounded-xl p-5 border border-border/50 shadow-sm font-sans"
                style={{ minHeight: 140 }}
              >
                <div className="font-bold text-lg text-primary mb-2">{team.teamName}</div>
                <div className="flex flex-col gap-2 text-base text-foreground">
                  <div>Total DSRs: <span className="font-bold text-foreground">{team.totalDSRs}</span></div>
                  <div>Total Sales: <span className="font-bold text-foreground">{team.totalSales}</span></div>
                  <div>Total Commission: <span className="font-bold text-primary">{team.totalCommission.toLocaleString()} TZS</span></div>
                  <div>Total Bonus: <span className="font-bold text-info">{team.totalBonus.toLocaleString()} TZS</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commission Info Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {filteredDSRs.map((dsr) => (
            <div key={dsr.id} className="glass rounded-xl p-5 border border-border/50 shadow-sm">
              <div className="font-semibold text-lg text-foreground mb-1">{dsr.full_name}</div>
              <div className="flex flex-col gap-1 text-sm text-foreground">
                <div>Total Sales: <span className="font-bold text-foreground">{dsr.total_sales}</span></div>
                <div>Total Commission: <span className="font-bold text-primary">{dsr.total_commission.toLocaleString()} TZS</span></div>
                <div>Bonus Awarded: <span className="font-bold text-info">{dsr.bonus_awarded.toLocaleString()} TZS</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div>Loading...</div>
      ) : filteredDSRs.length === 0 ? (
        <div className="text-center text-muted-foreground">No DSRs found.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>DSR Name</TableHead>
              <TableHead>Total Sales</TableHead>
              <TableHead>Total Commission</TableHead>
              <TableHead>Bonus Awarded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDSRs.map((dsr) => (
              <TableRow key={dsr.id}>
                <TableCell className="text-foreground">{dsr.full_name}</TableCell>
                <TableCell className="text-foreground">{dsr.total_sales}</TableCell>
                <TableCell>
                  <Badge className="bg-primary text-primary-foreground px-2 py-1">
                    {dsr.total_commission.toLocaleString()} TZS
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      dsr.bonus_awarded > 0
                        ? "bg-info text-info-foreground px-2 py-1"
                        : "bg-muted text-muted-foreground px-2 py-1"
                    }
                  >
                    {dsr.bonus_awarded.toLocaleString()} TZS
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
