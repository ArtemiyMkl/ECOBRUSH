import Link from "next/link";

export function SegLinks({
  options,
}: {
  options: { href: string; label: string; active: boolean }[];
}) {
  return (
    <div className="seg">
      {options.map((option) => (
        <Link
          key={option.href}
          href={option.href}
          aria-pressed={option.active}
          className="seg-item px-3 py-1 text-xs no-underline"
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
