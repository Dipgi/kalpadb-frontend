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
  title: string;
  work_type: string;
  publication_year: number | null;
  language_code: string;
  cover_image_url: string | null;
  authors: { id: number; name: string }[];
  genres: { id: number; name: string }[];
  localised: Record<string, Record<string, string>>;
}

export interface WorkDetail extends WorkSummary {
  description: string | null;
  original_language_code: string | null;
  publishers: { id: number; name: string }[];
  tags: { id: number; name: string }[];
  book: {
    format: string | null;
    page_count: number | null;
    isbn: string | null;
  } | null;
  story: { word_count: number | null } | null;
  external_links: { url: string; link_type: string }[];
  awards: { award_name: string; category: string | null; year: number | null; result: string }[];
  translations: { id: number; title: string; language_code: string }[];
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
  total_works: number;
  total_books: number;
  total_stories: number;
  total_persons: number;
  total_publishers: number;
  total_languages: number;
  total_users: number;
  total_awards: number;
  total_genres: number;
  total_tags: number;
}

export interface NewsItem {
  id: number;
  title: string;
  body: string;
  published_at: string;
}

export interface SearchResult {
  works: WorkSummary[];
  persons: Person[];
}

export interface UserOut {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface ShelfEntry {
  work_id: number;
  status: string;
  work: WorkSummary;
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

  me: () => request<UserOut>("/auth/me"),
};

// ── Works ──────────────────────────────────────────────────────────────────

export const works = {
  list: (params: {
    type?: string;
    language?: string;
    genre_id?: number;
    page?: number;
    size?: number;
  } = {}) => {
    const q = new URLSearchParams();
    if (params.type) q.set("type", params.type);
    if (params.language) q.set("language", params.language);
    if (params.genre_id) q.set("genre_id", String(params.genre_id));
    q.set("page", String(params.page ?? 1));
    q.set("size", String(params.size ?? 20));
    return request<Page<WorkSummary>>(`/works?${q}`);
  },

  get: (id: number) => request<WorkDetail>(`/works/${id}`),
};

// ── Catalogue ─────────────────────────────────────────────────────────────

export const catalogue = {
  person: (id: number) => request<Person>(`/persons/${id}`),
  personWorks: (id: number, page = 1, size = 25) =>
    request<Page<WorkSummary>>(`/persons/${id}/works?page=${page}&page_size=${size}`),
  genres: () => request<{ id: number; name: string }[]>("/genres"),
  languages: () => request<{ code: string; name: string }[]>("/languages"),
};

// ── Search ────────────────────────────────────────────────────────────────

export const search = {
  query: (q: string, page = 1, size = 20) =>
    request<Page<WorkSummary>>(`/search?q=${encodeURIComponent(q)}&page=${page}&size=${size}`),
};

// ── Stats & News ──────────────────────────────────────────────────────────

export const stats = {
  get: () => request<StatsOut>("/stats"),
};

export const news = {
  list: (page = 1, size = 5) =>
    request<Page<NewsItem>>(`/news?page=${page}&size=${size}`),
};

// ── User features ─────────────────────────────────────────────────────────

export const user = {
  shelf: () => request<ShelfEntry[]>("/users/me/shelf"),
  addToShelf: (work_id: number, status: string) =>
    request("/users/me/shelf", { method: "POST", body: JSON.stringify({ work_id, status }) }),
  updateShelf: (work_id: number, status: string) =>
    request(`/users/me/shelf/${work_id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
