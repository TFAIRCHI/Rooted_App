import { GetStarted } from "../../components/public/get-started";
import { publicMetadata } from "../../lib/public-metadata";
export const metadata = publicMetadata("Get started with your church", "Create your church’s Rooted workspace or find the church you already belong to.", "/get-started");
export default function Page() { return <GetStarted />; }
