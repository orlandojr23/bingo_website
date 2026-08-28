export default function manifest() {
  return {
    name: "Bin'Go Smart Waste Collection",
    short_name: "Bin'Go",
    description: "Track garbage compactors live, report issues, and keep your community clean.",
    start_url: "/", // Directly open the home page
    display: "standalone",
    background_color: "#FAFAFA", // Minimalist zinc-50 light style
    theme_color: "#059669",      // Emerald-600 accent
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
