import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CloudRain,
  Coffee,
  Flame,
  Hourglass,
  ListTodo,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings,
  Sparkles,
  Target,
  Trash2,
  Volume2,
  VolumeX,
  Wind,
} from "lucide-react";
import type { Task, Settings as SettingsType, Session, SessionType, User } from "@shared/schema";

type TimerState = "idle" | "running" | "paused";

const MODE_OPTIONS: Array<{
  id: SessionType;
  label: string;
  eyebrow: string;
  description: string;
}> = [
  {
    id: "work",
    label: "Focus",
    eyebrow: "Deep Work",
    description: "Stay with one deliberate task until the bell.",
  },
  {
    id: "shortBreak",
    label: "Short Break",
    eyebrow: "Reset",
    description: "Step back briefly, then return with a clear head.",
  },
  {
    id: "longBreak",
    label: "Long Break",
    eyebrow: "Recover",
    description: "Let the pace soften before the next block starts.",
  },
];

const AMBIENCE_OPTIONS = [
  { id: "rain", label: "Rain", icon: CloudRain },
  { id: "cafe", label: "Cafe", icon: Coffee },
  { id: "wind", label: "Wind", icon: Wind },
  { id: "fire", label: "Fire", icon: Flame },
] as const;

const DAILY_QUOTES = [
  "Clarity grows when the next step is smaller than the hesitation.",
  "A steady rhythm outperforms a dramatic sprint.",
  "Quiet structure makes focused work feel lighter.",
  "The best study sessions begin before motivation catches up.",
  "Give one task your full attention and let the rest wait.",
  "Depth comes from staying with the page a little longer.",
  "A calm system turns repetition into progress.",
];

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

    for (let i = 0; i < bufferSize; i += 1) {
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
    this.nodes.forEach((node) => {
      if (node instanceof AudioBufferSourceNode || node instanceof OscillatorNode) {
        try {
          node.stop();
        } catch {
          // Ignore nodes that are already stopped.
        }
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

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dayKey(date: Date) {
  return [
    date.getFullYear(),
    `${date.getMonth() + 1}`.padStart(2, "0"),
    `${date.getDate()}`.padStart(2, "0"),
  ].join("-");
}

function formatTimer(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatCompactFocus(totalMinutes: number) {
  if (totalMinutes >= 60) {
    const hours = totalMinutes / 60;
    return `${hours.toFixed(totalMinutes % 60 === 0 ? 0 : 1)}h`;
  }

  return `${totalMinutes}m`;
}

function formatFocusDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) {
    return `${minutes} minutes`;
  }

  if (!minutes) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  return `${hours}h ${minutes}m`;
}

function formatSessionName(sessionType: string) {
  if (sessionType === "work") return "Focus";
  if (sessionType === "shortBreak") return "Short Break";
  return "Long Break";
}

function calculateFocusStreak(sessions: Session[], now: Date) {
  const workDays = new Set(
    sessions
      .filter((session) => session.type === "work")
      .map((session) => dayKey(startOfDay(new Date(session.completedAt)))),
  );

  let streak = 0;
  const cursor = startOfDay(now);

  while (workDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function buildWeeklyFocus(sessions: Session[], now: Date) {
  const today = startOfDay(now);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));

    const workSessions = sessions.filter((session) => {
      if (session.type !== "work") return false;
      const completedAt = startOfDay(new Date(session.completedAt));
      return completedAt.getTime() === date.getTime();
    });

    const minutes = workSessions.reduce((total, session) => total + Math.floor(session.duration / 60), 0);

    return {
      key: dayKey(date),
      label: date.toLocaleDateString([], { weekday: "short" }).slice(0, 2),
      fullLabel: date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" }),
      minutes,
      sessions: workSessions.length,
      isToday: date.getTime() === today.getTime(),
    };
  });

  return days;
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
  highlight = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "border p-4 sm:p-5",
        highlight ? "border-foreground bg-background/70" : "border-border bg-background/40",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-3 font-mono text-3xl font-light tabular-nums text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  );
}

