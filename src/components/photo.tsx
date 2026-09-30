import Image from "next/image";
import { IconClose } from "@/components/icons";
import type { Dictionary } from "@/lib/i18n/server";

/** Ein Bild, das sich groß ansehen lässt. Die Vergrößerung ist ein natives
 *  `popover`: Escape, Klick daneben und Top-Layer kommen vom Browser, es
 *  braucht kein Client-Bündel. `id` muss auf der Seite eindeutig sein.
 *
 *  Chat-Anhänge laufen über die eigene Route und dürfen nicht durch den
 *  Bildoptimierer — deshalb `unoptimized`. */
export function Photo({
  id,
  src,
  alt,
  size,
  className = "",
  unoptimized = false,
  t,
}: {
  id: string;
  src: string;
  alt: string;
  /** Kantenlänge der Vorschau in Pixeln. */
  size: number;
  className?: string;
  unoptimized?: boolean;
  t: Dictionary;
}) {
  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label={t.common.enlarge}
        className={`photo-btn ${className}`}
      >
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          unoptimized={unoptimized}
          className="h-full w-full object-cover"
        />
      </button>

      <div popover="auto" id={id} className="pop pop-photo">
        <button
          type="button"
          popoverTarget={id}
          popoverTargetAction="hide"
          aria-label={t.common.close}
          className="pop-dismiss"
        />
        <div className="photo-full">
          <Image
            src={src}
            alt={alt}
            fill
            sizes="100vw"
            unoptimized={unoptimized}
          />
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute top-4 right-4 rounded-full bg-card/80 p-2 text-dim"
        >
          <IconClose className="h-4 w-4" />
        </span>
      </div>
    </>
  );
}
