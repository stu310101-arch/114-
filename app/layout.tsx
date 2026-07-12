import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title: "114 申請入學一階落點查詢｜逐關倍率篩選",
    description:
      "輸入學測級分，以 114 學年度官方通過倍率篩選最低級分逐關回測，查看可能通過與接近的校系。",
    openGraph: {
      title: "114 申請入學一階落點查詢",
      description: "每一關都算清楚，看看你離目標校系有多近。",
      locale: "zh_TW",
      type: "website",
      images: [{ url: "/og.png", width: 1536, height: 1024 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "114 申請入學一階落點查詢",
      description: "官方資料逐關回測，找出可能通過與最接近的校系。",
      images: ["/og.png"],
    },
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
