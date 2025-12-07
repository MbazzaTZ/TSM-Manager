import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export const useRealtimeAlerts = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  useEffect(() => {
    const channel = supabase
      .channel("realtime-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_log",
        },
        (payload) => {
          const activity = payload.new as {
            event_type: string;
            metadata: { has_package?: boolean; is_paid?: boolean };
          };

          // Show toast based on event type
          switch (activity.event_type) {
            case "sale_created":
              toast.success(t("alert.newSale"), {
                description: activity.metadata.has_package
                  ? t("status.hasPackage")
                  : t("status.noPackage"),
                duration: 8000,
              });
              break;
            case "payment_received":
              toast.info(t("alert.paymentReceived"), {
                duration: 8000,
              });
              break;
          }

          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ["inventory"] });
          queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
          queryClient.invalidateQueries({ queryKey: ["sales"] });
          queryClient.invalidateQueries({ queryKey: ["unpaid-count"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, t]);
};

export const useRealtimeInventory = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("inventory-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["inventory"] });
          queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};

export const useRealtimeSales = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("sales-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["sales"] });
          queryClient.invalidateQueries({ queryKey: ["unpaid-sales"] });
          queryClient.invalidateQueries({ queryKey: ["unpaid-count"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
