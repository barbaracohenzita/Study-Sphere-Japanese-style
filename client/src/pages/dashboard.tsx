import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PomodoroTimer } from "@/components/pomodoro-timer";
import { TaskList } from "@/components/task-list";
import { StatsCards } from "@/components/stats-cards";
import { SettingsPanel } from "@/components/settings-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { GraduationCap } from "lucide-react";
import type { Task, Settings, Session, SessionType } from "@shared/schema";

export default function Dashboard() {
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  const defaultSettings: Settings = {
    id: "default",
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLongBreak: 4,
    soundEnabled: true,
  };

  const currentSettings = settings || defaultSettings;

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
    mutationFn: async (data: Partial<Settings>) => {
      return apiRequest("PATCH", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: { type: SessionType; duration: number; taskId?: string }) => {
      return apiRequest("POST", "/api/sessions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const handleAddTask = useCallback((title: string, estimatedPomodoros: number) => {
    addTaskMutation.mutate({ title, estimatedPomodoros });
  }, [addTaskMutation]);

  const handleToggleTask = useCallback((id: string) => {
    toggleTaskMutation.mutate(id);
  }, [toggleTaskMutation]);

  const handleDeleteTask = useCallback((id: string) => {
    deleteTaskMutation.mutate(id);
    if (currentTaskId === id) {
      setCurrentTaskId(null);
    }
  }, [deleteTaskMutation, currentTaskId]);

  const handleSelectTask = useCallback((id: string) => {
    setCurrentTaskId(prev => prev === id ? null : id);
  }, []);

  const handleSessionComplete = useCallback((type: SessionType, taskId?: string) => {
    const duration = type === "work" 
      ? currentSettings.workDuration * 60 
      : type === "shortBreak" 
        ? currentSettings.shortBreakDuration * 60 
        : currentSettings.longBreakDuration * 60;
    
    createSessionMutation.mutate({ type, duration, taskId });
  }, [createSessionMutation, currentSettings]);

  const handleUpdateSettings = useCallback((newSettings: Partial<Settings>) => {
    updateSettingsMutation.mutate(newSettings);
  }, [updateSettingsMutation]);

  const currentTask = currentTaskId ? tasks.find(t => t.id === currentTaskId) || null : null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaySessions = sessions.filter(s => {
    const sessionDate = new Date(s.completedAt);
    sessionDate.setHours(0, 0, 0, 0);
    return sessionDate.getTime() === today.getTime() && s.type === "work";
  });

  const sessionsToday = todaySessions.length;
  const totalFocusMinutes = todaySessions.reduce((acc, s) => acc + Math.floor(s.duration / 60), 0);
  const tasksCompleted = tasks.filter(t => t.completed).length;
  
  const completedWorkSessions = sessions.filter(s => s.type === "work").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 neo-card border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="neo-button p-2 rounded-xl">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">StudyFlow</h1>
              <p className="text-xs text-muted-foreground">Focus & Achieve</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="neo-card rounded-3xl p-8">
            <PomodoroTimer
              settings={currentSettings}
              currentTask={currentTask}
              onSessionComplete={handleSessionComplete}
              completedSessions={completedWorkSessions}
            />
          </section>

          <section className="neo-card rounded-3xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Today's Tasks</h2>
            {tasksLoading ? (
              <div className="neo-inset rounded-2xl p-8 text-center">
                <p className="text-muted-foreground">Loading tasks...</p>
              </div>
            ) : (
              <TaskList
                tasks={tasks}
                currentTaskId={currentTaskId}
                onAddTask={handleAddTask}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onSelectTask={handleSelectTask}
              />
            )}
          </section>
        </div>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Your Progress</h2>
          <StatsCards
            sessionsToday={sessionsToday}
            totalFocusMinutes={totalFocusMinutes}
            currentStreak={1}
            tasksCompleted={tasksCompleted}
          />
        </section>

        <section className="mt-8 neo-card rounded-3xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-6">Settings</h2>
          <SettingsPanel
            settings={currentSettings}
            onUpdateSettings={handleUpdateSettings}
          />
        </section>
      </main>
    </div>
  );
}
