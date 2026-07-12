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
  alias_match?: boolean;
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
  authors: { id: number; name: string; image_url: string | null; credited_as?: string | null }[];
  avg_rating: number | null;
  rating_count: number;
  /** Catalogued issue count — only meaningful for type=MAGAZINE (0 otherwise). */
  issue_count: number;
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
    award: string | null;
    category: { name: string };
    year: number;
    result: string;
    notes: string | null;
  }[];
  related_works: {
    id: number;
    relation_type: string;
    notes?: string | null;
    work: WorkSummary;
  }[];
  book: {
    publication_year: number | null;
    series_id: number | null;
    series_position: number | null;
    edition_label: string | null;
    edition_notes: string | null;
    original_title: string | null;
    original_author: string | null;
    source_relation: string | null;
    formats: BookFormat[];
    publishers: { id: number; name: string }[];
    editors: { id: number; name: string }[];
    translators: { id: number; name: string }[];
    illustrators: { id: number; name: string }[];
    cover_artists: { id: number; name: string }[];
    /** Table of contents for anthologies/collections. */
    stories: {
      story_id: number;
      title: string;
      authors: PersonSummary[];
      page_start: number | null;
      page_end: number | null;
    }[];
    /** Deduped roll-up of every contained story's author/translator credits. */
    contributors: PersonSummary[];
  } | null;
  story: StoryDetail | null;
  comic: ComicDetail | null;
  media: MediaWorkDetail | null;
  magazine_detail: MagazineDetail | null;
}

export interface StoryDetail {
  id: number;
  original_title: string | null;
  original_author: string | null;
  source_relation: string | null;
  page_count: number | null;
  word_count: number | null;
  story_length: string | null;
  authors: PersonSummary[];
  translators: PersonSummary[];
  /** Book anthologies/collections this story appears in (story → book). */
  book_appearances: {
    book_id: number;
    book_title: string | null;
    page_start: number | null;
    page_end: number | null;
  }[];
  /** Resolved original-publication venue (null when unknown). */
  first_published: {
    book_id: number | null;
    issue_id: number | null;
    magazine_id: number | null;
    title: string | null;
    note: string | null;
    pub_date: string | null;
  } | null;
  magazine_appearances: {
    m_issue_id: number;
    magazine_id: number | null;
    magazine_title: string | null;
    issue_label: string | null;
    page_start: number | null;
    page_end: number | null;
  }[];
}

/** Controlled vocabulary for a magazine issue's character. */
export type IssueType =
  | "regular"
  | "special"
  | "annual"
  | "puja_annual"
  | "double"
  | "anniversary";

/** Structured issue-identity fields shared across issue summaries/records. */
export interface IssueIdentity {
  volume_number: number | null;
  issue_number: number | null;
  issue_type: IssueType | null;
  special_title: string | null;
  /** Human display string (native script) — period + volume/number. */
  issue_label: string | null;
}

export interface ComicDetail {
  id: number;
  series_id: number | null;
  series_position: number | null;
  series_position_label: string | null;
  is_color: boolean | null;
  reading_direction: string | null;
  page_count: number | null;
  isbn: string | null;
  collected_in_id: number | null;
  writers: PersonSummary[];
  artists: PersonSummary[];
  inkers: PersonSummary[];
  colorists: PersonSummary[];
  letterers: PersonSummary[];
  translators: PersonSummary[];
  editors: PersonSummary[];
  cover_artists: PersonSummary[];
  publishers: PublisherSummary[];
  formats: ComicFormat[];
}

export interface ComicFormat {
  id: number;
  format_type: string;
  isbn: string | null;
  page_count: number | null;
  publication_date: string | null;
  cover_image_url: string | null;
  price: string | null;
  currency: string | null;
  notes: string | null;
}

export interface MediaWorkDetail {
  id: number;
  runtime_minutes: number | null;
  total_seasons: number | null;
  total_episodes: number | null;
  platform: string | null;
  production_house: string | null;
  country_of_origin: string | null;
  age_rating: string | null;
  source_lw_id: number | null;
  credits: {
    id: number;
    stakeholder: PersonSummary;
    role: string;
    character_name: string | null;
    is_primary: boolean;
    notes: string | null;
  }[];
  adaptations: { id: number; source_work: WorkSummary; adaptation_type: string; notes: string | null }[];
}

export type MagazineStatus = "active" | "ceased" | "hiatus" | "unknown";

export interface MagazineEditorshipInput {
  stakeholder_id: number;
  start_year?: number | null;
  end_year?: number | null;
  role?: string | null;
}

export interface MagazineEditorshipOut {
  id: number;
  start_year: number | null;
  end_year: number | null;
  role: string | null;
  stakeholder: PersonSummary;
}

export interface MagazineFrequencyInput {
  frequency: string;
  start_year?: number | null;
  end_year?: number | null;
}

