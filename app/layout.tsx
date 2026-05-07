import type { Metadata, Viewport } from "next";
import "./globals.css";

export const preferredRegion = "lhr1";

export const metadata: Metadata = {
  title: "Ekipa",
  description: "Mobilny kalendarz pomysłów dla ekipy.",
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className="h-full">
      <body className="min-h-full bg-slate-50 text-slate-950 antialiased">
        {children}
      </body>
    </html>
  );
}
