import type { MetadataRoute } from "next";
import { publicOrigin } from "../lib/public-metadata";
import { publicDiscoveryPaths } from "../lib/marketing";
export default function robots(): MetadataRoute.Robots {
  const origin = publicOrigin();
  return origin ? { rules: { userAgent: "*", allow: [...publicDiscoveryPaths.map(path => `${path}$`), "/_next/static/", "/_next/image", "/showcase/", "/rooted-share.svg$"], disallow: "/" }, sitemap: `${origin}/sitemap.xml` } : { rules: { userAgent: "*", disallow: "/" } };
}
