import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const managers = new Set(["digitalavante3@gmail.com", "nicolaspatzlaff02@gmail.com", "lucadsilva666@gmail.com", "leonardowebster.ja@gmail.com"]);
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
class RequestError extends Error { constructor(message: string, public status = 400) { super(message); } }
type Account = { id: string; name: string; currency: string; timezone_name?: string; account_status: number };

function whatsappChannel(channel: string) {
  const prefix = channel === "backup" ? "EVOLUTION_BACKUP_" : "EVOLUTION_";
  const url = Deno.env.get(prefix + "API_URL")?.trim().replace(/\/+$/, "").replace(/\/manager$/i, "");
  const instance = Deno.env.get(prefix + "INSTANCE_NAME"), token = Deno.env.get(prefix + "API_TOKEN");
  if (!url || !instance || !token) throw new RequestError("Canal WhatsApp não configurado.", 503);
  return { url, instance, token };
}
async function whatsappRequest(channel: string, path: string, body?: object) {
  const config = whatsappChannel(channel);
  let instance = config.instance;
  let state = await fetch(`${config.url}/instance/connectionState/${encodeURIComponent(instance)}`, { headers: { apikey: config.token }, signal: AbortSignal.timeout(8000) });
  if (state.status === 404) {
    const response = await fetch(`${config.url}/instance/fetchInstances`, { headers: { apikey: config.token }, signal: AbortSignal.timeout(8000) });
    const instances = await response.json();
    const match = Array.isArray(instances) && instances.find(value => [value.name, value.profileName, value.instance?.instanceName].some(name => String(name || "").toLowerCase() === instance.toLowerCase()));
    if (!response.ok || !match) throw new RequestError("Instância WhatsApp não encontrada.", 503);
    instance = match.name || match.instance.instanceName;
    state = await fetch(`${config.url}/instance/connectionState/${encodeURIComponent(instance)}`, { headers: { apikey: config.token }, signal: AbortSignal.timeout(8000) });
  }
  const connection = await state.json();
  if (!state.ok || String(connection?.instance?.state ?? connection?.state ?? "").toLowerCase() !== "open") throw new RequestError("Canal WhatsApp desconectado.", 503);
  const response = await fetch(`${config.url}/${path}/${encodeURIComponent(instance)}${body ? "" : "?getParticipants=false"}`, {
    method: body ? "POST" : "GET", headers: { apikey: config.token, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok || data?.error) throw new RequestError("Não foi possível acessar o grupo no WhatsApp.", 502);
  return data;
}
async function monitorBalances(db: any, balances: Record<string, any>) {
  const { data: destination, error: destinationError } = await db.from("meta_balance_alert_destination").select("*").eq("id", true).maybeSingle();
  if (destinationError || !destination) throw new RequestError("Grupo dos avisos ainda não configurado.", 503);
  const [{ data: clients, error: clientsError }, { data: settings, error: settingsError }] = await Promise.all([
    db.from("gestao_clients").select("id,name,status"), db.from("client_meta_balance_alerts").select("*"),
  ]);
  if (clientsError || settingsError) throw new Error("alert configuration lookup");
  let sent = 0, failed = 0;
  for (const client of clients || []) {
    const balance = balances[client.id];
    const setting = (settings || []).find((row: any) => row.client_id === client.id) || { threshold: 50, enabled: true };
    if (client.status !== "Ativo" || !setting.enabled || balance?.status !== "available" || balance.currency !== "BRL" || !Number.isFinite(balance.available)) continue;
    const { data: episode, error } = await db.rpc("claim_meta_balance_episode", { p_client: client.id, p_account: balance.accountId, p_available: balance.available, p_threshold: Number(setting.threshold) });
    if (error) { failed++; continue; }
    if (!episode) continue;
    const key = `meta-balance:${client.id}:${episode}`;
    const { data: claim, error: claimError } = await db.rpc("claim_whatsapp_dispatch", { p_key: key });
    if (claimError || claim !== "claimed") continue;
    const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const text = [`⚠️ Saldo baixo — ${client.name}`, `Saldo disponível: ${money(balance.available)}`, `Limite do aviso: ${money(Number(setting.threshold))}`, `Conta: ${balance.accountId}`, "Adicione saldo para evitar interrupções nos anúncios.", `https://business.facebook.com/billing_hub/payment_settings?asset_id=${balance.accountId.replace(/^act_/, "")}`].join("\n");
    let delivery = "uncertain";
    try {
      const result = await whatsappRequest(destination.channel, "message/sendText", { number: destination.group_id, text });
      if (!result?.key?.id || ["ERROR", "FAILED"].includes(String(result.status || "").toUpperCase())) throw new Error("provider rejection");
      delivery = "sent"; sent++;
    } catch { failed++; }
    await db.from("whatsapp_dispatch_attempts").update({ status: delivery, retryable: false, updated_at: new Date().toISOString() }).eq("dispatch_key", key);
    await db.from("meta_balance_alert_state").update({ delivery_status: delivery, last_error: delivery === "sent" ? null : "Envio sem confirmação; verificar o grupo antes de reenviar." }).eq("client_id", client.id).eq("episode", episode);
  }
  return { sent, failed, checkedAt: new Date().toISOString() };
}

async function graph(path: string, params: Record<string, string> = {}) {
  const token = Deno.env.get("META_ACCESS_TOKEN");
  if (!token) throw new RequestError("A conexão com a Meta ainda precisa ser configurada.", 503);
  const url = new URL(`https://graph.facebook.com/${Deno.env.get("META_API_VERSION") || "v25.0"}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(25000) });
  const result = await response.json();
  if (!response.ok || result.error) {
    if (params.fields?.includes("funding_source_details") && [10, 200].includes(result.error?.code)) throw new RequestError("Sem acesso financeiro à conta na Meta.", 403);
    if (result.error?.code === 190) throw new RequestError("A autorização da Meta expirou. Renove a conexão para carregar as contas.", 502);
    throw new RequestError("A Meta não permitiu consultar esses dados. Confira o acesso à conta e a permissão de leitura de anúncios.", 502);
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply({ error: "Método não permitido" }, 405);
  try {
    const authorization = req.headers.get("Authorization") || "";
    const body = await req.json();
    const cronSecret = Deno.env.get("WHATSAPP_SCHEDULER_SECRET");
    const monitoring = body.action === "monitor_balances" && !!cronSecret && req.headers.get("x-cron-secret") === cronSecret;
    if (!monitoring && !authorization.startsWith("Bearer ")) throw new RequestError("Entre na sua conta.", 401);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: authError } = monitoring ? { data: { user: { id: "cron", email: "" } }, error: null } : await db.auth.getUser(authorization.slice(7));
    if (authError || !user) throw new RequestError("Sessão inválida.", 401);
    const email = (user.email || "").trim().toLowerCase();
    if (!monitoring && !managers.has(email) && !(email === "emanoelbull@gmail.com" && ["balances", "status", "insights", "report", "weekly", "goals", "balance_alert", "save_balance_alert"].includes(body.action))) throw new RequestError("Sem acesso às contas de anúncios.", 403);
    if (["alert_groups", "configure_alert_group"].includes(body.action)) {
      if (email !== "digitalavante3@gmail.com") throw new RequestError("Acesso negado.", 403);
      const groups: any[] = [];
      for (const channel of ["backup", "primary"]) {
        try {
          const result = await whatsappRequest(channel, "group/fetchAllGroups");
          for (const group of Array.isArray(result) ? result : []) if (String(group.subject || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, "") === "GESTAODETRAFEGO-CLIENTESEAVANTE") groups.push({ id: group.id, name: group.subject, channel });
        } catch { /* Another configured channel may have this group. */ }
      }
      if (body.action === "configure_alert_group") {
        const group = groups.find(group => group.id === body.groupId && group.channel === body.channel);
        if (!group || !/^[0-9-]+@g\.us$/.test(group.id)) throw new RequestError("Grupo não encontrado no canal conectado.");
        const { error } = await db.from("meta_balance_alert_destination").upsert({ id: true, group_id: group.id, group_name: group.name, channel: group.channel });
        if (error) throw new Error("group save");
      }
      const { data: destination } = await db.from("meta_balance_alert_destination").select("group_id,group_name,channel").eq("id", true).maybeSingle();
      return reply({ groups, destination });
    }
    if (body.action === "balances" || monitoring) {
      const { data: connections, error } = await db.from("client_meta_accounts").select("client_id,account_id,currency");
      if (error) throw new Error("balances lookup");
      const balances: Record<string, unknown> = {};
      for (let i = 0; i < (connections || []).length; i += 4) {
        await Promise.all((connections || []).slice(i, i + 4).map(async (connection) => {
          try {
            const account = await graph(connection.account_id, { fields: "currency,is_prepay_account,funding_source_details" });
            const funding = account.funding_source_details;
            // Account.balance is an amount owed, not the prepaid funds available.
            // Only accept a complete monetary display for the stored balance.
            // Coupon amounts can be promotional credits rather than available funds.
            let available: number | null = null;
            if (account.is_prepay_account && Number(funding?.type) === 20) {
              const display = String(funding.display_string || "").trim();
              const matched = display.match(/^(?:Saldo dispon[ií]vel\s*\(\s*)?R\$\s*((?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})(?:\s+BRL)?\s*\)?$/i);
              if (account.currency === "BRL" && matched) {
                available = Number(matched[1].replace(/\./g, "").replace(",", "."));
              }
            }
            const status = available != null ? "available" : account.is_prepay_account === false && Number(funding?.type) === 1 ? "credit_card" : "unavailable";
            balances[connection.client_id] = { accountId: connection.account_id, available, currency: account.currency || connection.currency, status };
          } catch (error) {
            balances[connection.client_id] = { accountId: connection.account_id, available: null, currency: connection.currency, status: error instanceof RequestError && error.status === 403 ? "permission_denied" : "unavailable" };
          }
        }));
      }
      return reply(monitoring ? await monitorBalances(db, balances) : { balances, checkedAt: new Date().toISOString() });
    }
    if (!/^[0-9a-f-]{36}$/i.test(body.clientId || "")) throw new RequestError("Cliente inválido.");
    const { data: client, error: clientError } = await db.from("gestao_clients").select("id").eq("id", body.clientId).maybeSingle();
    if (clientError) throw new Error("client lookup");
    if (!client) throw new RequestError("Cliente não encontrado.", 404);
    if (["balance_alert", "save_balance_alert"].includes(body.action)) {
      if (body.action === "save_balance_alert") {
        if (!Number.isFinite(body.threshold) || body.threshold <= 0 || body.threshold > 1000000 || typeof body.enabled !== "boolean") throw new RequestError("Informe um limite válido maior que zero.");
        const { error } = await db.from("client_meta_balance_alerts").upsert({ client_id: body.clientId, threshold: Math.round(body.threshold * 100) / 100, enabled: body.enabled });
        if (error) throw new Error("alert save");
      }
      const { data: setting, error } = await db.from("client_meta_balance_alerts").select("threshold,enabled").eq("client_id", body.clientId).maybeSingle();
      if (error) throw new Error("alert lookup");
      const { data: delivery } = await db.from("meta_balance_alert_state").select("delivery_status,last_error,checked_at").eq("client_id", body.clientId).maybeSingle();
      return reply({ setting: setting || { threshold: 50, enabled: true }, delivery });
    }
    if (body.action === "goals" || body.action === "save_goals") {
      if (typeof body.month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(body.month)) throw new RequestError("Selecione um mês válido.");
      if (body.action === "save_goals") {
        const targets = body.targets;
        const keys = ["purchases", "revenue", "roas", "leads", "conversations", "cpl"];
        if (!targets || typeof targets !== "object" || Array.isArray(targets) || Object.entries(targets).some(([key, value]) => !keys.includes(key) || typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 1e12)) throw new RequestError("Informe metas positivas e válidas.");
        const { error } = await db.from("client_meta_goals").upsert({ client_id: body.clientId, month: body.month, targets, updated_at: new Date().toISOString() });
        if (error) throw new Error("goals save");
      }
      const { data, error } = await db.from("client_meta_goals").select("targets").eq("client_id", body.clientId).eq("month", body.month).maybeSingle();
      if (error) throw new Error("goals lookup");
      return reply({ targets: data?.targets || {} });
    }
    if (body.action === "accounts") {
      const { data: linkedAccounts, error: linkedError } = await db.from("client_meta_accounts").select("account_id");
      if (linkedError) throw new Error("linked accounts lookup");
      const linkedIds = new Set((linkedAccounts || []).map((connection) => connection.account_id));
      const accounts: Account[] = [];
      let after: string | undefined;
      for (let page = 0; page < 100; page++) {
        const result = await graph("me/adaccounts", { fields: "id,name,currency,timezone_name,account_status", limit: "100", ...(after ? { after } : {}) });
        accounts.push(...(result.data || []).filter((account: Account) => !linkedIds.has(account.id)));
        if (!result.paging?.next) return reply({ accounts });
        after = result.paging?.cursors?.after;
        if (!after) break;
      }
      throw new RequestError("Não foi possível carregar todas as contas. Tente novamente.", 502);
    }
    if (body.action === "connect") {
      if (!/^act_[0-9]+$/.test(body.accountId || "")) throw new RequestError("Selecione uma conta válida.");
      const account: Account = await graph(body.accountId, { fields: "id,name,currency,timezone_name,account_status" });
      if (account.account_status !== 1) throw new RequestError("Selecione uma conta de anúncios ativa.");
      const { error } = await db.from("client_meta_accounts").upsert({ client_id: body.clientId, account_id: account.id, account_name: account.name, currency: account.currency, timezone_name: account.timezone_name, connected_by: user.id, updated_at: new Date().toISOString() });
      if (error?.code === "23505") throw new RequestError("Essa conta já está vinculada a outro cliente.", 409);
      if (error) throw new Error("connection save");
      return reply({ connected: true });
    }
    if (body.action === "disconnect") {
      const { error } = await db.from("client_meta_accounts").delete().eq("client_id", body.clientId);
      if (error) throw new Error("connection removal");
      return reply({ connected: false });
    }
    const { data: connection, error } = await db.from("client_meta_accounts").select("account_id,account_name,currency,timezone_name,updated_at").eq("client_id", body.clientId).maybeSingle();
    if (error) throw new Error("connection lookup");
    if (body.action === "status") return reply({ connection });
    if (!["insights", "report", "weekly"].includes(body.action)) throw new RequestError("Ação inválida.");
    if (!connection) throw new RequestError("Conecte uma conta de anúncios primeiro.");
    const preset = ["last_7d", "last_30d", "this_month", "last_month"].includes(body.period) ? body.period : "this_month";
    let range: Record<string, string> = { date_preset: preset };
    if (body.period === "custom") {
      const validDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + "T00:00:00Z")) && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
      if (!validDate(body.since) || !validDate(body.until) || body.since > body.until || (Date.parse(body.until) - Date.parse(body.since)) / 86400000 >= 366) throw new RequestError("Informe datas válidas, em ordem, para um período de até 366 dias.");
      range = { time_range: JSON.stringify({ since: body.since, until: body.until }) };
    }
    if (body.action === "weekly") {
      if (body.period !== "custom" || new Date(body.since + "T12:00:00Z").getUTCDay() !== 1 || (Date.parse(body.until)-Date.parse(body.since))/86400000 > 90) throw new RequestError("Selecione até 13 semanas iniciadas na segunda-feira.");
      const collect = async (fields: string, level: string) => {
        const rows: any[] = []; let after: string | undefined;
        for (let page=0;page<20;page++) {
          const result=await graph(`${connection.account_id}/insights`, {fields, level, time_increment:"7", ...range, limit:"500", ...(after?{after}:{})});
          rows.push(...(result.data||[]));
          if(!result.paging?.next)return rows;
          after=result.paging?.cursors?.after;
          if(!after)break;
        }
        throw new RequestError("A consulta de criativos ultrapassou o limite. Reduza o período e tente novamente.",502);
      };
      const campaignList = async () => {
        const campaigns:any[]=[];let after:string|undefined;
        for(let page=0;page<20;page++){
          const result=await graph(`${connection.account_id}/campaigns`,{fields:"id,name,objective,status",limit:"100",...(after?{after}:{})});
          campaigns.push(...(result.data||[]));if(!result.paging?.next)return campaigns;
          after=result.paging?.cursors?.after;if(!after)break;
        }
        throw new RequestError("Não foi possível carregar todas as campanhas. Tente novamente.",502);
      };
      const [weeks,ads,campaignWeeks,campaigns]=await Promise.all([
        collect("date_start,date_stop,spend,actions,action_values,purchase_roas","account"),
        collect("date_start,date_stop,ad_id,ad_name,campaign_id,campaign_name,spend,impressions","ad"),
        collect("date_start,date_stop,campaign_id,campaign_name,objective,spend,actions,action_values,purchase_roas","campaign"),
        campaignList()
      ]);
      return reply({connection,weeks,ads,campaignWeeks,campaigns,fetchedAt:new Date().toISOString()});
    }
    const result = await graph(`${connection.account_id}/insights`, { fields: "spend,impressions,clicks,reach,ctr,cpc,cpm,frequency,instagram_profile_follow,inline_link_clicks,inline_link_click_ctr,cost_per_inline_link_click,actions,action_values,purchase_roas,website_purchase_roas,cost_per_action_type", ...range });
    if (body.action === "report") {
      const current = result.data?.[0];
      if (!current) throw new RequestError("Sem dados da Meta neste período.");
      const start = Date.parse(current.date_start + "T00:00:00Z");
      const end = Date.parse(current.date_stop + "T00:00:00Z");
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) throw new Error("invalid dates");
      const day = 86400000;
      const days = Math.round((end - start) / day) + 1;
      const previousRange = { since: new Date(start - days * day).toISOString().slice(0, 10), until: new Date(start - day).toISOString().slice(0, 10) };
      const fields = "spend,impressions,clicks,reach,ctr,cpc,cpm,frequency,instagram_profile_follow,inline_link_clicks,inline_link_click_ctr,cost_per_inline_link_click,actions,action_values,purchase_roas,website_purchase_roas,cost_per_action_type";
      const campaignFields = `campaign_id,campaign_name,objective,${fields}`;
      const campaignRows = async (period: object, daily = false) => {
        const rows: any[] = [];
        let after: string | undefined;
        for (let page = 0; page < 100; page++) {
          const result = await graph(`${connection.account_id}/insights`, { fields: campaignFields, level: "campaign", time_range: JSON.stringify(period), ...(daily ? { time_increment: "1" } : {}), limit: "500", ...(after ? { after } : {}) });
          rows.push(...(result.data || []));
          if (!result.paging?.next) return rows;
          after = result.paging?.cursors?.after;
          if (!after) break;
        }
        throw new RequestError("Não foi possível carregar todas as campanhas do relatório. Tente novamente.", 502);
      };
      const [previous, daily, campaignCurrent, campaignPrevious, campaignDaily] = await Promise.all([
        graph(`${connection.account_id}/insights`, { fields, time_range: JSON.stringify(previousRange) }),
        graph(`${connection.account_id}/insights`, { fields, time_range: JSON.stringify({ since: current.date_start, until: current.date_stop }), time_increment: "1", limit: "400" }),
        campaignRows({ since: current.date_start, until: current.date_stop }),
        campaignRows(previousRange),
        campaignRows({ since: current.date_start, until: current.date_stop }, true),
      ]);
      if (daily.paging?.next) throw new RequestError("Não foi possível obter todos os dias do relatório.", 502);
      const campaigns = campaignCurrent.map(row => ({ id: row.campaign_id, name: row.campaign_name, objective: row.objective, current: row, previous: campaignPrevious.find(previous => previous.campaign_id === row.campaign_id) || null, daily: campaignDaily.filter(day => day.campaign_id === row.campaign_id) }));
      return reply({ connection, current, previous: previous.data?.[0] || null, previousRange, daily: daily.data || [], campaigns, fetchedAt: new Date().toISOString() });
    }
    return reply({ connection, insight: result.data?.[0] || null, fetchedAt: new Date().toISOString() });
  } catch (error) {
    return reply({ error: error instanceof RequestError ? error.message : "Não foi possível carregar a integração. Tente novamente." }, error instanceof RequestError ? error.status : 500);
  }
});

