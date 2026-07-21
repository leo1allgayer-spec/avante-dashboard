import { ReactNode, useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Moon, PanelLeft, Sun } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

const DashboardLayout = ({ children, title, subtitle, actions }: DashboardLayoutProps) => {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem("avante-theme") === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    localStorage.setItem("avante-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((current) => current === "dark" ? "light" : "dark");

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
          {/* Top bar */}
          <header className="h-16 flex items-center justify-between border-b border-border/40 bg-background/80 backdrop-blur-lg px-5 sm:px-8 sticky top-0 z-50">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-primary transition-colors -ml-1">
                <PanelLeft className="h-5 w-5" />
              </SidebarTrigger>
              <div className="border-l border-border/40 pl-4">
                <h1 className="font-display text-lg font-bold text-foreground leading-tight">{title}</h1>
                {subtitle && <p className="text-xs text-muted-foreground leading-tight mt-0.5">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {actions}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
                aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
                className="h-10 px-3"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="hidden sm:inline">{theme === "dark" ? "Claro" : "Escuro"}</span>
              </Button>
            </div>
          </header>

          {/* Dot pattern background */}
          <div className="flex-1 relative">
            <div className="absolute inset-0 dot-pattern opacity-30 pointer-events-none" />
            <main className="relative z-10 p-4 sm:p-6">
              <div className="mx-auto max-w-7xl space-y-5">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
