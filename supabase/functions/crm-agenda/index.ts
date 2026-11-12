import { crmModality } from "../_shared/crm-modality.ts";
import { crmContactPhone } from "../_shared/crm-contact.ts";
import { crmResponsibleName } from "../_shared/crm-responsible.ts";
import { selectedCallTotals } from "../_shared/crm-calls.ts";
import { resolveCrmResponsible } from "../_shared/crm-assignment.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CRM_BASE_URL = "https://crm.solairew.com.br/api/v1";

type JsonObject = Record<string, unknown>;

const asObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};

const firstString = (row: JsonObject, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const firstIdentifier = (row: JsonObject, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
};

const firstName = (...rows: JsonObject[]) => {
  for (const row of rows) {
    const value = firstString(row, [
      "full_name",
      "lead_name",
      "contact_name",
      "customer_name",
      "client_name",
      "participant_name",
      "name",
      "title",
    ]);
    if (value) return value;
  }
  return "";
};
const relatedRecordKeys = new Set(["lead", "contact", "customer", "client", "participant", "person", "prospect"]);

const collectRelatedRecords = (row: JsonObject, depth = 0): JsonObject[] => {
  if (depth > 3) return [];
  const records: JsonObject[] = [];
  for (const [key, value] of Object.entries(row)) {
    if (!value || typeof value !== "object") continue;
    const normalizedKey = key.replace(/[_-]/g, "").toLowerCase();
    if (Array.isArray(value)) {
      if ([...relatedRecordKeys].some((candidate) => normalizedKey.includes(candidate))) {
        records.push(...value.map(asObject).filter((item) => Object.keys(item).length));
      }
      continue;
    }
    const nested = asObject(value);
    if ([...relatedRecordKeys].some((candidate) => normalizedKey.includes(candidate))) records.push(nested);
    records.push(...collectRelatedRecords(nested, depth + 1));
  }
  return records;
};

const collectKeyPaths = (value: unknown, prefix = "", depth = 0): string[] => {
  if (!value || typeof value !== "object" || depth > 4) return [];
  const entries = Array.isArray(value) ? value.slice(0, 1).map((item, index) => [String(index), item] as const) : Object.entries(asObject(value));
  return entries.flatMap(([key, nestedValue]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return [path, ...collectKeyPaths(nestedValue, path, depth + 1)];
  });
};

const linkedLeadIdentifier = (row: JsonObject) => {
  const direct = firstIdentifier(row, [
    "lead_id", "leadId", "contact_id", "contactId", "customer_id", "customerId",
    "client_id", "clientId", "person_id", "personId", "prospect_id", "prospectId",
  ]);
  if (direct) return direct;
  for (const key of relatedRecordKeys) {
    const value = row[key];
    if (typeof value === "string" || typeof value === "number") return String(value);
    const id = firstIdentifier(asObject(value), ["id", "lead_id", "leadId", "uuid"]);
    if (id) return id;
  }
  for (const related of collectRelatedRecords(row)) {
    const id = firstIdentifier(related, ["id", "lead_id", "leadId", "uuid"]);
    if (id) return id;
  }
  return "";
};

const isGenericMeetingTitle = (value: string) => {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return [
    "reuniao",
    "reuniao do crm",
    "compromisso",
    "compromisso do crm",
    "agendamento",
    "sem titulo",
  ].includes(normalized);
};

const extractRows = (payload: unknown): JsonObject[] => {
  if (Array.isArray(payload)) return payload.map(asObject);
  const root = asObject(payload);
  for (const key of ["data", "appointments", "commitments", "events", "schedules", "calendar", "items", "results", "leads", "contacts", "clients"]) {
    const value = root[key];
    if (Array.isArray(value)) return value.map(asObject);
    const nested = asObject(value);
    for (const nestedKey of ["data", "items", "results", "leads", "contacts", "clients"]) {
      if (Array.isArray(nested[nestedKey])) return (nested[nestedKey] as unknown[]).map(asObject);
    }
  }
  return [];
};

const formatInSaoPaulo = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(parsed);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
};