export interface WorkRelationshipInput {
  other_work_id: number;
  direction:
    | "continues"
    | "continued_by"
    | "sequel_to"
    | "prequel_of"
    | "spinoff_of"
    | "companion_to"
    | "fix_up_of"
    | "retelling_of"
    | "inspired_by"
    | "part_of_series";
  notes?: string | null;
}

/** Controlled vocabulary for a magazine's release cadence. */
export type PublicationFrequency =
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "biannual"
  | "annual"
  | "irregular";

/** One cadence period in a magazine's frequency history. */
export interface MagazineFrequencyOut {
  id: number;
  frequency: PublicationFrequency;
  start_year: number | null;
  end_year: number | null;
}

export interface MagazineDetail {
  id: number;
  issn: string | null;
  frequencies: MagazineFrequencyOut[];
  founded_year: number | null;
  ceased_year: number | null;
  status: MagazineStatus | null;
  place_of_publication: string | null;
  website_url: string | null;
  title: string;
  description: string | null;
  language: string | null;
  localised: Record<string, Record<string, string>>;
  editorships: MagazineEditorshipOut[];
  issues: (IssueIdentity & {
    m_issue_id: number;
    publication_date: string | null;
    cover_image_url: string | null;
  })[];
}

export interface Person {
  id: number;
  name: string;
  bio: string | null;
  gender: string | null;
  image_url: string | null;
  /** Legacy free-text awards note; structured results come from personAwards(). */
  awards: string | null;
  nationality: string | null;
  /** Free-text "primary / known-for" hint only — not authoritative. */
  role_type: string | null;
  /** Native/primary language code ('bn','mr',…) — which localised name form to feature. */
  primary_language: string | null;
  /** Roles derived from real credits across all work types. */
  roles: string[];
  birth_date: string | null;
  end_date: string | null;
  localised: Record<string, Record<string, string>>;
  aliases: { alias: string; alias_type: string | null; language: string | null }[];
  external_links: ExternalLinkItem[];
}

/** A pen name / alias to submit with a person. alias_type is "pen_name" for pen names. */
export interface PersonAliasIn {
  alias: string;
  alias_type?: string | null;
  language?: string | null;
}

export interface StatsOut {
  stats: {
    total_works?: number;
    total_authors?: number;
    total_books?: number;
    total_stories?: number;
    total_magazines?: number;
    total_magazine_issues?: number;
    total_publishers?: number;
    total_languages?: number;
    total_users?: number;
    visitor_count?: number;
    [key: string]: number | undefined;
  };
  refreshed_at: string | null;
}

export interface InsightItem {
  label: string;
  count: number;
  id?: number | string | null;
}

export interface InsightsOut {
  total_works: number;
  total_magazine_issues: number;
  by_genre: InsightItem[];
  by_language: InsightItem[];
  top_publishers: InsightItem[];
  top_authors: InsightItem[];
  by_content_type: InsightItem[];
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
  /** Roles derived from real credits across all work types. */
  roles?: string[];
  localised?: Record<string, Record<string, string>>;
  /** Byline as printed on this credit (pen name); null/absent = canonical name. */
  credited_as?: string | null;
}

export interface PublisherSummary {
  id: number;
  name: string;
  slug: string | null;
  city: string | null;
  country: string | null;
  image_url: string | null;
}

export interface BookSeriesOut {
  id: number;
  name: string;
  description: string | null;
  slug: string | null;
  localised: Record<string, Record<string, string>>;
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
  agreed_terms_at?: string | null;
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
      body: JSON.stringify({ username, email, password, agree_terms: true, ...antiBotBody(ab) }),
    }),

  /** Record acceptance of the contributor agreement for an existing account. */
  agreeTerms: () => request<UserOut>("/users/me/agree-terms", { method: "POST" }),

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

/** One row in the global magazine-issue browse (GET /works/magazines/issues). */
export interface IssueBrowseItem extends IssueIdentity {
  m_issue_id: number;
  magazine_id: number | null;
  magazine_title: string | null;
  publication_date: string | null;
  cover_image_url: string | null;
  story_count: number;
}

