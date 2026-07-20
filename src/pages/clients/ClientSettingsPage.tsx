import { usePermissions, UserPermission } from "@/hooks/clients/useGestaoPermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/clients/useGestaoAuth";
import { useAuth as useMainAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const Settings = () => {
  const { session } = useAuth();
  const { permissions, loading, updatePermission } = usePermissions();

  const handleToggle = (perm: UserPermission, field: "canAccessClients" | "canAccessTasks" | "canAccessBookings") => {
    updatePermission({ ...perm, [field]: !perm[field] });
  };

  const { signOut: signOutMain } = useMainAuth();

  if (!session && !loading) {
    signOutMain();
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Configurações Operacionais"
      subtitle="Gerencie o nível de acesso e as permissões dos usuários do sistema"
    >
      <div className="max-w-[800px] mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Permissões de Acesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {permissions.length === 0 && (
              <p className="text-muted-foreground text-sm">Nenhum usuário encontrado.</p>
            )}
            {permissions.map((perm) => (
              <div
                key={perm.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border border-border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{perm.email || "Sem email"}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`clients-${perm.id}`}
                      checked={perm.canAccessClients}
                      onCheckedChange={() => handleToggle(perm, "canAccessClients")}
                    />
                    <Label htmlFor={`clients-${perm.id}`} className="text-sm whitespace-nowrap">
                      Clientes
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`tasks-${perm.id}`}
                      checked={perm.canAccessTasks}
                      onCheckedChange={() => handleToggle(perm, "canAccessTasks")}
                    />
                    <Label htmlFor={`tasks-${perm.id}`} className="text-sm whitespace-nowrap">
                      Tarefas
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`bookings-${perm.id}`}
                      checked={perm.canAccessBookings}
                      onCheckedChange={() => handleToggle(perm, "canAccessBookings")}
                    />
                    <Label htmlFor={`bookings-${perm.id}`} className="text-sm whitespace-nowrap">
                      Agendamentos
                    </Label>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
