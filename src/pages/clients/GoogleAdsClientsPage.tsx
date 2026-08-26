import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { ClientTable } from "@/components/clients/ClientTable";
import { ClientDetail } from "@/components/clients/ClientDetail";
import { AddClientDialog } from "@/components/clients/AddClientDialog";
import { useClients } from "@/hooks/clients/useGestaoClients";

export default function GoogleAdsClientsPage() {
  const { clients, loading, addClient, updateClient, deleteClient } = useClients("google_ads");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const normalizedManagers = useRef(new Set<string>());
  const googleManagers = ["Henrique"] as const;
  const selectedClient = clients.find((client) => client.id === selectedId);

  useEffect(() => {
    clients.forEach((client) => {
      if (client.manager !== "Henrique" && !normalizedManagers.current.has(client.id)) {
        normalizedManagers.current.add(client.id);
        void updateClient({ ...client, manager: "Henrique" });
      }
    });
  }, [clients, updateClient]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleDelete = (id: string) => {
    void deleteClient(id);
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <DashboardLayout
      title="Clientes Google Ads"
      subtitle={`${clients.filter((client) => client.status === "Ativo").length} ativos · sem valores de contrato`}
      contentClassName="max-w-[1720px]"
    >
      {selectedClient ? (
        <ClientDetail client={selectedClient} onBack={() => setSelectedId(null)} onUpdate={updateClient} hideContractValues managerOptions={googleManagers} />
      ) : (
        <div className="space-y-8">
          <ClientTable clients={clients} onClientClick={setSelectedId} onUpdateClient={updateClient} onDeleteClient={handleDelete} onAddClient={() => setShowAdd(true)} onlyStatus="Ativo" title="Clientes Google Ads ativos" hideContractValues managerOptions={googleManagers} />
          <ClientTable clients={clients} onClientClick={setSelectedId} onUpdateClient={updateClient} onDeleteClient={handleDelete} onAddClient={() => setShowAdd(true)} onlyStatus="Pausado" title="Clientes Google Ads pausados" hideContractValues managerOptions={googleManagers} />
        </div>
      )}
      <AddClientDialog open={showAdd} onClose={() => setShowAdd(false)} onAdd={addClient} hideContractValues managerOptions={googleManagers} />
    </DashboardLayout>
  );
}
