import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendReceiptParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Non-blocking: caller must not await the result for critical path.
// Email failure never rolls back a transaction.
export async function sendReceipt(
  params: SendReceiptParams
): Promise<{ ok: boolean; error?: string }> {
  try {
    await resend.emails.send({
      from: "GSF Foundation <onboarding@resend.dev>",
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    return { ok: true };
  } catch (err) {
    console.error("Email send failed", err);
    return { ok: false, error: String(err) };
  }
}
