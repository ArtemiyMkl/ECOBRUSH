import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoBrush",
  description: "Панель управления продажами EcoBrush",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
