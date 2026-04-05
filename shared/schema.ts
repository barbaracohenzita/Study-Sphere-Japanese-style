import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey(),
  title: text("title").notNull(),
  notes: text("notes").notNull().default(""),
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
  dailyGoal: integer("daily_goal").notNull().default(6),
  soundEnabled: boolean("sound_enabled").notNull().default(true),
});

const sessionTypeSchema = z.enum(["work", "shortBreak", "longBreak"]);

export const insertTaskSchema = createInsertSchema(tasks, {
  title: () => z.string().trim().min(1, "Task title is required").max(160, "Task title is too long"),
  notes: () => z.string().max(4000, "Task notes are too long").default(""),
  estimatedPomodoros: () =>
    z.number().int().min(1, "Estimated pomodoros must be at least 1").max(12, "Estimated pomodoros are too large"),
  completedPomodoros: () =>
    z.number().int().min(0, "Completed pomodoros cannot be negative").max(12, "Completed pomodoros are too large"),
}).omit({ id: true });
export const updateTaskSchema = insertTaskSchema.partial();
export const insertSessionSchema = createInsertSchema(sessions, {
  type: () => sessionTypeSchema,
  duration: () =>
    z.number().int().min(60, "Session duration must be at least 60 seconds").max(60 * 60 * 3, "Session duration is too large"),
  taskId: () => z.string().trim().min(1).nullable().optional(),
}).omit({
  id: true,
  completedAt: true,
});
export const insertSettingsSchema = createInsertSchema(settings, {
  workDuration: () => z.number().int().min(10).max(90),
  shortBreakDuration: () => z.number().int().min(1).max(20),
  longBreakDuration: () => z.number().int().min(10).max(45),
  sessionsUntilLongBreak: () => z.number().int().min(2).max(6),
  dailyGoal: () => z.number().int().min(1).max(12),
  soundEnabled: () => z.boolean(),
}).omit({ id: true });
export const updateSettingsSchema = insertSettingsSchema.partial();

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

export const registerUserSchema = z.object({
  name: z.string().trim().min(2).max(40),
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
});

export const loginUserSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type UpdateSettings = z.infer<typeof updateSettingsSchema>;
export type User = z.infer<typeof userSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;

export type TimerState = 'idle' | 'running' | 'paused';
export type SessionType = 'work' | 'shortBreak' | 'longBreak';
