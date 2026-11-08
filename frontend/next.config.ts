import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.ROOTED_CONTAINER_BUILD === "true" ? { output: "standalone" as const } : {}),
  distDir: process.env.GATHER_E2E === "true" ? ".next-e2e" : ".next",
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${process.env.BACKEND_URL ?? "http://127.0.0.1:4000"}/v1/:path*` }];
  },
  async headers() {
    return ["/c/:path*", "/onboarding/:path*", "/sign-in", "/invitation", "/user/:path*", "/dashboard", "/settings/:path*", "/studies", "/calendar"].map(source => ({ source, headers: [{ key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Referrer-Policy", value: "no-referrer" }] }));
  },
};

export default nextConfig;
