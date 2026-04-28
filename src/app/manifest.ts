import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || "Indexing Dashboard";
  return {
    name: `${brandName} — Indexing Dashboard`,
    short_name: "Indexing",
    description: `Monitor de Google indexeringsstatus van alle webshops van ${brandName}.`,
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F8FAF5",
    theme_color: "#1A2E05",
    categories: ["business", "productivity"],
    lang: "nl",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
