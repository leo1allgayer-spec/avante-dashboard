import DashboardLayout from "@/components/DashboardLayout";
import { ClientTable } from "@/components/clients/ClientTable";
import { useClients } from "@/hooks/clients/useGestaoClients";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { AddClientDialog } from "@/components/clients/AddClientDialog";
import { useAuth } from "@/hooks/clients/useGestaoAuth";

export default function ClientSummaryPage() {
  const { clients, loading, updateClient, addClient } = useClients();
  const { session } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  return <DashboardLayout title="Gestão de Clientes" subtitle={`${clients.filter(client => client.status === "Ativo").length} ativos`} contentClassName="max-w-[1720px]">
    <div className="space-y-8">{(["Ativo", "Pausado"] as const).map(status => <ClientTable key={status}
      clients={clients} onClientClick={() => {}} onUpdateClient={updateClient} onDeleteClient={() => {}} onAddClient={() => setShowAdd(true)}
      summaryOnly allowAddClient={session?.user.email?.trim().toLowerCase() === "emanoelbull@gmail.com"} onlyStatus={status} title={status === "Ativo" ? "Clientes Ativos" : "Clientes Pausados"} />)}</div>
    <AddClientDialog open={showAdd} onClose={() => setShowAdd(false)} onAdd={addClient} summaryOnly title="Novo cliente" submitLabel="Adicionar cliente" />
  </DashboardLayout>;
}
