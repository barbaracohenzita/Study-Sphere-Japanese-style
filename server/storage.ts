import type { Task, InsertTask, Session, InsertSession, Settings, InsertSettings } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;
  toggleTask(id: string): Promise<Task | undefined>;
  incrementTaskPomodoro(id: string): Promise<Task | undefined>;

  getSessions(): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;

  getSettings(): Promise<Settings>;
  updateSettings(updates: Partial<Settings>): Promise<Settings>;
}

export class MemStorage implements IStorage {
  private tasks: Map<string, Task>;
  private sessions: Map<string, Session>;
  private settings: Settings;

  constructor() {
    this.tasks = new Map();
    this.sessions = new Map();
    this.settings = {
      id: "default",
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      sessionsUntilLongBreak: 4,
      soundEnabled: true,
    };
  }

  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = {
      id,
      title: insertTask.title,
      completed: insertTask.completed ?? false,
      estimatedPomodoros: insertTask.estimatedPomodoros ?? 1,
      completedPomodoros: insertTask.completedPomodoros ?? 0,
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...updates };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async toggleTask(id: string): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, completed: !task.completed };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async incrementTaskPomodoro(id: string): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { 
      ...task, 
      completedPomodoros: task.completedPomodoros + 1 
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async getSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values()).sort((a, b) => 
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = randomUUID();
    const session: Session = {
      id,
      type: insertSession.type,
      duration: insertSession.duration,
      completedAt: new Date(),
      taskId: insertSession.taskId ?? null,
    };
    this.sessions.set(id, session);
    
    if (session.type === "work" && session.taskId) {
      await this.incrementTaskPomodoro(session.taskId);
    }
    
    return session;
  }

  async getSettings(): Promise<Settings> {
    return this.settings;
  }

  async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    this.settings = { ...this.settings, ...updates };
    return this.settings;
  }
}

export const storage = new MemStorage();
