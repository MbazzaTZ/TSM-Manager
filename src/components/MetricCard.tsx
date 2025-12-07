import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "primary" | "success" | "warning" | "danger" | "info";
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  variant = "primary",
  trend 
}: MetricCardProps) => {
  const glowClasses = {
    primary: "metric-glow",
    success: "success-glow",
    warning: "warning-glow",
    danger: "danger-glow",
    info: "info-glow",
  };

  const iconBgClasses = {
    primary: "gradient-primary",
    success: "gradient-success",
    warning: "gradient-warning",
    danger: "gradient-danger",
    info: "gradient-info",
  };

  const textColorClasses = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    info: "text-info",
  };

  return (
    <div className={cn("glass-hover rounded-2xl p-5", glowClasses[variant])}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-xl", iconBgClasses[variant])}>
          <Icon className="w-5 h-5 text-foreground" />
        </div>
        {trend && (
          <span className={cn(
            "text-sm font-medium",
            trend.isPositive ? "text-success" : "text-destructive"
          )}>
            {trend.isPositive ? "+" : "-"}{trend.value}%
          </span>
        )}
      </div>
      
      <div>
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className={cn("text-3xl font-bold", textColorClasses[variant])}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
