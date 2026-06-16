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
    throw new ApiError(res.status, formatDetail(body.detail) ?? res.statusText, body.detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

interface ValidationItem {
  loc?: (string | number)[];
  msg?: string;
}

/** FastAPI 422 returns detail as an array of {loc, msg}; flatten to "field: message". */
function formatDetail(detail: unknown): string | null {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return (detail as ValidationItem[])
      .map((d) => {
        const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : null;
        return field && field !== "body" ? `${field}: ${d.msg}` : d.msg ?? "";
      })
      .filter(Boolean)
      .join("; ");
  }
  return null;
}

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

/** An existing record flagged as a possible duplicate of one being created. */
export interface DuplicateCandidate {
  id: number;
  name: string;
  similarity: number;
  localised_match: boolean;
}

export interface DuplicateError {
  code: "duplicate_name";
  message: string;
  candidates: DuplicateCandidate[];
}

/**
 * If `err` is a 409 duplicate-name rejection from POST /persons or /publishers,
 * return its structured detail; otherwise null.
 */
export function getDuplicateError(err: unknown): DuplicateError | null {
  if (err instanceof ApiError && err.status === 409) {
    const d = err.detail as Partial<DuplicateError> | undefined;
    if (d && d.code === "duplicate_name" && Array.isArray(d.candidates)) {
      return d as DuplicateError;
    }
  }
  return null;
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
  cover_image_url: string | null;
  authors: { id: number; name: string; image_url: string | null }[];
  avg_rating: number | null;
  rating_count: number;
  localised: Record<string, Record<string, string>>;
}

export interface BookFormat {
  format_type: string;
  isbn: string | null;
  page_count: number | null;
  publication_date: string | null;
  cover_image_url: string | null;
  price: string | null;
  currency: string | null;
  availability: string | null;
  notes: string | null;
}

export interface WorkDetail extends WorkSummary {
  description: string | null;
  image_urls: string[] | null;
  original_language: string | null;
  genres: { id: number; genre_name: string }[];
  tags: { id: number; tag_name: string }[];
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
    series_id: number | null;
    series_position: number | null;
    edition_label: string | null;
    edition_notes: string | null;
    formats: BookFormat[];
    publishers: { id: number; name: string }[];
    editors: { id: number; name: string }[];
    translators: { id: number; name: string }[];
    illustrators: { id: number; name: string }[];
    cover_artists: { id: number; name: string }[];
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
  slug: string;
  summary: string | null;
  pinned: boolean;
  published_at: string | null;
  author: { id: number; username: string };
}

export interface NewsItemFull extends NewsItem {
  body: string;
}

export interface PersonSummary {
  id: number;
  name: string;
  image_url: string | null;
  localised?: Record<string, Record<string, string>>;
}

export interface PublisherSummary {
  id: number;
  name: string;
  slug: string | null;
  city: string | null;
  country: string | null;
}

export interface SearchResult {
  query: string;
  total: number;
  works: WorkSummary[];
  persons: PersonSummary[];
  publishers: PublisherSummary[];
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

export interface Rating {
  id: number;
  lw_id: number;
  rating: number;
  review: string | null;
  created_at: string | null;
  updated_at: string | null;
  work: WorkSummary | null;
}

// ── Auth ───────────────────────────────────────────────────────────────────

/** Anti-bot fields sent with public auth forms (honeypot + Turnstile token). */
export interface AntiBot {
  turnstileToken?: string | null;
  website?: string; // honeypot — kept empty by real users
}

function antiBotBody(ab?: AntiBot) {
  return { turnstile_token: ab?.turnstileToken ?? null, website: ab?.website ?? "" };
}

export const auth = {
  login: (email: string, password: string, ab?: AntiBot) =>
    request<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, ...antiBotBody(ab) }),
    }),

  register: (username: string, email: string, password: string, ab?: AntiBot) =>
    request<UserOut & { access_token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password, ...antiBotBody(ab) }),
    }),

  verifyEmail: (token: string) =>
    request<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: "POST",
    }),

  requestPasswordReset: (email: string) =>
    request<{ message: string }>("/auth/request-password-reset", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
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

  reviews: (id: number, page = 1, size = 20) =>
    request<Page<PublicReview>>(`/works/${id}/reviews?page=${page}&page_size=${size}`),
};

