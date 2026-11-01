import { notFound } from "next/navigation";
import { Workspace } from "../../components/workspace";

export default async function Page({ params }: { params: Promise<{ route: string }> }) {
  const { route } = await params;
  if (!["dashboard", "sermons", "studies", "calendar", "reviews", "engagement", "moderation", "delivery", "settings", "onboarding"].includes(route)) notFound();
  return <Workspace route={route} />;
}
