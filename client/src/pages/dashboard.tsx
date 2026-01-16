import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Pause, 
  Play, 
  RotateCcw, 
  Plus, 
  Check, 
  Trash2,
  CloudRain,
  Coffee,
  Wind,
  Flame,
  Settings,
  Droplets,
  Minus
} from "lucide-react";
import type { Task, Settings as SettingsType, Session, SessionType } from "@shared/schema";

export default function Dashboard() {
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [sessionType, setSessionType] = useState<SessionType>("work");
  const [timerState, setTimerState] = useState<"idle" | "running" | "paused">("idle");
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [waterCount, setWaterCount] = useState(2);
  const [activeAmbience, setActiveAmbience] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: settings } = useQuery<SettingsType>({
    queryKey: ["/api/settings"],
  });

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  const defaultSettings: SettingsType = {
    id: "default",
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLongBreak: 4,
    soundEnabled: true,
  };

  const currentSettings = settings || defaultSettings;

  const getDuration = useCallback((type: SessionType) => {
    switch (type) {
      case "work": return currentSettings.workDuration * 60;
      case "shortBreak": return currentSettings.shortBreakDuration * 60;
      case "longBreak": return currentSettings.longBreakDuration * 60;
    }
  }, [currentSettings]);

  useEffect(() => {
    setTimeRemaining(getDuration(sessionType));
  }, [sessionType, getDuration]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (timerState === "running") {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setTimerState("idle");
            return getDuration(sessionType);
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [timerState, sessionType, getDuration]);

  const addTaskMutation = useMutation({
    mutationFn: async (data: { title: string; estimatedPomodoros: number }) => {
      return apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/tasks/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<SettingsType>) => {
      return apiRequest("PATCH", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      addTaskMutation.mutate({ title: newTaskTitle.trim(), estimatedPomodoros: 1 });
      setNewTaskTitle("");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const hours = now.getHours();
  const timeOfDay = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  const incompleteTasks = tasks.filter(t => !t.completed);
  const progress = 1 - (timeRemaining / getDuration(sessionType));
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference * (1 - progress);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayWorkSessions = sessions.filter(s => {
    const sessionDate = new Date(s.completedAt);
    sessionDate.setHours(0, 0, 0, 0);
    return sessionDate.getTime() === today.getTime() && s.type === "work";
  }).length;

  const endOfYear = new Date(now.getFullYear(), 11, 31);
  const daysRemaining = Math.ceil((endOfYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-12 gap-4 auto-rows-min">
          
          <div className="col-span-12 md:col-span-4 neo-card rounded-3xl p-6">
            <div className="flex gap-2 mb-6 justify-center">
              <Button
                onClick={() => { setSessionType("work"); setTimerState("idle"); }}
                variant="ghost"
                data-testid="button-session-focus"
                className={`rounded-full px-6 ${sessionType === "work" ? "neo-pressed" : "neo-button"}`}
              >
                Focus
              </Button>
              <Button
                onClick={() => { setSessionType("shortBreak"); setTimerState("idle"); }}
                variant="ghost"
                data-testid="button-session-break"
                className={`rounded-full px-6 ${sessionType !== "work" ? "neo-pressed" : "neo-button"}`}
              >
                Break
              </Button>
            </div>

            <div className="relative flex justify-center mb-6">
              <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                <circle cx="100" cy="100" r="90" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" className="opacity-30" />
                <circle
                  cx="100" cy="100" r="90"
                  fill="none"
                  stroke="hsl(var(--foreground))"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-light text-foreground tabular-nums tracking-tight" data-testid="text-timer-display">
                  {formatTime(timeRemaining)}
                </span>
                <span className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
                  {timerState === "running" ? "Running" : timerState === "paused" ? "Paused" : "Ready"}
                </span>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button
                onClick={() => setTimerState(prev => prev === "running" ? "paused" : "running")}
                variant="ghost"
                size="icon"
                data-testid="button-timer-toggle"
                className="neo-button w-12 h-12 rounded-full"
              >
                {timerState === "running" ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </Button>
              <Button
                onClick={() => { setTimerState("idle"); setTimeRemaining(getDuration(sessionType)); }}
                variant="ghost"
                size="icon"
                data-testid="button-timer-reset"
                className="neo-button w-12 h-12 rounded-full"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="col-span-6 md:col-span-4 neo-card rounded-3xl p-6 flex flex-col justify-center">
            <div className="text-5xl font-light text-foreground tracking-tight">
              {month}/{day}
            </div>
            <div className="text-2xl text-muted-foreground font-light">
              {displayHours}{timeOfDay}
            </div>
          </div>

          <div className="col-span-6 md:col-span-4 neo-card rounded-3xl p-5">
            <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Ambience</h3>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "rain", icon: CloudRain, label: "Rain" },
                { id: "cafe", icon: Coffee, label: "Cafe" },
                { id: "wind", icon: Wind, label: "Wind" },
                { id: "fire", icon: Flame, label: "Fire" },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveAmbience(prev => prev === item.id ? null : item.id)}
                  data-testid={`button-ambience-${item.id}`}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${
                    activeAmbience === item.id ? "neo-pressed" : "neo-button"
                  }`}
                >
                  <item.icon className="w-5 h-5 text-foreground" />
                  <span className="text-[10px] text-muted-foreground">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-6 md:col-span-4 neo-card rounded-3xl p-6">
            <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Hydration</h3>
            <div className="flex items-center justify-center gap-4 mb-3">
              <Button
                onClick={() => setWaterCount(prev => Math.max(0, prev - 1))}
                variant="ghost"
                size="icon"
                data-testid="button-water-minus"
                className="neo-button w-10 h-10 rounded-full"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="neo-inset p-4 rounded-2xl">
                <Droplets className="w-8 h-8 text-foreground" />
              </div>
              <Button
                onClick={() => setWaterCount(prev => Math.min(8, prev + 1))}
                variant="ghost"
                size="icon"
                data-testid="button-water-plus"
                className="neo-button w-10 h-10 rounded-full"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Drink water: <span className="text-foreground font-medium">{waterCount} / 8</span>
            </p>
          </div>

          <div className="col-span-6 md:col-span-4 neo-card rounded-3xl p-5 flex flex-col items-center justify-center">
            <div className="neo-inset w-20 h-20 rounded-full flex items-center justify-center mb-2">
              <span className="text-2xl font-bold text-foreground">{daysRemaining}</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">
              Days Left This Year
            </p>
          </div>

          <div className="col-span-12 md:col-span-4 neo-card rounded-3xl p-5">
            <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Today's Sessions</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {Array.from({ length: currentSettings.sessionsUntilLongBreak }).map((_, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                    i < todayWorkSessions ? "bg-foreground text-background" : "neo-inset text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-12 md:col-span-5 neo-card rounded-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider">Tasks</h3>
              <span className="text-xs text-muted-foreground">{incompleteTasks.length} Pending</span>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
              {incompleteTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No tasks yet</p>
              ) : (
                incompleteTasks.map(task => (
                  <div key={task.id} className="neo-inset rounded-xl p-3 flex items-center gap-3 group">
                    <button
                      onClick={() => toggleTaskMutation.mutate(task.id)}
                      data-testid={`button-toggle-task-${task.id}`}
                      className="neo-button w-5 h-5 rounded flex-shrink-0 flex items-center justify-center"
                    >
                      {task.completed && <Check className="w-3 h-3" />}
                    </button>
                    <span className="flex-1 text-sm text-foreground truncate">{task.title}</span>
                    <button
                      onClick={() => deleteTaskMutation.mutate(task.id)}
                      data-testid={`button-delete-task-${task.id}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="neo-inset rounded-xl p-2 flex items-center gap-2">
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                placeholder="Add a task..."
                data-testid="input-task-title"
                className="flex-1 bg-transparent border-0 h-8 text-sm focus-visible:ring-0"
              />
              <Button
                onClick={handleAddTask}
                variant="ghost"
                size="icon"
                data-testid="button-add-task"
                className="neo-button w-8 h-8 rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3 flex flex-col gap-4">
            <div className="neo-card rounded-3xl p-4 flex-1 flex items-center justify-center">
              <ThemeToggle />
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              data-testid="button-settings"
              className="neo-card rounded-3xl p-4 flex items-center justify-center hover:neo-pressed transition-all"
            >
              <Settings className="w-6 h-6 text-foreground" />
            </button>
          </div>

        </div>

        {showSettings && (
          <div className="mt-6 neo-card rounded-3xl p-6">
            <h3 className="text-lg font-medium text-foreground mb-6">Timer Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="neo-inset rounded-2xl p-4">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Focus Duration</label>
                <div className="flex items-center justify-between mt-2">
                  <Button
                    onClick={() => updateSettingsMutation.mutate({ workDuration: Math.max(5, currentSettings.workDuration - 5) })}
                    variant="ghost"
                    size="icon"
                    className="neo-button w-8 h-8 rounded-lg"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-2xl font-light text-foreground">{currentSettings.workDuration}m</span>
                  <Button
                    onClick={() => updateSettingsMutation.mutate({ workDuration: Math.min(60, currentSettings.workDuration + 5) })}
                    variant="ghost"
                    size="icon"
                    className="neo-button w-8 h-8 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="neo-inset rounded-2xl p-4">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Short Break</label>
                <div className="flex items-center justify-between mt-2">
                  <Button
                    onClick={() => updateSettingsMutation.mutate({ shortBreakDuration: Math.max(1, currentSettings.shortBreakDuration - 1) })}
                    variant="ghost"
                    size="icon"
                    className="neo-button w-8 h-8 rounded-lg"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-2xl font-light text-foreground">{currentSettings.shortBreakDuration}m</span>
                  <Button
                    onClick={() => updateSettingsMutation.mutate({ shortBreakDuration: Math.min(15, currentSettings.shortBreakDuration + 1) })}
                    variant="ghost"
                    size="icon"
                    className="neo-button w-8 h-8 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="neo-inset rounded-2xl p-4">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Long Break</label>
                <div className="flex items-center justify-between mt-2">
                  <Button
                    onClick={() => updateSettingsMutation.mutate({ longBreakDuration: Math.max(10, currentSettings.longBreakDuration - 5) })}
                    variant="ghost"
                    size="icon"
                    className="neo-button w-8 h-8 rounded-lg"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-2xl font-light text-foreground">{currentSettings.longBreakDuration}m</span>
                  <Button
                    onClick={() => updateSettingsMutation.mutate({ longBreakDuration: Math.min(30, currentSettings.longBreakDuration + 5) })}
                    variant="ghost"
                    size="icon"
                    className="neo-button w-8 h-8 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
