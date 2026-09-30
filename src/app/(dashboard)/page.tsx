import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { NAV_ITEMS } from "@/lib/nav";

export default function HomePage() {
  const sections = NAV_ITEMS.filter((item) => item.href !== "/");

  return (
    <>
      <PageHeader
        title="Главная"
        description="Сводка по магазину EcoBrush"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-black/10 p-4 transition hover:border-emerald-600 hover:shadow-sm dark:border-white/10"
          >
            <h2 className="font-medium">{item.label}</h2>
            <p className="mt-1 text-sm opacity-60">{item.description}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
