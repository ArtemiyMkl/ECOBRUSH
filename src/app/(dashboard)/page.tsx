import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { NAV_ITEMS } from "@/lib/nav";

export default function HomePage() {
  const sections = NAV_ITEMS.filter((item) => item.href !== "/");

  return (
    <>
      <PageHeader title="Главная" description="Сводка по магазину EcoBrush" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((item) => (
          <Link key={item.href} href={item.href} className="tile block p-4">
            <h2 className="font-medium">{item.label}</h2>
            <p className="mt-1 text-sm text-dim">{item.description}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
