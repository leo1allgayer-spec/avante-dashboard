import { metricsItems, gestaoItems, metaItems, groupNavigationItems } from "@/constants/dashboardNavigation";
import { isSocialOperationUser, SOCIAL_OPERATION_PATHS } from "@/lib/accessControl";
import {
  ChevronDown,
  Star,
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
  BarChart3,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useEffect, useState } from "react";
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
  SidebarMenuAction,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { isGoogleTasksOnlyUser, isClientSummaryUser, canAccessSupportSchedule, canAccessClientContracts } from "@/lib/accessControl";

export function AppSidebar() {
  const [closedGroups, setClosedGroups] = useState<Set<string>>(() => new Set());
  const [menuSearch, setMenuSearch] = useState("");
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { session, signOut } = useAuth();
  const favoritesKey = session?.user.id ? `avante:menu-favorites:${session.user.id}` : '';
  const [savedFavorites, setSavedFavorites] = useState<{ key: string; urls: string[] }>({ key: '', urls: [] });
  useEffect(() => {
    let urls: string[] = [];
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
      if (Array.isArray(stored)) urls = [...new Set(stored.filter((url): url is string => typeof url === 'string'))];
    } catch { /* Keep the menu available when browser storage is unavailable. */ }
    setSavedFavorites({ key: favoritesKey, urls });
  }, [favoritesKey]);
  const favorites = savedFavorites.key === favoritesKey ? savedFavorites.urls : [];
  const toggleFavorite = (url: string) => {
    if (!favoritesKey) return;
    const urls = favorites.includes(url) ? favorites.filter(item => item !== url) : [...favorites, url];
    setSavedFavorites({ key: favoritesKey, urls });
    try { localStorage.setItem(favoritesKey, JSON.stringify(urls)); } catch { /* Session preference still works. */ }
  };
  const socialOnly = isSocialOperationUser(session?.user.email);
  const summaryOnly = isClientSummaryUser(session?.user);
  const googleTasksOnly = isGoogleTasksOnlyUser(session?.user?.email) || summaryOnly;

  const visibleGestaoItems = socialOnly ? [...metricsItems, ...gestaoItems].filter(item => SOCIAL_OPERATION_PATHS.has(item.url)) : summaryOnly ? [...gestaoItems.filter(item => item.url === "/gestao-clientes" || item.url === "/gestor-tarefas"), { title: "Agenda Geral", url: "/agenda-geral", icon: CalendarDays }, ...(canAccessSupportSchedule(session?.user) ? [{ title: "Agenda de Suporte", url: "/agenda-suporte", icon: CalendarCheck2 }] : [])] : googleTasksOnly
    ? [
        { title: "Cursos Google e Meta Ads", url: "/tasks", icon: GraduationCap },
        { title: "Clientes Google Ads", url: "/clientes-google-ads", icon: Users2 },
        { title: "Dias disponíveis", url: "/admin/agendamentos", icon: Calendar },
      ]
    : gestaoItems.filter(item => !["/contrato-cliente","/nps-clientes"].includes(item.url) || canAccessClientContracts(session?.user?.email));

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

  const filteredMetricsItems = filterItems(socialOnly ? [] : metricsItems).filter(item => item.url !== "/despesas-financeiras" || canAccessClientContracts(session?.user?.email));
  const filteredGestaoItems = filterItems(visibleGestaoItems);
  const filteredMetaItems = filterItems(socialOnly ? [] : metaItems);
  const regularGroups = groupNavigationItems(googleTasksOnly ? filteredGestaoItems : [...filteredMetricsItems, ...filteredGestaoItems, ...filteredMetaItems]);
  const favoriteItems = regularGroups.flatMap(group => group.items).filter(item => favorites.includes(item.url));
  const groups = [
    ...(favoriteItems.length ? [{ title: 'Favoritos', items: favoriteItems }] : []),
    ...regularGroups.map(group => ({ ...group, items: group.items.filter(item => !favorites.includes(item.url)) })).filter(group => group.items.length),
  ];
  const hasSearchResults = groups.length > 0;
  const toggleGroup = (title: string) => setClosedGroups(previous => {
    const next = new Set(previous); if (next.has(title)) next.delete(title); else next.add(title); return next;
  });
  return <Sidebar collapsible="icon" className="border-r border-border/40">
    <SidebarHeader className="p-2 pb-0"><div className="flex items-center justify-center overflow-hidden">
      <img src={collapsed ? logoIcon : logoFull} alt="Avante Digital" className={collapsed ? 'h-8 w-8 object-contain' : 'h-24 object-contain'} />
    </div></SidebarHeader>
    {!collapsed && <div className="relative px-3 pb-2">
      <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-[calc(50%+4px)] text-muted-foreground/60" />
      <Input type="search" value={menuSearch} onChange={event=>setMenuSearch(event.target.value)} placeholder="Buscar uma aba..." aria-label="Buscar uma aba no menu" className="h-9 border-border/60 bg-secondary/30 pl-9 text-sm" />
    </div>}
    <SidebarContent className="px-2 pt-0 -mt-1" data-lenis-prevent>
        {groups.map(group => {
          const open = collapsed || !!normalizedSearch || !closedGroups.has(group.title);
          return <SidebarGroup key={group.title} className="py-2">
            {!collapsed && <SidebarGroupLabel asChild className="mb-1 h-8 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <button type="button" className="flex w-full items-center justify-between hover:text-foreground" aria-expanded={open} onClick={() => toggleGroup(group.title)}>
                {group.title}<ChevronDown className={open ? 'h-3.5 w-3.5 transition-transform' : 'h-3.5 w-3.5 -rotate-90 transition-transform'} />
              </button>
            </SidebarGroupLabel>}
            {open && <SidebarGroupContent><SidebarMenu>
              {group.items.map(item => {
                const title = item.url === '/admin-settings' ? 'Configurações operacionais' : item.url === '/configuracoes' ? 'Configurações gerais' : item.title;
                return <SidebarMenuItem key={item.url}><SidebarMenuButton asChild tooltip={title}>
                  <NavLink to={item.url} end className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150" activeClassName="bg-gradient-to-r from-primary/15 to-accent/5 border border-primary/20 text-primary font-semibold shadow-inner">
                    <item.icon className="h-[18px] w-[18px] shrink-0" />{!collapsed && <span className="min-w-0 truncate pr-5">{title}</span>}
                  </NavLink>
                </SidebarMenuButton>{!collapsed && <SidebarMenuAction type="button" onClick={() => toggleFavorite(item.url)} aria-label={`${favorites.includes(item.url) ? 'Remover' : 'Adicionar'} ${title} ${favorites.includes(item.url) ? 'dos' : 'aos'} favoritos`} aria-pressed={favorites.includes(item.url)} title={favorites.includes(item.url) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} className={favorites.includes(item.url) ? 'text-amber-400 hover:text-amber-300' : 'text-muted-foreground/60 hover:text-amber-400'}><Star className={favorites.includes(item.url) ? 'fill-current' : ''} /></SidebarMenuAction>}</SidebarMenuItem>;
              })}

            </SidebarMenu></SidebarGroupContent>}
          </SidebarGroup>;
        })}
      {!collapsed && normalizedSearch && !hasSearchResults && <p className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhuma aba encontrada.</p>}
    </SidebarContent>
    <SidebarFooter className="p-3"><Button variant="ghost" size={collapsed ? 'icon' : 'default'} onClick={signOut} className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-[13px]">
      <LogOut className="h-4 w-4 shrink-0" />{!collapsed && <span>Sair</span>}
    </Button></SidebarFooter>
  </Sidebar>;
}

