/** User avatar: picture if set, else a coloured initial circle. */
interface Props {
  url?: string | null;
  name: string;
  /** Tailwind size classes, e.g. "w-8 h-8 text-sm". */
  sizeCls?: string;
}

export default function Avatar({ url, name, sizeCls = "w-8 h-8 text-sm" }: Props) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizeCls} rounded-full object-cover border border-gray-200`}
      />
    );
  }
  return (
    <div
      className={`${sizeCls} rounded-full bg-violet-100 text-violet-700 font-semibold flex items-center justify-center shrink-0`}
      aria-hidden
    >
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}
