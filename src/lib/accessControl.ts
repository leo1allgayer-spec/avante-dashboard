const GOOGLE_TASKS_ONLY_EMAILS = new Set([
  "hjasiulzwicz@gmail.com",
]);

export function canAccessClientContracts(email?: string | null) {
  return new Set([
    "abreuconsultoriaempresarial@gmail.com",
    "nicolaspatzlaff02@gmail.com",
    "leonardowebster.ja@gmail.com",
    "digitalavante3@gmail.com",
    "lucadsilva666@gmail.com",
  ]).has((email || "").trim().toLowerCase());
}

const FULL_CLIENT_MANAGEMENT_EMAILS = new Set([
  "zanchikaua7@gmail.com",
  "hiagooleques1505@gmail.com",
]);

export function hasFullClientManagementAccess(email?: string | null) {
  return FULL_CLIENT_MANAGEMENT_EMAILS.has((email || "").trim().toLowerCase());
}

export function isGoogleTasksOnlyUser(email?: string | null) {
  return GOOGLE_TASKS_ONLY_EMAILS.has((email || "").trim().toLowerCase());
}

export const GOOGLE_TASKS_ONLY_PATH = "/tasks";

export const GOOGLE_MANAGER_PATHS = new Set([
  "/tasks",
  "/clientes-google-ads",
  "/admin/agendamentos",
]);

export function isGoogleManagerPath(pathname: string) {
  return GOOGLE_MANAGER_PATHS.has(pathname);
}

export function isClientSummaryUser(user?: { email?: string | null; app_metadata?: Record<string, unknown> } | null) {
  return user?.app_metadata?.clients_access === "summary" ||
    user?.email?.trim().toLowerCase() === "emanoelbull@gmail.com";
}

export function isClientProfileEditor(user?: { email?: string | null } | null) {
  return user?.email?.trim().toLowerCase() === "emanoelbull@gmail.com";
}

export function canAccessSupportSchedule(user?: { email?: string | null } | null) {
  return user?.email?.trim().toLowerCase() === "emanoelbull@gmail.com";
}

const CLIENT_WEEKLY_REPORT_EMAILS = new Set([
  "digitalavante3@gmail.com",
  "nicolaspatzlaff02@gmail.com",
  "lucadsilva666@gmail.com",
  "leonardowebster.ja@gmail.com",
  "emanoelbull@gmail.com",
  "zanchikaua7@gmail.com",
  "hiagooleques1505@gmail.com",
]);

export function canAccessClientWeeklyReports(email?: string | null) {
  return CLIENT_WEEKLY_REPORT_EMAILS.has((email || "").trim().toLowerCase());
}


const SOCIAL_OPERATION_EMAILS = new Set(['beatrizfsavante@gmail.com', 'avantegabriela51@gmail.com']);
export const SOCIAL_OPERATION_PATHS = new Set(['/agenda-geral', '/kanban-social-media', '/agenda-captacao', '/calendario-editorial', '/gestor-tarefas']);
export function isSocialOperationUser(email?: string | null) {
  return SOCIAL_OPERATION_EMAILS.has((email || '').trim().toLowerCase());
}
