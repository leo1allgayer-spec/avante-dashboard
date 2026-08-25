const GOOGLE_TASKS_ONLY_EMAILS = new Set([
  "hjasiulzwicz@gmail.com",
]);

export function isGoogleTasksOnlyUser(email?: string | null) {
  return GOOGLE_TASKS_ONLY_EMAILS.has((email || "").trim().toLowerCase());
}

export const GOOGLE_TASKS_ONLY_PATH = "/tasks";

export const GOOGLE_MANAGER_PATHS = new Set([
  "/tasks",
  "/clientes-google-ads",
]);

export function isGoogleManagerPath(pathname: string) {
  return GOOGLE_MANAGER_PATHS.has(pathname);
}
