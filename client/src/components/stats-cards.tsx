import { Clock, Target, Flame, CheckCircle } from "lucide-react";

interface StatsCardsProps {
  sessionsToday: number;
  totalFocusMinutes: number;
  currentStreak: number;
  tasksCompleted: number;
}

export function StatsCards({
  sessionsToday,
  totalFocusMinutes,
  currentStreak,
  tasksCompleted,
}: StatsCardsProps) {
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const stats = [
    {
      icon: Target,
      label: "Sessions Today",
      value: sessionsToday.toString(),
      color: "text-primary",
    },
    {
      icon: Clock,
      label: "Focus Time",
      value: formatTime(totalFocusMinutes),
      color: "text-chart-4",
    },
    {
      icon: Flame,
      label: "Day Streak",
      value: currentStreak.toString(),
      color: "text-chart-3",
    },
    {
      icon: CheckCircle,
      label: "Tasks Done",
      value: tasksCompleted.toString(),
      color: "text-chart-2",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="neo-card rounded-2xl p-5"
          data-testid={`card-stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`neo-button-sm p-2 rounded-xl ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground tabular-nums">{stat.value}</p>
          <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
