import { useAuth } from "@/hooks/useAuth";
import { usePermissions, UserPermission } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, LogOut, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Settings = () => {
  const { signOut } = useAuth();
  const { permissions, loading, updatePermission } = usePermissions();

  const handleToggle = (perm: UserPermission, field: "canAccessClients" | "canAccessTasks" | "canAccessBookings") => {
    updatePermission({ ...perm, [field]: !perm[field] });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Configurações</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
            <LogOut className="h-4 w-4 mr-1" /> Sair
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-[800px] mx-auto space-y-6">
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
      </main>
    </div>
  );
};

export default Settings;
