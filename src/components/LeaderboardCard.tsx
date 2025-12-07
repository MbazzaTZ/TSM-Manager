import { Trophy, ChevronRight, Star, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface LeaderboardItem {
  id: string;
  name: string;
  role: "TL" | "DSR";
  sales: number;
  target?: number;
  progress?: number;
  region?: string;
  rank: number;
}

interface LeaderboardCardProps {
  title: string;
  items: LeaderboardItem[];
  showTarget?: boolean;
  onItemClick?: (item: LeaderboardItem) => void;
}

const LeaderboardCard = ({ title, items, showTarget = true, onItemClick }: LeaderboardCardProps) => {
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-8 h-8 rounded-full gradient-warning flex items-center justify-center">
            <Trophy className="w-4 h-4 text-warning-foreground" />
          </div>
        );
      case 2:
        return (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <span className="text-sm font-bold text-muted-foreground">2</span>
          </div>
        );
      case 3:
        return (
          <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
            <span className="text-sm font-bold text-warning">3</span>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-sm font-medium text-muted-foreground">{rank}</span>
          </div>
        );
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-success";
    if (progress >= 75) return "bg-info";
    if (progress >= 50) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-warning" />
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No team leaders yet</p>
          <p className="text-xs mt-1">Add TLs in Team Members</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onItemClick?.(item)}
              className="w-full flex flex-col gap-2 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                {getRankBadge(item.rank)}
                
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {item.role}
                    </Badge>
                    {item.region && (
                      <span className="text-xs text-muted-foreground truncate">{item.region}</span>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  {showTarget && item.target ? (
                    <div>
                      <p className="font-bold">
                        <span className={cn(
                          item.sales >= item.target ? "text-success" : "text-foreground"
                        )}>
                          {item.sales}
                        </span>
                        <span className="text-muted-foreground text-sm">/{item.target}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">target</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-success">{item.sales}</p>
                      <p className="text-xs text-muted-foreground">mauzo</p>
                    </div>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </div>

              {/* Progress Bar */}
              {showTarget && item.target && item.target > 0 && (
                <div className="w-full">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className={cn(
                      "font-medium",
                      (item.progress || 0) >= 100 ? "text-success" :
                      (item.progress || 0) >= 75 ? "text-info" :
                      (item.progress || 0) >= 50 ? "text-warning" : "text-destructive"
                    )}>
                      {item.progress || 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-500", getProgressColor(item.progress || 0))}
                      style={{ width: `${Math.min(item.progress || 0, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaderboardCard;
