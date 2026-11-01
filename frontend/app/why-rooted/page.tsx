import { WhyRooted } from "../../components/public/marketing-pages";
import { marketingPages } from "../../lib/marketing";
import { publicMetadata } from "../../lib/public-metadata";

const page = marketingPages.find(item => item.href === "/why-rooted")!;
export const metadata = publicMetadata(page.title, page.description, page.href);
export default function Page() { return <WhyRooted />; }
