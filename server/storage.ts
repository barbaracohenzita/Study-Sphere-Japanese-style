import type { Task, InsertTask, Session, InsertSession, Settings, User } from "@shared/schema";
import { randomUUID } from "crypto";

export type StoredUser = User & {
  passwordHash: string;
};

type UserWorkspace = {
  tasks: Map<string, Task>;
  sessions: Map<string, Session>;
  settings: Settings;
};

const defaultSettings = (): Settings => ({
  id: "default",
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  dailyGoal: 6,
  soundEnabled: true,
});

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<StoredUser | undefined>;
  createUser(input: { name: string; email: string; passwordHash: string }): Promise<User>;

  getTasks(userId: string): Promise<Task[]>;
  getTask(userId: string, id: string): Promise<Task | undefined>;
  createTask(userId: string, task: InsertTask): Promise<Task>;
  updateTask(userId: string, id: string, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(userId: string, id: string): Promise<boolean>;
  toggleTask(userId: string, id: string): Promise<Task | undefined>;
  incrementTaskPomodoro(userId: string, id: string): Promise<Task | undefined>;

  getSessions(userId: string): Promise<Session[]>;
  createSession(userId: string, session: InsertSession): Promise<Session>;

  getSettings(userId: string): Promise<Settings>;
  updateSettings(userId: string, updates: Partial<Settings>): Promise<Settings>;
}

export class MemStorage implements IStorage {
  private users: Map<string, StoredUser>;
  private usersByEmail: Map<string, string>;
  private workspaces: Map<string, UserWorkspace>;

  constructor() {
    this.users = new Map();
    this.usersByEmail = new Map();
    this.workspaces = new Map();
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private toPublicUser(user: StoredUser): User {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }

  private ensureWorkspace(userId: string) {
    const existing = this.workspaces.get(userId);
    if (existing) return existing;

    const workspace: UserWorkspace = {
      tasks: new Map(),
      sessions: new Map(),
      settings: defaultSettings(),
    };

    this.workspaces.set(userId, workspace);
    return workspace;
  }

  async getUser(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    return user ? this.toPublicUser(user) : undefined;
  }

  async getUserByEmail(email: string): Promise<StoredUser | undefined> {
    const normalizedEmail = this.normalizeEmail(email);
    const userId = this.usersByEmail.get(normalizedEmail);
    return userId ? this.users.get(userId) : undefined;
  }

  async createUser(input: { name: string; email: string; passwordHash: string }): Promise<User> {
    const normalizedEmail = this.normalizeEmail(input.email);
    if (this.usersByEmail.has(normalizedEmail)) {
      throw new Error("A user with that email already exists");
    }

    const user: StoredUser = {
      id: randomUUID(),
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash: input.passwordHash,
    };

    this.users.set(user.id, user);
    this.usersByEmail.set(normalizedEmail, user.id);
    this.ensureWorkspace(user.id);

    return this.toPublicUser(user);
  }

  async getTasks(userId: string): Promise<Task[]> {
    return Array.from(this.ensureWorkspace(userId).tasks.values());
  }

  async getTask(userId: string, id: string): Promise<Task | undefined> {
    return this.ensureWorkspace(userId).tasks.get(id);
  }

  async createTask(userId: string, insertTask: InsertTask): Promise<Task> {
    const workspace = this.ensureWorkspace(userId);
    const id = randomUUID();
    const task: Task = {
      id,
      title: insertTask.title,
      notes: insertTask.notes ?? "",
      completed: insertTask.completed ?? false,
      estimatedPomodoros: insertTask.estimatedPomodoros ?? 1,
      completedPomodoros: insertTask.completedPomodoros ?? 0,
    };

    workspace.tasks.set(id, task);
    return task;
  }

  async updateTask(userId: string, id: string, updates: Partial<Task>): Promise<Task | undefined> {
    const workspace = this.ensureWorkspace(userId);
    const task = workspace.tasks.get(id);
    if (!task) return undefined;

    const completedPomodoros = updates.completedPomodoros ?? task.completedPomodoros;
    const estimatedPomodoros = Math.max(
      updates.estimatedPomodoros ?? task.estimatedPomodoros,
      completedPomodoros,
      1,
    );
    const updatedTask = {
      ...task,
      ...updates,
      completedPomodoros,
      estimatedPomodoros,
    };
    workspace.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(userId: string, id: string): Promise<boolean> {
    return this.ensureWorkspace(userId).tasks.delete(id);
  }

  async toggleTask(userId: string, id: string): Promise<Task | undefined> {
    const workspace = this.ensureWorkspace(userId);
    const task = workspace.tasks.get(id);
    if (!task) return undefined;

    const updatedTask = task.completed
      ? {
          ...task,
          completed: false,
          completedPomodoros:
            task.completedPomodoros >= task.estimatedPomodoros
              ? Math.max(task.estimatedPomodoros - 1, 0)
              : Math.min(task.completedPomodoros, task.estimatedPomodoros),
        }
      : {
          ...task,
          completed: true,
          completedPomodoros: task.estimatedPomodoros,
        };
    workspace.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async incrementTaskPomodoro(userId: string, id: string): Promise<Task | undefined> {
    const workspace = this.ensureWorkspace(userId);
    const task = workspace.tasks.get(id);
    if (!task) return undefined;

    const completedPomodoros = Math.min(task.completedPomodoros + 1, task.estimatedPomodoros);
    const updatedTask = {
      ...task,
      completedPomodoros,
      completed: completedPomodoros >= task.estimatedPomodoros,
    };

    workspace.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async getSessions(userId: string): Promise<Session[]> {
    return Array.from(this.ensureWorkspace(userId).sessions.values()).sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );
  }

  async createSession(userId: string, insertSession: InsertSession): Promise<Session> {
    const workspace = this.ensureWorkspace(userId);
    const id = randomUUID();
    const session: Session = {
      id,
      type: insertSession.type,
      duration: insertSession.duration,
      completedAt: new Date(),
      taskId: insertSession.taskId ?? null,
    };

    workspace.sessions.set(id, session);

    if (session.type === "work" && session.taskId) {
      await this.incrementTaskPomodoro(userId, session.taskId);
    }

    return session;
  }

  async getSettings(userId: string): Promise<Settings> {
    return this.ensureWorkspace(userId).settings;
  }

  async updateSettings(userId: string, updates: Partial<Settings>): Promise<Settings> {
    const workspace = this.ensureWorkspace(userId);
    workspace.settings = { ...workspace.settings, ...updates };
    return workspace.settings;
  }
}

export const storage = new MemStorage();
