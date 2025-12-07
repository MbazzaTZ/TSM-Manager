import { Trophy, ChevronRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LeaderboardItem {
  id: string;
  name: string;
  role: "TL" | "DSR";
  sales: number;
  region?: string;
  rank: number;
}

interface LeaderboardCardProps {
  title: string;
  items: LeaderboardItem[];
  onItemClick?: (item: LeaderboardItem) => void;
}

const LeaderboardCard = ({ title, items, onItemClick }: LeaderboardCardProps) => {
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

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-warning" />
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick?.(item)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-200 group"
          >
            {getRankBadge(item.rank)}
            
            <div className="flex-1 text-left">
              <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                {item.name}
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {item.role}
                </Badge>
                {item.region && (
                  <span className="text-xs text-muted-foreground">{item.region}</span>
                )}
              </div>
            </div>

            <div className="text-right">
              <p className="font-bold text-success">{item.sales}</p>
              <p className="text-xs text-muted-foreground">mauzo</p>
            </div>

            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default LeaderboardCard;
