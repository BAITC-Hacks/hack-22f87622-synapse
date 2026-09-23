import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventMatch — подбор подрядчиков",
  description: "Детерминированный подбор до трёх подрядчиков с проверяемыми объяснениями.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
