import { PublicSignIn } from "../../components/public/sign-in";
import { safeContinuation } from "../../../backend/src/auth/continuation";
export const metadata = { title: "Church team sign in · Rooted", robots: { index: false, follow: false } };
export default async function Page({searchParams}: {searchParams: Promise<{returnTo?: string}>}) { const params = await searchParams; return <PublicSignIn returnTo={safeContinuation(params.returnTo)} />; }
