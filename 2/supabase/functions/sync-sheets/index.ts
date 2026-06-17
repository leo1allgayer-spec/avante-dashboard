import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SPREADSHEET_ID = "1I2gj73l7UsuVJ91sa8GHJjq8RgjxwM97gG9I66QomBo";

// All known sheet tabs (gid) mapped to year
const SHEETS: { gid?: string; year: number; forceMonth?: string }[] = [
  { year: 2025 },                                        // default tab (Sept/Oct 2025)
  { gid: "1626971892", year: 2026 },                     // Janeiro 2026
  { gid: "1615483263", year: 2026 },                     // Fevereiro 2026
  { gid: "1635318096", year: 2026, forceMonth: "03" },   // Março 2026 (dates say /02 but should be /03)
];

const parseBRL = (s: string): number => {
  if (!s || !s.trim()) return 0;
  const clean = s.replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".").trim();
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
};

const parseInt2 = (s: string): number => {
  if (!s || !s.trim()) return 0;
  const n = parseInt(s.trim(), 10);
  return isNaN(n) ? 0 : n;
};

const parseFloat2 = (s: string): number => {
  if (!s || !s.trim()) return 0;
  const clean = s.replace(",", ".").trim();
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
};

const parseDate = (dateStr: string, year: number, forceMonth?: string): string | null => {
  if (!dateStr || !dateStr.trim()) return null;
  const parts = dateStr.trim().split("/");
  if (parts.length < 2) return null;
  const day = parts[0].padStart(2, "0");
  const month = forceMonth || parts[1].padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseCSV = (csvText: string): string[][] => {
  return csvText.split("\n").map(l => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of l) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { result.push(current); current = ""; continue; }
      current += ch;
    }
    result.push(current);
    return result.map(c => c.trim());
  });
};

const dayNames = ["segunda", "terça", "terca", "quarta", "quinta", "sexta", "sábado", "sabado", "domingo"];

const extractRows = (lines: string[][], year: number, userId: string, forceMonth?: string): any[] => {
  const rows: any[] = [];
  for (const cols of lines) {
    if (cols.length < 11) continue;

    const dayName = (cols[1] || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const isDay = dayNames.some(d => {
      const normalized = d.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return dayName.includes(normalized);
    });
    if (!isDay) continue;

    const dateStr = cols[2];
    const date = parseDate(dateStr, year, forceMonth);
    if (!date) continue;

    if ((cols[1] || "").toUpperCase().includes("TOTAL")) continue;

    const ads = parseBRL(cols[3]);
    const leads = parseInt2(cols[4]);
    const cpl = parseBRL(cols[5]);
    const mql = parseInt2(cols[6]);
    const cplMql = parseBRL(cols[7]);
    const cursoMarcado = parseInt2(cols[8]);
    const cursoFeito = parseInt2(cols[9]);
    const faturamento = parseBRL(cols[10]);
    const roas = parseFloat2(cols[11]);
    const cac = parseBRL(cols[12]);

    rows.push({
      user_id: userId,
      date,
      leads,
      lead_mql: mql,
      custo_por_lead: cpl || (leads > 0 ? ads / leads : 0),
      custo_por_lead_mql: cplMql || (mql > 0 ? ads / mql : 0),
      faturamento_dia: faturamento,
      roas,
      cac,
      curso_marcado: cursoMarcado,
      curso_feito: cursoFeito,
    });
  }
  return rows;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from authorization header
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Fallback to body
    if (!userId) {
      const body = await req.json().catch(() => ({}));
      userId = body.user_id;
    }

    if (!userId) throw new Error("user_id é obrigatório");

    // Fetch all sheet tabs in parallel
    const allRows: any[] = [];

    const fetchPromises = SHEETS.map(async (sheet) => {
      const gidParam = sheet.gid ? `&gid=${sheet.gid}` : "";
      const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv${gidParam}`;
      const csvRes = await fetch(csvUrl);
      if (!csvRes.ok) {
        console.error(`Erro ao buscar aba gid=${sheet.gid || "default"}: ${csvRes.status}`);
        return [];
      }
      const csvText = await csvRes.text();
      const lines = parseCSV(csvText);
      console.log(`Aba gid=${sheet.gid || "default"}: ${lines.length} linhas`);
      return extractRows(lines, sheet.year, userId!, sheet.forceMonth);
    });

    const results = await Promise.all(fetchPromises);
    for (const rows of results) {
      allRows.push(...rows);
    }

    console.log(`Total: ${allRows.length} linhas válidas para user ${userId}`);

    if (allRows.length === 0) {
      return new Response(JSON.stringify({ success: true, imported: 0, message: "Nenhum dado encontrado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let imported = 0;
    let errors = 0;

    for (const row of allRows) {
      const { error } = await supabase
        .from("daily_metrics")
        .upsert(row, { onConflict: "user_id,date" });
      if (error) {
        console.error(`Error upserting ${row.date}:`, error.message);
        errors++;
      } else {
        imported++;
      }
    }

    return new Response(JSON.stringify({ success: true, imported, errors, total: allRows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync-sheets error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
