import { createServer } from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import process from "node:process";

type Settings = {
  id: string;
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
  soundEnabled: boolean;
};

type Task = {
  id: string;
  title: string;
  completed: boolean;
  estimatedPomodoros: number;
  completedPomodoros: number;
};

type Session = {
  id: string;
  type: string;
  duration: number;
  completedAt: string;
  taskId: string | null;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function getFreePort() {
  return await new Promise<number>((resolve, reject) => {
    const server = createServer();

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to resolve a free port")));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(port);
      });
    });
  });
}

async function waitForServer(baseUrl: string, timeoutMs = 20_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/settings`);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for smoke server at ${baseUrl}`);
}

async function requestJson<T>(baseUrl: string, route: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${route}`, init);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${init?.method || "GET"} ${route} failed: ${response.status} ${text}`);
  }

  return text ? (JSON.parse(text) as T) : (undefined as T);
}

function startServer(port: number) {
  const tsxPath = path.resolve("node_modules/.bin/tsx");
  const child = spawn(tsxPath, ["server/index.ts"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "development",
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.on("data", (chunk) => {
    process.stdout.write(`[smoke-server] ${chunk}`);
  });

  child.stderr?.on("data", (chunk) => {
    process.stderr.write(`[smoke-server] ${chunk}`);
  });

  return child;
}

async function stopServer(child: ChildProcess) {
  if (child.killed || child.exitCode !== null) return;

  child.kill("SIGINT");

  await new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
    setTimeout(() => {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
    }, 3_000);
  });
}

async function main() {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = startServer(port);

  try {
    await waitForServer(baseUrl);

    const settings = await requestJson<Settings>(baseUrl, "/api/settings");
    assert(settings.workDuration === 25, "Expected default work duration to be 25");

    const createdTask = await requestJson<Task>(baseUrl, "/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Smoke task",
        estimatedPomodoros: 2,
      }),
    });

    assert(createdTask.title === "Smoke task", "Task title did not round-trip");
    assert(createdTask.completed === false, "New task should start incomplete");

    const toggledTask = await requestJson<Task>(baseUrl, `/api/tasks/${createdTask.id}/toggle`, {
      method: "PATCH",
    });

    assert(toggledTask.completed === true, "Task toggle did not mark the task complete");

    const updatedSettings = await requestJson<Settings>(baseUrl, "/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        soundEnabled: false,
      }),
    });

    assert(updatedSettings.soundEnabled === false, "Settings patch did not persist");

    const createdSession = await requestJson<Session>(baseUrl, "/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "work",
        duration: 1500,
      }),
    });

    assert(createdSession.duration === 1500, "Session duration did not round-trip");
    assert(Boolean(createdSession.completedAt), "Session did not get a completion timestamp");

    const sessions = await requestJson<Session[]>(baseUrl, "/api/sessions");
    assert(sessions.length === 1, "Expected the smoke run to create exactly one session");

    const deleteResponse = await fetch(`${baseUrl}/api/tasks/${createdTask.id}`, {
      method: "DELETE",
    });
    assert(deleteResponse.status === 204, "Task delete did not return 204");

    console.log("Smoke API checks passed.");
  } finally {
    await stopServer(server);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
