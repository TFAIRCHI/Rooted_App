import { notFound } from "next/navigation";
import { Workspace } from "../../../components/workspace";

const sections = new Set(["members", "church", "reading", "integrations"]);

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.has(section)) notFound();
  return <Workspace route={`settings/${section}`} />;
}
