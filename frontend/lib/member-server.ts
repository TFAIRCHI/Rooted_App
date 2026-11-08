import { cookies } from "next/headers";
import type { ChurchTheme, Session } from "./api";

export type Publication = { id: string; churchId: string; contentId: string; payload: { title: string; body: string; reflection: string; discussionQuestion: string; application: string; references?: string[]; scriptureReading?: {reference:string;translation:'KJV';edition:'1769';source:string;digest:string;verses:{number:number;text:string}[];featuredVerse:number} }; publishedAt: string };

export async function memberFetch(path: string) {
  const cookieStore = await cookies();
  return fetch(`${process.env.BACKEND_URL ?? "http://127.0.0.1:4000"}/v1${path}`, { headers: { Cookie: cookieStore.toString(), Accept: "application/json" }, cache: "no-store" });
}

export async function publishedResource(slug: string, publicationId?: string): Promise<{ data: Publication | { items: Publication[] } | null; session: Session | null; churchId: string | null; theme: ChurchTheme | null; status: number }> {
  try {
    const sessionResponse = await memberFetch("/auth/session");
    const session: Session | null = sessionResponse.ok ? await sessionResponse.json() : null;
    const church = session?.churches.find(item => item.slug === slug);
    const suffix = publicationId ? `/studies/${encodeURIComponent(publicationId)}` : "/studies";
    const path = `/public/churches/${encodeURIComponent(slug)}${suffix}`;
    const [response, themeResponse] = await Promise.all([memberFetch(path), memberFetch(`/public/churches/${encodeURIComponent(slug)}/theme`)]);
    return { data: response.ok ? await response.json() : null, session, churchId: church?.id ?? null, theme: themeResponse.ok ? await themeResponse.json() : null, status: response.status >= 500 ? 503 : response.status };
  } catch { return { data: null, session: null, churchId: null, theme: null, status: 503 }; }
}
