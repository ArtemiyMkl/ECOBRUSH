import Image from "next/image";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/ecobrush-mark.png"
      alt=""
      aria-hidden
      width={64}
      height={64}
      priority
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