export interface PublicReview {
  id: number;
  rating: number;
  review: string | null;
  created_at: string | null;
  updated_at: string | null;
  user: { id: number; username: string; image_url: string | null };
}

// ── Catalogue ─────────────────────────────────────────────────────────────

export interface GenreItem {
  id: number;
  genre_name: string;
  slug: string;
}

export interface PublisherDetail {
  id: number;
  name: string;
  slug: string | null;
  city: string | null;
  country: string | null;
  founded_year: number | null;
  defunct_year: number | null;
  website: string | null;
  description: string | null;
  parent_publisher_id: number | null;
  image_url: string | null;
}

export interface TagNode {
  id: number;
  tag_name: string;
  slug: string;
  children?: TagNode[];
}

export const catalogue = {
  person: (id: number) => request<Person>(`/persons/${id}`),
  publisher: (id: number) => request<PublisherDetail>(`/publishers/${id}`),
  personWorks: (id: number, page = 1, size = 25) =>
    request<Page<WorkSummary>>(`/persons/${id}/works?page=${page}&page_size=${size}`),
  publisherWorks: (id: number, page = 1, size = 25) =>
    request<Page<WorkSummary>>(`/publishers/${id}/works?page=${page}&page_size=${size}`),
  persons: (q: string, size = 10) =>
    request<Page<{ id: number; name: string; image_url: string | null }>>(
      `/persons?q=${encodeURIComponent(q)}&page_size=${size}`
    ),
  publishers: (q: string, size = 10) =>
    request<Page<{ id: number; name: string }>>(
      `/publishers?q=${encodeURIComponent(q)}&page_size=${size}`
    ),
  // Browse listings (paginated, richer than the picker helpers above)
  personsList: (params: { q?: string; role_type?: string; sort?: string; page?: number } = {}) => {
    const p = new URLSearchParams();
    if (params.q) p.set("q", params.q);
    if (params.role_type) p.set("role_type", params.role_type);
    p.set("sort", params.sort ?? "name_asc");
    p.set("page", String(params.page ?? 1));
    p.set("page_size", "30");
    return request<Page<PersonSummary>>(`/persons?${p}`);
  },
  publishersList: (params: { q?: string; country?: string; page?: number } = {}) => {
    const p = new URLSearchParams();
    if (params.q) p.set("q", params.q);
    if (params.country) p.set("country", params.country);
    p.set("page", String(params.page ?? 1));
    p.set("page_size", "30");
    return request<Page<PublisherSummary>>(`/publishers?${p}`);
  },
  genres: () => request<GenreItem[]>("/genres?in_use=true"),
  allGenres: () => request<GenreItem[]>("/genres"),
  allTags: () =>
    request<{ id: number; tag_name: string; slug: string }[]>("/tags?flat=true"),
  series: () => request<Page<{ id: number; name: string }>>("/series?page_size=100"),
  languages: () => request<{ code: string; name: string }[]>("/languages"),
  allLanguages: () =>
    request<{ code: string; name: string; name_local: string | null }[]>(
      "/languages?active_only=false"
    ),
};

// ── Search ────────────────────────────────────────────────────────────────

export const search = {
  query: (q: string, page = 1) =>
    request<SearchResult>(`/search?q=${encodeURIComponent(q)}&page=${page}&page_size=25`),
};

// ── Image uploads (Cloudflare R2) ─────────────────────────────────────────

export type ImageCategory = "covers" | "illustrations" | "people" | "publishers";

