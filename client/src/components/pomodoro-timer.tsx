import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Task, SessionType, TimerState, Settings } from "@shared/schema";

interface PomodoroTimerProps {
  settings: Settings;
  currentTask: Task | null;
  onSessionComplete: (type: SessionType, taskId?: string) => void;
  completedSessions: number;
}

export function PomodoroTimer({ 
  settings, 
  currentTask, 
  onSessionComplete,
  completedSessions 
}: PomodoroTimerProps) {
  const [sessionType, setSessionType] = useState<SessionType>("work");
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [timeRemaining, setTimeRemaining] = useState(settings.workDuration * 60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getDuration = useCallback((type: SessionType) => {
    switch (type) {
      case "work":
        return settings.workDuration * 60;
      case "shortBreak":
        return settings.shortBreakDuration * 60;
      case "longBreak":
        return settings.longBreakDuration * 60;
    }
  }, [settings]);

  useEffect(() => {
    setTimeRemaining(getDuration(sessionType));
  }, [sessionType, settings, getDuration]);

  useEffect(() => {
    if (timerState === "running") {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSessionEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState]);

  const handleSessionEnd = () => {
    setTimerState("idle");
    if (settings.soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
    
    onSessionComplete(sessionType, sessionType === "work" ? currentTask?.id : undefined);
    
    const newCompletedSessions = sessionType === "work" ? completedSessions + 1 : completedSessions;
    
    if (sessionType === "work") {
      if (newCompletedSessions % settings.sessionsUntilLongBreak === 0) {
        setSessionType("longBreak");
      } else {
        setSessionType("shortBreak");
      }
    } else {
      setSessionType("work");
    }
  };

  const toggleTimer = () => {
    setTimerState(prev => prev === "running" ? "paused" : "running");
  };

  const resetTimer = () => {
    setTimerState("idle");
    setTimeRemaining(getDuration(sessionType));
  };

  const skipSession = () => {
    setTimerState("idle");
    if (sessionType === "work") {
      setSessionType("shortBreak");
    } else {
      setSessionType("work");
    }
  };

  const selectSessionType = (type: SessionType) => {
    setTimerState("idle");
    setSessionType(type);
    setTimeRemaining(getDuration(type));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = 1 - (timeRemaining / getDuration(sessionType));
  const circumference = 2 * Math.PI * 140;
  const strokeDashoffset = circumference * (1 - progress);

  const getSessionColor = () => {
    switch (sessionType) {
      case "work":
        return "hsl(var(--primary))";
      case "shortBreak":
        return "hsl(var(--chart-4))";
      case "longBreak":
        return "hsl(var(--chart-2))";
    }
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQoOF4nT2Kl5IRkWfMnPrYM8IiBxtr+2jFMqKG+yvLGPXy0ue7vBsIlbMDN5uMCxj18xNnm3v7KRYjM4e7i/spFiNDl6t7+ykWI0OXq3v7KRYjQ5ere/spJjNDl6t7+ykmM0OXq3v7KSYzQ5ere/spJjNDl6t7+ykmM0OA==" />
      
      <div className="flex gap-2">
        {(["work", "shortBreak", "longBreak"] as SessionType[]).map((type) => (
          <Button
            key={type}
            onClick={() => selectSessionType(type)}
            variant="ghost"
            data-testid={`button-session-${type}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${
              sessionType === type 
                ? "neo-pressed text-primary" 
                : "neo-button"
            }`}
          >
            {type === "work" ? "Focus" : type === "shortBreak" ? "Short Break" : "Long Break"}
          </Button>
        ))}
      </div>

      {currentTask && sessionType === "work" && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Current Task</p>
          <p className="text-lg font-medium text-foreground">{currentTask.title}</p>
        </div>
      )}

      <div className="relative">
        <svg width="320" height="320" viewBox="0 0 320 320" className="transform -rotate-90">
          <circle
            cx="160"
            cy="160"
            r="140"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="12"
            className="opacity-50"
          />
          <circle
            cx="160"
            cy="160"
            r="140"
            fill="none"
            stroke={getSessionColor()}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center neo-inset rounded-full m-6">
          <span 
            className="text-6xl font-mono font-bold text-foreground tabular-nums"
            data-testid="text-timer-display"
          >
            {formatTime(timeRemaining)}
          </span>
          <span className="text-sm text-muted-foreground mt-2 uppercase tracking-wider">
            {sessionType === "work" ? "Focus Time" : sessionType === "shortBreak" ? "Short Break" : "Long Break"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          onClick={resetTimer}
          variant="ghost"
          size="icon"
          data-testid="button-timer-reset"
          className="neo-button p-4 rounded-full h-14 w-14"
          aria-label="Reset timer"
        >
          <RotateCcw className="w-6 h-6 text-muted-foreground" />
        </Button>
        
        <Button
          onClick={toggleTimer}
          variant="ghost"
          size="icon"
          data-testid="button-timer-toggle"
          className={`neo-button p-6 rounded-full h-20 w-20 ${timerState === "running" ? "neo-pressed" : ""}`}
          aria-label={timerState === "running" ? "Pause timer" : "Start timer"}
        >
          {timerState === "running" ? (
            <Pause className="w-8 h-8 text-primary" />
          ) : (
            <Play className="w-8 h-8 text-primary ml-1" />
          )}
        </Button>
        
        <Button
          onClick={skipSession}
          variant="ghost"
          size="icon"
          data-testid="button-timer-skip"
          className="neo-button p-4 rounded-full h-14 w-14"
          aria-label="Skip session"
        >
          <SkipForward className="w-6 h-6 text-muted-foreground" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {Array.from({ length: settings.sessionsUntilLongBreak }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all ${
              i < (completedSessions % settings.sessionsUntilLongBreak)
                ? "bg-primary"
                : "neo-inset"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
