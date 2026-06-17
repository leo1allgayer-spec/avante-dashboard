import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Tasks from "./pages/Tasks.tsx";
import Settings from "./pages/Settings.tsx";
import BookingPublic from "./pages/BookingPublic.tsx";
import AdminBookings from "./pages/AdminBookings.tsx";
import NotFound from "./pages/NotFound.tsx";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PermissionRoute({ children, module }: { children: React.ReactNode; module: "clients" | "tasks" | "bookings" }) {
  const { myPermissions, loading } = usePermissions();
  if (loading) return <LoadingScreen />;

  if (module === "clients" && myPermissions && !myPermissions.canAccessClients) {
    return <Navigate to={myPermissions.canAccessTasks ? "/tasks" : "/settings"} replace />;
  }
  if (module === "tasks" && myPermissions && !myPermissions.canAccessTasks) {
    return <Navigate to={myPermissions.canAccessClients ? "/" : "/settings"} replace />;
  }
  if (module === "bookings" && myPermissions && !myPermissions.canAccessBookings) {
    return <Navigate to={myPermissions.canAccessClients ? "/" : myPermissions.canAccessTasks ? "/tasks" : "/settings"} replace />;
  }

  return <>{children}</>;
}
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  if (session?.user?.email !== "digitalavante3@gmail.com") {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

const AppRoutes = () => {
  const { session, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <PermissionRoute module="clients">
              <Index />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <PermissionRoute module="tasks">
              <Tasks />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Settings />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route path="/agendar" element={<BookingPublic />} />
      <Route
        path="/admin/agendamentos"
        element={
          <ProtectedRoute>
            <PermissionRoute module="bookings">
              <AdminBookings />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
