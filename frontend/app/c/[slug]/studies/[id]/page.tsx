import { notFound } from "next/navigation";
import { publishedResource, type Publication } from "../../../../../lib/member-server";
import { MemberStudyReader } from "../../../../../components/member-study-reader";
import { Notice } from "../../../../../components/ui";
import { memberDesignExamples } from "../../../../../lib/member-design-preview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rooted · Church study", robots: { index: false, follow: false } };

export default async function StudyPage({ params, searchParams }: { params: Promise<{ slug: string; id: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { slug, id } = await params;
  const preview = process.env.NODE_ENV === "development" && (await searchParams).preview === "figma";
  const exampleId = preview && id.startsWith("figma-previous-");
  const result = await publishedResource(slug, exampleId ? undefined : id);
  const example = exampleId && result.data ? memberDesignExamples(result.churchId ?? "preview").find(item => item.id === id) : null;
  if (result.status === 404 && result.session || exampleId && !example) notFound();
  const study = example || (exampleId ? null : result.data as Publication | null);
  const churchName = result.session?.churches.find(church => church.slug === slug)?.name ?? "Your church";
  return <div className="member-study-root">
    {study ? <MemberStudyReader study={study} slug={slug} userId={result.session?.user.id ?? "guest"} session={result.session} preview={preview} /> : <main id="main" className="library-content unavailable-study">{result.status === 503 ? <Notice error>The published study service is unavailable. Please try again shortly.</Notice> : <section className="card"><h1>Sign in to read with your church.</h1><p>This study is available according to church membership policy.</p><a className="button primary" href={`/sign-in?returnTo=${encodeURIComponent(`/c/${slug}/studies/${id}`)}`}>Sign in</a></section>}</main>}
    <footer className="site-footer"><span className="wordmark">Rooted</span><p>Made for the people growing in faith together.</p><span>{churchName}</span></footer>
  </div>;
}
