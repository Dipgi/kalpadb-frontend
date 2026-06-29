import { useId } from "react";

/**
 * Deterministic generative cover for works that have no real cover yet.
 *
 * Why client-side: nothing is stored, so it costs no data, applies to every
 * past and future coverless work automatically, and vanishes the moment a real
 * cover_image_url exists. The same work id always yields the same art (stable
 * across reloads and pages), and all placeholders share one retro-SF visual
 * language so the set feels connected. A "PLACEHOLDER" label marks them clearly.
 */

// Cohesive duotone palettes [top, bottom, accent] in one muted retro-SF family.
const PALETTES: [string, string, string][] = [
  ["#312e81", "#6d28d9", "#c4b5fd"], // indigo → violet (brand)
  ["#0f766e", "#155e75", "#5eead4"], // teal → deep cyan
  ["#4a044e", "#9d174d", "#fbcfe8"], // plum → rose
  ["#7c2d12", "#b45309", "#fde68a"], // rust → amber
  ["#1e293b", "#0e7490", "#67e8f9"], // slate → cyan
  ["#14532d", "#166534", "#bbf7d0"], // forest greens
];

/** Small deterministic PRNG (mulberry32) so one seed → one fixed picture. */
function mulberry32(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function PlaceholderCover({
  seed,
  showLabel = true,
  className = "",
}: {
  seed: number;
  showLabel?: boolean;
  className?: string;
}) {
  const uid = useId(); // unique gradient id even if the same seed renders twice
  const rand = mulberry32(Math.abs(seed) * 2654435761);
  const [top, bottom, accent] = PALETTES[Math.abs(seed) % PALETTES.length];

  const planetR = 38 + rand() * 46;
  const planetX = 45 + rand() * 110;
  const planetY = 70 + rand() * 120;
  const ringRot = Math.round(rand() * 160 - 80);
  const stars = Array.from({ length: 22 }, () => ({
    x: rand() * 200,
    y: rand() * 300,
    r: 0.4 + rand() * 1.6,
    o: 0.3 + rand() * 0.5,
  }));

  return (
    <svg
      viewBox="0 0 200 300"
      preserveAspectRatio="xMidYMid slice"
      className={`w-full h-full ${className}`}
      role="img"
      aria-label="Placeholder cover"
    >
      <defs>
        <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
        <radialGradient id={`pl-${uid}`} cx="0.35" cy="0.32" r="0.8">
          <stop offset="0" stopColor={accent} />
          <stop offset="1" stopColor={bottom} />
        </radialGradient>
      </defs>

      <rect width="200" height="300" fill={`url(#bg-${uid})`} />

      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" opacity={s.o} />
      ))}

      {/* orbit ring behind the planet */}
      <g transform={`rotate(${ringRot} ${planetX} ${planetY})`}>
        <ellipse
          cx={planetX}
          cy={planetY}
          rx={planetR * 1.7}
          ry={planetR * 0.45}
          fill="none"
          stroke={accent}
          strokeWidth="2"
          opacity="0.55"
        />
      </g>

      <circle cx={planetX} cy={planetY} r={planetR} fill={`url(#pl-${uid})`} />

      {showLabel && (
        <g>
          <rect x="52" y="268" width="96" height="18" rx="9" fill="#000000" opacity="0.3" />
          <text
            x="100"
            y="280"
            textAnchor="middle"
            fontSize="9"
            letterSpacing="1.5"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fill="#ffffff"
            opacity="0.9"
          >
            PLACEHOLDER
          </text>
        </g>
      )}
    </svg>
  );
}
