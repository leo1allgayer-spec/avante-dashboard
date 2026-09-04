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
  Settings2,
  Cpu,
  UserRoundPlus,
  ReceiptText,
  CalendarCheck2,
  KanbanSquare,
  NotebookPen,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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
  { title: "Agenda Reuniões", url: "/reunioes", icon: CalendarCheck2 },
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
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { session, signOut } = useAuth();
  const googleTasksOnly = isGoogleTasksOnlyUser(session?.user?.email);

  const visibleGestaoItems = googleTasksOnly
    ? [
        { title: "Cursos Google Ads", url: "/tasks", icon: GraduationCap },
        { title: "Clientes Google Ads", url: "/clientes-google-ads", icon: Users2 },
        { title: "Dias disponíveis", url: "/admin/agendamentos", icon: Calendar },
        { title: "Kanban Social Media", url: "/kanban-social-media", icon: KanbanSquare },
        { title: "Kanban Sites", url: "/kanban-sites", icon: KanbanSquare },
        { title: "Kanban CRM", url: "/kanban-crm", icon: KanbanSquare },
        { title: "Kanban Edição Foto/Vídeo", url: "/kanban-edicao", icon: KanbanSquare },
      ]
    : gestaoItems;

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

      <SidebarContent className="px-2 pt-0 -mt-1" data-lenis-prevent>
        {!googleTasksOnly && <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 font-semibold mb-1">
              Métricas de Vendas
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {metricsItems.map((item) => (
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

        {!googleTasksOnly && !collapsed && <Separator className="my-2 bg-border/40" />}

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 font-semibold mb-1">
              Gestão Operacional
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleGestaoItems.map((item) => (
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
        </SidebarGroup>

        {!googleTasksOnly && !collapsed && <Separator className="my-2 bg-border/40" />}

        {!googleTasksOnly && <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 font-semibold mb-1">
              Meta Pixel & CAPI
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {metaItems.map((item) => (
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
