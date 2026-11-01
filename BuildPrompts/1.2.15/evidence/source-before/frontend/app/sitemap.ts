import type { MetadataRoute } from "next";
import { publicOrigin } from "../lib/public-metadata";
export default function sitemap(): MetadataRoute.Sitemap { const origin = publicOrigin(); return origin ? ["/", "/get-started", "/sample-study"].map(path => ({ url: `${origin}${path}` })) : []; }
