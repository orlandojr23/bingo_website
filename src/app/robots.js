const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://simplybingo.onrender.com";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/driver",
        "/report",
        "/admin-login",
        "/login",
        "/dashboard",
        "/dispatch",
        "/tickets",
        "/live-map",
        "/analytics",
        "/notifications",
        "/staff",
        "/crud",
        "/settings",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
