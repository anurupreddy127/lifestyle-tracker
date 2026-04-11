import { Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { ThemeProvider } from "@/contexts/ThemeContext";

const manrope = Manrope({ subsets: ["latin"] });

export const metadata = {
  title: "Lifestyle Tracker",
  description: "Personal gym and finance tracker",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lifestyle Tracker",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0A0A0A",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${manrope.className} dark`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        />
      </head>
      <body className="bg-bg-primary text-text-primary select-none overscroll-none antialiased">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
