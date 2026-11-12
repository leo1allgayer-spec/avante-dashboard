// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { transform } from "esbuild";

const clientId = "11111111-1111-1111-1111-111111111111";
const connection = { account_id: "act_123", account_name: "Avante", currency: "BRL" };
const insight = { spend: "10", date_start: "2026-10-01", date_stop: "2026-10-07" };
async function handler(email = "emanoelbull@gmail.com") {
  let serve: (req: Request) => Promise<Response>;
  const source = await readFile("supabase/functions/client-meta-ads/index.ts", "utf8");
  const { code } = await transform(source.replace(/^\uFEFF?import [^\r\n]+\r?\n/, ""), { loader: "ts" });
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: "user", email } } }) },
    from: (table: string) => {
      const data = table === "gestao_clients" ? { id: clientId } : table === "client_meta_goals" ? { targets: { purchases: 20 } } : connection;
      const query = {
        select: () => query, eq: () => query,
        maybeSingle: async () => ({ data }),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: [{ ...connection, client_id: clientId }] })),
      };
      return query;
    },
  };
  runInNewContext(code, {
    createClient: () => db, Request, Response, URL, AbortSignal,
    Deno: { env: { get: () => "test" }, serve: (fn: typeof serve) => { serve = fn; } },
    fetch: async (url: URL) => ({ ok: true, json: async () => url.pathname.endsWith("/insights") ? { data: [insight] } : { currency: "BRL", is_prepay_account: true, funding_source_details: { type: 20, display_string: "R$ 50,00" } } }),
  });
  return async (action: string, headers: Record<string, string> = { Authorization: "Bearer test" }, extra: Record<string, unknown> = {}) => {
    const response = await serve!(new Request("https://example.test", { method: "POST", headers, body: JSON.stringify({ action, clientId, period: "last_7d", month: "2026-10", ...extra }) }));
    return { status: response.status, data: await response.json() };
  };
}
describe("Meta action routing", () => {
  it("returns each authorized response instead of routing all reads to balances", async () => {
    const request = await handler();
    expect((await request("status")).data.connection.account_id).toBe("act_123");
    expect((await request("insights")).data.insight.spend).toBe("10");
    expect((await request("report")).data.current.spend).toBe("10");
    expect((await request("goals")).data.targets.purchases).toBe(20);
    expect((await request("balances")).data.balances[clientId].available).toBe(50);
  });
  it("allows Emanoel to read weekly metrics only within a valid Monday-based range", async () => {
    const request=await handler();
    const valid=await request("weekly",undefined,{period:"custom",since:"2026-10-12",until:"2026-10-20"});
    expect(valid.status).toBe(200);
    expect(valid.data.weeks[0].spend).toBe("10");
    expect(Array.isArray(valid.data.ads)).toBe(true);
    expect((await request("weekly",undefined,{period:"custom",since:"2026-10-13",until:"2026-10-20"})).status).toBe(400);
    const stranger=await handler("unknown@example.test");
    expect((await stranger("weekly",undefined,{period:"custom",since:"2026-10-12",until:"2026-10-20"})).status).toBe(403);
  });
  it("keeps account changes and goal writes restricted", async () => {
    const request = await handler();
    for (const action of ["accounts", "connect", "disconnect", "save_goals"]) expect((await request(action)).status).toBe(403);
  });
  it("requires authentication and confines scheduler authentication to monitoring", async () => {
    const request = await handler();
    expect((await request("monitor_balances", {})).status).toBe(401);
    expect((await request("monitor_balances", { "x-cron-secret": "wrong" })).status).toBe(401);
    expect((await request("status", { "x-cron-secret": "test" })).status).toBe(401);
    expect((await request("monitor_balances")).status).toBe(403);
    const stranger = await handler("stranger@example.test");
    expect((await stranger("balances")).status).toBe(403);
  });
});
