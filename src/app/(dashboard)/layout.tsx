import { redirect } from "next/navigation";
import { SidebarNav } from "@/components/sidebar-nav";
import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { IconClose, IconMenu } from "@/components/icons";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "@/lib/i18n/server";
import { NAV_ITEMS } from "@/lib/nav";

const DRAWER = "nav-drawer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { locale, t } = await getTranslations();

  return (
    <div className="flex h-dvh flex-col lg:flex-row">
      {/* Am Telefon trägt die Kopfleiste die Marke und den Griff zur
          Schublade; ab `lg` steht beides in der Seitenleiste selbst. */}
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3 lg:hidden">
        <button
          type="button"
          popoverTarget={DRAWER}
          aria-label={t.common.menu}
          className="btn btn-quiet p-2"
        >
          <IconMenu className="h-5 w-5" />
        </button>
        <BrandMark className="h-7 w-7" />
        <span className="font-semibold tracking-tight">EcoBrush</span>
      </header>

      <aside
        popover="auto"
        id={DRAWER}
        className="nav-drawer inset scroll-area shrink-0 flex-col overflow-y-auto border-line lg:border-r"
      >
        <div className="flex items-center gap-2.5 px-4 py-5">
          <BrandMark className="h-8 w-8" />
          <span className="font-semibold tracking-tight">EcoBrush</span>
          <button
            type="button"
            popoverTarget={DRAWER}
            popoverTargetAction="hide"
            aria-label={t.common.close}
            className="btn btn-quiet drawer-close ml-auto p-1.5"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <SidebarNav
          drawerId={DRAWER}
          items={NAV_ITEMS.map((item) => ({
            href: item.href,
            label: t.nav[item.key],
          }))}
        />

        <div className="mt-auto border-t border-line p-3">
          <LocaleSwitcher locale={locale} label={t.common.language} />
          <p className="truncate px-1 pt-3 pb-2 text-xs text-dim">
            {user.email}
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="btn btn-quiet btn-wide w-full justify-start px-3 py-2 text-sm"
            >
              {t.common.signOut}
            </button>
          </form>
        </div>
      </aside>

      <main className="scroll-area flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {children}
      </main>
    </div>
  );
}
