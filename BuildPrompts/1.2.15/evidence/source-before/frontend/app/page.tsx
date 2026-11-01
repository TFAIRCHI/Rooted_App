import { PublicHome } from "../components/public/index";
import { publicMetadata } from "../lib/public-metadata";

export const metadata = publicMetadata("Let Sunday take root. All week long.", "Turn your church’s teaching into weekday Bible studies with an AI co-writer and human review. Grow in Scripture, stay connected and bring faith home.", "/");
export default function Page() { return <PublicHome />; }
