import Link from "next/link";
import { MarketingFrame } from "../../components/public/marketing-frame";

export const metadata = { title: "Study text enrollment · Rooted Application" };
export default function SmsPage() {
  return <MarketingFrame><main className="wrap" style={{ maxWidth: 820, padding: "48px 20px 80px" }}><h1>Receive study texts</h1><p>To request Bible study texts from Rooted Application for the participating church, text <strong>ROOTED</strong> to <a href="sms:+18037705549?body=ROOTED">+1 (803) 770-5549</a>. We will reply with the program details. Reply <strong>AGREE</strong> to that message to confirm your enrollment. You are not enrolled until you confirm.</p>
    <p>Message frequency varies by church. Message and data rates may apply. Reply STOP to unsubscribe or HELP for help. Study links open public pages without a sign-in. Texts include a short note, a study title, and a public link. Reading studies does not require SMS enrollment.</p>
    <h2>Messages you will receive</h2><p>After ROOTED, we reply: “Rooted Application: Reply AGREE within 24 hours to receive recurring Bible study texts and public study links. Message frequency varies by church. Message and data rates may apply. Reply STOP to unsubscribe or HELP for help. Privacy: https://rooted-together.com/privacy Terms: https://rooted-together.com/terms”</p><p>After AGREE, we reply: “Rooted Application: You are subscribed to study texts. Message frequency varies by church. Reply STOP to unsubscribe or HELP for help.”</p>
    <p>For help, email <a href="mailto:rooted-together@outlook.com">rooted-together@outlook.com</a>. Read the <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Terms &amp; Conditions</Link> before opting in.</p></main></MarketingFrame>;
}
