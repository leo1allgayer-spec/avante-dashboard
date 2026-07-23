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
import PlanilhaPage from "./pages/PlanilhaPage";
import VendasPage from "./pages/VendasPage";
import CursosDadosPage from "./pages/CursosDadosPage";
import CriativosPage from "./pages/CriativosPage";
import PlanilhaInstaPage from "./pages/PlanilhaInstaPage";
import PagamentosPage from "./pages/PagamentosPage";
import NotFound from "./pages/NotFound";

// Imports das Novas Páginas e Integrações
import { AuthProvider as GestaoAuthProvider } from "@/hooks/clients/useGestaoAuth";
import ClientsPage from "./pages/clients/ClientsPage";
import ClientTasksPage from "./pages/clients/ClientTasksPage";
import ClientSettingsPage from "./pages/clients/ClientSettingsPage";
import AdminBookingsPage from "./pages/clients/AdminBookingsPage";
import BookingPublicPage from "./pages/clients/BookingPublicPage";
import ConfirmBookingPage from "./pages/clients/ConfirmBookingPage";
import MetaPixelPage from "./pages/meta/MetaPixelPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
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
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
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
        <Route path="/planilha" element={<ProtectedRoute><PlanilhaPage /></ProtectedRoute>} />
        <Route path="/vendas" element={<ProtectedRoute><VendasPage /></ProtectedRoute>} />
        <Route path="/cursos-dados" element={<ProtectedRoute><CursosDadosPage /></ProtectedRoute>} />
        <Route path="/criativos" element={<ProtectedRoute><CriativosPage /></ProtectedRoute>} />
        <Route path="/planilha-insta" element={<ProtectedRoute><PlanilhaInstaPage /></ProtectedRoute>} />
        <Route path="/pagamentos" element={<ProtectedRoute><PagamentosPage /></ProtectedRoute>} />
        
        {/* Rotas de Gestão de Clientes (Banco ckabqsggkjebaaliyszn) */}
        <Route path="/gestao-clientes" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><ClientTasksPage /></ProtectedRoute>} />
        <Route path="/admin-settings" element={<ProtectedRoute><ClientSettingsPage /></ProtectedRoute>} />
        <Route path="/admin/agendamentos" element={<ProtectedRoute><AdminBookingsPage /></ProtectedRoute>} />
        <Route path="/agendar" element={<BookingPublicPage />} />
        <Route path="/confirmar-agendamento" element={<ConfirmBookingPage />} />
        
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
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </GestaoAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
