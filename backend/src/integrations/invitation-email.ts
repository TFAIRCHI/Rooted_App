import { EmailClient } from '@azure/communication-email';

export type InvitationMail = { to: string; firstName: string; churchName: string; role: string; token: string; origin: string };

async function send(to:string,subject:string,plainText:string):Promise<'accepted_by_provider'> {
  if (process.env.NODE_ENV !== 'production' && process.env.ROOTED_EMAIL_TEST_MODE === 'true') return 'accepted_by_provider';
  const connectionString = process.env.ACS_EMAIL_CONNECTION_STRING;
  const sender = process.env.ACS_EMAIL_SENDER;
  if (!connectionString || !sender) throw new Error('Invitation email delivery is not configured');
  const client = new EmailClient(connectionString);
  await client.beginSend({ senderAddress: sender, recipients: { to: [{ address: to }] }, content: { subject, plainText } });
  return 'accepted_by_provider';
}

export async function sendInvitationEmail(mail: InvitationMail): Promise<'accepted_by_provider'> {
  const link = `${mail.origin}/invitation#token=${encodeURIComponent(mail.token)}`;
  const plainText = `Hello ${mail.firstName},\n\nYou have been invited to join ${mail.churchName} on Rooted as ${mail.role}.\n\nOpen this link to sign in or create your account and accept the invitation:\n${link}\n\nThis invitation expires in seven days. If you did not expect it, you can ignore this email.\n\nRooted`;
  return send(mail.to,`Join ${mail.churchName} on Rooted`,plainText);
}

export async function sendInvitationChallenge(to:string,churchName:string,code:string) {
  return send(to,`Verify your email for ${churchName} on Rooted`,`Your Rooted verification code for ${churchName} is ${code}. It expires in 10 minutes. If you did not request it, ignore this message.`);
}
