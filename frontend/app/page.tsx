import { PublicHome } from "../components/public/index";
import { publicMetadata } from "../lib/public-metadata";
import { marketingPages } from "../lib/marketing";

export const metadata = publicMetadata(marketingPages[0].title, marketingPages[0].description, "/");
export default function Page() { return <PublicHome />; }
