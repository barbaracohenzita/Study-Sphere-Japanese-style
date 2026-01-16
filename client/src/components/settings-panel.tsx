import { Volume2, VolumeX } from "lucide-react";
import type { Settings } from "@shared/schema";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

interface SettingsPanelProps {
  settings: Settings;
  onUpdateSettings: (settings: Partial<Settings>) => void;
}

export function SettingsPanel({ settings, onUpdateSettings }: SettingsPanelProps) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-6">Timer Settings</h3>
        
        <div className="space-y-6">
          <div className="neo-inset rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-foreground">Focus Duration</label>
              <span className="text-2xl font-bold text-primary tabular-nums">{settings.workDuration}m</span>
            </div>
            <Slider
              value={[settings.workDuration]}
              onValueChange={([value]) => onUpdateSettings({ workDuration: value })}
              min={5}
              max={60}
              step={5}
              data-testid="slider-work-duration"
              className="neo-slider"
            />
          </div>
          
          <div className="neo-inset rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-foreground">Short Break</label>
              <span className="text-2xl font-bold text-chart-4 tabular-nums">{settings.shortBreakDuration}m</span>
            </div>
            <Slider
              value={[settings.shortBreakDuration]}
              onValueChange={([value]) => onUpdateSettings({ shortBreakDuration: value })}
              min={1}
              max={15}
              step={1}
              data-testid="slider-short-break"
              className="neo-slider"
            />
          </div>
          
          <div className="neo-inset rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-foreground">Long Break</label>
              <span className="text-2xl font-bold text-chart-2 tabular-nums">{settings.longBreakDuration}m</span>
            </div>
            <Slider
              value={[settings.longBreakDuration]}
              onValueChange={([value]) => onUpdateSettings({ longBreakDuration: value })}
              min={10}
              max={30}
              step={5}
              data-testid="slider-long-break"
              className="neo-slider"
            />
          </div>
          
          <div className="neo-inset rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-foreground">Sessions Until Long Break</label>
              <span className="text-2xl font-bold text-foreground tabular-nums">{settings.sessionsUntilLongBreak}</span>
            </div>
            <Slider
              value={[settings.sessionsUntilLongBreak]}
              onValueChange={([value]) => onUpdateSettings({ sessionsUntilLongBreak: value })}
              min={2}
              max={6}
              step={1}
              data-testid="slider-sessions-until-long-break"
              className="neo-slider"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-6">Notifications</h3>
        
        <div className="neo-card rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {settings.soundEnabled ? (
                <Volume2 className="w-5 h-5 text-primary" />
              ) : (
                <VolumeX className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-foreground">Sound Notifications</p>
                <p className="text-sm text-muted-foreground">Play sound when timer ends</p>
              </div>
            </div>
            <Button
              onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              variant="ghost"
              data-testid="button-toggle-sound"
              className={`w-14 h-8 rounded-full transition-all relative p-0 ${
                settings.soundEnabled ? "bg-primary" : "neo-inset"
              }`}
            >
              <div
                className={`absolute top-1 w-6 h-6 rounded-full transition-all ${
                  settings.soundEnabled
                    ? "left-7 bg-white shadow-md"
                    : "left-1 neo-button"
                }`}
              />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
