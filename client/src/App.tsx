import { Switch, Route } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient, getQueryFn } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";
import type { User } from "@shared/schema";

function Router({ user }: { user: User }) {
  return (
    <Switch>
      <Route path="/">
        <Dashboard user={user} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthGate() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="border border-border bg-card/80 px-6 py-5">
          <p className="text-[11px] uppercase tracking-[0.42em] text-muted-foreground">StudyFlow</p>
          <p className="mt-3 font-serif text-2xl">Opening your workspace…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <Router user={user} />;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <AuthGate />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
