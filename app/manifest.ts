import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ekipa",
    short_name: "Ekipa",
    description: "Mobilny kalendarz pomysłów dla ekipy.",
    lang: "pl",
    start_url: "/ideas",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f766e",
  };
}
