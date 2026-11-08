import { redirect } from "next/navigation";

export default async function Page({ searchParams }: { searchParams: Promise<{ church?: string }> }) {
  const { church } = await searchParams;
  redirect(`/settings/church${church ? `?church=${encodeURIComponent(church)}` : ""}`);
}
