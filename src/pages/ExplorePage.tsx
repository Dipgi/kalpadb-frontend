import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { stats, type InsightItem } from "../lib/api";

const VIOLET = "#6d28d9";
// Distinct categorical hues, in a FIXED order chosen so no two adjacent
// slices are confusable under color-vision deficiency (order validated:
// worst adjacent-pair CVD ΔE 19.4). Slices beyond this list fold into
// "Other" rather than cycling colors.
const PIE_COLORS = [
  "#6d28d9", // violet
  "#059669", // emerald
  "#d97706", // amber
  "#2563eb", // blue
  "#dc2626", // red
  "#0891b2", // cyan
  "#db2777", // pink
  "#65a30d", // lime
];
const OTHER_COLOR = "#6b7280"; // neutral gray for the folded tail

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mb-2">{subtitle}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

/** Horizontal bar chart of `items`; clicking a bar runs `onPick(item)`. */
function HBar({
  items,
  onPick,
}: {
  items: InsightItem[];
  onPick?: (item: InsightItem) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(140, items.length * 28)}>
      <BarChart data={items} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" allowDecimals={false} hide />
        <YAxis
          type="category"
          dataKey="label"
          width={150}
          tick={{ fontSize: 12, fill: "#374151" }}
        />
        <Tooltip
          cursor={{ fill: "#f5f3ff" }}
          formatter={(value) => [`${value} works`, ""]}
          labelStyle={{ color: "#374151" }}
        />
        <Bar
          dataKey="count"
          fill={VIOLET}
          radius={[0, 4, 4, 0]}
          cursor={onPick ? "pointer" : undefined}
          onClick={(d: { payload?: InsightItem }) => d.payload && onPick?.(d.payload)}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["insights"],
    queryFn: stats.insights,
  });

  // content-type donut: drop the (usually large) "Unspecified" slice and note it.
  const allClassified = (data?.by_content_type ?? [])
    .filter((i) => i.label.toLowerCase() !== "unspecified")
    .sort((a, b) => b.count - a.count);
  const unclassified =
    data?.by_content_type.find((i) => i.label.toLowerCase() === "unspecified")?.count ?? 0;
  // Top slices get their own color; the long tail folds into one "Other"
  // slice — 13 sliver slices with recycled colors are unreadable, especially
  // on a phone.
  const otherCount = allClassified.slice(PIE_COLORS.length).reduce((s, i) => s + i.count, 0);
  const classified =
    otherCount > 0
      ? [
          ...allClassified.slice(0, PIE_COLORS.length),
          { id: "other", label: "Other", count: otherCount },
        ]
      : allClassified;
  const sliceColor = (i: number) =>
    classified[i].id === "other" ? OTHER_COLOR : PIE_COLORS[i % PIE_COLORS.length];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Explore the catalogue</h1>
        <p className="text-sm text-gray-500">
          {data
            ? `${data.total_works.toLocaleString()} works` +
              (data.total_magazine_issues
                ? ` · ${data.total_magazine_issues.toLocaleString()} magazine issues`
                : "")
            : "Loading"}{" "}
          · click a bar to drill in
        </p>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Loading insights…</p>}
      {isError && <p className="text-rose-600 text-sm">Couldn’t load insights. Try again later.</p>}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="Works by genre" subtitle="Click to browse that genre">
            <HBar
              items={data.by_genre}
              onPick={(i) => navigate(`/browse?genre_slug=${i.id}`)}
            />
          </ChartCard>

          <ChartCard title="Works by language" subtitle="Click to browse that language">
            <HBar
              items={data.by_language}
              onPick={(i) => navigate(`/browse?lang=${i.id}`)}
            />
          </ChartCard>

          <ChartCard title="Top publishers" subtitle="By number of works · top 15">
            <HBar
              items={data.top_publishers}
              onPick={(i) => navigate(`/publishers/${i.id}`)}
            />
          </ChartCard>

          <ChartCard title="Most-catalogued authors" subtitle="By number of works · top 15">
            <HBar items={data.top_authors} onPick={(i) => navigate(`/persons/${i.id}`)} />
          </ChartCard>

          <ChartCard
            title="Classified work types"
            subtitle={
              unclassified
                ? `${unclassified.toLocaleString()} works not yet classified`
                : undefined
            }
          >
            {classified.length > 0 ? (
              <>
                {/* Radius is relative so the pie fits any card width; the
                    legend is plain flex-wrapped HTML below the plot instead of
                    recharts' <Legend>, which overlaps the pie when it wraps to
                    several rows on narrow screens. */}
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={classified}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius="85%"
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {classified.map((_, i) => (
                        <Cell key={i} fill={sliceColor(i)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} works`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
                  {classified.map((item, i) => (
                    <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: sliceColor(i) }}
                      />
                      {item.label}
                      <span className="text-gray-400">{item.count}</span>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 py-8 text-center">No classified work types yet.</p>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}
