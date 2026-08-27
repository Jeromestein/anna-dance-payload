export const USERS_PAGE_SIZE = 20;

const USER_SEARCH_COLUMNS = [
  "name",
  "email",
  "phone",
  "guardian_name",
  "guardian_phone",
] as const;

export type UserDirectoryRole = "student" | "admin";
export type UserDirectoryFilter = "all" | UserDirectoryRole;

export function parseUsersPage(value: string | undefined) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function getUsersPageRange(page: number) {
  const from = (page - 1) * USERS_PAGE_SIZE;
  return { from, to: from + USERS_PAGE_SIZE - 1 };
}

export function getUsersHref({
  role,
  query,
  page = 1,
}: {
  role: UserDirectoryFilter;
  query: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (role !== "all") params.set("role", role);
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));

  const value = params.toString();
  return value ? `/users?${value}` : "/users";
}

export function buildUserSearchFilter(query: string) {
  const safeQuery = query
    .trim()
    .slice(0, 100)
    .replace(/[^\p{L}\p{N}@.+\-\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!safeQuery) return "";

  const pattern = `*${safeQuery}*`;
  return USER_SEARCH_COLUMNS.map((column) => `${column}.ilike.${pattern}`).join(",");
}

export function getUserInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase();
  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toLocaleUpperCase();
}
