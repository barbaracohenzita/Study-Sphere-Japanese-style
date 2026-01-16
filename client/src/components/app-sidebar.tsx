import { Clock, ListTodo, BarChart3, Settings } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

type View = "timer" | "tasks" | "stats" | "settings";

interface AppSidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const navItems = [
  { id: "timer" as View, label: "Focus", icon: Clock },
  { id: "tasks" as View, label: "Tasks", icon: ListTodo },
  { id: "stats" as View, label: "History", icon: BarChart3 },
  { id: "settings" as View, label: "Settings", icon: Settings },
];

export function AppSidebar({ currentView, onViewChange }: AppSidebarProps) {
  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary flex items-center justify-center">
            <span className="text-primary font-serif text-xl">S</span>
          </div>
          <div>
            <h1 className="text-lg font-medium tracking-tight text-sidebar-foreground">StudyFlow</h1>
            <p className="text-xs text-muted-foreground tracking-wide">Mindful Focus</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-6">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={currentView === item.id}
                    data-testid={`nav-${item.id}`}
                    className={`rounded-none ${
                      currentView === item.id
                        ? "bg-accent border-l-4 border-l-primary pl-4"
                        : "pl-5"
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${currentView === item.id ? "text-primary" : ""}`} />
                    <span className="text-sm tracking-wide">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Theme</span>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
