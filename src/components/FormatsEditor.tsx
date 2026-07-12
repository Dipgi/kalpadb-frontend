const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

export const BOOK_FORMAT_TYPES = ["paperback", "hardcover", "ebook"];
export const COMIC_FORMAT_TYPES = [
  "single_issue",
  "trade_paperback",
  "hardcover",
  "omnibus",
  "digital",
  "webcomic",
];

const AVAILABILITY_OPTIONS = [
  { value: "", label: "Unknown" },
  { value: "in_print", label: "In print" },
  { value: "out_of_print", label: "Out of print" },
  { value: "digital_only", label: "Digital only" },
  { value: "rare", label: "Rare" },
];

/**
 * One editable format row. All edited fields are strings (form inputs);
 * `publication_date` / `cover_image_url` are carried through untouched so an
 * edit round-trip doesn't drop fields this form doesn't expose.
 */
export interface FormatRow {
  format_type: string;
  isbn: string;
  page_count: string;
  availability: string;
  price: string;
  currency: string;
  notes: string;
  publication_date?: string | null;
  cover_image_url?: string | null;
}

export function emptyFormatRow(defaultType = "paperback"): FormatRow {
  return {
    format_type: defaultType,
    isbn: "",
    page_count: "",
    availability: "",
    price: "",
    currency: "",
    notes: "",
  };
}

/** Existing format shape shared by BookFormat and ComicFormat (availability optional). */
interface ExistingFormat {
  format_type: string;
  isbn: string | null;
  page_count: number | null;
  availability?: string | null;
  price: string | null;
  currency: string | null;
  notes: string | null;
  publication_date: string | null;
  cover_image_url: string | null;
}

/** Build editable rows from a work's existing formats (for edit forms). */
export function formatRowsFromExisting(formats: ExistingFormat[] | undefined | null): FormatRow[] {
  return (formats ?? []).map((f) => ({
    format_type: f.format_type,
    isbn: f.isbn ?? "",
    page_count: f.page_count?.toString() ?? "",
    availability: f.availability ?? "",
    price: f.price ?? "",
    currency: f.currency ?? "",
    notes: f.notes ?? "",
    publication_date: f.publication_date,
    cover_image_url: f.cover_image_url,
  }));
}

/** Has the user actually entered anything beyond the default format type? */
function rowHasDetail(r: FormatRow): boolean {
  return Boolean(
    r.isbn.trim() ||
      r.page_count.trim() ||
      r.availability ||
      r.price.trim() ||
      r.currency.trim() ||
      r.notes.trim() ||
      r.cover_image_url,
  );
}

/**
 * Convert rows to the API payload. On add forms a lone, untouched row is
 * treated as "no format" (matching the old optional-format behaviour); once
 * the user adds a second row or fills any detail, every row with a type is
 * kept — so e.g. hardcover + ebook with no extra details are both recorded.
 *
 * On edit forms pass `keepAll` so an existing detail-less format isn't dropped
 * on save; an empty row list then means "remove all formats" (replace-semantics).
 *
 * `includeAvailability=false` omits the availability field (comics don't model it).
 */
export function formatRowsToPayload(rows: FormatRow[], keepAll = false, includeAvailability = true) {
  const keep = (r: FormatRow) =>
    r.format_type && (keepAll || rows.length > 1 || rowHasDetail(r));
  return rows.filter(keep).map((r) => ({
    format_type: r.format_type,
    isbn: r.isbn.trim() || null,
    page_count: r.page_count ? Number(r.page_count) : null,
    ...(includeAvailability ? { availability: r.availability || null } : {}),
    price: r.price.trim() || null,
    currency: r.currency.trim() || null,
    notes: r.notes.trim() || null,
    publication_date: r.publication_date ?? null,
    cover_image_url: r.cover_image_url ?? null,
  }));
}

interface Props {
  value: FormatRow[];
  onChange: (rows: FormatRow[]) => void;
  /** Format type options (defaults to book formats). */
  formatTypes?: string[];
  /** Show the availability field (books yes; comics don't model it). */
  showAvailability?: boolean;
  /** Optional hint shown beside the "Formats" label. */
  hint?: string;
}

export default function FormatsEditor({
  value,
  onChange,
  formatTypes = BOOK_FORMAT_TYPES,
  showAvailability = true,
  hint = "Hardcover, paperback & ebook of the same edition go here as separate rows.",
}: Props) {
  const defaultType = formatTypes[0] ?? "paperback";
  function update(i: number, patch: Partial<FormatRow>) {
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...value, emptyFormatRow(defaultType)]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className={labelCls + " mb-0"}>Formats</label>
        <span className="text-xs text-gray-400">{hint}</span>
      </div>

      {value.length === 0 && <p className="text-xs text-gray-400">No formats added.</p>}

      {value.map((row, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Format {i + 1}</span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>

          <div className={`grid grid-cols-2 gap-3 ${showAvailability ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
            <div>
              <label className={labelCls}>Type</label>
              <select
                value={row.format_type}
                onChange={(e) => update(i, { format_type: e.target.value })}
                className={inputCls}
              >
                {formatTypes.map((f) => (
                  <option key={f} value={f}>
                    {f.charAt(0).toUpperCase() + f.slice(1).replace(/_/g, " ")}
                  </option>
                ))}
                {!formatTypes.includes(row.format_type) && (
                  <option value={row.format_type}>{row.format_type}</option>
                )}
              </select>
            </div>
            <div>
              <label className={labelCls}>Pages</label>
              <input
                type="number"
                min={1}
                value={row.page_count}
                onChange={(e) => update(i, { page_count: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>ISBN</label>
              <input
                value={row.isbn}
                onChange={(e) => update(i, { isbn: e.target.value })}
                className={inputCls}
              />
            </div>
            {showAvailability && (
              <div>
                <label className={labelCls}>Availability</label>
                <select
                  value={row.availability}
                  onChange={(e) => update(i, { availability: e.target.value })}
                  className={inputCls}
                >
                  {AVAILABILITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Price</label>
              <input
                value={row.price}
                onChange={(e) => update(i, { price: e.target.value })}
                placeholder="e.g. 250"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <input
                value={row.currency}
                onChange={(e) => update(i, { currency: e.target.value })}
                placeholder="e.g. INR"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <input
                value={row.notes}
                onChange={(e) => update(i, { notes: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="text-sm text-violet-700 hover:text-violet-900 font-medium"
      >
        + Add{value.length > 0 ? " another" : ""} format
      </button>
    </div>
  );
}
