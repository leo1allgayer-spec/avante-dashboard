import { useState } from "react";
import { Client } from "@/types/clients/client";
import { ClientTable } from "@/components/clients/ClientTable";
import { ClientDetail } from "@/components/clients/ClientDetail";
import { AddClientDialog } from "@/components/clients/AddClientDialog";
import { Users, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/clients/useGestaoAuth";
import { useClients } from "@/hooks/clients/useGestaoClients";
import { Button } from "@/components/ui/button";
import { Link, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth as useMainAuth } from "@/hooks/useAuth";

const Index = () => {
  const { session } = useAuth();
  const { clients, loading, addClient, updateClient, deleteClient } = useClients();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const { signOut: signOutMain } = useMainAuth();

  const selectedClient = clients.find((c) => c.id === selectedId);

  const handleDelete = (id: string) => {
    deleteClient(id);
    if (selectedId === id) setSelectedId(null);
  };

  if (!session && !loading) {
    signOutMain();
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Gestão de Clientes"
      subtitle={`${clients.filter((c) => c.status === "Ativo").length} ativos`}
      actions={
        <div className="flex items-center gap-2">
          {session?.user?.email === "digitalavante3@gmail.com" && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin-settings">Configurações</Link>
            </Button>
          )}
        </div>
      }
    >
      {selectedClient ? (
        <ClientDetail
          client={selectedClient}
          onBack={() => setSelectedId(null)}
          onUpdate={updateClient}
        />
      ) : (
        <div className="space-y-8">
          <ClientTable
            clients={clients}
            onClientClick={setSelectedId}
            onUpdateClient={updateClient}
            onDeleteClient={handleDelete}
            onAddClient={() => setShowAdd(true)}
            onlyStatus="Ativo"
            title="Clientes Ativos"
          />
          <ClientTable
            clients={clients}
            onClientClick={setSelectedId}
            onUpdateClient={updateClient}
            onDeleteClient={handleDelete}
            onAddClient={() => setShowAdd(true)}
            onlyStatus="Pausado"
            title="Clientes Pausados"
          />
        </div>
      )}

      <AddClientDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={addClient}
      />
    </DashboardLayout>
  );
};

export default Index;
