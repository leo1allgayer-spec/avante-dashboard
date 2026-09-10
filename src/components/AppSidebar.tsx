import {
  LayoutDashboard,
  Target,
  TrendingUp,
  DollarSign,
  Megaphone,
  Settings,
  LogOut,
  Monitor,
  ShoppingCart,
  Brain,
  ClipboardList,
  Sheet,
  GraduationCap,
  Palette,
  Wallet,
  Users2,
  Calendar,
  CalendarDays,
  Settings2,
  Cpu,
  UserRoundPlus,
  ReceiptText,
  CalendarCheck2,
  KanbanSquare,
  NotebookPen,
  Search,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import logoFull from "@/assets/logo-full.svg";
import logoIcon from "@/assets/logo-icon.svg";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { isGoogleTasksOnlyUser } from "@/lib/accessControl";

const metricsItems = [
  { title: "Visão Geral", url: "/", icon: LayoutDashboard },
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Faturamento", url: "/faturamento", icon: DollarSign },
  { title: "Performance", url: "/performance", icon: TrendingUp },
  { title: "Planilha", url: "/planilha", icon: Sheet },
  { title: "Vendas", url: "/vendas", icon: ShoppingCart },
  { title: "Boletos", url: "/boletos", icon: ReceiptText },
  { title: "Criativos", url: "/criativos", icon: Palette },
  { title: "Cursos Dados", url: "/cursos-dados", icon: GraduationCap },
  { title: "Campanhas", url: "/campanhas", icon: Megaphone },
  { title: "Análise de Alunos", url: "/analise-alunos", icon: Brain },
  { title: "Alunos Futuros", url: "/alunos-futuros", icon: UserRoundPlus },
  { title: "Agenda Geral", url: "/agenda-geral", icon: CalendarDays },
  { title: "Agenda Reuniões", url: "/reunioes", icon: CalendarCheck2 },
  { title: "Agenda de Captação", url: "/agenda-captacao", icon: CalendarCheck2 },
  { title: "Agenda Social Media", url: "/agenda-social-media", icon: CalendarCheck2 },
  { title: "Agenda de Suporte", url: "/agenda-suporte", icon: CalendarCheck2 },
  { title: "Pagamentos", url: "/pagamentos", icon: Wallet },
  { title: "Pesquisa", url: "/pesquisa", icon: ClipboardList },
  { title: "Dashboard TV", url: "/dashboard-tv", icon: Monitor },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

const gestaoItems = [
  { title: "Clientes", url: "/gestao-clientes", icon: Users2 },
  { title: "Dados dos Alunos", url: "/dados-alunos", icon: GraduationCap },
  { title: "Notas dos Clientes", url: "/notas-clientes", icon: NotebookPen },
  { title: "Clientes Google Ads", url: "/clientes-google-ads", icon: Users2 },
  { title: "Gestor de Tarefas", url: "/gestor-tarefas", icon: ClipboardList },
  { title: "Agenda Curso", url: "/tasks", icon: CalendarCheck2 },
  { title: "Agendamentos", url: "/admin/agendamentos", icon: Calendar },
  { title: "Configurações", url: "/admin-settings", icon: Settings2 },
  { title: "Kanban Social Media", url: "/kanban-social-media", icon: KanbanSquare },
  { title: "Kanban Sites", url: "/kanban-sites", icon: KanbanSquare },
  { title: "Kanban CRM", url: "/kanban-crm", icon: KanbanSquare },
  { title: "Kanban Edição Foto/Vídeo", url: "/kanban-edicao", icon: KanbanSquare },
];

const metaItems = [
  { title: "Meta Hub", url: "/meta-pixel", icon: Cpu },
];

export function AppSidebar() {
  const [menuSearch, setMenuSearch] = useState("");
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { session, signOut } = useAuth();
  const googleTasksOnly = isGoogleTasksOnlyUser(session?.user?.email);

  const visibleGestaoItems = googleTasksOnly
    ? [
        { title: "Cursos Google Ads", url: "/tasks", icon: GraduationCap },
        { title: "Clientes Google Ads", url: "/clientes-google-ads", icon: Users2 },
        { title: "Dias disponíveis", url: "/admin/agendamentos", icon: Calendar },
        { title: "Agenda Geral", url: "/agenda-geral", icon: CalendarDays },
        { title: "Agenda Reuniões", url: "/reunioes", icon: CalendarCheck2 },
        { title: "Agenda de Captação", url: "/agenda-captacao", icon: CalendarCheck2 },
        { title: "Agenda Social Media", url: "/agenda-social-media", icon: CalendarCheck2 },
        { title: "Kanban Social Media", url: "/kanban-social-media", icon: KanbanSquare },
        { title: "Kanban Sites", url: "/kanban-sites", icon: KanbanSquare },
        { title: "Kanban CRM", url: "/kanban-crm", icon: KanbanSquare },
        { title: "Kanban Edição Foto/Vídeo", url: "/kanban-edicao", icon: KanbanSquare },
      ]
    : gestaoItems;

  const normalizedSearch = menuSearch
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const filterItems = <T extends { title: string }>(items: T[]) =>
    normalizedSearch
      ? items.filter((item) =>
          item.title
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .includes(normalizedSearch),
        )
      : items;

  const filteredMetricsItems = filterItems(metricsItems);
  const filteredGestaoItems = filterItems(visibleGestaoItems);
  const filteredMetaItems = filterItems(metaItems);
  const hasSearchResults = googleTasksOnly
    ? filteredGestaoItems.length > 0
    : filteredMetricsItems.length + filteredGestaoItems.length + filteredMetaItems.length > 0;

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="p-2 pb-0">
        <div className="flex items-center justify-center overflow-hidden">
          {collapsed ? (
            <img src={logoIcon} alt="Avante" className="h-8 w-8 object-contain" />
          ) : (
            <img src={logoFull} alt="Avante Digital" className="h-24 object-contain" />
          )}
        </div>
      </SidebarHeader>

      {!collapsed && (
        <div className="relative px-3 pb-2">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-[calc(50%+4px)] text-muted-foreground/60" />
          <Input
            type="search"
            value={menuSearch}
            onChange={(event) => setMenuSearch(event.target.value)}
            placeholder="Buscar uma aba..."
            aria-label="Buscar uma aba no menu"
            className="h-9 border-border/60 bg-secondary/30 pl-9 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-1"
          />
        </div>
      )}

      <SidebarContent className="px-2 pt-0 -mt-1" data-lenis-prevent>
        {!googleTasksOnly && filteredMetricsItems.length > 0 && <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 font-semibold mb-1">
              Métricas de Vendas
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMetricsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150"
                      activeClassName="bg-gradient-to-r from-primary/15 to-accent/5 border border-primary/20 text-primary font-semibold shadow-inner"
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>}

        {!googleTasksOnly && filteredMetricsItems.length > 0 && filteredGestaoItems.length > 0 && !collapsed && <Separator className="my-2 bg-border/40" />}

        {filteredGestaoItems.length > 0 && <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 font-semibold mb-1">
              Gestão Operacional
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredGestaoItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/gestao-clientes"}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150"
                      activeClassName="bg-gradient-to-r from-primary/15 to-accent/5 border border-primary/20 text-primary font-semibold shadow-inner"
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>}

        {!googleTasksOnly && filteredGestaoItems.length > 0 && filteredMetaItems.length > 0 && !collapsed && <Separator className="my-2 bg-border/40" />}

        {!googleTasksOnly && filteredMetaItems.length > 0 && <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 font-semibold mb-1">
              Meta Pixel & CAPI
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMetaItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150"
                      activeClassName="bg-gradient-to-r from-primary/15 to-accent/5 border border-primary/20 text-primary font-semibold shadow-inner"
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>}

        {!collapsed && normalizedSearch && !hasSearchResults && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            Nenhuma aba encontrada.
          </p>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={signOut}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-[13px]"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