export const uploads = {
  // Multipart file upload — must NOT set Content-Type (browser adds the boundary).
  image: async (file: File, category: ImageCategory): Promise<{ url: string }> => {
    const form = new FormData();
    form.append("category", category);
    form.append("file", file);
    const headers: Record<string, string> = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    const res = await fetch(`${BASE}/uploads/image`, { method: "POST", headers, body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, formatDetail(body.detail) ?? res.statusText, body.detail);
    }
    return res.json();
  },
  // Re-host an external image into R2 by URL.
  fromUrl: (url: string, category: ImageCategory) =>
    request<{ url: string }>("/uploads/image-from-url", {
      method: "POST",
      body: JSON.stringify({ url, category }),
    }),
};

// ── Stats & News ──────────────────────────────────────────────────────────

export const stats = {
  get: () => request<StatsOut>("/stats"),
};

export const news = {
  list: (page = 1, size = 5) =>
    request<Page<NewsItem>>(`/news?page=${page}&page_size=${size}`),
  get: (slug: string) =>
    request<NewsItemFull>(`/news/${slug}`),
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
  /** Existing similar-name records, for pending person/publisher creates. */
  duplicate_candidates?: DuplicateCandidate[];
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at?: string;
}

export interface AuditEntry {
  id: number;
  action: string;
  target_type: string | null;
  target_id: number | null;
  summary: string | null;
  detail: Record<string, unknown> | null;
  created_at: string | null;
  actor: { id: number; username: string } | null;
}

// ── Admin API ─────────────────────────────────────────────────────────────

