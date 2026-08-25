import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";
import Dashboard from "./pages/Dashboard";
import MetasPage from "./pages/MetasPage";
import FaturamentoPage from "./pages/FaturamentoPage";
import ComercialPage from "./pages/ComercialPage";
import PerformancePage from "./pages/PerformancePage";
import RelatoriosPage from "./pages/RelatoriosPage";
import CampanhasPage from "./pages/CampanhasPage";
import AnaliseVendasPage from "./pages/AnaliseVendasPage";
import ClientesPage from "./pages/ClientesPage";
import AnaliseAlunosPage from "./pages/AnaliseAlunosPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import DashboardTVPage from "./pages/DashboardTVPage";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import PesquisaPage from "./pages/PesquisaPage";
import QrPage from "./pages/QrPage";
import PlanilhaPage from "./pages/PlanilhaPage";
import VendasPage from "./pages/VendasPage";
import CursosDadosPage from "./pages/CursosDadosPage";
import CriativosPage from "./pages/CriativosPage";
import PlanilhaInstaPage from "./pages/PlanilhaInstaPage";
import PagamentosPage from "./pages/PagamentosPage";
import BoletosPage from "./pages/BoletosPage";
import GoogleAdsClientsPage from "./pages/clients/GoogleAdsClientsPage";
import ClientIntakePage from "./pages/clients/ClientIntakePage";
import FutureStudentSignupPage from "./pages/FutureStudentSignupPage";
import FutureStudentsPage from "./pages/FutureStudentsPage";
import SupportSchedulePage from "./pages/SupportSchedulePage";
import SupportBookingPublicPage from "./pages/SupportBookingPublicPage";
import SocialMediaKanbanPage from "./pages/SocialMediaKanbanPage";
import NotFound from "./pages/NotFound";

// Imports das Novas Páginas e Integrações
import { AuthProvider as GestaoAuthProvider } from "@/hooks/clients/useGestaoAuth";
import ClientsPage from "./pages/clients/ClientsPage";
import ClientTasksPage from "./pages/clients/ClientTasksPage";
import ClientSettingsPage from "./pages/clients/ClientSettingsPage";
import AdminBookingsPage from "./pages/clients/AdminBookingsPage";
import BookingPublicPage from "./pages/clients/BookingPublicPage";
import ConfirmBookingPage from "./pages/clients/ConfirmBookingPage";
import ConfirmReschedulePage from "./pages/clients/ConfirmReschedulePage";
import MetaPixelPage from "./pages/meta/MetaPixelPage";
import { GOOGLE_TASKS_ONLY_PATH, isGoogleManagerPath, isGoogleTasksOnlyUser } from "@/lib/accessControl";

const queryClient = new QueryClient();

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

  override render() {
    if (this.state.hasError) {
      const isDomMutationError = this.state.error?.message.includes("removeChild") ||
        this.state.error?.message.includes("not a child of this node");
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-2xl w-full rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-foreground">
            <h1 className="text-xl font-bold text-destructive mb-2">Erro ao carregar o dashboard</h1>
            <p className="text-sm text-muted-foreground mb-4">
              A aplicação encontrou um erro em runtime. A mensagem abaixo ajuda a identificar a tela que está quebrando.
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
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Recarregar pagina
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
  if (isGoogleTasksOnlyUser(session.user.email) && !isGoogleManagerPath(location.pathname)) {
    return <Navigate to={GOOGLE_TASKS_ONLY_PATH} replace />;
  }
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) {
    return <Navigate to={isGoogleTasksOnlyUser(session.user.email) ? GOOGLE_TASKS_ONLY_PATH : "/"} replace />;
  }
  return <>{children}</>;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  useSmoothScroll();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Rotas de Métricas (Banco yhyuwmrwhnyxyyztzvqw) */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
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
        <Route path="/pagamentos" element={<ProtectedRoute><PagamentosPage /></ProtectedRoute>} />
        <Route path="/boletos" element={<ProtectedRoute><BoletosPage /></ProtectedRoute>} />
        <Route path="/alunos-futuros" element={<ProtectedRoute><FutureStudentsPage /></ProtectedRoute>} />
        <Route path="/aluno-futuro" element={<FutureStudentSignupPage />} />
        <Route path="/agenda-suporte" element={<ProtectedRoute><SupportSchedulePage /></ProtectedRoute>} />
        <Route path="/kanban-social-media" element={<ProtectedRoute><SocialMediaKanbanPage /></ProtectedRoute>} />
        <Route path="/kanban-sites" element={<ProtectedRoute><SocialMediaKanbanPage boardType="sites" /></ProtectedRoute>} />
        <Route path="/kanban-crm" element={<ProtectedRoute><SocialMediaKanbanPage boardType="crm" /></ProtectedRoute>} />
        <Route path="/agendar-suporte" element={<SupportBookingPublicPage />} />
        
        {/* Rotas de Gestão de Clientes (Banco ckabqsggkjebaaliyszn) */}
        <Route path="/gestao-clientes" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
        <Route path="/clientes-google-ads" element={<ProtectedRoute><GoogleAdsClientsPage /></ProtectedRoute>} />
        <Route path="/cadastro-cliente/:token" element={<ClientIntakePage />} />
        <Route path="/tasks" element={<ProtectedRoute><ClientTasksPage /></ProtectedRoute>} />
        <Route path="/admin-settings" element={<ProtectedRoute><ClientSettingsPage /></ProtectedRoute>} />
        <Route path="/admin/agendamentos" element={<ProtectedRoute><AdminBookingsPage /></ProtectedRoute>} />
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
    </AnimatePresence>
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
            <AnimatedRoutes />
          </BrowserRouter>
        </AppErrorBoundary>
      </GestaoAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
