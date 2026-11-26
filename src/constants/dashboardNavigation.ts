import { BarChart3, Brain, Calendar, CalendarCheck2, CalendarDays, ClipboardList, Cpu, DollarSign, GraduationCap, KanbanSquare, LayoutDashboard, Megaphone, Monitor, NotebookPen, Palette, ReceiptText, Settings, Settings2, Sheet, ShoppingCart, Target, TrendingUp, UserRoundPlus, Users2, Wallet } from "lucide-react";

export const metricsItems = [
  { title: "Visão Geral", url: "/", icon: LayoutDashboard },
  { title: "Evolução", url: "/evolucao", icon: TrendingUp },
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Faturamento", url: "/faturamento", icon: DollarSign },
  { title: "Performance", url: "/performance", icon: TrendingUp },
  { title: "Planilha", url: "/planilha", icon: Sheet },
  { title: "Vendas", url: "/vendas", icon: ShoppingCart },
  { title: "Boletos", url: "/boletos", icon: ReceiptText },
  { title: "Criativos", url: "/criativos", icon: Palette },
  { title: "Cursos Dados", url: "/cursos-dados", icon: GraduationCap },
  { title: "Disponibilidade de Cursos", url: "/agenda-cursos", icon: CalendarDays },
  { title: "Campanhas", url: "/campanhas", icon: Megaphone },
  { title: "Análise de Alunos", url: "/analise-alunos", icon: Brain },
  { title: "Alunos Futuros", url: "/alunos-futuros", icon: UserRoundPlus },
  { title: "Agenda Geral", url: "/agenda-geral", icon: CalendarDays },
  { title: "Agenda Closer", url: "/reunioes", icon: CalendarCheck2 },
  { title: "Métricas de Reuniões", url: "/metricas-reunioes", icon: TrendingUp },
  { title: "Agenda de Captação", url: "/agenda-captacao", icon: CalendarCheck2 },
  { title: "Agenda Social Media", url: "/agenda-social-media", icon: CalendarCheck2 },
  { title: "Agenda de Suporte", url: "/agenda-suporte", icon: CalendarCheck2 },
  { title: "Despesas Financeiras", url: "/despesas-financeiras", icon: Wallet },
  { title: "Pagamentos", url: "/pagamentos", icon: Wallet },
  { title: "Pesquisa", url: "/pesquisa", icon: ClipboardList },
  { title: "Dashboard TV", url: "/dashboard-tv", icon: Monitor },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export const gestaoItems = [
  { title: "Clientes", url: "/gestao-clientes", icon: Users2 },
  { title: "Agenda presencial", url: "/agenda-relatorios-presenciais", icon: CalendarDays },
  { title: "Clientes MRV", url: "/contrato-cliente", icon: ReceiptText },
  { title: "NPS dos Clientes", url: "/nps-clientes", icon: ClipboardList },
  { title: "Métricas dos Clientes", url: "/metricas-clientes", icon: BarChart3 },
  { title: "Dados dos Alunos", url: "/dados-alunos", icon: GraduationCap },
  { title: "Contratos Clientes", url: "/notas-clientes", icon: NotebookPen },
  { title: "Clientes Google Ads", url: "/clientes-google-ads", icon: Users2 },
  { title: "Gestor de Tarefas", url: "/gestor-tarefas", icon: ClipboardList },
  { title: "Agenda Curso", url: "/tasks", icon: CalendarCheck2 },
  { title: "Agendamentos", url: "/admin/agendamentos", icon: Calendar },
  { title: "Configurações", url: "/admin-settings", icon: Settings2 },
  { title: "Kanban Social Media", url: "/kanban-social-media", icon: KanbanSquare },
  { title: "Calendário Editorial", url: "/calendario-editorial", icon: CalendarDays },
  { title: "Kanban Sites", url: "/kanban-sites", icon: KanbanSquare },
  { title: "Kanban CRM", url: "/kanban-crm", icon: KanbanSquare },
  { title: "Kanban Edição Foto/Vídeo", url: "/kanban-edicao", icon: KanbanSquare },
];

export const metaItems = [
  { title: "Meta Hub", url: "/meta-pixel", icon: Cpu },
];


// Presentation only: callers supply the items already allowed for the current user.
export const navigationGroups = [
 { title: 'Visão e metas', paths: ['/', '/dashboard-tv', '/evolucao', '/metas', '/performance'] },
 { title: 'Vendas e reuniões', paths: ['/vendas', '/planilha', '/reunioes', '/metricas-reunioes'] },
 { title: 'Marketing e anúncios', paths: ['/criativos', '/campanhas', '/meta-pixel'] },
 { title: 'Financeiro', paths: ['/faturamento', '/boletos', '/despesas-financeiras', '/pagamentos'] },
 { title: 'Clientes', paths: ['/gestao-clientes', '/agenda-relatorios-presenciais', '/clientes-google-ads', '/contrato-cliente', '/notas-clientes', '/metricas-clientes', '/nps-clientes'] },
 { title: 'Cursos e alunos', paths: ['/alunos-futuros', '/tasks', '/admin/agendamentos', '/agenda-cursos', '/dados-alunos', '/cursos-dados', '/analise-alunos', '/pesquisa'] },
 { title: 'Agendas da equipe', paths: ['/agenda-geral', '/agenda-captacao', '/agenda-social-media', '/agenda-suporte'] },
 { title: 'Tarefas e entregas', paths: ['/gestor-tarefas', '/calendario-editorial', '/kanban-social-media', '/kanban-sites', '/kanban-crm', '/kanban-edicao'] },
 { title: 'Configurações', paths: ['/configuracoes', '/admin-settings'] },
];
export function groupNavigationItems<T extends {url:string;title:string}>(items: T[]) {
 const allowed = new Map(items.map(item=>[item.url,item]));
 const grouped = navigationGroups.map(group=>({title:group.title,items:group.paths.flatMap(path=>allowed.has(path)?[allowed.get(path)!]:[])})).filter(group=>group.items.length);
 const known = new Set(navigationGroups.flatMap(group=>group.paths));
 const remaining = [...allowed.values()].filter(item=>!known.has(item.url));
 if(remaining.length)grouped.push({title:'Outras ferramentas',items:remaining});
 return grouped;
}
