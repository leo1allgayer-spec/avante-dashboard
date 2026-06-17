import { useState } from "react";
import { Client } from "@/types/client";
import { ClientTable } from "@/components/ClientTable";
import { ClientDetail } from "@/components/ClientDetail";
import { AddClientDialog } from "@/components/AddClientDialog";
import { Users, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useClients } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  const { session, signOut } = useAuth();
  const { clients, loading, addClient, updateClient, deleteClient } = useClients();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const selectedClient = clients.find((c) => c.id === selectedId);

  const handleDelete = (id: string) => {
    deleteClient(id);
    if (selectedId === id) setSelectedId(null);
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
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Gestão de Clientes</h1>
          <span className="text-sm text-muted-foreground ml-2">
            {clients.filter((c) => c.status === "Ativo").length} ativos
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/tasks">Tarefas</Link>
          </Button>
          {session?.user?.email === "digitalavante3@gmail.com" && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings">Configurações</Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
            <LogOut className="h-4 w-4 mr-1" />
            Sair
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-[1600px] mx-auto">
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
      </main>

      <AddClientDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={addClient}
      />
    </div>
  );
};

export default Index;
