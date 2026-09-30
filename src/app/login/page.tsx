import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <BrandMark className="mx-auto mb-3 h-11 w-11" />
          <h1 className="text-xl font-semibold tracking-tight">EcoBrush</h1>
          <p className="mt-1 text-sm text-dim">
            Войдите, чтобы открыть панель управления
          </p>
        </div>

        <LoginForm redirectTo={redirectTo ?? "/"} />
      </div>
    </main>
  );
}
