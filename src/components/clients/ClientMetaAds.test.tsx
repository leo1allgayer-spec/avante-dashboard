// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClientMetaAds } from "./ClientMetaAds";
const mocks = vi.hoisted(() => ({ email: "digitalavante3@gmail.com", invoke: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ session: { user: { id: "user", email: mocks.email } } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("./MetaReportButton", () => ({ MetaReportButton: ({ load }: { load: () => Promise<unknown> }) => <button onClick={() => void load()}>Gerar relatório PDF</button> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ClientMetaAds clientId="client-a" clientName="Cliente A" /></QueryClientProvider>);
describe("client Meta connection", () => {
  it("offers one report button and uses the selected period", async () => {
    mocks.email = "digitalavante3@gmail.com";
    mocks.invoke.mockImplementation(async (_name, { body }) => ({ data: body.action === "status" ? { connection: { account_id: "act_123", account_name: "Conta A", currency: "BRL" } } : { insight: { spend: "10", impressions: "100", clicks: "5", reach: "80", ctr: "5", cpc: "2", date_start: "2026-09-01", date_stop: "2026-09-30" } }, error: null }));
    mount();
    await screen.findByText("Gerar relatório PDF");
    expect(screen.getAllByText("Gerar relatório PDF")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Período"), { target: { value: "last_30d" } });
    fireEvent.click(await screen.findByText("Gerar relatório PDF"));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("client-meta-ads", { body: { clientId: "client-a", action: "report", period: "last_30d" } }));
  });
  it("waits for valid custom dates and sends the same range to the report", async () => {
    mocks.email = "digitalavante3@gmail.com";
    mocks.invoke.mockImplementation(async (_name, { body }) => ({ data: body.action === "status" ? { connection: { account_id: "act_123", account_name: "Conta A", currency: "BRL" } } : { insight: { spend: "10", impressions: "100", clicks: "5", reach: "80", ctr: "5", cpc: "2", date_start: "2026-09-01", date_stop: "2026-09-30" } }, error: null }));
    mount();
    await screen.findByText("Gerar relatório PDF");
    fireEvent.change(screen.getByLabelText("Período"), { target: { value: "custom" } });
    expect(screen.queryByText("Gerar relatório PDF")).toBeNull();
    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-09-10" } });
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-09-05" } });
    expect(screen.queryByText("Gerar relatório PDF")).toBeNull();
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-09-20" } });
    fireEvent.click(await screen.findByText("Gerar relatório PDF"));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("client-meta-ads", { body: { clientId: "client-a", action: "report", period: "custom", since: "2026-09-10", until: "2026-09-20" } }));
  });
  it("does not fetch or expose accounts to Henrique", () => {
    mocks.email = "hjasiulzwicz@gmail.com";
    const view = mount();
    expect(view.container.textContent).toBe("");
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("requires explicit selection and binds only the selected account to this client", async () => {
    mocks.email = "digitalavante3@gmail.com";
    mocks.invoke.mockImplementation(async (_name, { body }) => ({ data: body.action === "accounts" ? { accounts: [{ id: "act_123", name: "Conta A", currency: "BRL", account_status: 1 }] } : { connection: null }, error: null }));
    mount();
    fireEvent.click(await screen.findByText("Selecionar conta de anúncios"));
    const select = await screen.findByLabelText("Conta de anúncios de Cliente A");
    const button = screen.getByText("Vincular conta a Cliente A") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(select, { target: { value: "act_123" } });
    fireEvent.click(button);
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("client-meta-ads", { body: { clientId: "client-a", action: "connect", accountId: "act_123" } }));
  });
});
