import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { stats, type InsightItem } from "../lib/api";

const VIOLET = "#6d28d9";
// Distinct categorical hues so adjacent slices are easy to tell apart.
const PIE_COLORS = [
  "#6d28d9", // violet
  "#2563eb", // blue
  "#059669", // emerald
  "#d97706", // amber
  "#dc2626", // red
  "#db2777", // pink
  "#0891b2", // cyan
  "#65a30d", // lime
];

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
  const classified = (data?.by_content_type ?? []).filter(
    (i) => i.label.toLowerCase() !== "unspecified"
  );
  const unclassified =
    data?.by_content_type.find((i) => i.label.toLowerCase() === "unspecified")?.count ?? 0;

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
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={classified}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {classified.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(value, name) => [`${value} works`, name]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 py-8 text-center">No classified work types yet.</p>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}
