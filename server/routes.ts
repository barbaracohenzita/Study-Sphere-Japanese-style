import type { Express, NextFunction, Request, Response } from "express";
import type { Server } from "http";
import {
  insertTaskSchema,
  insertSessionSchema,
  loginUserSchema,
  registerUserSchema,
  updateSettingsSchema,
  updateTaskSchema,
} from "@shared/schema";
import { hashPassword, verifyPassword } from "./auth";
import { storage } from "./storage";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
}

async function establishSession(req: Request, userId: string) {
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }

      req.session.userId = userId;
      resolve();
    });
  });
}

async function destroySession(req: Request, res: Response) {
  await new Promise<void>((resolve, reject) => {
    req.session.destroy((error) => {
      if (error) {
        reject(error);
        return;
      }

      res.clearCookie("studyflow.sid");
      resolve();
    });
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get("/api/auth/user", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.json(null);
      }

      const user = await storage.getUser(userId);
      if (!user) {
        await destroySession(req, res);
        return res.json(null);
      }

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch the current user" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const existingUser = await storage.getUserByEmail(parsed.data.email);
      if (existingUser) {
        return res.status(409).json({ error: "An account with that email already exists" });
      }

      const user = await storage.createUser({
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: hashPassword(parsed.data.password),
      });

      await establishSession(req, user.id);
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to register account" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const user = await storage.getUserByEmail(parsed.data.email);
      if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      await establishSession(req, user.id);
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to sign in" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(204).send();
      }

      await destroySession(req, res);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to sign out" });
    }
  });

  app.use("/api/tasks", requireAuth);
  app.use("/api/sessions", requireAuth);
  app.use("/api/settings", requireAuth);

  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks(req.session.userId!);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const parsed = insertTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const task = await storage.createTask(req.session.userId!, parsed.data);
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id/toggle", async (req, res) => {
    try {
      const task = await storage.toggleTask(req.session.userId!, req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle task" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const parsed = updateTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const task = await storage.updateTask(req.session.userId!, req.params.id, parsed.data);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTask(req.session.userId!, req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  app.get("/api/sessions", async (req, res) => {
    try {
      const sessions = await storage.getSessions(req.session.userId!);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.post("/api/sessions", async (req, res) => {
    try {
      const parsed = insertSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const session = await storage.createSession(req.session.userId!, parsed.data);
      res.status(201).json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings(req.session.userId!);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", async (req, res) => {
    try {
      const parsed = updateSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const settings = await storage.updateSettings(req.session.userId!, parsed.data);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  return httpServer;
}
