import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cricinfobuzz",
  description: "Cricket news and live scores",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="w-full m-0 p-0">
      <body className="w-full m-0 p-0">{children}</body>
    </html>
  );
}

