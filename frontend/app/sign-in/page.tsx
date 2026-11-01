import { PublicSignIn } from "../../components/public/sign-in";
import { safeContinuation } from "../../../backend/src/auth/continuation";
export const metadata = { title: "Sign in · Rooted", robots: { index: false, follow: false } };
export default async function Page({searchParams}: {searchParams: Promise<{returnTo?: string; access?: string}>}) { const params = await searchParams; return <PublicSignIn returnTo={safeContinuation(params.returnTo)} access={params.access === 'contributor' ? 'contributor' : params.access === 'member' ? 'member' : undefined} />; }