const splitDateTime = (row: JsonObject) => {
  const zonedTimestamp = firstString(row, ["starts_at", "start_at", "scheduled_at", "start"]);
  if (zonedTimestamp && /T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(zonedTimestamp)) {
    const local = formatInSaoPaulo(zonedTimestamp);
    if (local) return local;
  }

  const rawDate = firstString(row, ["date", "start_date", "scheduled_date", "appointment_date", "starts_at", "start_at", "start", "scheduled_at"]);
  const rawTime = firstString(row, ["time", "start_time", "scheduled_time", "appointment_time"]);
  if (!rawDate) return { date: "", time: rawTime.slice(0, 5) };

  if (/T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(rawDate)) {
    const local = formatInSaoPaulo(rawDate);
    if (local) return local;
  }

  const isoMatch = rawDate.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?/);
  if (isoMatch) return { date: isoMatch[1], time: (rawTime || isoMatch[2] || "").slice(0, 5) };
  const brMatch = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) return { date: `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`, time: rawTime.slice(0, 5) };
  return { date: rawDate.slice(0, 10), time: rawTime.slice(0, 5) };
};

const normalizeAppointment = (row: JsonObject, index: number) => {
  const relatedRecords = collectRelatedRecords(row);
  const contact = asObject(row.contact ?? row.lead ?? row.customer ?? row.client);
  const rawLeadSummary = row.lead_summary ?? contact.lead_summary;
  const leadSummary = asObject(rawLeadSummary);
  const hasLeadSummary = rawLeadSummary !== null && typeof rawLeadSummary === "object" && !Array.isArray(rawLeadSummary);
  const leadSummaryLines = hasLeadSummary
    ? [
        ["Sócios", leadSummary.socios],
        ["Tipo de negócio", leadSummary.tipo_negocio],
        ["Faturamento", leadSummary.faturamento],
        ["Interesse (curso/assessoria)", leadSummary.interesse],
      ].map(([label, value]) => {
        const displayed = value === null || value === undefined || String(value).trim() === ""
          ? "Não informado"
          : typeof value === "boolean"
            ? (value ? "Sim" : "Não")
            : String(value).trim();
        return `${label}: ${displayed}`;
      })
    : [];
  const participant = asObject(row.participant ?? row.person ?? row.prospect);
  const owner = asObject(row.owner ?? row.user ?? row.assignee ?? row.responsible);
  const professional = asObject(row.professional ?? row.agent ?? row.attendant);
  const serviceRecord = asObject(row.service ?? row.service_type);
  const { date, time } = splitDateTime(row);
  const statusObject = asObject(row.status);
  const statusRaw = (firstString(row, ["status", "state", "situation"]) || firstString(statusObject, ["name", "slug", "value"])).toLowerCase();
  const meetingTitle = firstString(row, ["title", "subject", "summary", "name"]);
  const explicitPersonName = firstString(row, [
    "lead_name", "leadName", "contact_name", "contactName", "customer_name", "customerName",
    "client_name", "clientName", "participant_name", "participantName", "person_name", "personName",
  ]);
  const personName = explicitPersonName || firstName(contact, participant, ...relatedRecords);
  const title = personName || (!isGenericMeetingTitle(meetingTitle) ? meetingTitle : "") || "Reunião do CRM";
  const participantNames = [
    personName,
    firstString(owner, ["name", "full_name"]),
  ].filter(Boolean);
  const directParticipants = row.participants;
  if (Array.isArray(directParticipants)) {
    directParticipants.forEach((participant) => {
      if (typeof participant === "string" && participant.trim()) participantNames.push(participant.trim());
      else {
        const name = firstString(asObject(participant), ["name", "full_name", "email"]);
        if (name) participantNames.push(name);
      }
    });
  }
  const id = firstIdentifier(row, ["id", "appointment_id", "commitment_id", "uuid"]) || `${date}-${time}-${index}`;
  return {
    id: `crm:${id}`,
    externalId: id,
    leadId: linkedLeadIdentifier(row),
    createdAt: firstString(row, ['created_at', 'createdAt']),
    title,
    meetingType: firstString(row, ["appointment_type", "meeting_type", "type"]) || "reuniao",
    clientName: personName || title,
    clientPhone: crmContactPhone(row, [contact, participant, ...relatedRecords]),
    notifyClient: row.notify_client !== false,
    date,
    time,
    durationMinutes: Number(row.duration_minutes ?? row.duration ?? 60) || 60,
    agendaCategory: crmResponsibleName(row).trim().toLowerCase().replace(/\s+/g, ' ') === 'leonardo webster' && ["reuniao","reuniao_vendas","reuniao_cliente"].includes(firstString(row, ["appointment_type", "meeting_type", "type"]) || "reuniao") ? 'reunioes' : 'geral',
    responsible: crmResponsibleName(row),
    professional: firstString(professional, ["name", "full_name"]),
    participants: [...new Set(participantNames)],
    description: [firstString(row, ["description", "notes", "note", "details"]), ...leadSummaryLines].filter(Boolean).join("\n"),
    status: ["cancelled", "canceled", "cancelado", "cancelada"].includes(statusRaw)
      ? "cancelled"
      : ["completed", "done", "finished", "realizado", "realizada", "concluido", "concluído", "concluida", "concluída"].includes(statusRaw)
        ? "completed"
        : "pending",
    outcome: null,
    origin: firstString(row, ["origin", "source"]) || "CRM",
    service: firstString(row, ["service_name", "service"]) || firstString(serviceRecord, ["name", "title"]),
    modality: crmModality(row),
    hasClosed: Boolean(row.has_closing) || firstString(row, ["closing_status"]) === "closed",
    closingStatus: firstString(row, ["closing_status"]) || (Boolean(row.has_closing) ? "closed" : "pending"),
    objection: firstString(row, ["objection", "objection_reason", "lost_reason"]),
    source: "crm",
  };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const body = await request.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "list";
    if (action === 'set_closing') {
      const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.100.0');
      const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
      const {data:{user},error:authError}=await db.auth.getUser(token);
      if(authError||!user)return new Response(JSON.stringify({error:'Entre novamente para salvar.'}),{status:401,headers:{...corsHeaders,'Content-Type':'application/json'}});
      const status=String(body.closingStatus||'');
      const objection=String(body.objection||'').trim();
      if(!['pending','closed','not_closed'].includes(status)||objection.length>5000||status==='not_closed'&&!objection)throw new Error('Informe o fechamento e o motivo quando não fechou.');
      let lookup=db.from('meetings').select('id,user_id,agenda_category');
      if(body.externalId)lookup=lookup.eq('external_id',String(body.externalId));
      else lookup=lookup.eq('id',String(body.meetingId));
      const {data:record,error:lookupError}=await lookup.maybeSingle();
      if(lookupError)throw lookupError;
      if(!record)throw new Error('A reunião ainda não foi sincronizada. Atualize a agenda e tente novamente.');
      const managers=['digitalavante3@gmail.com','nicolaspatzlaff02@gmail.com','lucadsilva666@gmail.com','leonardowebster.ja@gmail.com','abreuconsultoriaempresarial@gmail.com'];
      const email=(user.email||'').toLowerCase();
      const social=['beatrizfsavante@gmail.com','avantegabriela51@gmail.com'].includes(email);
      const allowed=record.user_id===user.id||managers.includes(email)||social&&['geral','captacao'].includes(record.agenda_category);
      if(!allowed)return new Response(JSON.stringify({error:'Seu perfil não pode alterar o fechamento desta reunião.'}),{status:403,headers:{...corsHeaders,'Content-Type':'application/json'}});
      const {data:saved,error:saveError}=await db.from('meetings').update({closing_status:status,has_closing:status==='closed',objection:status==='not_closed'?objection:''}).eq('id',record.id).select('id,closing_status,has_closing,objection').single();
      if(saveError)throw saveError;
      return new Response(JSON.stringify({ok:true,meeting:saved}),{headers:{...corsHeaders,'Content-Type':'application/json'}});
    }
    const apiKey = Deno.env.get("SOLAIRE_API_KEY")?.trim();
    if (!apiKey) throw new Error("SOLAIRE_API_KEY não configurada.");
    if (action === 'calls') {
      const fetchPeriod = async (period:string) => {
        const response = await fetch(`${CRM_BASE_URL}/calls?period=${period}`, {headers:{Authorization:`Bearer ${apiKey}`,Accept:'application/json'}});
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.error?.message || `CRM HTTP ${response.status} ao consultar ligações`);
        return { sellers: selectedCallTotals(result), period: result.period };
      };
      const [today,month] = await Promise.all([fetchPeriod('today'),fetchPeriod('month')]);
      return new Response(JSON.stringify({today,month}), {headers:{...corsHeaders,'Content-Type':'application/json'}});
    }
    if (["create", "update"].includes(action)) {
      const meeting = asObject(body.meeting);
      const category = firstString(meeting,["agendaCategory","agenda_category"]);
      const type = firstString(meeting,["meetingType","meeting_type"]) || "reuniao";
      const title = firstString(meeting,["title"]).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
      const importedGeneralUpdate = action === 'update' && firstString(meeting, ['origin']).toUpperCase() === 'CRM' && Boolean(firstString(meeting, ['externalId', 'external_id']));
      if (!importedGeneralUpdate && (category !== "reunioes" || type !== "reuniao_vendas" || /\b(interna|interno|internas|internos)\b/.test(title))) {
        return new Response(JSON.stringify({error:"Somente reuniões da Agenda Closer podem ser enviadas ao CRM."}),{status:400,headers:{...corsHeaders,"Content-Type":"application/json"}});
      }
    }
    const since = typeof body?.since === "string" ? body.since : "";
    const until = typeof body?.until === "string" ? body.until : "";
    const buildQuery = (page: number, dateStyle: "start" | "range" | "from" | "none" = "start") => {
      const query = new URLSearchParams();
      if (dateStyle === "start" && since) {
        query.set("start_date", since);
      }
      if (dateStyle === "start" && until) {
        query.set("end_date", until);
      }
      if (dateStyle === "range" && since) {
        query.set("date_from", since);
      }
      if (dateStyle === "range" && until) {
        query.set("date_to", until);
      }
      if (dateStyle === "from" && since) {
        query.set("from", since);
      }
      if (dateStyle === "from" && until) {
        query.set("to", until);
      }
      query.set("page", String(page));
      query.set("per_page", "100");
      query.set("limit", "100");
      query.set("include", "lead,professional,service");
      query.set("expand", "lead,professional,service");
      return query;
    };

    let payload: unknown = null;
    let selectedEndpoint = "";
    let selectedDateStyle: "start" | "range" | "from" | "none" = "start";
    let bestRowCount = -1;
    const errors: string[] = [];
    const attempts: Array<Record<string, unknown>> = [];
    // A integração Solaire utiliza /agenda. Não sondar rotas inexistentes a cada atualização.
    for (const endpoint of ["agenda"]) {
      for (const dateStyle of ["start"] as const) {
        const response = await fetch(`${CRM_BASE_URL}/${endpoint}?${buildQuery(1, dateStyle).toString()}`, {
          headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        });
        const candidate = await response.json().catch(() => null);
        if (response.ok) {
          const candidateRows = extractRows(candidate);
          const rowCount = candidateRows.length;
          const sample = candidateRows[0] ?? {};
          const nestedKeys = Object.fromEntries(Object.entries(sample)
            .filter(([, value]) => value && typeof value === "object" && !Array.isArray(value))
            .map(([key, value]) => [key, Object.keys(asObject(value))]));
          attempts.push({ endpoint, dateStyle, status: response.status, rowCount, rootKeys: Object.keys(asObject(candidate)), sampleKeys: Object.keys(sample), nestedKeys });
          if (rowCount > bestRowCount) {
            payload = candidate;
            selectedEndpoint = endpoint;
            selectedDateStyle = dateStyle;
            bestRowCount = rowCount;
          }
          if (rowCount > 0) break;
        } else {
          attempts.push({ endpoint, dateStyle, status: response.status, rowCount: 0 });
          errors.push(`${endpoint}/${dateStyle}: HTTP ${response.status}`);
        }
      }
    }
    if (!selectedEndpoint) throw new Error(`Não foi possível consultar a agenda do CRM (${errors.join(", ")}).`);

    if (action !== "list") {
      const meeting = asObject(body?.meeting);
      const externalId = firstString(meeting, ["externalId", "external_id", "id"]).replace(/^crm:/, "");
      const date = firstString(meeting, ["date"]);
      const time = firstString(meeting, ["time"]);
      const startsAt = date ? `${date}T${time || "00:00"}:00-03:00` : "";
      const durationMinutes = Number(meeting.durationMinutes ?? meeting.duration_minutes ?? 60) || 60;
      const [startHour, startMinute] = (time || "00:00").split(":").map(Number);
      const endTotalMinutes = (startHour * 60 + startMinute + durationMinutes) % (24 * 60);
      const endTime = `${String(Math.floor(endTotalMinutes / 60)).padStart(2, "0")}:${String(endTotalMinutes % 60).padStart(2, "0")}`;
      const crmPayload = {
        title: firstString(meeting, ["title"]) || "Reunião",
        type: firstString(meeting, ["meetingType", "meeting_type"]) || "reuniao",
        appointment_type: firstString(meeting, ["meetingType", "meeting_type"]) || "reuniao",
        client_name: firstString(meeting, ["clientName", "client_name", "title"]),
        description: firstString(meeting, ["description"]),
        date,
        time,
        duration_minutes: durationMinutes,
        start_time: time,
        end_time: endTime,
        scheduled_date: date,
        scheduled_time: time,
        appointment_date: date,
        appointment_time: time,
        responsible: firstString(meeting, ["responsible"]),
        professional: firstString(meeting, ["professional"]),
        service: firstString(meeting, ["service"]),
        origin: firstString(meeting, ["origin"]),
        starts_at: startsAt,
        start_at: startsAt,
        scheduled_at: startsAt,
        participants: Array.isArray(meeting.participants) ? meeting.participants : [],
        modality: firstString(meeting, ["modality"]) || "presencial",
        status: firstString(meeting, ["status"]) || "pending",
        has_closing: Boolean(meeting.hasClosed) || firstString(meeting, ["closingStatus"]) === "closed",
        closing_status: firstString(meeting, ["closingStatus", "closing_status"]) || "pending",
        objection: firstString(meeting, ["objection"]),
      };
      const isCreate = action === "create";
      if (!isCreate && !externalId) throw new Error("Identificador do compromisso não informado.");
      const target = `${CRM_BASE_URL}/${selectedEndpoint}${isCreate ? "" : `/${encodeURIComponent(externalId)}`}`;
      const isDelete = action === "delete";
      let assignedTo: string | null = null;
      if (!isDelete) {
        const teamResponse = await fetch(`${CRM_BASE_URL}/calls?period=today`, {headers:{Authorization:`Bearer ${apiKey}`,Accept:'application/json'}});
        const teamResult = await teamResponse.json().catch(() => null);
        if (!teamResponse.ok || !Array.isArray(teamResult?.data)) throw new Error('Não foi possível consultar os responsáveis do CRM');
        assignedTo = resolveCrmResponsible(teamResult.data, crmPayload.responsible);
        Object.assign(crmPayload, {assigned_to:assignedTo});
      }
      const headers = {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      let result: unknown = null;
      let response: Response;
      if (isDelete || isCreate) {
        response = await fetch(target, {
          method: isDelete ? "DELETE" : "POST",
          headers,
          body: isDelete ? undefined : JSON.stringify(crmPayload),
        });
        result = await response.json().catch(() => null);
      } else {
        const schedulePayload = {
          date,
          time,
          start_time: time,
          end_time: endTime,
          starts_at: startsAt,
          start_at: startsAt,
          scheduled_at: startsAt,
          scheduled_date: date,
          scheduled_time: time,
          appointment_date: date,
          appointment_time: time,
          duration_minutes: durationMinutes,
        };
        const updateAttempts = [
          { method: "PATCH", payload: crmPayload },
          { method: "PATCH", payload: { ...schedulePayload, assigned_to: assignedTo } },
          { method: "PUT", payload: crmPayload },
        ];
        let lastResponse: Response | null = null;
        let lastResult: unknown = null;
        for (const attempt of updateAttempts) {
          const candidateResponse = await fetch(target, { method: attempt.method, headers, body: JSON.stringify(attempt.payload) });
          const candidateResult = await candidateResponse.json().catch(() => null);
          lastResponse = candidateResponse;
          lastResult = candidateResult;
          if (candidateResponse.ok) break;
        }
        response = lastResponse!;
        result = lastResult;
      }
      if (!response.ok && !(isDelete && [404, 410].includes(response.status))) {
        const resultObject = asObject(result);
        const nestedErrors = asObject(resultObject.errors);
        const apiMessage = firstString(resultObject, ["message", "error", "detail"])
          || Object.values(nestedErrors).flat().filter((value) => typeof value === "string").join("; ");
        throw new Error(apiMessage || `CRM HTTP ${response.status} ao ${isDelete ? "excluir" : isCreate ? "criar" : "editar"} compromisso.`);
      }
      if (!isDelete) {
        const rootResult = asObject(result);
        const saved = asObject(rootResult.data ?? rootResult.appointment ?? rootResult);
        if (!Object.prototype.hasOwnProperty.call(saved, 'assigned_to') || (saved.assigned_to ?? null) !== assignedTo) throw new Error('O CRM não confirmou a alteração do responsável. Atualize a agenda e tente novamente.');
      }
      return new Response(JSON.stringify({ ok: true, appointment: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allRows = [...extractRows(payload)];
    const root = asObject(payload);
    const rootData = asObject(root.data);
    const paginationCandidates = [root.meta, root.pagination, rootData.meta, rootData.pagination]
      .map(asObject)
      .filter((candidate) => Object.keys(candidate).length > 0);
    const meta = paginationCandidates[0] || {};
    const totalPagesRaw = Number(meta.last_page ?? meta.total_pages ?? root.last_page ?? root.total_pages ?? rootData.last_page ?? rootData.total_pages ?? 0);
    const hasDeclaredTotal = Number.isFinite(totalPagesRaw) && totalPagesRaw > 0;
    const totalPages = hasDeclaredTotal
      ? Math.min(Math.max(totalPagesRaw, 1), 100)
      : bestRowCount >= 100 ? 100 : 1;
    let complete = hasDeclaredTotal ? totalPagesRaw <= 100 : bestRowCount < 100;
    let previousPageSignature = JSON.stringify(allRows.slice(0, 3).map((row) => firstIdentifier(row, ["id", "appointment_id", "commitment_id", "uuid"])));
    for (let page = 2; page <= totalPages; page += 1) {
      const response = await fetch(`${CRM_BASE_URL}/${selectedEndpoint}?${buildQuery(page, selectedDateStyle).toString()}`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      });
      if (!response.ok) { complete = false; break; }
      const nextPayload = await response.json().catch(() => null);
      if (!nextPayload) { complete = false; break; }
      const rows = extractRows(nextPayload);
      if (!rows.length) { complete = true; break; }
      const pageSignature = JSON.stringify(rows.slice(0, 3).map((row) => firstIdentifier(row, ["id", "appointment_id", "commitment_id", "uuid"])));
      if (pageSignature === previousPageSignature) { complete = false; break; }
      previousPageSignature = pageSignature;
      allRows.push(...rows);
      if (!hasDeclaredTotal && rows.length < 100) { complete = true; break; }
    }

    // A agenda já inclui lead_name; consultar o lead apenas quando falta o nome.
    const leadIds = [...new Set(allRows.filter((row) => !firstString(row, ["lead_name", "contact_name", "client_name"]) || !crmContactPhone(row, collectRelatedRecords(row)))
      .map(linkedLeadIdentifier).filter(Boolean))];
    const leadMap = new Map<string, JsonObject>();
    for (let offset = 0; offset < leadIds.length; offset += 10) {
      const batch = leadIds.slice(offset, offset + 10);
      await Promise.all(batch.map(async (leadId) => {
        const response = await fetch(`${CRM_BASE_URL}/leads/${encodeURIComponent(leadId)}`, {
          headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        });
        if (!response.ok) return;
        const result = asObject(await response.json().catch(() => null));
        const lead = asObject(result.data ?? result.lead ?? result);
        if (Object.keys(lead).length) leadMap.set(leadId, lead);
      }));
    }
    if (leadMap.size < leadIds.length) {
      const wantedLeadIds = new Set(leadIds);
      let leadPage = 1;
      let leadTotalPages = 1;
      do {
        const response = await fetch(`${CRM_BASE_URL}/leads?page=${leadPage}&per_page=100&limit=100`, {
          headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        });
        if (!response.ok) break;
        const result = asObject(await response.json().catch(() => null));
        const rows = extractRows(result);
        rows.forEach((lead) => {
          const id = firstIdentifier(lead, ["id", "_id", "lead_id", "leadId", "uuid"]);
          if (id && wantedLeadIds.has(id)) leadMap.set(id, lead);
        });
        const resultData = asObject(result.data);
        const pagination = asObject(result.pagination ?? result.meta ?? resultData.pagination ?? resultData.meta);
        leadTotalPages = Math.min(Math.max(Number(pagination.total_pages ?? pagination.last_page ?? 1) || 1, 1), 100);
        leadPage += 1;
      } while (leadPage <= leadTotalPages && leadMap.size < leadIds.length);
    }

    const enrichedRows = allRows.map((row) => {
      const leadId = linkedLeadIdentifier(row);
      return leadId && leadMap.has(leadId) ? { ...row, lead: leadMap.get(leadId) } : row;
    });
    if (Deno.env.get("CRM_AGENDA_DEBUG") === "true") console.log("CRM_AGENDA_SCHEMA", JSON.stringify({
      selectedEndpoint,
      selectedDateStyle,
      rowCount: allRows.length,
      leadIdsFound: leadIds.length,
      leadsResolved: leadMap.size,
      attempts,
      sampleKeyPaths: allRows.slice(0, 3).map((row) => collectKeyPaths(row)),
    }));
    const seen = new Set<string>();
    const appointments = enrichedRows
      .map(normalizeAppointment)
      .filter((item) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return false;
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    return new Response(JSON.stringify({ appointments, endpoint: selectedEndpoint, dateStyle: selectedDateStyle, pages: totalPages, complete }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
