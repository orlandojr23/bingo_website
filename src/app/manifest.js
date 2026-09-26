export default function manifest() {
  return {
    name: "Bin'Go Smart Waste Collection",
    short_name: "Bin'Go",
    description: "Track garbage compactors live, report issues, and keep your community clean.",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAFAFA",
    theme_color: "#059669",
    categories: ["utilities", "government", "lifestyle"],
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/favicon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Driver Login",
        short_name: "Driver",
        description: "Sign in to the Driver Terminal",
        url: "/driver-login",
        icons: [{ src: "https://simplybingo.vercel.app/favicon.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Live Compactor Map",
        short_name: "Live Map",
        description: "View real-time garbage truck locations",
        url: "/report?tab=map",
        icons: [{ src: "https://simplybingo.vercel.app/favicon.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Report Waste Issue",
        short_name: "Report Bin",
        description: "Submit photo & GPS ticket for uncollected waste",
        url: "/report?tab=report",
        icons: [{ src: "https://simplybingo.vercel.app/favicon.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Driver Terminal",
        short_name: "Driver",
        description: "Compactor GPS Telemetry Broadcaster",
        url: "/driver",
        icons: [{ src: "https://simplybingo.vercel.app/favicon.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
