import { NavigationFavicon } from "@/components/NavigationFavicon";
import { isSocialOperationUser, SOCIAL_OPERATION_PATHS } from "@/lib/accessControl";
import { canAccessClientContracts } from "@/lib/accessControl";
import React, { lazy, Suspense } from "react";
import { isChunkError, recoverChunk } from "@/lib/chunkRecovery";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const EvolucaoPage = lazy(() => import("./pages/EvolucaoPage"));
const MetasPage = lazy(() => import("./pages/MetasPage"));
const FaturamentoPage = lazy(() => import("./pages/FaturamentoPage"));
const ComercialPage = lazy(() => import("./pages/ComercialPage"));
const PerformancePage = lazy(() => import("./pages/PerformancePage"));
const RelatoriosPage = lazy(() => import("./pages/RelatoriosPage"));
const CampanhasPage = lazy(() => import("./pages/CampanhasPage"));
const AnaliseVendasPage = lazy(() => import("./pages/AnaliseVendasPage"));
const ClientesPage = lazy(() => import("./pages/ClientesPage"));
const ClientContractsPage = lazy(() => import("./pages/clients/ClientContractsPage"));
const ClientFeedbackPage = lazy(() => import("./pages/clients/ClientFeedbackPage"));
const ClientFeedbackPublicPage = lazy(() => import("./pages/clients/ClientFeedbackPublicPage"));
const AnaliseAlunosPage = lazy(() => import("./pages/AnaliseAlunosPage"));
const ConfiguracoesPage = lazy(() => import("./pages/ConfiguracoesPage"));
const FinancialExpensesPage = lazy(() => import("./pages/FinancialExpensesPage"));
const DashboardTVPage = lazy(() => import("./pages/DashboardTVPage"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PesquisaPage = lazy(() => import("./pages/PesquisaPage"));
const QrPage = lazy(() => import("./pages/QrPage"));
const PlanilhaPage = lazy(() => import("./pages/PlanilhaPage"));
const VendasPage = lazy(() => import("./pages/VendasPage"));
const CursosDadosPage = lazy(() => import("./pages/CursosDadosPage"));
const CriativosPage = lazy(() => import("./pages/CriativosPage"));
const PlanilhaInstaPage = lazy(() => import("./pages/PlanilhaInstaPage"));
const PagamentosPage = lazy(() => import("./pages/PagamentosPage"));
const BoletosPage = lazy(() => import("./pages/BoletosPage"));
const GoogleAdsClientsPage = lazy(() => import("./pages/clients/GoogleAdsClientsPage"));
const ClientNotesPage = lazy(() => import("./pages/clients/ClientNotesPage"));
const StudentDataPage = lazy(() => import("./pages/StudentDataPage"));
const ClientNotesPublicFormPage = lazy(() => import("./pages/clients/ClientNotesPublicFormPage"));
const ClientIntakePage = lazy(() => import("./pages/clients/ClientIntakePage"));
const FutureStudentSignupPage = lazy(() => import("./pages/FutureStudentSignupPage"));
const FutureStudentsPage = lazy(() => import("./pages/FutureStudentsPage"));
const SupportSchedulePage = lazy(() => import("./pages/SupportSchedulePage"));
const SupportBookingPublicPage = lazy(() => import("./pages/SupportBookingPublicPage"));
const SocialMediaKanbanPage = lazy(() => import("./pages/SocialMediaKanbanPage"));
const EditorialCalendarPage = lazy(() => import("./pages/EditorialCalendarPage"));
const OperationalAgendaPage = lazy(() => import("./pages/OperationalAgendaPage"));
const MeetingMetricsPage = lazy(() => import("./pages/MeetingMetricsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Imports das Novas Páginas e Integrações
import { AuthProvider as GestaoAuthProvider } from "@/hooks/clients/useGestaoAuth";
const ClientSummaryPage = lazy(() => import("./pages/clients/ClientSummaryPage"));
const ClientsPage = lazy(() => import("./pages/clients/ClientsPage"));
const ClientInPersonAgendaPage = lazy(() => import("./pages/clients/ClientInPersonAgendaPage"));
const ClientMetricsPage = lazy(() => import("./pages/clients/ClientMetricsPage"));
const ClientTasksPage = lazy(() => import("./pages/clients/ClientTasksPage"));
const TaskManagerPage = lazy(() => import("./pages/clients/TaskManagerPage"));
const ClientSettingsPage = lazy(() => import("./pages/clients/ClientSettingsPage"));
const AdminBookingsPage = lazy(() => import("./pages/clients/AdminBookingsPage"));
const BookingPublicPage = lazy(() => import("./pages/clients/BookingPublicPage"));
const ConfirmBookingPage = lazy(() => import("./pages/clients/ConfirmBookingPage"));
const ConfirmReschedulePage = lazy(() => import("./pages/clients/ConfirmReschedulePage"));
const MetaPixelPage = lazy(() => import("./pages/meta/MetaPixelPage"));
import { GOOGLE_TASKS_ONLY_PATH, isGoogleManagerPath, isGoogleTasksOnlyUser, isClientSummaryUser, isClientProfileEditor, canAccessSupportSchedule, hasFullClientManagementAccess } from "@/lib/accessControl";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    if (isChunkError(error)) recoverChunk();
  }

  override render() {
    if (this.state.hasError) {
      const chunkError = !!this.state.error && isChunkError(this.state.error);
      const isDomMutationError = this.state.error?.message.includes("removeChild") ||
        this.state.error?.message.includes("not a child of this node");
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-2xl w-full rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-foreground">
            <h1 className="text-xl font-bold text-destructive mb-2">Erro ao carregar o dashboard</h1>
            <p className="text-sm text-muted-foreground mb-4">
              {chunkError ? "Não foi possível baixar um arquivo da tela. Isso pode ocorrer durante uma atualização ou por uma falha temporária de conexão. Tente carregar a versão atual novamente." : "A aplicação encontrou um erro. Os detalhes abaixo ajudam a identificar a causa."}
            </p>
            <pre className="whitespace-pre-wrap text-xs rounded-xl bg-black/40 p-4 overflow-auto">
              {this.state.error?.message || "Erro desconhecido"}
            </pre>
            {isDomMutationError && (
              <p className="mt-4 text-sm text-muted-foreground">
                Desative a traducao automatica do navegador antes de tentar novamente.
              </p>
            )}
            <button
              type="button"
              onClick={() => { if (!chunkError || !recoverChunk(window, true)) window.location.reload(); }}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              {chunkError ? "Tentar novamente" : "Recarregar página"}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" replace />;
  if (isSocialOperationUser(session.user.email) && !SOCIAL_OPERATION_PATHS.has(location.pathname)) return <Navigate to="/agenda-geral" replace />;
  if (location.pathname === "/contrato-cliente" && !canAccessClientContracts(session.user.email)) return <Navigate to="/gestao-clientes" replace />;
  if (location.pathname === "/despesas-financeiras" && !canAccessClientContracts(session.user.email)) return <Navigate to="/" replace />;
  if (location.pathname === "/nps-clientes" && !canAccessClientContracts(session.user.email)) return <Navigate to="/gestao-clientes" replace />;
  if (isClientSummaryUser(session.user)) {
    if (location.pathname === "/gestao-clientes") return isClientProfileEditor(session.user) || hasFullClientManagementAccess(session.user.email) ? <ClientsPage /> : <ClientSummaryPage />;
    if (location.pathname !== "/agenda-geral" && location.pathname !== "/agenda-relatorios-presenciais" && location.pathname !== "/gestor-tarefas" && !(canAccessSupportSchedule(session.user) && location.pathname === "/agenda-suporte")) return <Navigate to="/gestao-clientes" replace />;
  }
  if (isGoogleTasksOnlyUser(session.user.email) && !isGoogleManagerPath(location.pathname)) {
    return <Navigate to={GOOGLE_TASKS_ONLY_PATH} replace />;
  }
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) {
    return <Navigate to={isSocialOperationUser(session.user.email) ? "/agenda-geral" : isClientSummaryUser(session.user) ? "/gestao-clientes" : isGoogleTasksOnlyUser(session.user.email) ? GOOGLE_TASKS_ONLY_PATH : "/"} replace />;
  }
  return <>{children}</>;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  useSmoothScroll();

  return (
    <Suspense fallback={<div role="status" className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Carregando página...</div>}>
      <Routes location={location}>
        {/* Rotas de Métricas (Banco yhyuwmrwhnyxyyztzvqw) */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/evolucao" element={<ProtectedRoute><EvolucaoPage /></ProtectedRoute>} />
        <Route path="/metas" element={<ProtectedRoute><MetasPage /></ProtectedRoute>} />
        <Route path="/faturamento" element={<ProtectedRoute><FaturamentoPage /></ProtectedRoute>} />
        <Route path="/comercial" element={<ProtectedRoute><ComercialPage /></ProtectedRoute>} />
        <Route path="/performance" element={<ProtectedRoute><PerformancePage /></ProtectedRoute>} />
        <Route path="/relatorios" element={<ProtectedRoute><RelatoriosPage /></ProtectedRoute>} />
        <Route path="/campanhas" element={<ProtectedRoute><CampanhasPage /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute><ClientesPage /></ProtectedRoute>} />
        <Route path="/analise-vendas" element={<ProtectedRoute><AnaliseVendasPage /></ProtectedRoute>} />
        <Route path="/analise-alunos" element={<ProtectedRoute><AnaliseAlunosPage /></ProtectedRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute><ConfiguracoesPage /></ProtectedRoute>} />
        <Route path="/dashboard-tv" element={<ProtectedRoute><DashboardTVPage /></ProtectedRoute>} />
        <Route path="/pesquisa" element={<PesquisaPage />} />
        <Route path="/qr" element={<QrPage />} />
        <Route path="/planilha" element={<ProtectedRoute><PlanilhaPage /></ProtectedRoute>} />
        <Route path="/vendas" element={<ProtectedRoute><VendasPage /></ProtectedRoute>} />
        <Route path="/fechamentos" element={<Navigate to="/vendas" replace />} />
        <Route path="/cursos-dados" element={<ProtectedRoute><CursosDadosPage /></ProtectedRoute>} />
        <Route path="/criativos" element={<ProtectedRoute><CriativosPage /></ProtectedRoute>} />
        <Route path="/planilha-insta" element={<ProtectedRoute><PlanilhaInstaPage /></ProtectedRoute>} />
        <Route path="/despesas-financeiras" element={<ProtectedRoute><FinancialExpensesPage /></ProtectedRoute>} />
        <Route path="/pagamentos" element={<ProtectedRoute><PagamentosPage /></ProtectedRoute>} />
        <Route path="/boletos" element={<ProtectedRoute><BoletosPage /></ProtectedRoute>} />
        <Route path="/alunos-futuros" element={<ProtectedRoute><FutureStudentsPage /></ProtectedRoute>} />
        <Route path="/aluno-futuro" element={<FutureStudentSignupPage />} />
        <Route path="/agenda-suporte" element={<ProtectedRoute><SupportSchedulePage /></ProtectedRoute>} />
        <Route path="/kanban-social-media" element={<ProtectedRoute><SocialMediaKanbanPage /></ProtectedRoute>} />
        <Route path="/calendario-editorial" element={<ProtectedRoute><EditorialCalendarPage /></ProtectedRoute>} />
        <Route path="/kanban-sites" element={<ProtectedRoute><SocialMediaKanbanPage boardType="sites" /></ProtectedRoute>} />
        <Route path="/kanban-crm" element={<ProtectedRoute><SocialMediaKanbanPage boardType="crm" /></ProtectedRoute>} />
        <Route path="/kanban-edicao" element={<ProtectedRoute><SocialMediaKanbanPage boardType="video_photo" /></ProtectedRoute>} />
        <Route path="/agendar-suporte" element={<SupportBookingPublicPage />} />
        
        {/* Rotas de Gestão de Clientes (Banco ckabqsggkjebaaliyszn) */}
        <Route path="/gestao-clientes" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
        <Route path="/agenda-relatorios-presenciais" element={<ProtectedRoute><ClientInPersonAgendaPage /></ProtectedRoute>} />
        <Route path="/contrato-cliente" element={<ProtectedRoute><ClientContractsPage /></ProtectedRoute>} />
        <Route path="/metricas-clientes" element={<ProtectedRoute><ClientMetricsPage /></ProtectedRoute>} />
        <Route path="/nps-clientes" element={<ProtectedRoute><ClientFeedbackPage /></ProtectedRoute>} />
        <Route path="/feedback-cliente/:token" element={<ClientFeedbackPublicPage />} />
        <Route path="/dados-alunos" element={<ProtectedRoute><StudentDataPage /></ProtectedRoute>} />
        <Route path="/notas-clientes" element={<ProtectedRoute><ClientNotesPage /></ProtectedRoute>} />
        <Route path="/cadastro-notas-cliente" element={<ClientNotesPublicFormPage />} />
        <Route path="/clientes-google-ads" element={<ProtectedRoute><GoogleAdsClientsPage /></ProtectedRoute>} />
        <Route path="/cadastro-cliente/:token" element={<ClientIntakePage />} />
        <Route path="/tasks" element={<ProtectedRoute><ClientTasksPage /></ProtectedRoute>} />
        <Route path="/gestor-tarefas" element={<ProtectedRoute><TaskManagerPage /></ProtectedRoute>} />
        <Route path="/reunioes" element={<ProtectedRoute><ClientTasksPage /></ProtectedRoute>} />
        <Route path="/metricas-reunioes" element={<ProtectedRoute><MeetingMetricsPage /></ProtectedRoute>} />
        <Route path="/agenda-geral" element={<ProtectedRoute><OperationalAgendaPage category="all" /></ProtectedRoute>} />
        <Route path="/agenda-captacao" element={<ProtectedRoute><OperationalAgendaPage category="captacao" /></ProtectedRoute>} />
        <Route path="/agenda-social-media" element={<ProtectedRoute><OperationalAgendaPage category="social_media" /></ProtectedRoute>} />
        <Route path="/admin-settings" element={<ProtectedRoute><ClientSettingsPage /></ProtectedRoute>} />
        <Route path="/admin/agendamentos" element={<ProtectedRoute><AdminBookingsPage /></ProtectedRoute>} />
        <Route path="/agenda-cursos" element={<ProtectedRoute><BookingPublicPage internalMode /></ProtectedRoute>} />
        <Route path="/agendar" element={<BookingPublicPage />} />
        <Route path="/agendar/:courseSlug" element={<BookingPublicPage />} />
        <Route path="/confirmar-agendamento" element={<ConfirmBookingPage />} />
        <Route path="/confirmar-remarcacao" element={<ConfirmReschedulePage />} />
        
        {/* Rota do Meta Pixel & CAPI Dashboard */}
        <Route path="/meta-pixel" element={<ProtectedRoute><MetaPixelPage /></ProtectedRoute>} />

        <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <GestaoAuthProvider>
        <AppErrorBoundary>
          <BrowserRouter>
            <NavigationFavicon />
            <AnimatedRoutes />
          </BrowserRouter>
        </AppErrorBoundary>
      </GestaoAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

