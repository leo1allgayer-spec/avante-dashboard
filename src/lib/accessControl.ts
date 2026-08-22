const GOOGLE_TASKS_ONLY_EMAILS = new Set([
  "hjasiulzwicz@gmail.com",
]);

export function isGoogleTasksOnlyUser(email?: string | null) {
  return GOOGLE_TASKS_ONLY_EMAILS.has((email || "").trim().toLowerCase());
}

export const GOOGLE_TASKS_ONLY_PATH = "/tasks";
