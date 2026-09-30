import { redirect } from "next/navigation";
import { SidebarNav } from "@/components/sidebar-nav";
import { BrandMark } from "@/components/brand-mark";
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
      <aside className="inset scroll-area flex w-60 shrink-0 flex-col overflow-y-auto border-r border-line">
        <div className="flex items-center gap-2.5 px-4 py-5">
          <BrandMark className="h-8 w-8 text-sm" />
          <span className="font-semibold tracking-tight">EcoBrush</span>
        </div>

        <SidebarNav />

        <div className="mt-auto border-t border-line p-3">
          <p className="truncate px-1 pb-2 text-xs text-dim">{user.email}</p>
          <form action={signOut}>
            <button
              type="submit"
              className="btn btn-quiet btn-wide w-full justify-start px-3 py-2 text-sm"
            >
              Выйти
            </button>
          </form>
        </div>
      </aside>

      <main className="scroll-area flex-1 overflow-y-auto px-8 py-7">
        {children}
      </main>
    </div>
  );
}
