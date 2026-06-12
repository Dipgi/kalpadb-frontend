import { useState } from "react";

function Star({ filled, half, className }: { filled: boolean; half?: boolean; className: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full text-gray-200">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.077 10.1c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z" />
      </svg>
      {(filled || half) && (
        <span
          className="absolute inset-0 overflow-hidden"
          style={{ width: half ? "50%" : "100%" }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full text-amber-400" style={{ width: half ? "200%" : "100%" }}>
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.077 10.1c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z" />
          </svg>
        </span>
      )}
    </span>
  );
}

/** Read-only star display, supports half-star precision. */
export function Stars({ value, size = "w-4 h-4" }: { value: number; size?: string }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className="inline-flex items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} filled={rounded >= i} half={rounded === i - 0.5} className={size} />
      ))}
    </span>
  );
}

/** Interactive star picker with hover preview. */
export function StarPicker({
  value,
  onChange,
  disabled = false,
  size = "w-7 h-7",
}: {
  value: number | null;
  onChange: (rating: number) => void;
  disabled?: boolean;
  size?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  return (
    <span className="inline-flex items-center" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
          className={`transition-transform ${disabled ? "cursor-default" : "hover:scale-110 cursor-pointer"}`}
          aria-label={`Rate ${i} star${i > 1 ? "s" : ""}`}
        >
          <Star filled={shown >= i} className={size} />
        </button>
      ))}
    </span>
  );
}
