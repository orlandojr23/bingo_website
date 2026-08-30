import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import PWARegistration from "@/components/pwa/PWARegistration";
import PWAInstallPrompt from "@/components/pwa/PWAInstallPrompt";
import PrivatePilotGate from "@/components/auth/PrivatePilotGate";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#059669",
};

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://simplybingo.onrender.com"),
  title: {
    default: "Bin'Go | Smart Waste Collection, Simplified",
    template: "%s | Bin'Go",
  },
  description:
    "Smart Waste Collection, Simplified. Track garbage trucks live, receive instant arrival alerts, and help keep your community clean with Bin'Go.",
  keywords: [
    "Bin'Go",
    "waste collection",
    "waste management",
    "garbage truck tracking",
    "garbage collection schedule",
    "barangay",
    "Metro Cebu",
    "illegal dumping",
    "sanitation",
    "civic tech",
    "community",
  ],
  authors: [{ name: "Orlando Jr. Fornolles" }],
  creator: "Orlando Jr. Fornolles",
  publisher: "Bin'Go",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/icon.png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bin'Go",
  },
  openGraph: {
    title: "Bin'Go | Smart Waste Collection, Simplified",
    description:
      "Smart Waste Collection, Simplified. Track garbage trucks live, receive instant arrival alerts, and help keep your community clean with Bin'Go.",
    type: "website",
    locale: "en_PH",
    url: "/",
    siteName: "Bin'Go",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bin'Go | Smart Waste Collection, Simplified",
    description:
      "Smart Waste Collection, Simplified. Track garbage trucks live, receive instant arrival alerts, and help keep your community clean with Bin'Go.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
        <AuthProvider>
          <PWARegistration />
          {children}
          <PWAInstallPrompt />
        </AuthProvider>
      </body>
    </html>
  );
}


