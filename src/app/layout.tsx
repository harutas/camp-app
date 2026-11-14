import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "キャンプ記録",
  description: "家族のキャンプ記録アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
