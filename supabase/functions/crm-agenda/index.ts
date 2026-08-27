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

const extractRows = (payload: unknown): JsonObject[] => {
  if (Array.isArray(payload)) return payload.map(asObject);
  const root = asObject(payload);
  for (const key of ["data", "appointments", "commitments", "events", "items", "results"]) {
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
  const contact = asObject(row.contact ?? row.lead ?? row.customer ?? row.client);
  const owner = asObject(row.owner ?? row.user ?? row.assignee);
  const { date, time } = splitDateTime(row);
  const statusRaw = firstString(row, ["status", "state"]).toLowerCase();
  const title = firstString(row, ["title", "name", "subject", "summary"]) || "Reunião do CRM";
  const participantNames = [
    firstString(contact, ["name", "full_name", "title"]),
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
  const id = firstString(row, ["id", "appointment_id", "commitment_id", "uuid"]) || `${date}-${time}-${index}`;
  return {
    id: `crm:${id}`,
    externalId: id,
    title,
    date,
    time,
    participants: [...new Set(participantNames)],
    description: firstString(row, ["description", "notes", "note", "details"]),
    status: ["completed", "done", "finished", "realizado", "concluido", "concluído"].includes(statusRaw) ? "completed" : "pending",
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
    const query = new URLSearchParams();
    if (since) query.set("start_date", since);
    if (until) query.set("end_date", until);

    let payload: unknown = null;
    let selectedEndpoint = "";
    const errors: string[] = [];
    for (const endpoint of ["appointments", "commitments", "agenda"]) {
      const response = await fetch(`${CRM_BASE_URL}/${endpoint}?${query.toString()}`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      });
      const candidate = await response.json().catch(() => null);
      if (response.ok) {
        payload = candidate;
        selectedEndpoint = endpoint;
        break;
      }
      errors.push(`${endpoint}: HTTP ${response.status}`);
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

    const appointments = extractRows(payload)
      .map(normalizeAppointment)
      .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date));
    return new Response(JSON.stringify({ appointments, endpoint: selectedEndpoint }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
