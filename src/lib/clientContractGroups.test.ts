import { it, expect } from "vitest";
import { groupClientContracts } from "./clientContractGroups";
import type { Client } from "@/types/clients/client";
it("counts the shared contract once and retains both source records", () => {
  const meta = {id:"m",name:"Cliente Á",contractValue:1500,status:"Ativo"} as Client;
  const google = {id:"g",name:"cliente a",contractValue:1500,status:"Ativo"} as Client;
  const groups = groupClientContracts([meta],[google]);
  expect(groups).toHaveLength(1);
  expect(groups[0].client.contractValue).toBe(1500);
  expect(groups[0].google?.id).toBe("g");
  expect(groupClientContracts([meta],[{...google,name:"Outro"}])).toHaveLength(2);
  expect(groupClientContracts([{...meta,contractValue:0}],[google])[0].client.contractValue).toBe(1500);
});
