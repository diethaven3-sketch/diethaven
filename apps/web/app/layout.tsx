import type { Metadata } from "next";
import { Figtree, Noto_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  weight: ["500", "600", "700"],
});

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "DietHaven Consult",
  description: "Clinical nutrition care platform for dietitians and administrators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${figtree.variable} ${notoSans.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
