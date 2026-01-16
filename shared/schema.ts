import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey(),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  estimatedPomodoros: integer("estimated_pomodoros").notNull().default(1),
  completedPomodoros: integer("completed_pomodoros").notNull().default(0),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey(),
  type: text("type").notNull(),
  duration: integer("duration").notNull(),
  completedAt: timestamp("completed_at").notNull(),
  taskId: varchar("task_id"),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default("default"),
  workDuration: integer("work_duration").notNull().default(25),
  shortBreakDuration: integer("short_break_duration").notNull().default(5),
  longBreakDuration: integer("long_break_duration").notNull().default(15),
  sessionsUntilLongBreak: integer("sessions_until_long_break").notNull().default(4),
  soundEnabled: boolean("sound_enabled").notNull().default(true),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true });
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

export type TimerState = 'idle' | 'running' | 'paused';
export type SessionType = 'work' | 'shortBreak' | 'longBreak';
