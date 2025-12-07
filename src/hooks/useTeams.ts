import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Team {
  id: string;
  name: string;
  region_id: string | null;
  created_at: string;
  regions?: { name: string } | null;
}

export interface Region {
  id: string;
  name: string;
  created_at: string;
}

export const useRegions = () => {
  return useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regions")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Region[];
    },
  });
};

export const useTeams = () => {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          regions(name)
        `)
        .order("name");

      if (error) throw error;
      return data as Team[];
    },
  });
};

export const useCreateTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (team: { name: string; region_id: string }) => {
      const { data, error } = await supabase
        .from("teams")
        .insert(team)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast({
        title: "Timu Imeundwa",
        description: "Timu mpya imeundwa kikamilifu.",
      });
    },
    onError: (error) => {
      toast({
        title: "Kosa",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast({
        title: "Timu Imefutwa",
        description: "Timu imefutwa kikamilifu.",
      });
    },
    onError: (error) => {
      toast({
        title: "Kosa",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
