// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useClients } from "./useGestaoClients";

const mocks = vi.hoisted(()=>({update:vi.fn(),rpc:vi.fn(),role:"normal",rows:[{id:"client",name:"Cliente",status:"Ativo",manager:"Nicolas",notes:[],created_at:"2026-10-01"}]}));
vi.mock("./useGestaoAuth",()=>({useAuth:()=>({session:{user:{id:"user",email:"user@example.com"}}})}));
vi.mock("@/lib/accessControl",()=>({isSocialOperationUser:()=>false,isClientProfileEditor:()=>mocks.role==="editor",isClientSummaryUser:()=>mocks.role==="summary"}));
vi.mock("sonner",()=>({toast:{success:vi.fn(),error:vi.fn()}}));
vi.mock("@/integrations/supabase/clientsClient",()=>({supabaseClients:{
 from:()=>({select:()=>({order:async()=>({data:mocks.rows,error:null})}),update:mocks.update}),rpc:mocks.rpc,
 channel:()=>{const channel={on:()=>channel,subscribe:()=>channel};return channel;},removeChannel:vi.fn(),
}}));
beforeEach(()=>{mocks.role="normal";mocks.update.mockReset();mocks.update.mockReturnValue({eq:async()=>({error:null})});mocks.rpc.mockReset();mocks.rpc.mockImplementation(async(name:string)=>name.startsWith("list_")?{data:mocks.rows,error:null}:{error:null});});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it.each(["normal","editor","summary"])("does not replay stale paused status when editing a different field (%s)",async(role)=>{
 mocks.role=role;const {result}=renderHook(()=>useClients());await waitFor(()=>expect(result.current.clients).toHaveLength(1));
 await act(async()=>{await result.current.updateClient({...result.current.clients[0],status:"Pausado",name:"Nome editado"});});
 const payload=role==="normal"?mocks.update.mock.calls[0][0]:mocks.rpc.mock.calls.find(call=>call[0].startsWith("update_"))?.[1].p_changes;
 expect(payload.name).toBe("Nome editado");expect(payload).not.toHaveProperty("status");expect(result.current.clients[0].status).toBe("Ativo");
});
it("cancelling pause confirmation prevents any write",async()=>{
 const confirm=vi.spyOn(window,"confirm").mockReturnValue(false);const {result}=renderHook(()=>useClients());await waitFor(()=>expect(result.current.clients).toHaveLength(1));
 await act(async()=>{await result.current.updateClient({...result.current.clients[0],status:"Pausado"},{changeStatus:true});});
 expect(confirm).toHaveBeenCalledOnce();expect(mocks.update).not.toHaveBeenCalled();
});
it("an explicit confirmed pause is saved",async()=>{
 vi.spyOn(window,"confirm").mockReturnValue(true);const {result}=renderHook(()=>useClients());await waitFor(()=>expect(result.current.clients).toHaveLength(1));
 await act(async()=>{await result.current.updateClient({...result.current.clients[0],status:"Pausado"},{changeStatus:true});});
 expect(mocks.update.mock.calls[0][0].status).toBe("Pausado");
});
