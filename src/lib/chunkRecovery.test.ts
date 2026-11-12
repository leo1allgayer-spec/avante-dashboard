import { expect, it, vi } from "vitest";
import { installChunkRecovery } from "./chunkRecovery";

it("recovers once and leaves repeated failures available for manual recovery", () => {
  const events = new EventTarget();
  const values = new Map<string, string>();
  const reload = vi.fn();
  const target = Object.assign(events, {
    navigator: { onLine: true }, location: { replace: reload, href: "https://example.com/analise-alunos?mes=10" },
    history: { replaceState: vi.fn() },
    sessionStorage: { getItem: (k: string) => values.get(k), setItem: (k: string, v: string) => values.set(k, v) },
  });
  installChunkRecovery(target as unknown as Window);
  const first = new Event("vite:preloadError", { cancelable: true });
  events.dispatchEvent(first);
  expect(first.defaultPrevented).toBe(true);
  const second = new Event("vite:preloadError", { cancelable: true });
  events.dispatchEvent(second);
  expect(second.defaultPrevented).toBe(false);
  expect(reload).toHaveBeenCalledTimes(1);
  expect(reload.mock.calls[0][0]).toContain("/analise-alunos?mes=10&_app_update=");
});

it("does not reload offline", () => {
  const events = new EventTarget();
  const reload = vi.fn();
  installChunkRecovery(Object.assign(events, { navigator: { onLine: false }, location: { replace: reload, href: "https://example.com/" } }) as unknown as Window);
  events.dispatchEvent(new Event("vite:preloadError"));
  expect(reload).not.toHaveBeenCalled();
});

it('allows one retry after a fresh document, then stops automatic reload loops',async()=>{
 const {recoverChunk}=await import('./chunkRecovery');
 const values=new Map<string,string>();
 const storage={getItem:(k:string)=>values.get(k),setItem:(k:string,v:string)=>values.set(k,v)};
 const fresh=()=>({navigator:{onLine:true},sessionStorage:storage,location:{href:'https://example.com/vendas?mes=2026-10#lista',replace:vi.fn()}} as unknown as Window);
 const first=fresh();expect(recoverChunk(first)).toBe(true);expect(recoverChunk(first)).toBe(false);
 expect(recoverChunk(fresh())).toBe(true);
 const third=fresh();expect(recoverChunk(third)).toBe(false);
 expect(recoverChunk(third,true)).toBe(true);
 expect(third.location.replace).toHaveBeenCalledWith(expect.stringMatching(/\/vendas\?mes=2026-10&_app_update=\d+#lista$/));
});
it('lets a user retry when browser session storage is unavailable',async()=>{
 const {recoverChunk}=await import('./chunkRecovery');const replace=vi.fn();
 const target={navigator:{onLine:true},sessionStorage:{getItem:()=>{throw Error('blocked');}},location:{href:'https://example.com/vendas',replace}} as unknown as Window;
 expect(recoverChunk(target)).toBe(false);expect(recoverChunk(target,true)).toBe(true);expect(replace).toHaveBeenCalledOnce();
});
