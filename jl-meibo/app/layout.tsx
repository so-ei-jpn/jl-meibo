import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JL大会 参加者管理",
  description: "JL大会の参加者名簿・挨拶チェック管理システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
