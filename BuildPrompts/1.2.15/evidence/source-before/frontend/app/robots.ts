import type { MetadataRoute } from "next";
import { publicOrigin } from "../lib/public-metadata";
export default function robots(): MetadataRoute.Robots {
  const origin = publicOrigin();
  return origin ? { rules: { userAgent: "*", allow: ["/$", "/get-started$", "/sample-study$", "/_next/static/", "/rooted-share.svg$"], disallow: "/" }, sitemap: `${origin}/sitemap.xml` } : { rules: { userAgent: "*", disallow: "/" } };
}
