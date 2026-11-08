import Link from "next/link";
import { MarketingFrame } from "../../components/public/marketing-frame";

export const metadata = { title: "Terms & Conditions · Rooted Application" };
export default function TermsPage() {
  return <MarketingFrame><main className="wrap" style={{ maxWidth: 820, padding: "48px 20px 80px" }}><h1>Terms &amp; Conditions</h1><p>Effective November 5, 2026. Rooted Application is operated by a sole proprietor. For questions, contact <a href="mailto:rooted-together@outlook.com">rooted-together@outlook.com</a>.</p>
    <h2>Public studies</h2><p>Churches and their authorized teams prepare and publish studies. Published pages are public and may be shared. Study content is for personal reflection and discussion. A church may revise or withdraw a study. Public comments require a name and may be reviewed, declined, or removed by the church. A visitor-provided name is not verified.</p>
    <h2>SMS Terms</h2><p>By texting ROOTED to the study number shown on our <Link href="/sms">enrollment page</Link> and replying AGREE to the confirmation message, you request recurring Rooted Application Bible study texts for the participating church. Each study text may include a creator note, study title, and link to a public study. Message frequency varies by church. Message and data rates may apply. Reply STOP to unsubscribe at any time. Reply HELP for assistance, or email <a href="mailto:rooted-together@outlook.com">rooted-together@outlook.com</a>. Consent to SMS is optional and is not required to read public studies.</p>
    <h2>Availability</h2><p>We may change the service or pause delivery when a study, sender, or recipient is not ready. A scheduled study does not guarantee that a text will be delivered. See our <Link href="/privacy">Privacy Policy</Link> for how we use messaging and participation data.</p></main></MarketingFrame>;
}
