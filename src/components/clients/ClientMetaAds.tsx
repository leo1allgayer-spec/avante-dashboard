import { MetaReportButton } from "./MetaReportButton";
import { ClientBalanceAlert } from "./ClientBalanceAlert";
import { ClientMetaGoals } from "./ClientMetaGoals";
import type { MetaReport, GoalSnapshot } from "@/lib/clientMetaReport";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { canAccessClientWeeklyReports } from "@/lib/accessControl";

const managers = new Set([
  "digitalavante3@gmail.com",
  "nicolaspatzlaff02@gmail.com",
  "lucadsilva666@gmail.com",
  "leonardowebster.ja@gmail.com",
]);
type Account = {
  id: string;
  name: string;
  currency: string;
  account_status: number;
};
type Connection = {
  account_id: string;
  account_name: string;
  currency: string;
  timezone_name?: string;
};
type Insight = {
  spend: string;
  impressions: string;
  clicks: string;
  reach: string;
  ctr: string;
  cpc: string;
  date_start: string;
  date_stop: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
  purchase_roas?: { action_type: string; value: string }[];
};
async function request<T>(
  clientId: string,
  action: string,
  values = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("client-meta-ads", {
    body: { clientId, action, ...values },
  });
  if (error) {
    const payload = await error.context?.json?.().catch(() => null);
    throw new Error(
      payload?.error ||
        "Não foi possível acessar a integração. Tente novamente.",
    );
  }
  return data as T;
}

