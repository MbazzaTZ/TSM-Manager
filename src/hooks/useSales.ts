import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Sale {
  id: string;
  sale_id: string;
  inventory_id: string;
  sold_by_user_id: string;
  customer_phone: string | null;
  has_package: boolean;
  package_type: string | null;
  is_paid: boolean;
  sold_at: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  inventory?: {
    smartcard: string;
    serial_number: string;
    stock_type: string;
  };
  profiles?: {
    full_name: string;
  };
}

export const useSales = () => {
  return useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          inventory(smartcard, serial_number, stock_type)
        `)
        .order("sold_at", { ascending: false });

      if (error) throw error;
      return data as Sale[];
    },
  });
};

export const useUnpaidSales = () => {
  return useQuery({
    queryKey: ["unpaid-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          inventory(smartcard, serial_number, stock_type)
        `)
        .eq("is_paid", false)
        .order("sold_at", { ascending: false });

      if (error) throw error;
      return data as Sale[];
    },
  });
};

export const useUnpaidCount = () => {
  return useQuery({
    queryKey: ["unpaid-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("sales")
        .select("*", { count: "exact", head: true })
        .eq("is_paid", false);

      if (error) throw error;
      return count || 0;
    },
  });
};

export const useSaleByInventory = (inventoryId: string | undefined) => {
  return useQuery({
    queryKey: ["sale-by-inventory", inventoryId],
    queryFn: async () => {
      if (!inventoryId) return null;

      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          inventory(smartcard, serial_number, stock_type)
        `)
        .eq("inventory_id", inventoryId)
        .maybeSingle();

      if (error) throw error;
      return data as Sale | null;
    },
    enabled: !!inventoryId,
  });
};

export const useCreateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sale: {
      inventory_id: string;
      sold_by_user_id: string;
      customer_phone?: string | null;
      has_package: boolean;
      package_type?: string | null;
      is_paid: boolean;
    }) => {
      // Generate sale ID
      const { data: saleIdData, error: saleIdError } = await supabase
        .rpc("generate_sale_id");

      if (saleIdError) throw saleIdError;

      const { data, error } = await supabase
        .from("sales")
        .insert({
          inventory_id: sale.inventory_id,
          sold_by_user_id: sale.sold_by_user_id,
          customer_phone: sale.customer_phone || null,
          has_package: sale.has_package,
          package_type: sale.package_type || null,
          is_paid: sale.is_paid,
          sale_id: saleIdData,
        })
        .select()
        .single();

      if (error) throw error;

      // Update inventory status to sold
      await supabase
        .from("inventory")
        .update({ status: "sold" as const })
        .eq("id", sale.inventory_id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      queryClient.invalidateQueries({ queryKey: ["unpaid-count"] });
      toast({
        title: "Mauzo Yamerekodiwa",
        description: "Mauzo mapya yameongezwa.",
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

export const useMarkAsPaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => {
      const { data, error } = await supabase
        .from("sales")
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq("id", saleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["unpaid-sales"] });
      queryClient.invalidateQueries({ queryKey: ["unpaid-count"] });
      queryClient.invalidateQueries({ queryKey: ["sale-by-inventory"] });
      toast({
        title: "Malipo Yamepokelewa",
        description: "Mauzo yamewekwa kuwa yamelipwa.",
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

export const useUpdateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Sale> & { id: string }) => {
      const { data, error } = await supabase
        .from("sales")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["unpaid-sales"] });
      queryClient.invalidateQueries({ queryKey: ["unpaid-count"] });
      queryClient.invalidateQueries({ queryKey: ["sale-by-inventory"] });
      toast({
        title: "Sale Updated",
        description: "Sale information has been updated.",
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

// Get daily sales for the past N days
export const useDailySales = (days: number = 7) => {
  return useQuery({
    queryKey: ["daily-sales", days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("sales")
        .select("sold_at, is_paid")
        .gte("sold_at", startDate.toISOString())
        .order("sold_at", { ascending: true });

      if (error) throw error;

      // Group by day
      const dailyData: Record<string, { date: string; sales: number; paid: number; unpaid: number }> = {};
      
      for (let i = 0; i <= days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - i));
        const key = d.toISOString().split("T")[0];
        dailyData[key] = { date: key, sales: 0, paid: 0, unpaid: 0 };
      }

      data?.forEach((sale) => {
        const key = new Date(sale.sold_at).toISOString().split("T")[0];
        if (dailyData[key]) {
          dailyData[key].sales++;
          if (sale.is_paid) {
            dailyData[key].paid++;
          } else {
            dailyData[key].unpaid++;
          }
        }
      });

      return Object.values(dailyData);
    },
  });
};

// Get weekly sales summary
export const useWeeklySales = () => {
  return useQuery({
    queryKey: ["weekly-sales"],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 28); // 4 weeks
      startDate.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("sales")
        .select("sold_at, is_paid, inventory(stock_type)")
        .gte("sold_at", startDate.toISOString())
        .order("sold_at", { ascending: true });

      if (error) throw error;

      // Group by week
      const weeks: { week: string; fullSet: number; decoderOnly: number; total: number }[] = [];
      
      for (let w = 0; w < 4; w++) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - ((3 - w) * 7 + 6));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const weekSales = data?.filter((s) => {
          const saleDate = new Date(s.sold_at);
          return saleDate >= weekStart && saleDate <= weekEnd;
        }) || [];

        weeks.push({
          week: `Week ${w + 1}`,
          fullSet: weekSales.filter((s) => s.inventory?.stock_type === "full_set").length,
          decoderOnly: weekSales.filter((s) => s.inventory?.stock_type === "decoder_only").length,
          total: weekSales.length,
        });
      }

      return weeks;
    },
  });
};

// Get regional sales performance
export const useRegionalSales = () => {
  return useQuery({
    queryKey: ["regional-sales"],
    queryFn: async () => {
      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select(`
          id,
          is_paid,
          inventory(region_id, stock_type)
        `);

      if (salesError) throw salesError;

      const { data: regions, error: regionsError } = await supabase
        .from("regions")
        .select("id, name");

      if (regionsError) throw regionsError;

      const regionStats = regions?.map((region) => {
        const regionSales = sales?.filter((s) => s.inventory?.region_id === region.id) || [];
        return {
          id: region.id,
          name: region.name,
          totalSales: regionSales.length,
          paidSales: regionSales.filter((s) => s.is_paid).length,
          unpaidSales: regionSales.filter((s) => !s.is_paid).length,
          fullSetSales: regionSales.filter((s) => s.inventory?.stock_type === "full_set").length,
          decoderOnlySales: regionSales.filter((s) => s.inventory?.stock_type === "decoder_only").length,
          performanceRate: regionSales.length > 0 
            ? Math.round((regionSales.filter((s) => s.is_paid).length / regionSales.length) * 100)
            : 0,
        };
      }) || [];

      return regionStats.sort((a, b) => b.totalSales - a.totalSales);
    },
  });
};
