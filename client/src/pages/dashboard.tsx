import { useState, useCallback, useEffect, useRef } from "react";
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
  Minus,
  Target,
  Clock,
  Volume2,
  VolumeX
} from "lucide-react";
import type { Task, Settings as SettingsType, Session, SessionType } from "@shared/schema";

class AmbientSoundGenerator {
  private audioContext: AudioContext | null = null;
  private nodes: AudioNode[] = [];
  private gainNode: GainNode | null = null;

  start(type: string) {
    this.stop();
    this.audioContext = new AudioContext();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.15;
    this.gainNode.connect(this.audioContext.destination);

    switch (type) {
      case "rain":
        this.createRain();
        break;
      case "cafe":
        this.createCafe();
        break;
      case "wind":
        this.createWind();
        break;
      case "fire":
        this.createFire();
        break;
    }
  }

  private createNoise(): AudioBufferSourceNode {
    const bufferSize = this.audioContext!.sampleRate * 2;
    const buffer = this.audioContext!.createBuffer(1, bufferSize, this.audioContext!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.audioContext!.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    return noise;
  }

  private createRain() {
    const noise = this.createNoise();
    const filter = this.audioContext!.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1000;
    const filter2 = this.audioContext!.createBiquadFilter();
    filter2.type = "lowpass";
    filter2.frequency.value = 8000;
    noise.connect(filter);
    filter.connect(filter2);
    filter2.connect(this.gainNode!);
    noise.start();
    this.nodes.push(noise);
  }

  private createCafe() {
    const noise = this.createNoise();
    const filter = this.audioContext!.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 800;
    filter.Q.value = 0.5;
    const gain = this.audioContext!.createGain();
    gain.gain.value = 0.4;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.gainNode!);
    noise.start();
    this.nodes.push(noise);
  }

  private createWind() {
    const noise = this.createNoise();
    const filter = this.audioContext!.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 400;
    const lfo = this.audioContext!.createOscillator();
    lfo.frequency.value = 0.2;
    const lfoGain = this.audioContext!.createGain();
    lfoGain.gain.value = 200;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    noise.connect(filter);
    filter.connect(this.gainNode!);
    noise.start();
    this.nodes.push(noise, lfo);
  }

  private createFire() {
    const noise = this.createNoise();
    const filter = this.audioContext!.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    const filter2 = this.audioContext!.createBiquadFilter();
    filter2.type = "highpass";
    filter2.frequency.value = 100;
    noise.connect(filter);
    filter.connect(filter2);
    filter2.connect(this.gainNode!);
    noise.start();
    this.nodes.push(noise);
  }