export default function Dashboard({ user }: { user: User }) {
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(() => {
    return localStorage.getItem("studyflow_currentTaskId") || null;
  });
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPomodoros, setNewTaskPomodoros] = useState(1);
  const [sessionType, setSessionType] = useState<SessionType>(() => {
    return (localStorage.getItem("studyflow_sessionType") as SessionType) || "work";
  });
  const [timerState, setTimerState] = useState<TimerState>(() => {
    return (localStorage.getItem("studyflow_timerState") as TimerState) || "idle";
  });
  const [timeRemaining, setTimeRemaining] = useState(() => {
    const saved = localStorage.getItem("studyflow_timeRemaining");
    return saved ? parseInt(saved, 10) : 25 * 60;
  });
  const [dailyIntention, setDailyIntention] = useState(() => {
    return localStorage.getItem("studyflow_dailyIntention") || "";
  });
  const [activeAmbience, setActiveAmbience] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [now, setNow] = useState(() => new Date());

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
    localStorage.setItem("studyflow_dailyIntention", dailyIntention);
  }, [currentTaskId, sessionType, timerState, timeRemaining, dailyIntention]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

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

  const getDuration = useCallback(
    (type: SessionType) => {
      switch (type) {
        case "work":
          return currentSettings.workDuration * 60;
        case "shortBreak":
          return currentSettings.shortBreakDuration * 60;
        case "longBreak":
          return currentSettings.longBreakDuration * 60;
      }
    },
    [currentSettings],
  );

  useEffect(() => {
    if (timerState === "idle") {
      setTimeRemaining(getDuration(sessionType));
    }
  }, [getDuration, sessionType, timerState]);

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

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to sign out");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.removeQueries({ queryKey: ["/api/tasks"] });
      queryClient.removeQueries({ queryKey: ["/api/sessions"] });
      queryClient.removeQueries({ queryKey: ["/api/settings"] });
    },
  });

  const incompleteTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);
  const currentTask = currentTaskId ? tasks.find((task) => task.id === currentTaskId) ?? null : null;

  useEffect(() => {
    if (!currentTaskId) return;

    if (!currentTask || currentTask.completed) {
      setCurrentTaskId(null);
    }
  }, [currentTask, currentTaskId]);

  const totalWorkSessions = sessions.filter((session) => session.type === "work").length;

  const handleSessionComplete = useCallback(() => {
    const duration = getDuration(sessionType);

    if (currentSettings.soundEnabled) {
      if (!notificationAudioRef.current) {
        notificationAudioRef.current = new Audio(
          "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQoOF4nT2Kl5IRkWfMnPrYM8IiBxtr+2jFMqKG+yvLGPXy0ue7vBsIlbMDN5uMCxj18xNnm3v7KRYjM4e7i/spFiNDl6t7+ykmM0OXq3v7KSYzQ5ere/spJjNDl6t7+ykmM0OA==",
        );
      }

      notificationAudioRef.current.play().catch(() => {});
    }

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(sessionType === "work" ? "Focus session complete!" : "Break is over!", {
        body: sessionType === "work" ? "Time for a break." : "Ready to focus again?",
        icon: "/favicon.ico",
      });
    }

    createSessionMutation.mutate({
      type: sessionType,
      duration,
      taskId: sessionType === "work" ? currentTaskId || undefined : undefined,
    });

    if (sessionType === "work") {
      const updatedWorkCount = totalWorkSessions + 1;
      const shouldTakeLongBreak =
        updatedWorkCount % currentSettings.sessionsUntilLongBreak === 0;

      if (shouldTakeLongBreak) {
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
  }, [
    createSessionMutation,
    currentSettings,
    currentTaskId,
    getDuration,
    sessionType,
    totalWorkSessions,
  ]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (timerState === "running") {
      interval = setInterval(() => {
        setTimeRemaining((previous) => {
          if (previous <= 1) {
            handleSessionComplete();
            return 0;
          }

          return previous - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [handleSessionComplete, timerState]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;

    addTaskMutation.mutate({
      title: newTaskTitle.trim(),
      estimatedPomodoros: newTaskPomodoros,
    });

    setNewTaskTitle("");
    setNewTaskPomodoros(1);
  };

  const handleSelectTask = (id: string) => {
    setCurrentTaskId((previous) => (previous === id ? null : id));
  };

  const progress = Math.max(0, Math.min(1, 1 - timeRemaining / getDuration(sessionType)));
  const circumference = 2 * Math.PI * 148;
  const strokeDashoffset = circumference * (1 - progress);
  const today = startOfDay(now);
  const todayWorkSessions = sessions.filter((session) => {
    if (session.type !== "work") return false;
    return startOfDay(new Date(session.completedAt)).getTime() === today.getTime();
  });
  const todayFocusMinutes = todayWorkSessions.reduce(
    (total, session) => total + Math.floor(session.duration / 60),
    0,
  );
  const totalFocusMinutes = sessions
    .filter((session) => session.type === "work")
    .reduce((total, session) => total + Math.floor(session.duration / 60), 0);
  const focusStreak = calculateFocusStreak(sessions, now);
  const weeklyFocus = buildWeeklyFocus(sessions, now);
  const maxWeeklyMinutes = Math.max(...weeklyFocus.map((day) => day.minutes), 1);
  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 6);
  const cycleProgress = totalWorkSessions % currentSettings.sessionsUntilLongBreak;
  const nextLongBreakIn =
    cycleProgress === 0
      ? currentSettings.sessionsUntilLongBreak
      : currentSettings.sessionsUntilLongBreak - cycleProgress;
  const completionRate = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  const pendingPomodoros = incompleteTasks.reduce((total, task) => {
    return total + Math.max(task.estimatedPomodoros - task.completedPomodoros, 0);
  }, 0);
  const currentTaskRemainingPomodoros = currentTask
    ? Math.max(currentTask.estimatedPomodoros - currentTask.completedPomodoros, 0)
    : 0;
  const activeAmbienceOption = AMBIENCE_OPTIONS.find((option) => option.id === activeAmbience);
  const modeDetails = MODE_OPTIONS.find((mode) => mode.id === sessionType)!;
  const dailyQuote = DAILY_QUOTES[now.getDate() % DAILY_QUOTES.length];
  const yearEnd = new Date(now.getFullYear(), 11, 31);
  const daysRemaining = Math.max(
    0,
    Math.ceil((yearEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const headerDate = now.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const headerTime = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const intentionPlaceholder =
    now.getHours() < 12
      ? "Set a calm intention for this morning."
      : now.getHours() < 18
        ? "Name the one thing this afternoon should move forward."
        : "Choose how you want to close the day.";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center border border-foreground/20 bg-card font-serif text-sm tracking-[0.28em]">
              書
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.42em] text-muted-foreground">StudyFlow</p>
              <h1 className="truncate font-serif text-xl tracking-tight sm:text-2xl">
                Quiet momentum for focused study
              </h1>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a className="border-b border-foreground pb-1 text-foreground" href="#dashboard">
              Dashboard
            </a>
            <a className="text-muted-foreground transition-colors hover:text-foreground" href="#rhythm">
              Rhythm
            </a>
            <a className="text-muted-foreground transition-colors hover:text-foreground" href="#settings">
              Settings
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                {user.name}
              </p>
              <p className="font-mono text-sm tabular-nums">{headerDate} · {headerTime}</p>
            </div>
            <Button onClick={() => logoutMutation.mutate()} size="sm" variant="outline">
              Log out
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="jp-shell">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,0.9fr)]">
            <div className="border border-border bg-card/90 p-6 sm:p-8 jp-paper">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[11px] uppercase tracking-[0.42em] text-muted-foreground">
                    Daily Intention
                  </p>
                  <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
                    Make the next session deliberate, quiet, and easy to start.
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
                    The timer, tasks, and history now share the same structure so the page feels less
                    like a tool dump and more like a focused study desk.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[260px] xl:grid-cols-1">
                  <div className="border border-border bg-background/50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                      Next Long Break
                    </p>
                    <p className="mt-3 font-mono text-2xl tabular-nums">{nextLongBreakIn}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      focus block{nextLongBreakIn === 1 ? "" : "s"} left in the current cycle
                    </p>
                  </div>
                  <div className="border border-border bg-background/50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                      Year Horizon
                    </p>
                    <p className="mt-3 font-mono text-2xl tabular-nums">{daysRemaining}</p>
                    <p className="mt-2 text-sm text-muted-foreground">days remaining this year</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="border-l-4 border-primary bg-background/60 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground"
                      htmlFor="daily-intention"
                    >
                      Today&apos;s line of focus
                    </label>
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="daily-intention"
                    value={dailyIntention}
                    onChange={(event) => setDailyIntention(event.target.value)}
                    placeholder={intentionPlaceholder}
                    className="mt-4 h-auto border-0 bg-transparent px-0 text-lg font-medium leading-8 shadow-none focus-visible:ring-0"
                  />
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Keep it short enough to remember while the timer is running.
                  </p>
                </div>

                <div className="border border-border bg-background/45 p-4 sm:p-5">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                    Guiding Note
                  </p>
                  <p className="mt-4 font-serif text-xl leading-8 text-foreground/90">
                    {dailyQuote}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    Small, repeatable effort is the theme of the layout and the study flow.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  label="Sessions Today"
                  value={`${todayWorkSessions.length}`}
                  detail="Completed focus blocks recorded today."
                  icon={<CalendarDays className="h-4 w-4" />}
                  highlight
                />
                <SummaryCard
                  label="Focus Time"
                  value={formatCompactFocus(todayFocusMinutes)}
                  detail={formatFocusDuration(todayFocusMinutes)}
                  icon={<Hourglass className="h-4 w-4" />}
                />
                <SummaryCard
                  label="Streak"
                  value={`${focusStreak}`}
                  detail="Consecutive days with at least one focus session."
                  icon={<CheckCircle2 className="h-4 w-4" />}
                />
                <SummaryCard
                  label="Pending Blocks"
                  value={`${pendingPomodoros}`}
                  detail="Estimated pomodoros still attached to active tasks."
                  icon={<ListTodo className="h-4 w-4" />}
                />
              </div>
            </div>

            <aside className="border border-border bg-card/85 p-6 jp-paper">
              <p className="text-[11px] uppercase tracking-[0.42em] text-muted-foreground">
                At A Glance
              </p>
              <div className="mt-6 space-y-5">
                <div className="border-l-2 border-foreground/30 pl-4">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">Now</p>
                  <p className="mt-2 font-serif text-2xl">{modeDetails.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {timerState === "running"
                      ? "Timer is active."
                      : timerState === "paused"
                        ? "Timer is paused."
                        : "Ready to begin the next block."}
                  </p>
                </div>

                <div className="border-l-2 border-foreground/20 pl-4">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">Anchor Task</p>
                  <p className="mt-2 text-base text-foreground">
                    {currentTask ? currentTask.title : "No active task selected yet."}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {currentTask
                      ? `${currentTaskRemainingPomodoros} pomodoro${currentTaskRemainingPomodoros === 1 ? "" : "s"} left`
                      : "Pick one task to keep the timer grounded."}
                  </p>
                </div>

                <div className="border-l-2 border-foreground/20 pl-4">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">Ambience</p>
                  <p className="mt-2 text-base text-foreground">
                    {activeAmbienceOption ? activeAmbienceOption.label : "Silent room"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeAmbienceOption && currentSettings.soundEnabled
                      ? "Ambient texture is active."
                      : "Sound stays optional until it helps."}
                  </p>
                </div>

                <div className="border border-border bg-background/40 p-4">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                    Progress Ledger
                  </p>
                  <p className="mt-3 font-mono text-2xl tabular-nums">{formatCompactFocus(totalFocusMinutes)}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    total recorded focus across all saved sessions
                  </p>
                </div>
              </div>
            </aside>
          </section>

          <section
            className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]"
            id="dashboard"
          >
            <div className="space-y-6">
              <section className="border border-border bg-card/90 p-6 sm:p-8 jp-paper">
                <div className="flex flex-col gap-6 border-b border-border pb-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.42em] text-muted-foreground">
                        {modeDetails.eyebrow}
                      </p>
                      <h3 className="mt-2 font-serif text-3xl tracking-tight">Pomodoro Dial</h3>
                    </div>
                    <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                      {modeDetails.description}
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    {MODE_OPTIONS.map((mode) => (
                      <button
                        key={mode.id}
                        className={cn(
                          "border px-4 py-3 text-left transition-colors hover:bg-background/70",
                          sessionType === mode.id
                            ? "border-foreground bg-background text-foreground"
                            : "border-border text-muted-foreground",
                        )}
                        data-testid={
                          mode.id === "work"
                            ? "button-session-focus"
                            : mode.id === "shortBreak"
                              ? "button-session-break"
                              : "button-session-long-break"
                        }
                        onClick={() => {
                          setSessionType(mode.id);
                          setTimerState("idle");
                          setTimeRemaining(getDuration(mode.id));
                        }}
                        type="button"
                      >
                        <span className="block text-[11px] uppercase tracking-[0.32em]">{mode.eyebrow}</span>
                        <span className="mt-2 block font-medium text-foreground">{mode.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex flex-col items-center">
                  <div
                    className={cn(
                      "relative flex w-full max-w-[340px] justify-center",
                      timerState === "running" && "timer-breathing",
                    )}
                  >
                    <svg
                      className="h-auto w-full max-w-[320px] -rotate-90"
                      viewBox="0 0 320 320"
                      width="320"
                      height="320"
                    >
                      <circle
                        cx="160"
                        cy="160"
                        r="148"
                        fill="none"
                        stroke="hsl(var(--border))"
                        strokeWidth="4"
                      />
                      {Array.from({ length: currentSettings.sessionsUntilLongBreak }).map((_, index) => {
                        const angle =
                          ((index / currentSettings.sessionsUntilLongBreak) * 360 - 90) * (Math.PI / 180);
                        const x1 = 160 + 138 * Math.cos(angle);
                        const y1 = 160 + 138 * Math.sin(angle);
                        const x2 = 160 + 154 * Math.cos(angle);
                        const y2 = 160 + 154 * Math.sin(angle);
                        const isFilled = index < cycleProgress;

                        return (
                          <line
                            key={index}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={isFilled ? "hsl(var(--foreground))" : "hsl(var(--border))"}
                            strokeWidth={2.5}
                          />
                        );
                      })}
                      <circle
                        cx="160"
                        cy="160"
                        r="148"
                        fill="none"
                        stroke={sessionType === "work" ? "hsl(var(--foreground))" : "hsl(var(--primary))"}
                        strokeWidth="4"
                        strokeLinecap="square"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                      />
                    </svg>

                    <div
                      aria-atomic="true"
                      aria-live="polite"
                      className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
                    >
                      <span className="text-[11px] uppercase tracking-[0.38em] text-muted-foreground">
                        {formatSessionName(sessionType)}
                      </span>
                      <span
                        className="mt-4 font-mono text-6xl font-light tracking-tight text-foreground sm:text-7xl"
                        data-testid="text-timer-display"
                      >
                        {formatTimer(timeRemaining)}
                      </span>
                      <span className="mt-4 text-sm text-muted-foreground">
                        {timerState === "running"
                          ? "Running"
                          : timerState === "paused"
                            ? "Paused"
                            : "Ready"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 w-full border border-border bg-background/45 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                          Current Focus
                        </p>
                        <p className="mt-2 truncate text-base text-foreground">
                          {currentTask ? currentTask.title : "Choose one active task to anchor this session."}
                        </p>
                      </div>
                      {currentTask && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Target className="h-4 w-4" />
                          <span>
                            {currentTask.completedPomodoros}/{currentTask.estimatedPomodoros} completed
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <button
                      className="flex h-14 w-14 items-center justify-center border-2 border-foreground bg-background/80 transition-colors hover:bg-background"
                      data-testid="button-timer-toggle"
                      onClick={() =>
                        setTimerState((previous) => (previous === "running" ? "paused" : "running"))
                      }
                      title={timerState === "running" ? "Pause" : "Start"}
                      type="button"
                    >
                      {timerState === "running" ? (
                        <Pause className="h-6 w-6" />
                      ) : (
                        <Play className="ml-0.5 h-6 w-6" />
                      )}
                    </button>
                    <button
                      className="flex h-14 w-14 items-center justify-center border border-border bg-background/50 transition-colors hover:bg-background/80"
                      data-testid="button-timer-reset"
                      onClick={() => {
                        setTimerState("idle");
                        setTimeRemaining(getDuration(sessionType));
                      }}
                      title="Reset"
                      type="button"
                    >
                      <RotateCcw className="h-5 w-5 text-muted-foreground" />
                    </button>
                    <button
                      className={cn(
                        "flex h-14 w-14 items-center justify-center border bg-background/50 transition-colors hover:bg-background/80",
                        currentSettings.soundEnabled ? "border-border" : "border-border/60 opacity-65",
                      )}
                      data-testid="button-toggle-sound"
                      onClick={() =>
                        updateSettingsMutation.mutate({
                          soundEnabled: !currentSettings.soundEnabled,
                        })
                      }
                      title={currentSettings.soundEnabled ? "Sound on" : "Sound off"}
                      type="button"
                    >
                      {currentSettings.soundEnabled ? (
                        <Volume2 className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <VolumeX className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      className={cn(
                        "flex h-14 min-w-[56px] items-center justify-center border px-4 transition-colors",
                        showSettings
                          ? "border-foreground bg-background text-foreground"
                          : "border-border bg-background/50 text-muted-foreground hover:bg-background/80",
                      )}
                      data-testid="button-settings"
                      id="settings"
                      onClick={() => setShowSettings((previous) => !previous)}
                      title="Settings"
                      type="button"
                    >
                      <Settings className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-8 grid w-full gap-3 sm:grid-cols-3">
                    <SummaryCard
                      detail="completed work sessions recorded for today"
                      icon={<CalendarDays className="h-4 w-4" />}
                      label="Today"
                      value={`${todayWorkSessions.length}`}
                    />
                    <SummaryCard
                      detail="focused time captured today"
                      icon={<Hourglass className="h-4 w-4" />}
                      label="Minutes"
                      value={`${todayFocusMinutes}`}
                    />
                    <SummaryCard
                      detail={`long break every ${currentSettings.sessionsUntilLongBreak} focus sessions`}
                      icon={<ChevronRight className="h-4 w-4" />}
                      label="Cycle"
                      value={`${cycleProgress}/${currentSettings.sessionsUntilLongBreak}`}
                    />
                  </div>
                </div>
              </section>

              {showSettings && (
                <section className="border border-border bg-card/90 p-6 sm:p-8 jp-paper">
                  <div className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.42em] text-muted-foreground">
                        Timer Settings
                      </p>
                      <h3 className="mt-2 font-serif text-3xl tracking-tight">Shape the cadence</h3>
                    </div>
                    <p className="max-w-md text-sm leading-6 text-muted-foreground">
                      Adjust durations without leaving the page. Idle timers immediately reflect the new values.
                    </p>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-4">
                    {[
                      {
                        key: "workDuration" as const,
                        label: "Focus",
                        value: currentSettings.workDuration,
                        min: 10,
                        max: 90,
                        step: 5,
                        suffix: "minutes",
                      },
                      {
                        key: "shortBreakDuration" as const,
                        label: "Short Break",
                        value: currentSettings.shortBreakDuration,
                        min: 1,
                        max: 20,
                        step: 1,
                        suffix: "minutes",
                      },
                      {
                        key: "longBreakDuration" as const,
                        label: "Long Break",
                        value: currentSettings.longBreakDuration,
                        min: 10,
                        max: 45,
                        step: 5,
                        suffix: "minutes",
                      },
                      {
                        key: "sessionsUntilLongBreak" as const,
                        label: "Cycle Length",
                        value: currentSettings.sessionsUntilLongBreak,
                        min: 2,
                        max: 6,
                        step: 1,
                        suffix: "sessions",
                      },
                    ].map((setting) => (
                      <div className="border border-border bg-background/45 p-4" key={setting.key}>
                        <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                          {setting.label}
                        </p>
                        <div className="mt-4 flex items-center justify-between gap-4">
                          <Button
                            className="h-9 w-9"
                            onClick={() =>
                              updateSettingsMutation.mutate({
                                [setting.key]: Math.max(setting.min, setting.value - setting.step),
                              })
                            }
                            size="icon"
                            variant="outline"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <div className="text-center">
                            <p className="font-mono text-3xl font-light tabular-nums">{setting.value}</p>
                            <p className="text-xs text-muted-foreground">{setting.suffix}</p>
                          </div>
                          <Button
                            className="h-9 w-9"
                            onClick={() =>
                              updateSettingsMutation.mutate({
                                [setting.key]: Math.min(setting.max, setting.value + setting.step),
                              })
                            }
                            size="icon"
                            variant="outline"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="border border-border bg-background/45 p-4">
                      <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                        Presets
                      </p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        {[
                          {
                            label: "Classic 25",
                            values: { workDuration: 25, shortBreakDuration: 5, longBreakDuration: 15 },
                          },
                          {
                            label: "Deep 50",
                            values: { workDuration: 50, shortBreakDuration: 10, longBreakDuration: 20 },
                          },
                          {
                            label: "Sprint 15",
                            values: { workDuration: 15, shortBreakDuration: 3, longBreakDuration: 10 },
                          },
                        ].map((preset) => (
                          <button
                            className="border border-border bg-background/50 px-4 py-3 text-left transition-colors hover:bg-background"
                            key={preset.label}
                            onClick={() => updateSettingsMutation.mutate(preset.values)}
                            type="button"
                          >
                            <span className="block text-sm font-medium text-foreground">{preset.label}</span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {preset.values.workDuration}/{preset.values.shortBreakDuration}/
                              {preset.values.longBreakDuration}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border border-border bg-background/45 p-4">
                      <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                        Sound Policy
                      </p>
                      <p className="mt-4 text-sm leading-6 text-muted-foreground">
                        Notifications and ambience remain optional. Use silence when it helps the page stay calm.
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </div>

            <div className="space-y-6">
              <section className="border border-border bg-card/90 p-6 sm:p-8 jp-paper">
                <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.42em] text-muted-foreground">
                      Task Ledger
                    </p>
                    <h3 className="mt-2 font-serif text-3xl tracking-tight">Today&apos;s Focus</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Keep the list small enough that the timer still feels like the center of the page.
                    </p>
                  </div>

                  <div className="w-full max-w-sm">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-mono tabular-nums">{completionRate}%</span>
                    </div>
                    <div className="mt-2 h-3 border border-border bg-background/50 p-[3px]">
                      <div
                        className="h-full bg-foreground transition-[width] duration-300"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {incompleteTasks.length === 0 ? (
                    <div className="border border-dashed border-border bg-background/40 p-8 text-center">
                      <p className="font-serif text-xl">No active tasks yet.</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Add one concrete task and pair it with a timer block.
                      </p>
                    </div>
                  ) : (
                    incompleteTasks.map((task) => {
                      const remainingPomodoros = Math.max(
                        task.estimatedPomodoros - task.completedPomodoros,
                        0,
                      );

                      return (
                        <div
                          className={cn(
                            "group cursor-pointer border bg-background/45 p-4 transition-colors hover:bg-background/70",
                            currentTaskId === task.id
                              ? "border-foreground bg-background border-l-4 border-l-foreground"
                              : "border-border",
                          )}
                          data-testid={`task-item-${task.id}`}
                          key={task.id}
                          onClick={() => handleSelectTask(task.id)}
                        >
                          <div className="flex items-start gap-4">
                            <button
                              className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center border-2 border-border transition-colors hover:border-foreground"
                              data-testid={`button-toggle-task-${task.id}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleTaskMutation.mutate(task.id);
                              }}
                              type="button"
                            >
                              {task.completed && <Check className="h-3 w-3" />}
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <p className="truncate text-base text-foreground">{task.title}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {remainingPomodoros} block{remainingPomodoros === 1 ? "" : "s"} remaining
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  {currentTaskId === task.id && (
                                    <span className="border border-foreground px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-foreground">
                                      Now
                                    </span>
                                  )}
                                  <button
                                    className="opacity-0 transition-opacity group-hover:opacity-100"
                                    data-testid={`button-delete-task-${task.id}`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      deleteTaskMutation.mutate(task.id);
                                      if (currentTaskId === task.id) {
                                        setCurrentTaskId(null);
                                      }
                                    }}
                                    type="button"
                                  >
                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                  </button>
                                </div>
                              </div>

                              <div className="mt-4 flex items-center gap-2">
                                {Array.from({ length: task.estimatedPomodoros }).map((_, index) => (
                                  <div
                                    className={cn(
                                      "h-2.5 w-2.5",
                                      index < task.completedPomodoros
                                        ? "bg-foreground"
                                        : "border border-border bg-transparent",
                                    )}
                                    key={index}
                                  />
                                ))}
                                <span className="ml-1 font-mono text-xs text-muted-foreground">
                                  {task.completedPomodoros}/{task.estimatedPomodoros}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-6 border border-border bg-background/45 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      className="h-11 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      data-testid="input-task-title"
                      onChange={(event) => setNewTaskTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleAddTask();
                      }}
                      placeholder="What deserves the next block?"
                      value={newTaskTitle}
                    />
                    <Button data-testid="button-add-task" onClick={handleAddTask} variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Task
                    </Button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                      Planned blocks
                    </span>
                    {[1, 2, 3, 4].map((count) => (
                      <button
                        className={cn(
                          "h-9 min-w-[36px] border px-3 text-sm font-mono transition-colors hover:bg-background",
                          newTaskPomodoros === count
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background/50 text-foreground",
                        )}
                        data-testid={`button-pomodoros-${count}`}
                        key={count}
                        onClick={() => setNewTaskPomodoros(count)}
                        type="button"
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)]">
                  <div className="border border-border bg-background/45 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                        Completed
                      </p>
                      <span className="font-mono text-sm tabular-nums text-muted-foreground">
                        {completedTasks.length}
                      </span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {completedTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Completed tasks will collect here.</p>
                      ) : (
                        completedTasks.slice(0, 4).map((task) => (
                          <div
                            className="border border-border/70 bg-background/50 p-3 text-sm text-muted-foreground"
                            key={task.id}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="truncate line-through">{task.title}</span>
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="border border-border bg-background/45 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                        Ambience
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {activeAmbienceOption ? `${activeAmbienceOption.label} active` : "Off"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {AMBIENCE_OPTIONS.map((option) => (
                        <button
                          className={cn(
                            "flex items-center gap-2 border px-3 py-3 text-left transition-colors hover:bg-background",
                            activeAmbience === option.id
                              ? "border-foreground bg-background text-foreground"
                              : "border-border bg-background/50 text-muted-foreground",
                          )}
                          data-testid={`button-ambience-${option.id}`}
                          key={option.id}
                          onClick={() =>
                            setActiveAmbience((previous) => (previous === option.id ? null : option.id))
                          }
                          type="button"
                        >
                          <option.icon className="h-4 w-4" />
                          <span className="text-sm">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="border border-border bg-card/90 p-6 sm:p-8 jp-paper" id="rhythm">
                <div className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.42em] text-muted-foreground">
                      Rhythm
                    </p>
                    <h3 className="mt-2 font-serif text-3xl tracking-tight">Weekly cadence</h3>
                  </div>
                  <p className="max-w-md text-sm leading-6 text-muted-foreground">
                    Seven days of focus minutes plus the most recent sessions, so the page shows pace and not just tasks.
                  </p>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(260px,0.75fr)]">
                  <div className="grid grid-cols-7 gap-2">
                    {weeklyFocus.map((day) => {
                      const height = day.minutes
                        ? `${Math.max(14, (day.minutes / maxWeeklyMinutes) * 100)}%`
                        : "10%";

                      return (
                        <div className="flex flex-col items-center gap-3" key={day.key}>
                          <div
                            className={cn(
                              "flex h-40 w-full items-end border p-2",
                              day.isToday ? "border-foreground bg-background/70" : "border-border bg-background/45",
                            )}
                            title={`${day.fullLabel}: ${day.minutes} minutes`}
                          >
                            <div
                              className={cn(
                                "w-full",
                                day.minutes ? (day.isToday ? "bg-primary" : "bg-foreground") : "bg-border/70",
                              )}
                              style={{ height }}
                            />
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-medium text-foreground">{day.label}</p>
                            <p className="text-[11px] text-muted-foreground">{day.minutes}m</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border border-border bg-background/45 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                        Recent Sessions
                      </p>
                      <span className="font-mono text-sm text-muted-foreground">{recentSessions.length}</span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {recentSessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Completed sessions will appear once the timer starts moving.
                        </p>
                      ) : (
                        recentSessions.map((session) => (
                          <div
                            className="flex items-center justify-between gap-3 border border-border/70 bg-background/55 p-3"
                            key={session.id}
                          >
                            <div>
                              <p className="text-sm text-foreground">{formatSessionName(session.type)}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {new Date(session.completedAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-lg tabular-nums text-foreground">
                                {Math.floor(session.duration / 60)}m
                              </p>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                {session.type === "work" ? "Focus" : "Reset"}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
