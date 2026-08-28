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
  for (const key of ["data", "appointments", "commitments", "events", "schedules", "calendar", "items", "results"]) {
    const value = root[key];
    if (Array.isArray(value)) return value.map(asObject);
    const nested = asObject(value);
    for (const nestedKey of ["data", "items", "results"]) {
      if (Array.isArray(nested[nestedKey])) return (nested[nestedKey] as unknown[]).map(asObject);
    }
  }
  return [];
};

const splitDateTime = (row: JsonObject) => {
  const rawDate = firstString(row, ["date", "start_date", "scheduled_date", "appointment_date", "starts_at", "start_at", "start", "scheduled_at"]);
  const rawTime = firstString(row, ["time", "start_time", "scheduled_time", "appointment_time"]);
  if (!rawDate) return { date: "", time: rawTime.slice(0, 5) };
  const isoMatch = rawDate.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?/);
  if (isoMatch) return { date: isoMatch[1], time: (rawTime || isoMatch[2] || "").slice(0, 5) };
  const brMatch = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) return { date: `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`, time: rawTime.slice(0, 5) };
  return { date: rawDate.slice(0, 10), time: rawTime.slice(0, 5) };
};

const normalizeAppointment = (row: JsonObject, index: number) => {
  const relatedRecords = collectRelatedRecords(row);
  const contact = asObject(row.contact ?? row.lead ?? row.customer ?? row.client);
  const participant = asObject(row.participant ?? row.person ?? row.prospect);
  const owner = asObject(row.owner ?? row.user ?? row.assignee);
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
    title,
    date,
    time,
    participants: [...new Set(participantNames)],
    description: firstString(row, ["description", "notes", "note", "details"]),
    status: ["cancelled", "canceled", "cancelado", "cancelada"].includes(statusRaw)
      ? "cancelled"
      : ["completed", "done", "finished", "realizado", "realizada", "concluido", "concluído", "concluida", "concluída"].includes(statusRaw)
        ? "completed"
        : "pending",
    outcome: null,
    origin: "CRM",
    modality: firstString(row, ["modality", "type", "location_type"]).toLowerCase().includes("online") ? "online" : "presencial",
    hasClosed: false,
    source: "crm",
  };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("SOLAIRE_API_KEY")?.trim();
    if (!apiKey) throw new Error("SOLAIRE_API_KEY não configurada.");
    const body = await request.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "list";
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
    for (const endpoint of ["appointments", "commitments", "agenda", "calendar", "schedules"]) {
      for (const dateStyle of ["start", "range", "from", "none"] as const) {
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
      const crmPayload = {
        title: firstString(meeting, ["title"]) || "Reunião",
        description: firstString(meeting, ["description"]),
        date,
        time,
        starts_at: startsAt,
        start_at: startsAt,
        scheduled_at: startsAt,
        participants: Array.isArray(meeting.participants) ? meeting.participants : [],
        modality: firstString(meeting, ["modality"]) || "presencial",
        status: firstString(meeting, ["status"]) || "pending",
      };
      const isCreate = action === "create";
      if (!isCreate && !externalId) throw new Error("Identificador do compromisso não informado.");
      const target = `${CRM_BASE_URL}/${selectedEndpoint}${isCreate ? "" : `/${encodeURIComponent(externalId)}`}`;
      if (action === "delete") throw new Error("Cancelamento pelo dashboard não está habilitado.");
      const method = isCreate ? "POST" : "PATCH";
      const response = await fetch(target, {
        method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(crmPayload),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const resultObject = asObject(result);
        const apiMessage = firstString(resultObject, ["message", "error", "detail"]);
        throw new Error(apiMessage || `CRM HTTP ${response.status} ao ${isCreate ? "criar" : "editar"} compromisso.`);
      }
      return new Response(JSON.stringify({ ok: true, appointment: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allRows = [...extractRows(payload)];
    const root = asObject(payload);
    const meta = asObject(root.meta ?? root.pagination);
    const totalPagesRaw = Number(meta.last_page ?? meta.total_pages ?? root.last_page ?? root.total_pages ?? 1);
    const totalPages = Number.isFinite(totalPagesRaw) ? Math.min(Math.max(totalPagesRaw, 1), 100) : 1;
    for (let page = 2; page <= totalPages; page += 1) {
      const response = await fetch(`${CRM_BASE_URL}/${selectedEndpoint}?${buildQuery(page, selectedDateStyle).toString()}`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      });
      if (!response.ok) break;
      const nextPayload = await response.json().catch(() => null);
      const rows = extractRows(nextPayload);
      if (!rows.length) break;
      allRows.push(...rows);
    }

    const leadIds = [...new Set(allRows.map(linkedLeadIdentifier).filter(Boolean))];
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
        const rows = Array.isArray(result.data) ? result.data.map(asObject) : [];
        rows.forEach((lead) => {
          const id = firstIdentifier(lead, ["id", "lead_id", "uuid"]);
          if (id && wantedLeadIds.has(id)) leadMap.set(id, lead);
        });
        const pagination = asObject(result.pagination ?? result.meta);
        leadTotalPages = Math.min(Math.max(Number(pagination.total_pages ?? pagination.last_page ?? 1) || 1, 1), 100);
        leadPage += 1;
      } while (leadPage <= leadTotalPages && leadMap.size < leadIds.length);
    }

    const enrichedRows = allRows.map((row) => {
      const leadId = linkedLeadIdentifier(row);
      return leadId && leadMap.has(leadId) ? { ...row, lead: leadMap.get(leadId) } : row;
    });
    const seen = new Set<string>();
    const appointments = enrichedRows
      .map(normalizeAppointment)
      .filter((item) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return false;
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    return new Response(JSON.stringify({ appointments, endpoint: selectedEndpoint, dateStyle: selectedDateStyle, pages: totalPages }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
