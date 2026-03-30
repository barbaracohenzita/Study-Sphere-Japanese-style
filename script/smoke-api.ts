import { createServer } from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

type User = {
  id: string;
  name: string;
  email: string;
};

type Settings = {
  id: string;
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
  dailyGoal: number;
  soundEnabled: boolean;
};

type Task = {
  id: string;
  title: string;
  notes: string;
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
      const response = await fetch(`${baseUrl}/api/auth/user`);
      if (response.ok || response.status === 401) {
        return;
      }
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for smoke server at ${baseUrl}`);
}

function updateCookieJar(existingCookie: string, response: Response) {
  const setCookie = response.headers.getSetCookie?.() ?? [];
  if (setCookie.length === 0) {
    return existingCookie;
  }

  const jar = new Map<string, string>();

  for (const part of existingCookie.split(";").map((segment) => segment.trim()).filter(Boolean)) {
    const [name, value] = part.split("=");
    if (name && value) {
      jar.set(name, value);
    }
  }

  for (const cookie of setCookie) {
    const [nameValue] = cookie.split(";");
    const [name, value] = nameValue.split("=");
    if (name && value) {
      jar.set(name, value);
    }
  }

  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function requestJson<T>(
  baseUrl: string,
  route: string,
  cookieJar: string,
  init?: RequestInit,
) {
  const headers = new Headers(init?.headers);
  if (cookieJar) {
    headers.set("cookie", cookieJar);
  }

  const response = await fetch(`${baseUrl}${route}`, {
    ...init,
    headers,
  });

  const nextCookieJar = updateCookieJar(cookieJar, response);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${init?.method || "GET"} ${route} failed: ${response.status} ${text}`);
  }

  return {
    cookieJar: nextCookieJar,
    data: text ? (JSON.parse(text) as T) : (undefined as T),
    response,
  };
}

async function requestStatus(
  baseUrl: string,
  route: string,
  cookieJar: string,
  init?: RequestInit,
) {
  const headers = new Headers(init?.headers);
  if (cookieJar) {
    headers.set("cookie", cookieJar);
  }

  const response = await fetch(`${baseUrl}${route}`, {
    ...init,
    headers,
  });

  return {
    cookieJar: updateCookieJar(cookieJar, response),
    status: response.status,
    text: await response.text(),
  };
}