  stop() {
    this.nodes.forEach(node => {
      if (node instanceof AudioBufferSourceNode || node instanceof OscillatorNode) {
        try { node.stop(); } catch {}
      }
    });
    this.nodes = [];
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

const ambientGenerator = new AmbientSoundGenerator();

export default function Dashboard() {
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(() => {
    return localStorage.getItem("studyflow_currentTaskId") || null;
  });
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPomodoros, setNewTaskPomodoros] = useState(1);
  const [sessionType, setSessionType] = useState<SessionType>(() => {
    return (localStorage.getItem("studyflow_sessionType") as SessionType) || "work";
  });
  const [timerState, setTimerState] = useState<"idle" | "running" | "paused">(() => {
    return (localStorage.getItem("studyflow_timerState") as "idle" | "running" | "paused") || "idle";
  });
  const [timeRemaining, setTimeRemaining] = useState(() => {
    const saved = localStorage.getItem("studyflow_timeRemaining");
    return saved ? parseInt(saved, 10) : 25 * 60;
  });
  const [waterCount, setWaterCount] = useState(() => {
    const saved = localStorage.getItem("studyflow_waterCount");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [activeAmbience, setActiveAmbience] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [completedSessionsCount, setCompletedSessionsCount] = useState(0);

  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);

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

  useEffect(() => {
    localStorage.setItem("studyflow_currentTaskId", currentTaskId || "");
    localStorage.setItem("studyflow_sessionType", sessionType);
    localStorage.setItem("studyflow_timerState", timerState);
    localStorage.setItem("studyflow_timeRemaining", timeRemaining.toString());
    localStorage.setItem("studyflow_waterCount", waterCount.toString());
  }, [currentTaskId, sessionType, timerState, timeRemaining, waterCount]);

  useEffect(() => {
    if (activeAmbience && currentSettings.soundEnabled) {
      ambientGenerator.start(activeAmbience);
    } else {
      ambientGenerator.stop();
    }
    return () => {
      ambientGenerator.stop();
    };
  }, [activeAmbience, currentSettings.soundEnabled]);

  const getDuration = useCallback((type: SessionType) => {
    switch (type) {
      case "work": return currentSettings.workDuration * 60;
      case "shortBreak": return currentSettings.shortBreakDuration * 60;
      case "longBreak": return currentSettings.longBreakDuration * 60;
    }
  }, [currentSettings]);

  const createSessionMutation = useMutation({
    mutationFn: async (data: { type: SessionType; duration: number; taskId?: string }) => {
      return apiRequest("POST", "/api/sessions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

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
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      if (currentTaskId === deletedId) {
        setCurrentTaskId(null);
      }
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

  const handleSessionComplete = useCallback(() => {
    const duration = getDuration(sessionType);
    
    if (currentSettings.soundEnabled) {
      if (!notificationAudioRef.current) {
        notificationAudioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQoOF4nT2Kl5IRkWfMnPrYM8IiBxtr+2jFMqKG+yvLGPXy0ue7vBsIlbMDN5uMCxj18xNnm3v7KRYjM4e7i/spFiNDl6t7+ykmM0OXq3v7KSYzQ5ere/spJjNDl6t7+ykmM0OA==");
      }
      notificationAudioRef.current.play().catch(() => {});
    }

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(sessionType === "work" ? "Focus session complete!" : "Break is over!", {
        body: sessionType === "work" ? "Time for a break." : "Ready to focus again?",
        icon: "/favicon.ico"
      });
    }

    createSessionMutation.mutate({
      type: sessionType,
      duration,
      taskId: sessionType === "work" ? currentTaskId || undefined : undefined
    });

    const newCount = sessionType === "work" ? completedSessionsCount + 1 : completedSessionsCount;
    setCompletedSessionsCount(newCount);

    if (sessionType === "work") {
      if (newCount % currentSettings.sessionsUntilLongBreak === 0) {
        setSessionType("longBreak");
        setTimeRemaining(currentSettings.longBreakDuration * 60);
      } else {
        setSessionType("shortBreak");
        setTimeRemaining(currentSettings.shortBreakDuration * 60);
      }
    } else {
      setSessionType("work");
      setTimeRemaining(currentSettings.workDuration * 60);
    }
    setTimerState("idle");
  }, [sessionType, currentSettings, currentTaskId, completedSessionsCount, createSessionMutation, getDuration]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (timerState === "running") {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [timerState, handleSessionComplete]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      addTaskMutation.mutate({ title: newTaskTitle.trim(), estimatedPomodoros: newTaskPomodoros });
      setNewTaskTitle("");
      setNewTaskPomodoros(1);
    }
  };

  const handleSelectTask = (id: string) => {
    setCurrentTaskId(prev => prev === id ? null : id);
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
  });

  const todayFocusMinutes = todayWorkSessions.reduce((acc, s) => acc + Math.floor(s.duration / 60), 0);

  const endOfYear = new Date(now.getFullYear(), 11, 31);
  const daysRemaining = Math.ceil((endOfYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const currentTask = currentTaskId ? tasks.find(t => t.id === currentTaskId) : null;

  const recentSessions = [...sessions].sort((a, b) => 
    new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  ).slice(0, 5);

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-12 gap-8 auto-rows-min">
          
          <div className="col-span-12 md:col-span-4 border border-border bg-card jp-paper p-10">
            <div className="flex gap-1 mb-6 justify-center border-b border-border pb-4">
              <button
                onClick={() => { setSessionType("work"); setTimerState("idle"); setTimeRemaining(getDuration("work")); }}
                data-testid="button-session-focus"
                className={`px-4 py-2 text-sm tracking-wide hover-elevate ${
                  sessionType === "work" 
                    ? "border-b-2 border-primary text-primary font-medium" 
                    : "text-muted-foreground"
                }`}
              >
                Focus
              </button>
              <button
                onClick={() => { setSessionType("shortBreak"); setTimerState("idle"); setTimeRemaining(getDuration("shortBreak")); }}
                data-testid="button-session-break"
                className={`px-4 py-2 text-sm tracking-wide hover-elevate ${
                  sessionType !== "work" 
                    ? "border-b-2 border-primary text-primary font-medium" 
                    : "text-muted-foreground"
                }`}
              >
                Break
              </button>
            </div>

            {currentTask && sessionType === "work" && (
              <div className="text-center mb-6 border-l-4 border-l-primary pl-4 py-2 bg-accent/30">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground font-medium truncate">{currentTask.title}</span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {Array.from({ length: currentTask.estimatedPomodoros }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 ${
                        i < currentTask.completedPomodoros ? "bg-primary" : "border border-border"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="relative flex justify-center mb-8">
              <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                <circle cx="100" cy="100" r="90" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
                <circle
                  cx="100" cy="100" r="90"
                  fill="none"
                  stroke={sessionType === "work" ? "hsl(var(--foreground))" : "hsl(var(--primary))"}
                  strokeWidth="3"
                  strokeLinecap="square"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-6xl font-mono tabular-nums text-foreground tracking-tight" data-testid="text-timer-display">
                  {formatTime(timeRemaining)}
                </span>
                <span className="text-xs text-muted-foreground uppercase tracking-widest mt-2">
                  {timerState === "running" ? "Running" : timerState === "paused" ? "Paused" : sessionType === "work" ? "Focus" : "Break"}
                </span>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => setTimerState(prev => prev === "running" ? "paused" : "running")}
                data-testid="button-timer-toggle"
                className="w-12 h-12 border-2 border-foreground flex items-center justify-center hover-elevate active-elevate-2"
              >
                {timerState === "running" ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button
                onClick={() => { setTimerState("idle"); setTimeRemaining(getDuration(sessionType)); }}
                data-testid="button-timer-reset"
                className="w-12 h-12 border border-border flex items-center justify-center hover-elevate active-elevate-2"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="col-span-6 md:col-span-4 border border-border bg-card p-8 flex flex-col justify-center">
            <div className="text-5xl font-light text-foreground tracking-tight font-mono">
              {month}/{day}
            </div>
            <div className="text-2xl text-muted-foreground font-light">
              {displayHours}{timeOfDay}
            </div>
            <div className="jp-divider my-4" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{todayFocusMinutes} min focused today</span>
            </div>
          </div>

          <div className="col-span-6 md:col-span-4 border border-border bg-card p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-serif tracking-tight text-foreground uppercase">Ambience</h3>
              {activeAmbience && (
                <span className="text-xs text-primary">Playing</span>
              )}
            </div>
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
                  className={`flex flex-col items-center gap-1 p-3 border hover-elevate active-elevate-2 ${
                    activeAmbience === item.id 
                      ? "border-primary bg-accent" 
                      : "border-border"
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${activeAmbience === item.id ? "text-primary" : "text-foreground"}`} />
                  <span className="text-[10px] text-muted-foreground">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-6 md:col-span-4 border border-border bg-card p-8">
            <h3 className="text-sm font-serif tracking-tight text-foreground uppercase mb-4">Hydration</h3>
            <div className="flex items-center justify-center gap-4 mb-3">
              <Button
                onClick={() => setWaterCount(prev => Math.max(0, prev - 1))}
                variant="outline"
                size="icon"
                data-testid="button-water-minus"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="w-16 h-16 border-2 border-border flex items-center justify-center">
                <Droplets className={`w-8 h-8 ${waterCount >= 8 ? "text-primary" : "text-foreground"}`} />
              </div>
              <Button
                onClick={() => setWaterCount(prev => Math.min(8, prev + 1))}
                variant="outline"
                size="icon"
                data-testid="button-water-plus"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              <span className={`font-medium font-mono ${waterCount >= 8 ? "text-primary" : "text-foreground"}`}>{waterCount}</span> / 8 glasses
            </p>
          </div>

          <div className="col-span-6 md:col-span-4 border border-border bg-card p-8 flex flex-col items-center justify-center">
            <div className="w-20 h-20 border-2 border-foreground flex items-center justify-center mb-3">
              <span className="text-3xl font-light text-foreground font-mono">{daysRemaining}</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-center">
              Days Remaining
            </p>
          </div>

          <div className="col-span-12 md:col-span-4 border border-border bg-card p-8">
            <h3 className="text-sm font-serif tracking-tight text-foreground uppercase mb-4">Today's Sessions</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {Array.from({ length: currentSettings.sessionsUntilLongBreak }).map((_, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 flex items-center justify-center text-xs font-medium font-mono ${
                    i < todayWorkSessions.length 
                      ? "bg-foreground text-background" 
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
              ))}
              {todayWorkSessions.length > currentSettings.sessionsUntilLongBreak && (
                <span className="text-sm text-primary font-medium">+{todayWorkSessions.length - currentSettings.sessionsUntilLongBreak}</span>
              )}
            </div>
          </div>

          <div className="col-span-12 md:col-span-5 border border-border bg-card p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-serif tracking-tight text-foreground uppercase">Today's Focus</h3>
              <span className="text-xs text-muted-foreground font-mono">{incompleteTasks.length} tasks</span>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
              {incompleteTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border">No tasks yet</p>
              ) : (
                incompleteTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => handleSelectTask(task.id)}
                    data-testid={`task-item-${task.id}`}
                    className={`border p-3 flex items-center gap-3 group cursor-pointer hover-elevate ${
                      currentTaskId === task.id 
                        ? "border-primary bg-accent/30 border-l-4 border-l-primary" 
                        : "border-border"
                    }`}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleTaskMutation.mutate(task.id); }}
                      data-testid={`button-toggle-task-${task.id}`}
                      className="w-4 h-4 border-2 border-border flex-shrink-0 flex items-center justify-center hover:border-foreground"
                    >
                      {task.completed && <Check className="w-3 h-3" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground truncate block">{task.title}</span>
                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: task.estimatedPomodoros }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 ${
                              i < task.completedPomodoros ? "bg-primary" : "border border-border"
                            }`}
                          />
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-1 font-mono">
                          {task.completedPomodoros}/{task.estimatedPomodoros}
                        </span>
                      </div>
                    </div>
                    {currentTaskId === task.id && (
                      <Target className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteTaskMutation.mutate(task.id); }}
                      data-testid={`button-delete-task-${task.id}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="border border-border p-3">
              <div className="flex items-center gap-2 mb-3">
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                  placeholder="What will you focus on?"
                  data-testid="input-task-title"
                  className="flex-1 border-0 h-8 text-sm focus-visible:ring-0 bg-transparent"
                />
                <Button
                  onClick={handleAddTask}
                  variant="outline"
                  size="icon"
                  data-testid="button-add-task"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Sessions:</span>
                {[1, 2, 3, 4].map(num => (
                  <button
                    key={num}
                    onClick={() => setNewTaskPomodoros(num)}
                    data-testid={`button-pomodoros-${num}`}
                    className={`w-6 h-6 text-xs font-mono transition-all ${
                      newTaskPomodoros === num 
                        ? "bg-foreground text-background" 
                        : "border border-border hover:border-foreground"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3 flex flex-col gap-4">
            <div className="border border-border bg-card p-4 flex items-center justify-center gap-3">
              <ThemeToggle />
              <Button
                onClick={() => updateSettingsMutation.mutate({ soundEnabled: !currentSettings.soundEnabled })}
                variant="outline"
                size="icon"
                data-testid="button-toggle-sound"
                className={!currentSettings.soundEnabled ? "opacity-50" : ""}
              >
                {currentSettings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              data-testid="button-settings"
              className={`border bg-card p-4 flex items-center justify-center gap-2 hover-elevate active-elevate-2 ${
                showSettings ? "border-primary bg-accent" : "border-border"
              }`}
            >
              <Settings className="w-5 h-5 text-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Settings</span>
            </button>
          </div>

          {recentSessions.length > 0 && (
            <div className="col-span-12 border border-border bg-card p-8">
              <h3 className="text-sm font-serif tracking-tight text-foreground uppercase mb-4">Recent Sessions</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {recentSessions.map(session => (
                  <div key={session.id} className="border border-border p-3 flex-shrink-0 min-w-[120px]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 ${
                        session.type === "work" ? "bg-foreground" : "bg-primary"
                      }`} />
                      <span className="text-xs text-foreground">
                        {session.type === "work" ? "Focus" : session.type === "shortBreak" ? "Short" : "Long"}
                      </span>
                    </div>
                    <p className="text-xl font-light text-foreground font-mono">{Math.floor(session.duration / 60)}m</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">
                      {new Date(session.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {showSettings && (
          <div className="mt-8 border border-border bg-card p-8">
            <h3 className="text-sm font-serif tracking-tight text-foreground uppercase mb-6">Timer Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-border p-4">
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-3">Focus Duration</label>
                <div className="flex items-center justify-between">
                  <Button
                    onClick={() => updateSettingsMutation.mutate({ workDuration: Math.max(5, currentSettings.workDuration - 5) })}
                    variant="outline"
                    size="icon"
                    className="w-8 h-8"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-3xl font-light text-foreground font-mono">{currentSettings.workDuration}</span>
                  <Button
                    onClick={() => updateSettingsMutation.mutate({ workDuration: Math.min(60, currentSettings.workDuration + 5) })}
                    variant="outline"
                    size="icon"
                    className="w-8 h-8"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">minutes</p>
              </div>
              <div className="border border-border p-4">
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-3">Short Break</label>
                <div className="flex items-center justify-between">
                  <Button
                    onClick={() => updateSettingsMutation.mutate({ shortBreakDuration: Math.max(1, currentSettings.shortBreakDuration - 1) })}
                    variant="outline"
                    size="icon"
                    className="w-8 h-8"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-3xl font-light text-foreground font-mono">{currentSettings.shortBreakDuration}</span>
                  <Button
                    onClick={() => updateSettingsMutation.mutate({ shortBreakDuration: Math.min(15, currentSettings.shortBreakDuration + 1) })}
                    variant="outline"
                    size="icon"
                    className="w-8 h-8"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">minutes</p>
              </div>
              <div className="border border-border p-4">
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-3">Long Break</label>
                <div className="flex items-center justify-between">
                  <Button
                    onClick={() => updateSettingsMutation.mutate({ longBreakDuration: Math.max(10, currentSettings.longBreakDuration - 5) })}
                    variant="outline"
                    size="icon"
                    className="w-8 h-8"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-3xl font-light text-foreground font-mono">{currentSettings.longBreakDuration}</span>
                  <Button
                    onClick={() => updateSettingsMutation.mutate({ longBreakDuration: Math.min(30, currentSettings.longBreakDuration + 5) })}
                    variant="outline"
                    size="icon"
                    className="w-8 h-8"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">minutes</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
