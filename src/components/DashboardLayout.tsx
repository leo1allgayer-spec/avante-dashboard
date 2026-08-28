import { ReactNode, useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Moon, PanelLeft, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  contentClassName?: string;
}

const DashboardLayout = ({ children, title, subtitle, actions, contentClassName }: DashboardLayoutProps) => {
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
          <header className="sticky top-0 z-50 flex min-h-16 items-center justify-between gap-2 border-b border-border/40 bg-background/80 px-3 py-2 backdrop-blur-lg sm:h-16 sm:px-8 sm:py-0">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-primary transition-colors -ml-1">
                <PanelLeft className="h-5 w-5" />
              </SidebarTrigger>
              <div className="min-w-0 border-l border-border/40 pl-3 sm:pl-4">
                <h1 className="truncate font-display text-base font-bold leading-tight text-foreground sm:text-lg">{title}</h1>
                {subtitle && <p className="mt-0.5 hidden truncate text-xs leading-tight text-muted-foreground min-[390px]:block">{subtitle}</p>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
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
            <main className="relative z-10 p-3 sm:p-6">
              <div className={cn("mx-auto max-w-7xl space-y-5", contentClassName)}>
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