export function ClientMetaAds({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const { session } = useAuth();
  const canManage = managers.has((session?.user.email || "").trim().toLowerCase());
  const allowed = canManage || canAccessClientWeeklyReports(session?.user.email);
  const cache = useQueryClient();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState("");
  const [period, setPeriod] = useState("this_month");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const validRange =
    period !== "custom" ||
    (!!since &&
      !!until &&
      since <= until &&
      (Date.parse(until) - Date.parse(since)) / 86400000 < 366);
  const periodValues =
    period === "custom" ? { period, since, until } : { period };
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [goalSnapshot, setGoalSnapshot] = useState<GoalSnapshot>();
  const key = ["client-meta", session?.user.id, clientId];
  const status = useQuery({
    queryKey: [...key, "status"],
    enabled: allowed,
    queryFn: () =>
      request<{ connection: Connection | null }>(clientId, "status"),
    retry: false,
  });
  const connection = status.data?.connection;
  const metrics = useQuery({
    queryKey: [
      ...key,
      "insights",
      connection?.account_id,
      period,
      since,
      until,
    ],
    enabled: allowed && !!connection && validRange,
    queryFn: () =>
      request<{ insight: Insight | null; fetchedAt: string }>(
        clientId,
        "insights",
        periodValues,
      ),
    retry: false,
    refetchInterval: 300000,
  });
  if (!allowed) return null;
  const run = async (action: "accounts" | "connect" | "disconnect") => {
    setBusy(true);
    setMessage("");
    try {
      if (action === "accounts") {
        const result = await request<{ accounts: Account[] }>(clientId, action);
        setAccounts(result.accounts);
        setSelected("");
        if (!result.accounts.length)
          setMessage("Nenhuma conta sem vínculo disponível na autorização atual da Meta.");
      } else {
        await request(clientId, action, { accountId: selected });
        setAccounts([]);
        setSelected("");
        await cache.invalidateQueries({ queryKey: key });
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível concluir.",
      );
    } finally {
      setBusy(false);
    }
  };
  const insight = metrics.data?.insight;
  const purchaseValue = insight?.action_values?.find(
    (action) => action.action_type === "purchase",
  )?.value;
  const money = (value: string) =>
    Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: connection?.currency || "BRL",
    });
  const metricCards = insight
    ? [
        ["Investimento", money(insight.spend)],
        ["Impressões", Number(insight.impressions).toLocaleString("pt-BR")],
        ["Cliques", Number(insight.clicks).toLocaleString("pt-BR")],
        ["Alcance", Number(insight.reach).toLocaleString("pt-BR")],
        ["CTR", `${Number(insight.ctr).toLocaleString("pt-BR")}%`],
        ["Custo por clique", money(insight.cpc)],
        [
          "Compras atribuídas",
          insight.actions?.find((a) => a.action_type === "purchase")?.value ||
            "Não informado",
        ],
        [
          "Valor das compras atribuídas",
          purchaseValue != null && Number.isFinite(Number(purchaseValue))
            ? money(purchaseValue)
            : "Não informado",
        ],
        [
          "ROAS de compras",
          insight.purchase_roas?.[0]?.value
            ? `${Number(insight.purchase_roas[0].value).toFixed(2)}x`
            : "Não informado",
        ],
      ]
    : [];
  return (
    <section className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div>
        <h3 className="font-semibold">Meta Ads · {clientName}</h3>
        <p className="text-sm text-muted-foreground">
          Conecte a conta de anúncios deste cliente para consultar os resultados
          automaticamente.
        </p>
      </div>
      {status.isPending ? (
        <p>Carregando conexão…</p>
      ) : status.isError ? (
        <div role="alert">
          <p>{status.error.message}</p>
          <Button variant="outline" onClick={() => status.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          {connection && (
            <p className="text-sm text-emerald-400">
              Conta conectada: {connection.account_name} ·{" "}
              {connection.account_id} · {connection.currency}
            </p>
          )}
          {connection && <ClientBalanceAlert clientId={clientId} />}
          {canManage && <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => run("accounts")}>
              {busy
                ? "Aguarde…"
                : connection
                  ? "Trocar conta de anúncios"
                  : "Selecionar conta de anúncios"}
            </Button>
            {connection && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => run("disconnect")}
              >
                Desvincular do cliente
              </Button>
            )}
          </div>}
          {!!accounts.length && (
            <div className="space-y-2">
              <label htmlFor={`meta-account-${clientId}`} className="text-sm">
                Conta de anúncios de {clientName}
              </label>
              <select
                id={`meta-account-${clientId}`}
                className="w-full rounded-md border bg-background p-2"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">Selecione a conta correta</option>
                {accounts.map((a) => (
                  <option
                    key={a.id}
                    value={a.id}
                    disabled={a.account_status !== 1}
                  >
                    {a.name} · {a.id} · {a.currency}
                    {a.account_status !== 1 ? " (inativa)" : ""}
                  </option>
                ))}
              </select>
              <Button
                disabled={busy || !selected}
                onClick={() => run("connect")}
              >
                Vincular conta a {clientName}
              </Button>
            </div>
          )}
        </>
      )}
      {message && (
        <p role="alert" className="text-sm text-amber-400">
          {message}
        </p>
      )}
      {connection && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <label htmlFor={`meta-period-${clientId}`}>Período</label>
            <select
              id={`meta-period-${clientId}`}
              className="rounded-md border bg-background p-2"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="this_month">Este mês</option>
              <option value="last_month">Mês passado</option>
              <option value="last_7d">Últimos 7 dias</option>
              <option value="last_30d">Últimos 30 dias</option>
              <option value="custom">Período personalizado</option>
            </select>
            <Button
              variant="outline"
              disabled={metrics.isFetching || !validRange}
              onClick={() => metrics.refetch()}
            >
              Atualizar resultados
            </Button>
          </div>
          {period === "custom" && (
            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1 text-sm">
                Data inicial
                <input
                  type="date"
                  aria-label="Data inicial"
                  className="block rounded-md border bg-background p-2"
                  value={since}
                  onChange={(e) => setSince(e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                Data final
                <input
                  type="date"
                  aria-label="Data final"
                  className="block rounded-md border bg-background p-2"
                  value={until}
                  min={since || undefined}
                  onChange={(e) => setUntil(e.target.value)}
                />
              </label>
              {!validRange && (
                <p role="status" className="text-sm text-amber-400">
                  Escolha a data inicial e final, em ordem, para um período de
                  até 366 dias.
                </p>
              )}
            </div>
          )}
          {!validRange ? null : metrics.isPending ? (
            <p>Carregando resultados…</p>
          ) : metrics.isError ? (
            <p role="alert">{metrics.error.message}</p>
          ) : !insight ? (
            <p>Sem resultados disponibilizados pela Meta neste período.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {metricCards.map(([label, value]) => (
                  <div key={label} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Período: {insight.date_start} a {insight.date_stop}. Fuso da
                conta: {connection.timezone_name || "não informado"}. Compras e
                ROAS seguem a atribuição da Meta. Atualização automática a cada
                5 minutos enquanto esta aba estiver aberta.
              </p>
            </>
          )}
          {validRange && <ClientMetaGoals readOnly={!canManage} key={`${clientId}-${connection.account_id}`} clientId={clientId} accountId={connection.account_id} currency={connection.currency} request={(action, values) => request(clientId, action, values)} loadReport={() => request<MetaReport>(clientId, "report", periodValues)} periodKey={JSON.stringify(periodValues)} onSnapshot={setGoalSnapshot} />}
          {insight && validRange && (
            <MetaReportButton
              periodKey={JSON.stringify(periodValues)}
              clientId={clientId}
              clientName={clientName}
              goals={goalSnapshot}
              load={() => request<MetaReport>(clientId, "report", periodValues)}
            />
          )}
        </>
      )}
    </section>
  );
}
