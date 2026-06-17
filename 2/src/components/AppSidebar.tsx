import {
  LayoutDashboard,
  Target,
  TrendingUp,
  Users,
  DollarSign,
  FileBarChart,
  Megaphone,
  UserCircle,
  Settings,
  LogOut,
  Monitor,
  ShoppingCart,
  BarChart3,
  Brain,
  ClipboardList,
  Sheet,
  GraduationCap,
  Palette,
  Instagram,
  Wallet,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import logoFull from "@/assets/logo-full.png";
import logoIcon from "@/assets/logo-icon.png";

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

const mainItems = [
  { title: "Visão Geral", url: "/", icon: LayoutDashboard },
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Faturamento", url: "/faturamento", icon: DollarSign },
  { title: "Comercial", url: "/comercial", icon: Users },
  { title: "Performance", url: "/performance", icon: TrendingUp },
];

const extraItems = [
  { title: "Planilha", url: "/planilha", icon: Sheet },
  { title: "Vendas", url: "/vendas", icon: ShoppingCart },
  { title: "Criativos", url: "/criativos", icon: Palette },
  { title: "Cursos Dados", url: "/cursos-dados", icon: GraduationCap },
  { title: "Métricas Insta", url: "/planilha-insta", icon: Instagram },
  { title: "Relatórios", url: "/relatorios", icon: FileBarChart },
  { title: "Campanhas", url: "/campanhas", icon: Megaphone },
  { title: "Clientes", url: "/clientes", icon: UserCircle },
  { title: "Análise de Vendas", url: "/analise-vendas", icon: BarChart3 },
  { title: "Análise de Alunos", url: "/analise-alunos", icon: Brain },
  { title: "Pagamentos", url: "/pagamentos", icon: Wallet },
  { title: "Pesquisa", url: "/pesquisa", icon: ClipboardList },
  { title: "Dashboard TV", url: "/dashboard-tv", icon: Monitor },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();

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

      <SidebarContent className="px-2 pt-0 -mt-1">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 font-semibold mb-1">
              Principal
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150"
                      activeClassName="bg-primary/10 text-primary font-semibold"
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

        {!collapsed && <Separator className="my-2 bg-border/40" />}

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 font-semibold mb-1">
              Ferramentas
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {extraItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150"
                      activeClassName="bg-primary/10 text-primary font-semibold"
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
