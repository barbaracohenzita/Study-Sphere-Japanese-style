import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, LockKeyhole, User2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

type AuthMode = "login" | "register";

async function submitAuth<T>(path: string, body: T) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Authentication failed");
  }

  return (await response.json()) as User;
}

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [mode, name, email, password]);

  const authMutation = useMutation({
    mutationFn: async () => {
      setError(null);

      if (mode === "register") {
        return submitAuth("/api/auth/register", { name: name.trim(), email: email.trim(), password });
      }

      return submitAuth("/api/auth/login", { email: email.trim(), password });
    },
    onSuccess: (user) => {
      queryClient.removeQueries({ queryKey: ["/api/tasks"] });
      queryClient.removeQueries({ queryKey: ["/api/sessions"] });
      queryClient.removeQueries({ queryKey: ["/api/settings"] });
      queryClient.setQueryData(["/api/auth/user"], user);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Authentication failed");
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    authMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="jp-shell min-h-screen">
        <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)] lg:px-8 lg:py-8">
          <section className="flex flex-col justify-between border border-border bg-card/85 p-6 jp-paper sm:p-8">
            <div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.42em] text-muted-foreground">StudyFlow</p>
                  <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
                    A quiet login for a focused workspace.
                  </h1>
                </div>
                <ThemeToggle />
              </div>

              <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground">
                Sign in to keep the dashboard, timer, and task ledger scoped to your account. This
                local build uses in-memory auth, so accounts reset when the dev server restarts.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  {
                    title: "Private workspace",
                    detail: "Tasks, sessions, and timer settings are now isolated per signed-in user.",
                  },
                  {
                    title: "Session-backed",
                    detail: "Auth uses a real server session instead of a client-only flag.",
                  },
                  {
                    title: "Designed to flow",
                    detail: "The login screen follows the same restrained, paper-like visual system.",
                  },
                ].map((item) => (
                  <div className="border border-border bg-background/45 p-4" key={item.title}>
                    <p className="font-serif text-xl">{item.title}</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 border-t border-border pt-5 text-sm text-muted-foreground">
              Create an account once, then the dashboard will open automatically inside the current
              browser session.
            </div>
          </section>

          <section className="flex items-center">
            <div className="w-full border border-border bg-card/90 p-6 jp-paper sm:p-8">
              <div className="flex gap-2 border-b border-border pb-4">
                {[
                  { id: "login" as const, label: "Sign in" },
                  { id: "register" as const, label: "Create account" },
                ].map((option) => (
                  <button
                    className={cn(
                      "border px-4 py-2 text-sm transition-colors",
                      mode === option.id
                        ? "border-foreground bg-background text-foreground"
                        : "border-border bg-background/45 text-muted-foreground",
                    )}
                    key={option.id}
                    onClick={() => setMode(option.id)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <p className="text-[11px] uppercase tracking-[0.42em] text-muted-foreground">
                  {mode === "login" ? "Welcome back" : "New workspace"}
                </p>
                <h2 className="mt-3 font-serif text-3xl tracking-tight">
                  {mode === "login" ? "Sign in to continue" : "Create your account"}
                </h2>
              </div>

              <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                {mode === "register" && (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground" htmlFor="auth-name">
                      Display name
                    </label>
                    <div className="flex items-center gap-3 border border-border bg-background/45 px-3">
                      <User2 className="h-4 w-4 text-muted-foreground" />
                      <Input
                        className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                        id="auth-name"
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Aiko Tanaka"
                        value={name}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground" htmlFor="auth-email">
                    Email
                  </label>
                  <div className="flex items-center gap-3 border border-border bg-background/45 px-3">
                    <User2 className="h-4 w-4 text-muted-foreground" />
                    <Input
                      autoComplete="email"
                      className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      id="auth-email"
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      type="email"
                      value={email}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground" htmlFor="auth-password">
                    Password
                  </label>
                  <div className="flex items-center gap-3 border border-border bg-background/45 px-3">
                    <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                    <Input
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      id="auth-password"
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Minimum 8 characters"
                      type="password"
                      value={password}
                    />
                  </div>
                </div>

                {error && (
                  <div className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button
                  className="h-12 w-full justify-between"
                  disabled={authMutation.isPending}
                  type="submit"
                  variant="outline"
                >
                  <span>{mode === "login" ? "Sign in" : "Create account"}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
