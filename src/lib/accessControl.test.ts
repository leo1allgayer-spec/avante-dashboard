import { describe, expect, it } from "vitest";
import { canAccessClientContracts, SOCIAL_OPERATION_PATHS, isGoogleManagerPath, isGoogleTasksOnlyUser } from "./accessControl";

it("restricts client contracts to the named team accounts", () => {
  for (const email of ["abreuconsultoriaempresarial@gmail.com", "nicolaspatzlaff02@gmail.com", "leonardowebster.ja@gmail.com", "digitalavante3@gmail.com", "lucadsilva666@gmail.com"]) expect(canAccessClientContracts(email.toUpperCase())).toBe(true);
  for (const email of ["emanoelbull@gmail.com", "hjasiulzwicz@gmail.com", "anaafontoura06@gmail.com", "unknown@example.com", undefined]) expect(canAccessClientContracts(email)).toBe(false);
});

describe("Henrique navigation restrictions", () => {
  it("identifies Henrique without affecting other accounts", () => {
    expect(isGoogleTasksOnlyUser("HJASIULZWICZ@gmail.com")).toBe(true);
    expect(isGoogleTasksOnlyUser("digitalavante3@gmail.com")).toBe(false);
  });
  it("keeps courses, clients and availability accessible", () => {
    for (const path of ["/tasks", "/clientes-google-ads", "/admin/agendamentos"]) {
      expect(isGoogleManagerPath(path)).toBe(true);
    }
  });
  it("rejects direct navigation to the hidden sections", () => {
    for (const path of ["/agenda-geral", "/reunioes", "/metricas-reunioes", "/agenda-captacao", "/agenda-social-media", "/kanban-social-media", "/calendario-editorial", "/kanban-sites", "/kanban-crm", "/kanban-edicao"]) {
      expect(isGoogleManagerPath(path)).toBe(false);
    }
  });
});

it('allows social operators to open assigned task links',()=>{expect(SOCIAL_OPERATION_PATHS.has('/gestor-tarefas')).toBe(true);expect(SOCIAL_OPERATION_PATHS.has('/despesas-financeiras')).toBe(false);});