export const works = {
  list: (params: {
    type?: string;
    content_type?: string;
    lang?: string;
    genre_slug?: string;
    tag_slug?: string;
    sort?: string;
    page?: number;
    page_size?: number;
  } = {}) => {
    const q = new URLSearchParams();
    if (params.type) q.set("type", params.type);
    if (params.content_type) q.set("content_type", params.content_type);
    if (params.lang) q.set("lang", params.lang);
    if (params.genre_slug) q.set("genre_slug", params.genre_slug);
    if (params.tag_slug) q.set("tag_slug", params.tag_slug);
    if (params.sort) q.set("sort", params.sort);
    q.set("page", String(params.page ?? 1));
    q.set("page_size", String(params.page_size ?? 25));
    return request<Page<WorkSummary>>(`/works?${q}`);
  },

  get: (id: number) => request<WorkDetail>(`/works/${id}`),

  magazineIssues: (id: number) =>
    request<MagazineIssueFull[]>(`/works/magazines/${id}/issues`),

  browseIssues: (
    params: { q?: string; magazine_id?: number; sort?: string; page?: number; page_size?: number } = {}
  ) => {
    const p = new URLSearchParams();
    if (params.q) p.set("q", params.q);
    if (params.magazine_id) p.set("magazine_id", String(params.magazine_id));
    if (params.sort) p.set("sort", params.sort);
    p.set("page", String(params.page ?? 1));
    p.set("page_size", String(params.page_size ?? 25));
    return request<Page<IssueBrowseItem>>(`/works/magazines/issues?${p}`);
  },

  reviews: (id: number, page = 1, size = 20) =>
    request<Page<PublicReview>>(`/works/${id}/reviews?page=${page}&page_size=${size}`),

  // Translation editions of a work, in BOTH directions (its translations + the
  // original it was translated from). `work` is always the other work.
  translations: (id: number) =>
    request<TranslationEdition[]>(`/works/${id}/translations`),
};

export interface TranslationEdition {
  link_id: number;
  role: "translation" | "original";
  work: WorkSummary;
  original_language: string | null;
  target_language: string | null;
  translator_stakeholder_id: number | null;
  translator: { id: number; name: string } | null;
  translation_notes: string | null;
  published_year: number | null;
}

export interface TranslationLinkInput {
  translated_lw_id: number;
  this_work_role?: "original" | "translation";
  original_language?: string | null;
  target_language?: string | null;
  translator_stakeholder_id?: number | null;
  translation_notes?: string | null;
  published_year?: number | null;
}

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
  primary_language: string | null;
  localised: Record<string, Record<string, string>>;
}

export interface TagNode {
  id: number;
  tag_name: string;
  slug: string;
  parent_tag_id?: number | null;
  localised?: Record<string, Record<string, string>>;
  children?: TagNode[];
}

export interface PersonAward {
  id: number;
  award: string;
  category: string;
  category_id: number;
  year: number;
  result: string;
  notes: string | null;
  lw_id: number | null;
  work_title: string | null;
  /** True when the award went to one of the person's works, not to them directly. */
  for_work: boolean;
}

export interface AwardCategoryItem {
  id: number;
  name: string;
  description?: string | null;
}

export interface AwardTypeItem {
  id: number;
  name: string;
  slug: string | null;
  country: string | null;
  language: string | null;
  awarding_body: string | null;
  inaugural_year: number | null;
  discontinued_year: number | null;
  website: string | null;
  notes: string | null;
  is_active: boolean;
  categories: AwardCategoryItem[];
}

/** One award result attached to a work (from GET /works/{id}/awards). */
export interface WorkAward {
  id: number;
  award: string | null;
  category: AwardCategoryItem;
  year: number;
  result: string;
  notes: string | null;
  lw_id: number | null;
  stakeholder_id: number | null;
  stakeholder: { id: number; name: string } | null;
}

export interface ExternalLinkItem {
  id: number;
  link_type: string;
  url: string;
  label: string | null;
}

/** One award result rolled up for the public award page. */
export interface AwardWinner {
  id: number;
  category: string;
  year: number;
  result: string;
  notes: string | null;
  lw_id: number | null;
  work_title: string | null;
  stakeholder_id: number | null;
  person_name: string | null;
}

/** Award-result payload (create). One of work/person target is injected by the route. */
export interface AwardResultInput {
  category_id: number;
  year: number;
  result: string;
  notes?: string | null;
  /** For a work award crediting a specific person (e.g. best translation). */
  stakeholder_id?: number | null;
  /** For a person award tied to a specific work. */
  lw_id?: number | null;
}

export interface AwardResultUpdateInput {
  category_id?: number;
  year?: number;
  result?: string;
  notes?: string | null;
}

export interface ExternalLinkInput {
  link_type: string;
  url: string;
  label?: string | null;
}

