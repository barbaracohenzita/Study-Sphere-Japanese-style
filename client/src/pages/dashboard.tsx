import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AppSidebar } from "@/components/app-sidebar";
import { PomodoroTimer } from "@/components/pomodoro-timer";
import { TaskList } from "@/components/task-list";
import { StatsCards } from "@/components/stats-cards";
import { SettingsPanel } from "@/components/settings-panel";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { Task, Settings, Session, SessionType } from "@shared/schema";

type View = "timer" | "tasks" | "stats" | "settings";

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<View>("timer");
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

  const renderContent = () => {
    switch (currentView) {
      case "timer":
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <PomodoroTimer
              settings={currentSettings}
              currentTask={currentTask}
              onSessionComplete={handleSessionComplete}
              completedSessions={completedWorkSessions}
            />
          </div>
        );
      case "tasks":
        return (
          <div className="flex-1 p-8 max-w-2xl mx-auto w-full">
            <h2 className="text-2xl font-bold text-foreground mb-6">Today's Tasks</h2>
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
          </div>
        );
      case "stats":
        return (
          <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
            <h2 className="text-2xl font-bold text-foreground mb-6">Your Progress</h2>
            <StatsCards
              sessionsToday={sessionsToday}
              totalFocusMinutes={totalFocusMinutes}
              currentStreak={1}
              tasksCompleted={tasksCompleted}
            />
            
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-foreground mb-4">Recent Sessions</h3>
              {sessions.length === 0 ? (
                <div className="neo-inset rounded-2xl p-8 text-center">
                  <p className="text-muted-foreground">No sessions yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Start your first focus session!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.slice(0, 10).map((session) => (
                    <div key={session.id} className="neo-card rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          session.type === "work" ? "bg-primary" :
                          session.type === "shortBreak" ? "bg-chart-4" : "bg-chart-2"
                        }`} />
                        <div>
                          <p className="font-medium text-foreground capitalize">{session.type.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <p className="text-sm text-muted-foreground">{Math.floor(session.duration / 60)} minutes</p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(session.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      case "settings":
        return (
          <div className="flex-1 p-8 max-w-2xl mx-auto w-full">
            <h2 className="text-2xl font-bold text-foreground mb-6">Settings</h2>
            <SettingsPanel
              settings={currentSettings}
              onUpdateSettings={handleUpdateSettings}
            />
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-background">
      <AppSidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-auto flex flex-col">
        <header className="flex items-center p-4 border-b border-border">
          <SidebarTrigger data-testid="button-sidebar-toggle" className="neo-button" />
        </header>
        {renderContent()}
      </main>
    </div>
  );
}
