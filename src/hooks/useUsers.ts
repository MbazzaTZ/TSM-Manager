import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type AppRole = "admin" | "regional_manager" | "team_leader" | "dsr";

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  team_id: string | null;
  created_at: string;
  updated_at: string;
  teams?: { name: string; regions?: { name: string } | null } | null;
  role?: AppRole;
}

export const useUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(`*, teams(name, regions(name))`)
        .order("full_name");

      if (error) throw error;

      // Fetch roles separately
      const { data: roles } = await supabase.from("user_roles").select("*");
      
      const rolesMap: Record<string, AppRole> = {};
      roles?.forEach((r) => { rolesMap[r.user_id] = r.role as AppRole; });

      return profiles?.map((p) => ({ ...p, role: rolesMap[p.user_id] })) as UserProfile[];
    },
  });
};

export const useLeaderboard = () => {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Get sales for this month with inventory details
      const { data: salesData } = await supabase
        .from("sales")
        .select("id, inventory_id, inventory(assigned_to_tl, assigned_to_dsr)")
        .gte("sold_at", startOfMonth.toISOString());

      // Get TL/DSR members from localStorage
      let members: { id: string; name: string; role: string; region_id?: string }[] = [];
      try {
        const stored = localStorage.getItem("tsm_team_members");
        members = stored ? JSON.parse(stored) : [];
      } catch {
        members = [];
      }

      // Get sales targets from localStorage
      let salesTargets: Record<string, number> = {};
      try {
        const stored = localStorage.getItem("tsm_sales_targets");
        salesTargets = stored ? JSON.parse(stored) : {};
      } catch {
        salesTargets = {};
      }

      // Get default monthly target
      let defaultTarget = 20;
      try {
        const stored = localStorage.getItem("tsm_default_target");
        defaultTarget = stored ? parseInt(stored, 10) : 20;
      } catch {
        defaultTarget = 20;
      }

      // Get regions for display
      const { data: regions } = await supabase.from("regions").select("id, name");
      const regionMap = new Map(regions?.map((r) => [r.id, r.name]) || []);

      // Count sales per TL (by TL name match since localStorage uses names)
      const salesCountByTLName: Record<string, number> = {};
      
      // Build TL name to ID map from localStorage
      const teamLeaders = members.filter((m) => m.role === "team_leader");

      // Count sales - match by assigned_to_tl field (which stores TL name)
      salesData?.forEach((s: any) => {
        const tlName = s.inventory?.assigned_to_tl;
        if (tlName) {
          const normalizedName = tlName.toLowerCase();
          salesCountByTLName[normalizedName] = (salesCountByTLName[normalizedName] || 0) + 1;
        }
      });

      // Build leaderboard with targets
      const leaderboard = teamLeaders
        .map((tl) => {
          const sales = salesCountByTLName[tl.name.toLowerCase()] || 0;
          const target = salesTargets[tl.id] || defaultTarget;
          return {
            id: tl.id,
            name: tl.name,
            role: "TL" as const,
            sales,
            target,
            progress: target > 0 ? Math.round((sales / target) * 100) : 0,
            region: tl.region_id ? regionMap.get(tl.region_id) : undefined,
            rank: 0,
          };
        })
        .sort((a, b) => b.sales - a.sales)
        .map((p, i) => ({ ...p, rank: i + 1 }));

      return leaderboard;
    },
  });
};

// Hook to get/set sales targets
export const useSalesTargets = () => {
  return useQuery({
    queryKey: ["sales-targets"],
    queryFn: async () => {
      let targets: Record<string, number> = {};
      let defaultTarget = 20;
      
      try {
        const storedTargets = localStorage.getItem("tsm_sales_targets");
        targets = storedTargets ? JSON.parse(storedTargets) : {};
        
        const storedDefault = localStorage.getItem("tsm_default_target");
        defaultTarget = storedDefault ? parseInt(storedDefault, 10) : 20;
      } catch {
        targets = {};
        defaultTarget = 20;
      }
      
      return { targets, defaultTarget };
    },
  });
};

export const useUpdateSalesTarget = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ memberId, target }: { memberId: string; target: number }) => {
      let targets: Record<string, number> = {};
      try {
        const stored = localStorage.getItem("tsm_sales_targets");
        targets = stored ? JSON.parse(stored) : {};
      } catch {
        targets = {};
      }
      
      targets[memberId] = target;
      localStorage.setItem("tsm_sales_targets", JSON.stringify(targets));
      return targets;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-targets"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      toast({ title: "Target Updated" });
    },
  });
};

export const useUpdateDefaultTarget = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (target: number) => {
      localStorage.setItem("tsm_default_target", target.toString());
      return target;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-targets"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      toast({ title: "Default Target Updated" });
    },
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { data: existing } = await supabase.from("user_roles").select("*").eq("user_id", userId).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("user_roles").update({ role }).eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); toast({ title: "Jukumu Limebadilishwa" }); },
    onError: (error) => { toast({ title: "Kosa", description: error.message, variant: "destructive" }); },
  });
};

export const useUpdateUserTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, teamId }: { profileId: string; teamId: string | null }) => {
      const { error } = await supabase.from("profiles").update({ team_id: teamId }).eq("id", profileId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); toast({ title: "Timu Imebadilishwa" }); },
    onError: (error) => { toast({ title: "Kosa", description: error.message, variant: "destructive" }); },
  });
};
