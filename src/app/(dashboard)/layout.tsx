import { redirect } from "next/navigation";
import { SidebarNav } from "@/components/sidebar-nav";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <div className="flex h-dvh">
      <aside className="flex w-60 shrink-0 flex-col overflow-y-auto border-r border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2.5 px-4 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
            E
          </div>
          <span className="font-semibold tracking-tight">EcoBrush</span>
        </div>

        <SidebarNav />

        <div className="mt-auto border-t border-black/10 p-3 dark:border-white/10">
          <p className="truncate px-1 pb-2 text-xs opacity-60">{user.email}</p>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
            >
              Выйти
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-8 py-7">{children}</main>
    </div>
  );
}
