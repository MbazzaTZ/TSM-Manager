import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type StockType = "full_set" | "decoder_only";
export type StockStatus = "in_store" | "in_hand" | "sold";

export interface InventoryItem {
  id: string;
  batch_number: string;
  smartcard: string;
  serial_number: string;
  stock_type: StockType;
  status: StockStatus;
  region_id: string | null;
  assigned_to_team_id: string | null;
  assigned_to_user_id: string | null;
  created_at: string;
  updated_at: string;
  regions?: { name: string } | null;
  teams?: { name: string } | null;
  profiles?: { full_name: string } | null;
}

export const useInventory = () => {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select(`
          *,
          regions(name),
          teams:assigned_to_team_id(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as InventoryItem[];
    },
  });
};

export const useInventorySearch = (query: string) => {
  return useQuery({
    queryKey: ["inventory-search", query],
    queryFn: async () => {
      if (!query) return null;

      const { data, error } = await supabase
        .from("inventory")
        .select(`
          *,
          regions(name),
          teams:assigned_to_team_id(name)
        `)
        .or(`smartcard.eq.${query},serial_number.eq.${query}`)
        .maybeSingle();

      if (error) throw error;
      return data as InventoryItem | null;
    },
    enabled: !!query,
  });
};

export const useInventoryStats = () => {
  return useQuery({
    queryKey: ["inventory-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("status, stock_type");

      if (error) throw error;

      const stats = {
        available: 0,
        sold: 0,
        inHand: 0,
        fullSet: { available: 0, sold: 0, inHand: 0 },
        decoderOnly: { available: 0, sold: 0, inHand: 0 },
      };

      data?.forEach((item) => {
        const isFullSet = item.stock_type === "full_set";
        
        switch (item.status) {
          case "in_store":
            stats.available++;
            if (isFullSet) stats.fullSet.available++;
            else stats.decoderOnly.available++;
            break;
          case "in_hand":
            stats.inHand++;
            if (isFullSet) stats.fullSet.inHand++;
            else stats.decoderOnly.inHand++;
            break;
          case "sold":
            stats.sold++;
            if (isFullSet) stats.fullSet.sold++;
            else stats.decoderOnly.sold++;
            break;
        }
      });

      return stats;
    },
  });
};

export const useAddInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: Omit<InventoryItem, "id" | "created_at" | "updated_at" | "regions" | "teams" | "profiles">[]) => {
      const { data, error } = await supabase
        .from("inventory")
        .insert(items)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      toast({
        title: "Stock Imeongezwa",
        description: "Stock mpya imeongezwa kwenye mfumo.",
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

export const useUpdateInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InventoryItem> & { id: string }) => {
      const { data, error } = await supabase
        .from("inventory")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
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

export const useBulkUpdateInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<InventoryItem> }) => {
      const { data, error } = await supabase
        .from("inventory")
        .update(updates)
        .in("id", ids)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      toast({
        title: "Updated",
        description: `${variables.ids.length} item(s) updated successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("inventory")
        .delete()
        .in("id", ids);

      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      toast({
        title: "Deleted",
        description: `${ids.length} item(s) deleted successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
