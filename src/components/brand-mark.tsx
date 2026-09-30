export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`flex items-center justify-center rounded-md bg-brand font-bold text-white ${className}`}
    >
      E
    </span>
  );
}
