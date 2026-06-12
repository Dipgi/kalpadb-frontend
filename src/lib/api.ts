const BASE = import.meta.env.VITE_API_URL ?? "https://kalpa-api.onrender.com/api/v1";

let _token: string | null = localStorage.getItem("token");

export function setToken(t: string | null) {
  _token = t;
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
}

export function getToken() {
  return _token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (_token) headers["Authorization"] = `Bearer ${_token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface WorkSummary {
  id: number;
  type: string;
  content_type: string | null;
  title: string;
  language: string | null;
  publication_date: string | null;
  authors: { id: number; name: string; image_url: string | null }[];
  avg_rating: number | null;
  rating_count: number;
  localised: Record<string, Record<string, string>>;
}

export interface BookFormat {
  format_type: string;
  isbn: string | null;
  page_count: number | null;
  cover_image_url: string | null;
}

export interface WorkDetail extends WorkSummary {
  description: string | null;
  image_urls: string[] | null;
  original_language: string | null;
  genres: { id: number; name: string }[];
  tags: { id: number; name: string }[];
  external_links: { id: number; url: string; link_type: string; label: string | null }[];
  awards: {
    id: number;
    category: { name: string };
    year: number;
    result: string;
    notes: string | null;
  }[];
  related_works: {
    id: number;
    relation_type: string;
    work: WorkSummary;
  }[];
  book: {
    publication_year: number | null;
    formats: BookFormat[];
    publishers: { id: number; name: string }[];
    editors: { id: number; name: string }[];
    translators: { id: number; name: string }[];
    illustrators: { id: number; name: string }[];
  } | null;
  story: { word_count: number | null } | null;
}

export interface Person {
  id: number;
  name: string;
  bio: string | null;
  gender: string | null;
  image_url: string | null;
  nationality: string | null;
  role_type: string | null;
  birth_date: string | null;
  end_date: string | null;
  localised: Record<string, Record<string, string>>;
  aliases: { alias: string }[];
  external_links: { url: string; link_type: string }[];
}

export interface StatsOut {
  stats: {
    total_works?: number;
    total_authors?: number;
    total_books?: number;
    total_stories?: number;
    total_publishers?: number;
    total_languages?: number;
    total_users?: number;
    [key: string]: number | undefined;
  };
  refreshed_at: string | null;
}

export interface NewsItem {
  id: number;
  title: string;
  body: string;
  published_at: string;
}

export interface SearchResult {
  query: string;
  total: number;
  works: WorkSummary[];
  persons: { id: number; name: string; image_url: string | null; localised: Record<string, Record<string, string>> }[];
}

export interface UserOut {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface ShelfEntry {
  id: number;
  lw_id: number;
  status: string;
  date_started: string | null;
  date_finished: string | null;
  progress_note: string | null;
  private: boolean;
  updated_at: string | null;
  work: WorkSummary | null;
}

// ── Auth ───────────────────────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (username: string, email: string, password: string) =>
    request<UserOut>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    }),

  me: () => request<UserOut>("/users/me"),
};

// ── Works ──────────────────────────────────────────────────────────────────

export const works = {
  list: (params: {
    type?: string;
    lang?: string;
    genre_slug?: string;
    sort?: string;
    page?: number;
    page_size?: number;
  } = {}) => {
    const q = new URLSearchParams();
    if (params.type) q.set("type", params.type);
    if (params.lang) q.set("lang", params.lang);
    if (params.genre_slug) q.set("genre_slug", params.genre_slug);
    if (params.sort) q.set("sort", params.sort);
    q.set("page", String(params.page ?? 1));
    q.set("page_size", String(params.page_size ?? 25));
    return request<Page<WorkSummary>>(`/works?${q}`);
  },

  get: (id: number) => request<WorkDetail>(`/works/${id}`),
};

// ── Catalogue ─────────────────────────────────────────────────────────────

export const catalogue = {
  person: (id: number) => request<Person>(`/persons/${id}`),
  personWorks: (id: number, page = 1, size = 25) =>
    request<Page<WorkSummary>>(`/persons/${id}/works?page=${page}&page_size=${size}`),
  genres: () => request<{ id: number; name: string; slug: string }[]>("/genres"),
  languages: () => request<{ code: string; name: string }[]>("/languages"),
};

// ── Search ────────────────────────────────────────────────────────────────

export const search = {
  query: (q: string, page = 1) =>
    request<SearchResult>(`/search?q=${encodeURIComponent(q)}&page=${page}&page_size=25`),
};

// ── Stats & News ──────────────────────────────────────────────────────────

export const stats = {
  get: () => request<StatsOut>("/stats"),
};

export const news = {
  list: (page = 1, size = 5) =>
    request<Page<NewsItem>>(`/news?page=${page}&size=${size}`),
};

// ── Admin types ───────────────────────────────────────────────────────────

export interface NewsPost {
  id: number;
  title: string;
  slug: string;
  body: string;
  summary: string | null;
  status: string;
  pinned: boolean;
  published_at: string | null;
  created_at: string | null;
  author: { id: number; username: string };
}

export interface EditLogEntry {
  id: number;
  table_name: string;
  record_id: number | null;
  action: string;
  status: string;
  payload: Record<string, unknown>;
  reviewer_note: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  submitted_by: { id: number; username: string };
  reviewed_by: { id: number; username: string } | null;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at?: string;
}

// ── Admin API ─────────────────────────────────────────────────────────────

export const admin = {
  refreshStats: () =>
    request("/admin/stats/refresh", { method: "POST" }),

  news: {
    list: (page = 1) =>
      request<Page<NewsPost>>(`/admin/news?page=${page}&page_size=20`),
    create: (data: { title: string; body: string; summary?: string; status: string; pinned: boolean }) =>
      request<NewsPost>("/admin/news", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<{ title: string; body: string; summary: string; status: string; pinned: boolean }>) =>
      request<NewsPost>(`/admin/news/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request(`/admin/news/${id}`, { method: "DELETE" }),
  },

  queue: {
    list: (page = 1) =>
      request<Page<EditLogEntry>>(`/admin/queue?page=${page}&page_size=20`),
    review: (id: number, approve: boolean, reviewer_note?: string) =>
      request<EditLogEntry>(`/admin/queue/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ approve, reviewer_note: reviewer_note ?? null }),
      }),
  },

  users: {
    list: (page = 1) =>
      request<Page<AdminUser>>(`/admin/users?page=${page}&page_size=25`),
    update: (id: number, data: { role?: string; is_active?: boolean }) =>
      request<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
};

// ── User features ─────────────────────────────────────────────────────────

export const user = {
  shelf: () => request<Page<ShelfEntry>>("/shelf"),
  upsertShelf: (lw_id: number, status: string) =>
    request<ShelfEntry>(`/shelf/${lw_id}`, { method: "PUT", body: JSON.stringify({ status }) }),
  removeFromShelf: (lw_id: number) =>
    request(`/shelf/${lw_id}`, { method: "DELETE" }),
};
