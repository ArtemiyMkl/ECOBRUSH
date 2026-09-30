import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

/** `<html lang>` hängt am Sprach-Cookie, und hinter dem Login liest ohnehin jede
 *  Route das Session-Cookie — eine statische Shell gibt es hier also nirgends. */
export const instant = false;

export const metadata: Metadata = {
  title: "EcoBrush",
  description: "Панель управления продажами EcoBrush",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
