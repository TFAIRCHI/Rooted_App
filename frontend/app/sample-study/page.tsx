import { SampleStudy } from "../../components/public/sample-study";
import { publicMetadata } from "../../lib/public-metadata";
export const metadata = publicMetadata("Explore a sample devotional", "Read a fictional example of a Rooted Bible study, with a passage, reflection and practical next step.", "/sample-study");
export default function Page() { return <SampleStudy />; }
