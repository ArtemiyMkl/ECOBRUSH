"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNav({
  items,
  drawerId,
}: {
  items: { href: string; label: string }[];
  drawerId: string;
}) {
  const pathname = usePathname();

  /** Eine sanfte Navigation baut das Layout nicht neu auf — die Schublade bliebe
   *  also offen über der Seite liegen, die sie gerade geöffnet hat. Ab `lg` ist
   *  dasselbe Element eine feste Spalte und gar kein offener Popover. */
  const closeDrawer = () => {
    const drawer = document.getElementById(drawerId);
    if (drawer?.matches(":popover-open")) drawer.hidePopover();
  };

  return (
    <nav className="flex flex-col gap-1.5 p-3">
      {items.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            onClick={closeDrawer}
            className="nav-link block px-3.5 py-2.5 text-base"
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