function startServer(port: number, dataFile: string) {
  const tsxPath = path.resolve("node_modules/.bin/tsx");
  const child = spawn(tsxPath, ["server/index.ts"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "development",
      PORT: String(port),
      STUDYFLOW_DATA_FILE: dataFile,
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
  const tempDir = mkdtempSync(path.join(tmpdir(), "studyflow-smoke-"));
  const dataFile = path.join(tempDir, "store.json");
  let server = startServer(port, dataFile);

  try {
    await waitForServer(baseUrl);

    let cookieJar = "";

    const registered = await requestJson<User>(baseUrl, "/api/auth/register", cookieJar, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Smoke User",
        email: "smoke@example.com",
        password: "smoke-pass-123",
      }),
    });
    cookieJar = registered.cookieJar;
    assert(registered.data.email === "smoke@example.com", "Register did not return the created user");

    const currentUser = await requestJson<User>(baseUrl, "/api/auth/user", cookieJar);
    cookieJar = currentUser.cookieJar;
    assert(currentUser.data.name === "Smoke User", "Current-user endpoint returned the wrong account");

    const logoutResponse = await requestJson<void>(baseUrl, "/api/auth/logout", cookieJar, {
      method: "POST",
    });
    cookieJar = logoutResponse.cookieJar;

    const loggedIn = await requestJson<User>(baseUrl, "/api/auth/login", cookieJar, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "smoke@example.com",
        password: "smoke-pass-123",
      }),
    });
    cookieJar = loggedIn.cookieJar;
    assert(loggedIn.data.name === "Smoke User", "Login did not return the expected user");

    const settings = await requestJson<Settings>(baseUrl, "/api/settings", cookieJar);
    cookieJar = settings.cookieJar;
    assert(settings.data.workDuration === 25, "Expected default work duration to be 25");
    assert(settings.data.dailyGoal === 6, "Expected default daily goal to be 6");

    const createdTask = await requestJson<Task>(baseUrl, "/api/tasks", cookieJar, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Smoke task",
        notes: "Initial note",
        estimatedPomodoros: 2,
      }),
    });
    cookieJar = createdTask.cookieJar;
    assert(createdTask.data.title === "Smoke task", "Task title did not round-trip");
    assert(createdTask.data.notes === "Initial note", "Task notes did not round-trip");
    assert(createdTask.data.completed === false, "New task should start incomplete");

    const invalidTask = await requestStatus(baseUrl, "/api/tasks", cookieJar, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "   ",
        estimatedPomodoros: 0,
      }),
    });
    assert(invalidTask.status === 400, `Expected invalid task payload to fail, received ${invalidTask.status}`);

    const updatedTask = await requestJson<Task>(
      baseUrl,
      `/api/tasks/${createdTask.data.id}`,
      cookieJar,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Smoke task edited",
          notes: "Edited note",
          estimatedPomodoros: 3,
        }),
      },
    );
    cookieJar = updatedTask.cookieJar;
    assert(updatedTask.data.title === "Smoke task edited", "Task update did not persist the title");
    assert(updatedTask.data.notes === "Edited note", "Task update did not persist the notes");
    assert(updatedTask.data.estimatedPomodoros === 3, "Task update did not persist the estimate");

    const invalidTaskUpdate = await requestStatus(
      baseUrl,
      `/api/tasks/${createdTask.data.id}`,
      cookieJar,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimatedPomodoros: 0,
        }),
      },
    );
    assert(
      invalidTaskUpdate.status === 400,
      `Expected invalid task update to fail, received ${invalidTaskUpdate.status}`,
    );

    const toggledTask = await requestJson<Task>(
      baseUrl,
      `/api/tasks/${createdTask.data.id}/toggle`,
      cookieJar,
      { method: "PATCH" },
    );
    cookieJar = toggledTask.cookieJar;
    assert(toggledTask.data.completed === true, "Task toggle did not mark the task complete");
    assert(
      toggledTask.data.completedPomodoros === toggledTask.data.estimatedPomodoros,
      "Completing a task should fill its remaining planned blocks",
    );

    const reopenedTask = await requestJson<Task>(
      baseUrl,
      `/api/tasks/${createdTask.data.id}/toggle`,
      cookieJar,
      { method: "PATCH" },
    );
    cookieJar = reopenedTask.cookieJar;
    assert(reopenedTask.data.completed === false, "Reopening a task should make it active again");
    assert(
      reopenedTask.data.completedPomodoros === reopenedTask.data.estimatedPomodoros - 1,
      "Reopening a completed task should restore one remaining block",
    );

    const updatedSettings = await requestJson<Settings>(baseUrl, "/api/settings", cookieJar, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        soundEnabled: false,
        dailyGoal: 7,
      }),
    });
    cookieJar = updatedSettings.cookieJar;
    assert(updatedSettings.data.soundEnabled === false, "Settings patch did not persist");
    assert(updatedSettings.data.dailyGoal === 7, "Settings patch did not persist the daily goal");

    const invalidSettings = await requestStatus(baseUrl, "/api/settings", cookieJar, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dailyGoal: 0,
      }),
    });
    assert(
      invalidSettings.status === 400,
      `Expected invalid settings update to fail, received ${invalidSettings.status}`,
    );

    const createdSession = await requestJson<Session>(baseUrl, "/api/sessions", cookieJar, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "work",
        duration: 1500,
        taskId: createdTask.data.id,
      }),
    });
    cookieJar = createdSession.cookieJar;
    assert(createdSession.data.duration === 1500, "Session duration did not round-trip");
    assert(Boolean(createdSession.data.completedAt), "Session did not get a completion timestamp");

    const tasksAfterSession = await requestJson<Task[]>(baseUrl, "/api/tasks", cookieJar);
    cookieJar = tasksAfterSession.cookieJar;
    const taskAfterSession = tasksAfterSession.data.find((task) => task.id === createdTask.data.id);
    assert(taskAfterSession, "Task should still exist after recording a session");
    assert(taskAfterSession.completedPomodoros === taskAfterSession.estimatedPomodoros, "Work session should cap task progress at the estimate");
    assert(taskAfterSession.completed === true, "Task should auto-complete when all planned blocks are finished");

    const sessions = await requestJson<Session[]>(baseUrl, "/api/sessions", cookieJar);
    cookieJar = sessions.cookieJar;
    assert(sessions.data.length === 1, "Expected the smoke run to create exactly one session");

    await stopServer(server);
    server = startServer(port, dataFile);
    await waitForServer(baseUrl);

    const reloggedIn = await requestJson<User>(baseUrl, "/api/auth/login", "", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "smoke@example.com",
        password: "smoke-pass-123",
      }),
    });
    cookieJar = reloggedIn.cookieJar;
    assert(reloggedIn.data.name === "Smoke User", "Persisted account should still support login after restart");

    const persistedSettings = await requestJson<Settings>(baseUrl, "/api/settings", cookieJar);
    cookieJar = persistedSettings.cookieJar;
    assert(persistedSettings.data.dailyGoal === 7, "Settings should persist after restart");
    assert(persistedSettings.data.soundEnabled === false, "Sound preference should persist after restart");

    const persistedTasks = await requestJson<Task[]>(baseUrl, "/api/tasks", cookieJar);
    cookieJar = persistedTasks.cookieJar;
    assert(persistedTasks.data.length === 1, "Tasks should persist after restart");
    assert(persistedTasks.data[0].completed === true, "Task completion should persist after restart");

    const persistedSessions = await requestJson<Session[]>(baseUrl, "/api/sessions", cookieJar);
    cookieJar = persistedSessions.cookieJar;
    assert(persistedSessions.data.length === 1, "Sessions should persist after restart");

    const deletedTask = await fetch(`${baseUrl}/api/tasks/${createdTask.data.id}`, {
      method: "DELETE",
      headers: cookieJar ? { cookie: cookieJar } : undefined,
    });
    assert(deletedTask.status === 204, "Task delete did not return 204");

    console.log("Smoke API checks passed.");
  } finally {
    await stopServer(server);
    rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
