import type { MetadataRoute } from "next";
import { publicOrigin } from "../lib/public-metadata";
import { publicDiscoveryPaths } from "../lib/marketing";
export default function sitemap(): MetadataRoute.Sitemap { const origin = publicOrigin(); return origin ? publicDiscoveryPaths.map(path => ({ url: `${origin}${path}` })) : []; }
