import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "نظرسنجی انتخاب استاد",
  description: "نظرسنجی زنده‌ی انتخاب استاد بین دانشجویان",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="font-sans text-parchmentlight">{children}</body>
    </html>
  );
}
