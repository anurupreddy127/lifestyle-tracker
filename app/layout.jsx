import { Manrope } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const manrope = Manrope({ subsets: ["latin"] });

export const metadata = {
  title: "Lifestyle Tracker",
  description: "Personal gym and finance tracker",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={manrope.className}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#f8fafc" />
      </head>
      <body className="bg-slate-50 text-slate-900 select-none overscroll-none">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
