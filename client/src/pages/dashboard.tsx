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
        <div className="grid grid-cols-12 gap-4 auto-rows-min">
          
          <div className="col-span-12 md:col-span-4 neo-card rounded-3xl p-6">
            <div className="flex gap-2 mb-4 justify-center">
              <Button
                onClick={() => { setSessionType("work"); setTimerState("idle"); setTimeRemaining(getDuration("work")); }}
                variant="ghost"
                data-testid="button-session-focus"
                className={`rounded-full px-6 ${sessionType === "work" ? "neo-pressed" : "neo-button"}`}
              >
                Focus
              </Button>
              <Button
                onClick={() => { setSessionType("shortBreak"); setTimerState("idle"); setTimeRemaining(getDuration("shortBreak")); }}
                variant="ghost"
                data-testid="button-session-break"
                className={`rounded-full px-6 ${sessionType !== "work" ? "neo-pressed" : "neo-button"}`}
              >
                Break
              </Button>
            </div>

            {currentTask && sessionType === "work" && (
              <div className="text-center mb-4 neo-inset rounded-xl px-3 py-2">
                <div className="flex items-center justify-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground font-medium truncate">{currentTask.title}</span>
                </div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {Array.from({ length: currentTask.estimatedPomodoros }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i < currentTask.completedPomodoros ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="relative flex justify-center mb-6">
              <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                <circle cx="100" cy="100" r="90" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" className="opacity-30" />
                <circle
                  cx="100" cy="100" r="90"
                  fill="none"
                  stroke={sessionType === "work" ? "hsl(var(--foreground))" : "hsl(var(--primary))"}
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
                  {timerState === "running" ? "Running" : timerState === "paused" ? "Paused" : sessionType === "work" ? "Focus" : "Break"}
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
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{todayFocusMinutes} min focused today</span>
            </div>
          </div>

          <div className="col-span-6 md:col-span-4 neo-card rounded-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider">Ambience</h3>
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
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${
                    activeAmbience === item.id ? "neo-pressed" : "neo-button"
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${activeAmbience === item.id ? "text-primary" : "text-foreground"}`} />
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
                <Droplets className={`w-8 h-8 ${waterCount >= 8 ? "text-primary" : "text-foreground"}`} />
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
              Drink water: <span className={`font-medium ${waterCount >= 8 ? "text-primary" : "text-foreground"}`}>{waterCount} / 8</span>
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
                    i < todayWorkSessions.length ? "bg-foreground text-background" : "neo-inset text-muted-foreground"
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
                  <div
                    key={task.id}
                    onClick={() => handleSelectTask(task.id)}
                    data-testid={`task-item-${task.id}`}
                    className={`neo-inset rounded-xl p-3 flex items-center gap-3 group cursor-pointer transition-all ${
                      currentTaskId === task.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                    }`}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleTaskMutation.mutate(task.id); }}
                      data-testid={`button-toggle-task-${task.id}`}
                      className="neo-button w-5 h-5 rounded flex-shrink-0 flex items-center justify-center"
                    >
                      {task.completed && <Check className="w-3 h-3" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground truncate block">{task.title}</span>
                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: task.estimatedPomodoros }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              i < task.completedPomodoros ? "bg-primary" : "bg-muted-foreground/30"
                            }`}
                          />
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-1">
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
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="neo-inset rounded-xl p-2">
              <div className="flex items-center gap-2 mb-2">
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
                  className="neo-button w-8 h-8 rounded-lg flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1 px-1">
                <span className="text-[10px] text-muted-foreground mr-1">Est:</span>
                {[1, 2, 3, 4].map(num => (
                  <button
                    key={num}
                    onClick={() => setNewTaskPomodoros(num)}
                    data-testid={`button-pomodoros-${num}`}
                    className={`w-6 h-6 rounded text-xs font-medium transition-all ${
                      newTaskPomodoros === num ? "bg-foreground text-background" : "neo-button-sm"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3 flex flex-col gap-4">
            <div className="neo-card rounded-3xl p-4 flex items-center justify-center gap-3">
              <ThemeToggle />
              <Button
                onClick={() => updateSettingsMutation.mutate({ soundEnabled: !currentSettings.soundEnabled })}
                variant="ghost"
                size="icon"
                data-testid="button-toggle-sound"
                className={`neo-button w-10 h-10 rounded-full ${!currentSettings.soundEnabled ? "opacity-50" : ""}`}
              >
                {currentSettings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              data-testid="button-settings"
              className={`neo-card rounded-3xl p-4 flex items-center justify-center transition-all ${showSettings ? "neo-pressed" : ""}`}
            >
              <Settings className="w-6 h-6 text-foreground" />
            </button>
          </div>

          {recentSessions.length > 0 && (
            <div className="col-span-12 neo-card rounded-3xl p-5">
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Recent Sessions</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {recentSessions.map(session => (
                  <div key={session.id} className="neo-inset rounded-xl p-3 flex-shrink-0 min-w-[120px]">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${
                        session.type === "work" ? "bg-foreground" : "bg-primary"
                      }`} />
                      <span className="text-xs text-foreground capitalize">
                        {session.type === "work" ? "Focus" : session.type === "shortBreak" ? "Short" : "Long"}
                      </span>
                    </div>
                    <p className="text-lg font-light text-foreground">{Math.floor(session.duration / 60)}m</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(session.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

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
