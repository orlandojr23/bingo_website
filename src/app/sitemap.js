const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://simplybingo.onrender.com";

export default function sitemap() {
  const routes = ["", "/about", "/features", "/faqs", "/privacy", "/terms"];
  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.8,
  }));
}
