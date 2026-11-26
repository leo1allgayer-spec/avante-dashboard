import { AlertTriangle, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { useClients } from "@/hooks/clients/useGestaoClients";
import { useMeetings } from "@/hooks/clients/useMeetings";
import { getClientInPersonStatuses } from "@/lib/clientInPersonMeetings";

export function ClientInPersonAlert() {
  const meta = useClients("meta_ads");
  const google = useClients("google_ads");
  const { meetings, loading } = useMeetings();
  if (meta.loading || google.loading || loading || meta.loadError || google.loadError) return null;

  const clients = [...new Map([...meta.clients, ...google.clients].map((client) => [client.id, client])).values()];
  const overdueCount = getClientInPersonStatuses(clients, meetings).filter((item) => item.overdue).length;
  if (!overdueCount) return null;

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div>
          <p className="font-semibold">Atenção à agenda presencial</p>
          <p className="text-sm text-muted-foreground">{overdueCount} {overdueCount === 1 ? "cliente está" : "clientes estão"} sem reunião presencial registrada nos últimos 30 dias.</p>
        </div>
      </div>
      <Link to="/agenda-relatorios-presenciais" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-amber-500/40 px-3 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-500/10">
        <CalendarDays className="h-4 w-4" /> Ver e agendar reuniões
      </Link>
    </div>
  );
}