export const admin = {
  refreshStats: () =>
    request("/admin/stats/refresh", { method: "POST" }),

  news: {
    list: (page = 1) =>
      request<Page<NewsPost>>(`/admin/news?page=${page}&page_size=20`),
    get: (id: number) =>
      request<NewsPost>(`/admin/news/${id}`),
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

  works: {
    setGenres: (lw_id: number, genre_ids: number[]) =>
      request<GenreItem[]>(`/admin/works/${lw_id}/genres`, {
        method: "PUT",
        body: JSON.stringify({ genre_ids }),
      }),
    delete: (lw_id: number) =>
      request(`/admin/works/${lw_id}`, { method: "DELETE" }),
  },

  persons: {
    delete: (id: number) => request(`/admin/persons/${id}`, { method: "DELETE" }),
  },

  publishers: {
    delete: (id: number) => request(`/admin/publishers/${id}`, { method: "DELETE" }),
  },

  series: {
    delete: (id: number) => request(`/admin/series/${id}`, { method: "DELETE" }),
  },

  reviews: {
    delete: (id: number) => request(`/admin/reviews/${id}`, { method: "DELETE" }),
  },

  audit: {
    list: (params: { action?: string; target_type?: string; page?: number } = {}) => {
      const p = new URLSearchParams();
      if (params.action) p.set("action", params.action);
      if (params.target_type) p.set("target_type", params.target_type);
      p.set("page", String(params.page ?? 1));
      p.set("page_size", "50");
      return request<Page<AuditEntry>>(`/admin/audit?${p}`);
    },
  },

  // Tags are created directly (admin endpoint), not via the volunteer queue.
  tags: {
    create: (data: { tag_name: string; slug: string; parent_tag_id?: number | null }) =>
      request<{ id: number; tag_name: string; slug: string }>("/tags", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
};

// ── Volunteer submissions (admin uses these + auto-approve for direct entry) ──

export interface EditSubmission {
  edit_id: number;
  status: string;
}

export interface BookCreateIn {
  title: string;
  description?: string | null;
  language?: string | null;
  original_language?: string | null;
  publication_date?: string | null;
  image_urls?: string[] | null;
  genre_ids?: number[];
  tag_ids?: number[];
  author_ids?: number[];
  editor_ids?: number[];
  illustrator_ids?: number[];
  translator_ids?: number[];
  cover_artist_ids?: number[];
  publisher_ids?: number[];
  publication_year?: number | null;
  series_id?: number | null;
  series_position?: number | null;
  edition_label?: string | null;
  edition_notes?: string | null;
  formats?: {
    format_type: string;
    isbn?: string | null;
    page_count?: number | null;
    cover_image_url?: string | null;
    availability?: string | null;
    price?: string | null;
    currency?: string | null;
    notes?: string | null;
  }[];
}

export interface PersonCreateIn {
  name: string;
  bio?: string | null;
  nationality?: string | null;
  role_type?: string | null;
  birth_date?: string | null;
  image_url?: string | null;
}

export interface PublisherCreateIn {
  name: string;
  city?: string | null;
  country?: string | null;
  founded_year?: number | null;
  website?: string | null;
  description?: string | null;
  image_url?: string | null;
}

export interface BookUpdateIn {
  title?: string;
  description?: string | null;
  language?: string | null;
  original_language?: string | null;
  publication_date?: string | null;
  image_urls?: string[] | null;
  publication_year?: number | null;
  series_id?: number | null;
  series_position?: number | null;
  edition_label?: string | null;
  edition_notes?: string | null;
  genre_ids?: number[];
  tag_ids?: number[];
  author_ids?: number[];
  editor_ids?: number[];
  illustrator_ids?: number[];
  translator_ids?: number[];
  cover_artist_ids?: number[];
  publisher_ids?: number[];
  formats?: ({ format_type: string } & Partial<Omit<BookFormat, "format_type">>)[];
}

export interface PersonUpdateIn {
  name?: string;
  bio?: string | null;
  nationality?: string | null;
  role_type?: string | null;
  birth_date?: string | null;
  image_url?: string | null;
}

export interface PublisherUpdateIn {
  name?: string;
  city?: string | null;
  country?: string | null;
  founded_year?: number | null;
  defunct_year?: number | null;
  website?: string | null;
  description?: string | null;
  image_url?: string | null;
}

export interface SeriesCreateIn {
  name: string;
  description?: string | null;
  slug?: string | null;
}

export const volunteer = {
  submitBook: (data: BookCreateIn) =>
    request<EditSubmission>("/works/books", { method: "POST", body: JSON.stringify(data) }),
  updateBook: (work_id: number, data: BookUpdateIn) =>
    request<EditSubmission>(`/works/books/${work_id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  submitPerson: (data: PersonCreateIn, allowDuplicate = false) =>
    request<EditSubmission>(`/persons${allowDuplicate ? "?allow_duplicate=true" : ""}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updatePerson: (id: number, data: PersonUpdateIn) =>
    request<EditSubmission>(`/persons/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  submitPublisher: (data: PublisherCreateIn, allowDuplicate = false) =>
    request<EditSubmission>(`/publishers${allowDuplicate ? "?allow_duplicate=true" : ""}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updatePublisher: (id: number, data: PublisherUpdateIn) =>
    request<EditSubmission>(`/publishers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  submitSeries: (data: SeriesCreateIn) =>
    request<EditSubmission>("/series", { method: "POST", body: JSON.stringify(data) }),
};

// ── User features ─────────────────────────────────────────────────────────

export const user = {
  shelf: () => request<Page<ShelfEntry>>("/shelf"),
  upsertShelf: (lw_id: number, status: string) =>
    request<ShelfEntry>(`/shelf/${lw_id}`, { method: "PUT", body: JSON.stringify({ status }) }),
  removeFromShelf: (lw_id: number) =>
    request(`/shelf/${lw_id}`, { method: "DELETE" }),

  ratings: (page = 1, size = 100) =>
    request<Page<Rating>>(`/ratings?page=${page}&page_size=${size}`),
  upsertRating: (lw_id: number, rating: number, review?: string | null) =>
    request<Rating>(`/ratings/${lw_id}`, {
      method: "PUT",
      body: JSON.stringify({ rating, review: review ?? null }),
    }),
  deleteRating: (lw_id: number) =>
    request(`/ratings/${lw_id}`, { method: "DELETE" }),
};