export const catalogue = {
  person: (id: number) => request<Person>(`/persons/${id}`),
  personAwards: (id: number) => request<PersonAward[]>(`/persons/${id}/awards`),
  workAwards: (id: number) => request<WorkAward[]>(`/works/${id}/awards`),
  awardTypes: () => request<AwardTypeItem[]>(`/awards?active_only=false`),
  awardTypesActive: () => request<AwardTypeItem[]>(`/awards`),
  awardResults: (awardId: number) => request<AwardWinner[]>(`/awards/${awardId}/results`),
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
  tagTree: () => request<TagNode[]>("/tags"),
  series: () => request<Page<{ id: number; name: string }>>("/series?page_size=100"),
  // Browse listing + detail for the public Series pages.
  seriesList: (params: { q?: string; page?: number } = {}) => {
    const p = new URLSearchParams();
    if (params.q) p.set("q", params.q);
    p.set("page", String(params.page ?? 1));
    p.set("page_size", "30");
    return request<Page<BookSeriesOut>>(`/series?${p}`);
  },
  seriesDetail: (id: number) => request<BookSeriesOut>(`/series/${id}`),
  seriesWorks: (
    id: number,
    params: { sort?: "position_asc" | "date_asc" | "title_asc"; page?: number } = {}
  ) => {
    const p = new URLSearchParams();
    p.set("sort", params.sort ?? "position_asc");
    p.set("page", String(params.page ?? 1));
    p.set("page_size", "50");
    return request<Page<WorkSummary>>(`/series/${id}/works?${p}`);
  },
  // Browse filter: only languages that actually have works (self-maintaining).
  languages: () => request<{ code: string; name: string }[]>("/languages?in_use=true"),
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
  insights: () => request<InsightsOut>("/stats/insights"),
  recordVisit: () =>
    request<{ visitor_count: number }>("/stats/visit", { method: "POST" }),
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

/** One changed field in an UPDATE diff: before (`from`) and after (`to`). */
export interface DiffChange {
  from?: unknown;
  to: unknown;
}

/** A field whose live value drifted from the submitted base, blocking a clean approve. */
export interface EditConflict {
  field: string;
  base: unknown;
  current: unknown;
  submitted: unknown;
}

export interface EditLogEntry {
  id: number;
  table_name: string;
  record_id: number | null;
  action: string;
  status: string;
  payload: Record<string, unknown>;
  /** UPDATE only: {field: {from, to}}. Null for CREATE/DELETE. */
  diff: Record<string, DiffChange> | null;
  submitter_note: string | null;
  reviewer_note: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  submitted_by: { id: number; username: string };
  reviewed_by: { id: number; username: string } | null;
  /** Existing similar-name records, for pending person/publisher creates. */
  duplicate_candidates?: DuplicateCandidate[];
  /** Populated on the review-detail endpoint when a pending UPDATE's base drifted. */
  conflicts?: EditConflict[];
}

export interface ConflictDetail {
  message: string;
  conflicts: EditConflict[];
}

/**
 * If `err` is a 409 base-conflict from approving an UPDATE, return its structured
 * detail (the drifted fields); otherwise null.
 */
export function getConflictError(err: unknown): ConflictDetail | null {
  if (err instanceof ApiError && err.status === 409) {
    const d = err.detail as Partial<ConflictDetail> | undefined;
    if (d && Array.isArray(d.conflicts)) return d as ConflictDetail;
  }
  return null;
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

export interface VolunteerRequest {
  id: number;
  user: { id: number; username: string };
  status: "pending" | "approved" | "rejected";
  message: string | null;
  reviewer_note: string | null;
  reviewed_by: { id: number; username: string } | null;
  created_at: string | null;
  reviewed_at: string | null;
}

export interface PendingCounts {
  volunteer_requests: number;
  edit_queue: number;
}

// ── Duplicate finder (admin) ──────────────────────────────────────────────

/** Category tabs offered by the scanner. */
export type DuplicateScanKind =
  | "person"
  | "publisher"
  | "book"
  | "story"
  | "magazine"
  | "issue";

/** Id namespace used by merge/dismiss (all work types share "work"). */
export type DuplicateMergeKind = "person" | "publisher" | "work" | "issue";

export interface DuplicateMember {
  id: number;
  label: string;
  native: string | null;
  ref_count: number;
  has_image: boolean;
  detail: string;
  language: string | null;
  year: number | null;
  authors: string[];
  content_type: string | null;
  magazine_id: number | null;
}

export interface DuplicatePair {
  a: number;
  b: number;
  score: number;
  flags: string[];
}

export interface DuplicateCluster {
  members: DuplicateMember[];
  pairs: DuplicatePair[];
}

export interface DuplicateScanResult {
  kind: DuplicateScanKind;
  merge_kind: DuplicateMergeKind;
  clusters: DuplicateCluster[];
  scanned: number;
  dismissed_pairs: number;
}

export interface DuplicateMergeResult {
  kept_id: number;
  merged_ids: number[];
  repointed: Record<string, number>;
  dropped_conflicts: number;
  filled_fields: string[];
  aliases_added: number;
}

export interface DismissedPair {
  id: number;
  entity_kind: DuplicateMergeKind;
  low_id: number;
  high_id: number;
  low_label: string | null;
  high_label: string | null;
  created_at: string | null;
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
    get: (id: number) => request<EditLogEntry>(`/admin/queue/${id}`),
    review: (id: number, approve: boolean, reviewer_note?: string, force = false) =>
      request<EditLogEntry>(`/admin/queue/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ approve, reviewer_note: reviewer_note ?? null, force }),
      }),
  },

  users: {
    list: (page = 1) =>
      request<Page<AdminUser>>(`/admin/users?page=${page}&page_size=25`),
    update: (id: number, data: { role?: string; is_active?: boolean }) =>
      request<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },

  volunteerRequests: {
    list: (status: "pending" | "approved" | "rejected" = "pending", page = 1) =>
      request<Page<VolunteerRequest>>(
        `/admin/volunteer-requests?status=${status}&page=${page}&page_size=25`
      ),
    review: (id: number, approve: boolean, reviewer_note?: string) =>
      request<VolunteerRequest>(`/admin/volunteer-requests/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ approve, reviewer_note: reviewer_note ?? null }),
      }),
  },

  pendingCounts: () => request<PendingCounts>("/admin/pending-counts"),

  works: {
    setGenres: (lw_id: number, genre_ids: number[]) =>
      request<GenreItem[]>(`/admin/works/${lw_id}/genres`, {
        method: "PUT",
        body: JSON.stringify({ genre_ids }),
      }),
    setTags: (lw_id: number, tag_ids: number[]) =>
      request<{ id: number; tag_name: string; slug: string }[]>(
        `/admin/works/${lw_id}/tags`,
        { method: "PUT", body: JSON.stringify({ tag_ids }) }
      ),
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

  issues: {
    delete: (id: number) => request(`/admin/issues/${id}`, { method: "DELETE" }),
  },

  translations: {
    delete: (linkId: number) =>
      request(`/works/translations/${linkId}`, { method: "DELETE" }),
  },

  awards: {
    deleteResult: (resultId: number) =>
      request(`/awards/results/${resultId}`, { method: "DELETE" }),
    createType: (data: {
      name: string;
      slug?: string | null;
      country?: string | null;
      language?: string | null;
      awarding_body?: string | null;
      inaugural_year?: number | null;
      discontinued_year?: number | null;
      website?: string | null;
      notes?: string | null;
      is_active?: boolean;
    }) => request<AwardTypeItem>("/awards", { method: "POST", body: JSON.stringify(data) }),
    updateType: (
      id: number,
      data: Partial<{
        name: string;
        slug: string | null;
        country: string | null;
        language: string | null;
        awarding_body: string | null;
        inaugural_year: number | null;
        discontinued_year: number | null;
        website: string | null;
        notes: string | null;
        is_active: boolean;
      }>
    ) => request<AwardTypeItem>(`/awards/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteType: (id: number) => request(`/awards/${id}`, { method: "DELETE" }),
    createCategory: (awardId: number, data: { name: string; description?: string | null }) =>
      request<AwardCategoryItem>(`/awards/${awardId}/categories`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateCategory: (
      awardId: number,
      catId: number,
      data: Partial<{ name: string; description: string | null }>
    ) =>
      request<AwardCategoryItem>(`/awards/${awardId}/categories/${catId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    deleteCategory: (awardId: number, catId: number) =>
      request(`/awards/${awardId}/categories/${catId}`, { method: "DELETE" }),
  },

  links: {
    delete: (linkId: number) => request(`/links/${linkId}`, { method: "DELETE" }),
  },

  relationships: {
    delete: (relId: number) =>
      request(`/works/relationships/${relId}`, { method: "DELETE" }),
  },

  reviews: {
    delete: (id: number) => request(`/admin/reviews/${id}`, { method: "DELETE" }),
  },

  duplicates: {
    // The full-catalogue fuzzy scan can take up to ~1 min on the bigger kinds.
    scan: (kind: DuplicateScanKind) =>
      request<DuplicateScanResult>(`/admin/duplicates?kind=${kind}`),
    merge: (merge_kind: DuplicateMergeKind, keep_id: number, merge_ids: number[]) =>
      request<DuplicateMergeResult>("/admin/duplicates/merge", {
        method: "POST",
        body: JSON.stringify({ merge_kind, keep_id, merge_ids }),
      }),
    dismiss: (merge_kind: DuplicateMergeKind, ids: number[]) =>
      request<DismissedPair[]>("/admin/duplicates/dismiss", {
        method: "POST",
        body: JSON.stringify({ merge_kind, ids }),
      }),
    listDismissed: (merge_kind?: DuplicateMergeKind) =>
      request<DismissedPair[]>(
        `/admin/duplicates/dismissed${merge_kind ? `?merge_kind=${merge_kind}` : ""}`
      ),
    undismiss: (id: number) =>
      request(`/admin/duplicates/dismissed/${id}`, { method: "DELETE" }),
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
    delete: (id: number) => request(`/tags/${id}`, { method: "DELETE" }),
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
  content_type?: string | null;
  language?: string | null;
  original_language?: string | null;
  publication_date?: string | null;
  image_urls?: string[] | null;
  genre_ids?: number[];
  tag_ids?: number[];
  author_ids?: number[];
  /** {stakeholder_id: byline-as-printed} for author/translator credits. */
  credited_as?: Record<number, string>;
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
  original_title?: string | null;
  original_author?: string | null;
  source_relation?: string | null;
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
  /** Optional manual localised overrides: { field: { lang: value } }, e.g. { title: { "bn-Latn": "…" } }. */
  localised?: Record<string, Record<string, string>>;
}

export interface StoryCreateIn {
  title: string;
  description?: string | null;
  language?: string | null;
  original_language?: string | null;
  publication_date?: string | null;
  content_type?: string | null;
  image_urls?: string[] | null;
  genre_ids?: number[];
  tag_ids?: number[];
  author_ids?: number[];
  /** {stakeholder_id: byline-as-printed} for author/translator credits. */
  credited_as?: Record<number, string>;
  translator_ids?: number[];
  /** Book anthologies/collections this story appears in. */
  book_ids?: number[];
  /** Magazine issues this story appears in. */
  magazine_issue_ids?: number[];
  original_title?: string | null;
  original_author?: string | null;
  source_relation?: string | null;
  page_count?: number | null;
  word_count?: number | null;
  story_length?: string | null;
  /** Structured "first published in" — set at most one of book/issue id. */
  first_published_book_id?: number | null;
  first_published_issue_id?: number | null;
  first_published_note?: string | null;
  first_published_date?: string | null;
  /** Optional manual localised overrides: { field: { lang: value } }, e.g. { title: { "bn-Latn": "…" } }. */
  localised?: Record<string, Record<string, string>>;
}

export interface StoryUpdateIn {
  title?: string;
  description?: string | null;
  language?: string | null;
  original_language?: string | null;
  publication_date?: string | null;
  content_type?: string | null;
  image_urls?: string[] | null;
  genre_ids?: number[];
  tag_ids?: number[];
  author_ids?: number[];
  /** {stakeholder_id: byline-as-printed} for author/translator credits. */
  credited_as?: Record<number, string>;
  translator_ids?: number[];
  book_ids?: number[];
  magazine_issue_ids?: number[];
  original_title?: string | null;
  original_author?: string | null;
  source_relation?: string | null;
  page_count?: number | null;
  word_count?: number | null;
  story_length?: string | null;
  /** Structured "first published in" — set at most one of book/issue id. */
  first_published_book_id?: number | null;
  first_published_issue_id?: number | null;
  first_published_note?: string | null;
  first_published_date?: string | null;
  localised?: Record<string, Record<string, string>>;
}

export interface ComicCreateIn {
  title: string;
  description?: string | null;
  language?: string | null;
  original_language?: string | null;
  publication_date?: string | null;
  content_type?: string | null;
  image_urls?: string[] | null;
  genre_ids?: number[];
  tag_ids?: number[];
  /** Writers double as the work-level authors (shown in browse/cards). */
  writer_ids?: number[];
  artist_ids?: number[];
  inker_ids?: number[];
  colorist_ids?: number[];
  letterer_ids?: number[];
  translator_ids?: number[];
  editor_ids?: number[];
  cover_artist_ids?: number[];
  publisher_ids?: number[];
  series_id?: number | null;
  series_position?: number | null;
  is_color?: boolean | null;
  reading_direction?: "ltr" | "rtl" | null;
  page_count?: number | null;
  isbn?: string | null;
  formats?: ComicFormatInput[];
  /** Optional manual localised overrides: { field: { lang: value } }. */
  localised?: Record<string, Record<string, string>>;
}

export interface ComicFormatInput {
  format_type: string;
  isbn?: string | null;
  page_count?: number | null;
  publication_date?: string | null;
  cover_image_url?: string | null;
  price?: string | null;
  currency?: string | null;
  notes?: string | null;
}

/** All fields optional — a present field replaces, an absent one is left unchanged. */
export type ComicUpdateIn = Partial<ComicCreateIn>;

export interface MagazineCreateIn {
  title: string;
  description?: string | null;
  language?: string | null;
  issn?: string | null;
  founded_year?: number | null;
  ceased_year?: number | null;
  status?: MagazineStatus | null;
  place_of_publication?: string | null;
  website_url?: string | null;
  editorships?: MagazineEditorshipInput[];
  frequencies?: MagazineFrequencyInput[];
  image_urls?: string[] | null;
  genre_ids?: number[];
  tag_ids?: number[];
  localised?: Record<string, Record<string, string>>;
}

export interface MagazineUpdateIn {
  title?: string;
  description?: string | null;
  language?: string | null;
  image_urls?: string[] | null;
  issn?: string | null;
  founded_year?: number | null;
  ceased_year?: number | null;
  status?: MagazineStatus | null;
  place_of_publication?: string | null;
  website_url?: string | null;
  /** Replace-semantics: a present list (even []) replaces all editorships / frequencies. */
  editorships?: MagazineEditorshipInput[];
  frequencies?: MagazineFrequencyInput[];
  genre_ids?: number[];
  tag_ids?: number[];
  localised?: Record<string, Record<string, string>>;
}

export interface ScanInput {
  url: string;
  archive_host?: string | null;
  scan_type?: "full_issue" | "partial" | "text_only" | "cover_only" | null;
  legal_status?: "open_access" | "public_domain" | "permission" | "unknown" | null;
  quality_note?: string | null;
}

export interface MagazineIssueCreateIn {
  magazine_id: number;
  volume_number?: number | null;
  issue_number?: number | null;
  issue_type?: IssueType | null;
  special_title?: string | null;
  issue_label?: string | null;
  synopsis?: string | null;
  publication_date?: string | null;
  cover_image_url?: string | null;
  cover_artist_ids?: number[];
  editor_ids?: number[];
  illustrator_ids?: number[];
  translator_ids?: number[];
  publisher_ids?: number[];
  scans?: ScanInput[];
  stories?: { story_id: number; page_start?: number | null; page_end?: number | null }[];
}

export interface MagazineIssueUpdateIn {
  volume_number?: number | null;
  issue_number?: number | null;
  issue_type?: IssueType | null;
  special_title?: string | null;
  issue_label?: string | null;
  synopsis?: string | null;
  publication_date?: string | null;
  cover_image_url?: string | null;
  cover_artist_ids?: number[];
  editor_ids?: number[];
  illustrator_ids?: number[];
  translator_ids?: number[];
  publisher_ids?: number[];
  scans?: ScanInput[];
  stories?: { story_id: number; page_start?: number | null; page_end?: number | null }[];
}

/** Full issue record returned by GET /magazines/:id/issues. */
export interface MagazineIssueFull extends IssueIdentity {
  m_issue_id: number;
  magazine_id: number | null;
  synopsis: string | null;
  publication_date: string | null;
  cover_image_url: string | null;
  cover_artists: PersonSummary[];
  editors: PersonSummary[];
  illustrators: PersonSummary[];
  translators: PersonSummary[];
  publishers: PublisherSummary[];
  scans: {
    id: number;
    url: string;
    archive_host: string | null;
    scan_type: string | null;
    legal_status: string | null;
    quality_note: string | null;
  }[];
  stories: {
    story_id: number;
    title: string;
    authors: PersonSummary[];
    page_start: number | null;
    page_end: number | null;
  }[];
  /** Deduped roll-up of every contained story's author/translator credits. */
  contributors: PersonSummary[];
}

export interface PersonCreateIn {
  name: string;
  bio?: string | null;
  nationality?: string | null;
  role_type?: string | null;
  birth_date?: string | null;
  end_date?: string | null;
  image_url?: string | null;
  primary_language?: string | null;
  /** Manual localised overrides: { field: { lang: value } }, e.g. { name: { bn: "সত্যজিৎ রায়" } }. */
  localised?: Record<string, Record<string, string>>;
  /** Pen names / aliases for the person. */
  aliases?: PersonAliasIn[];
}

export interface PublisherCreateIn {
  name: string;
  city?: string | null;
  country?: string | null;
  founded_year?: number | null;
  defunct_year?: number | null;
  website?: string | null;
  description?: string | null;
  image_url?: string | null;
  primary_language?: string | null;
  /** Manual localised overrides: { field: { lang: value } }, e.g. { name: { bn: "…" } }. */
  localised?: Record<string, Record<string, string>>;
}

export interface BookUpdateIn {
  title?: string;
  description?: string | null;
  content_type?: string | null;
  language?: string | null;
  original_language?: string | null;
  publication_date?: string | null;
  image_urls?: string[] | null;
  publication_year?: number | null;
  series_id?: number | null;
  series_position?: number | null;
  edition_label?: string | null;
  edition_notes?: string | null;
  original_title?: string | null;
  original_author?: string | null;
  source_relation?: string | null;
  genre_ids?: number[];
  tag_ids?: number[];
  author_ids?: number[];
  /** {stakeholder_id: byline-as-printed} for author/translator credits. */
  credited_as?: Record<number, string>;
  editor_ids?: number[];
  illustrator_ids?: number[];
  translator_ids?: number[];
  cover_artist_ids?: number[];
  publisher_ids?: number[];
  formats?: ({ format_type: string } & Partial<Omit<BookFormat, "format_type">>)[];
  /** Manual localised overrides: { field: { lang: value } }, e.g. { title: { "bn-Latn": "…" } }. */
  localised?: Record<string, Record<string, string>>;
}

export interface PersonUpdateIn {
  name?: string;
  bio?: string | null;
  nationality?: string | null;
  role_type?: string | null;
  birth_date?: string | null;
  end_date?: string | null;
  image_url?: string | null;
  primary_language?: string | null;
  localised?: Record<string, Record<string, string>>;
  /** Full set of pen names / aliases (replace-semantics); omit to leave unchanged. */
  aliases?: PersonAliasIn[];
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
  primary_language?: string | null;
  localised?: Record<string, Record<string, string>>;
}

export interface SeriesCreateIn {
  name: string;
  description?: string | null;
  slug?: string | null;
}

export interface SeriesUpdateIn {
  name?: string | null;
  description?: string | null;
  slug?: string | null;
}

/** Append a reviewer note as a query param (submission metadata, not part of the body). */
function noteQuery(note?: string | null): string {
  return note && note.trim() ? `?note=${encodeURIComponent(note.trim())}` : "";
}

export const volunteer = {
  submitBook: (data: BookCreateIn) =>
    request<EditSubmission>("/works/books", { method: "POST", body: JSON.stringify(data) }),
  updateBook: (work_id: number, data: BookUpdateIn, note?: string | null) =>
    request<EditSubmission>(`/works/books/${work_id}${noteQuery(note)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  submitStory: (data: StoryCreateIn) =>
    request<EditSubmission>("/works/stories", { method: "POST", body: JSON.stringify(data) }),
  updateStory: (work_id: number, data: StoryUpdateIn, note?: string | null) =>
    request<EditSubmission>(`/works/stories/${work_id}${noteQuery(note)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  submitComic: (data: ComicCreateIn) =>
    request<EditSubmission>("/works/comics", { method: "POST", body: JSON.stringify(data) }),
  updateComic: (work_id: number, data: ComicUpdateIn, note?: string | null) =>
    request<EditSubmission>(`/works/comics/${work_id}${noteQuery(note)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  submitMagazine: (data: MagazineCreateIn) =>
    request<EditSubmission>("/works/magazines", { method: "POST", body: JSON.stringify(data) }),
  updateMagazine: (work_id: number, data: MagazineUpdateIn, note?: string | null) =>
    request<EditSubmission>(`/works/magazines/${work_id}${noteQuery(note)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  submitMagazineIssue: (data: MagazineIssueCreateIn) =>
    request<EditSubmission>("/works/magazines/issues", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateMagazineIssue: (issue_id: number, data: MagazineIssueUpdateIn, note?: string | null) =>
    request<EditSubmission>(`/works/magazines/issues/${issue_id}${noteQuery(note)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  submitPerson: (data: PersonCreateIn, allowDuplicate = false) =>
    request<EditSubmission>(`/persons${allowDuplicate ? "?allow_duplicate=true" : ""}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updatePerson: (id: number, data: PersonUpdateIn, note?: string | null) =>
    request<EditSubmission>(`/persons/${id}${noteQuery(note)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  submitPublisher: (data: PublisherCreateIn, allowDuplicate = false) =>
    request<EditSubmission>(`/publishers${allowDuplicate ? "?allow_duplicate=true" : ""}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updatePublisher: (id: number, data: PublisherUpdateIn, note?: string | null) =>
    request<EditSubmission>(`/publishers/${id}${noteQuery(note)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  submitSeries: (data: SeriesCreateIn) =>
    request<EditSubmission>("/series", { method: "POST", body: JSON.stringify(data) }),
  addTranslation: (workId: number, data: TranslationLinkInput) =>
    request<EditSubmission>(`/works/${workId}/translations`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  addWorkRelationship: (workId: number, data: WorkRelationshipInput) =>
    request<EditSubmission>(`/works/${workId}/relationships`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Awards — create goes through the review queue (auto-approved for admins by the caller).
  addWorkAward: (workId: number, data: AwardResultInput) =>
    request<EditSubmission>(`/works/${workId}/awards`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  addPersonAward: (personId: number, data: AwardResultInput) =>
    request<EditSubmission>(`/persons/${personId}/awards`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateAward: (resultId: number, data: AwardResultUpdateInput, note?: string | null) =>
    request<EditSubmission>(`/awards/results/${resultId}${noteQuery(note)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // External links — create via the work/person sub-route, edit by row id.
  addWorkLink: (workId: number, data: ExternalLinkInput) =>
    request<EditSubmission>(`/works/${workId}/links`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  addPersonLink: (personId: number, data: ExternalLinkInput) =>
    request<EditSubmission>(`/persons/${personId}/links`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateLink: (linkId: number, data: Partial<ExternalLinkInput>, note?: string | null) =>
    request<EditSubmission>(`/links/${linkId}${noteQuery(note)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  updateSeries: (id: number, data: SeriesUpdateIn, note?: string | null) =>
    request<EditSubmission>(`/series/${id}${noteQuery(note)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // A volunteer's own submission history (read-only) + withdraw a pending one.
  mySubmissions: (status?: "pending" | "approved" | "rejected", page = 1) =>
    request<Page<EditLogEntry>>(
      `/volunteer/submissions?page=${page}&page_size=25${status ? `&status=${status}` : ""}`
    ),
  withdrawSubmission: (id: number) =>
    request(`/volunteer/submissions/${id}`, { method: "DELETE" }),

  // Self-service volunteer-access request (any signed-in USER).
  requestAccess: (message?: string | null) =>
    request<VolunteerRequest>("/volunteer/request", {
      method: "POST",
      body: JSON.stringify({ message: message ?? null }),
    }),
  myRequest: () => request<VolunteerRequest | null>("/volunteer/request/mine"),
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
