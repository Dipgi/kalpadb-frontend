import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { catalogue } from "../lib/api";
import { formatRole } from "../lib/roles";
import Pagination from "../components/Pagination";
import { useSeo } from "../hooks/useSeo";

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "author", label: "Authors" },
  { value: "illustrator", label: "Illustrators" },
  { value: "editor", label: "Editors" },
  { value: "translator", label: "Translators" },
];

const SORT_OPTIONS = [
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "added_desc", label: "Recently Added" },
];

export default function BrowsePersonsPage() {
  useSeo({
    title: "People",
    description: "Authors, translators, editors and artists of Indian speculative fiction.",
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const role = searchParams.get("role_type") ?? "";
  const sort = searchParams.get("sort") ?? "name_asc";
  const page = Number(searchParams.get("page") ?? 1);
  const [input, setInput] = useState(q);

  const { data: result, isLoading } = useQuery({
    queryKey: ["persons-list", q, role, sort, page],
    queryFn: () => catalogue.personsList({ q: q || undefined, role_type: role || undefined, sort, page }),
  });

  function set(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      return next;
    });
  }

  function setPage(p: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(p));
      return next;
    });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">People</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          set("q", input.trim());
        }}
        className="flex flex-wrap items-center gap-3 mb-8"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search by name…"
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <button
          type="submit"
          className="bg-violet-700 text-white text-sm px-4 py-1.5 rounded-md font-medium hover:bg-violet-800 transition-colors"
        >
          Search
        </button>
        {q && (
          <button
            type="button"
            onClick={() => {
              setInput("");
              set("q", "");
            }}
            className="text-sm text-gray-400 hover:text-gray-700"
          >
            Clear
          </button>
        )}
        <select
          value={role}
          onChange={(e) => set("role_type", e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => set("sort", e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </form>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : result && result.items.length > 0 ? (
        <>
          <p className="text-sm text-gray-400 mb-4">
            {result.total.toLocaleString()} people · page {result.page} of {result.pages}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {result.items.map((p) => (
              <Link
                key={p.id}
                to={`/persons/${p.id}`}
                className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 hover:shadow-sm transition-shadow bg-white"
              >
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <span className="min-w-0">
                  <span className="block text-sm text-gray-900 line-clamp-2">{p.name}</span>
                  {p.roles && p.roles.length > 0 && (
                    <span className="block text-xs text-gray-400 line-clamp-1">
                      {p.roles.map(formatRole).join(" · ")}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
          <Pagination page={result.page} pages={result.pages} onChange={setPage} />
        </>
      ) : (
        <p className="text-gray-400 text-center py-16">No people found.</p>
      )}
    </div>
  );
}
