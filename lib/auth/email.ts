// Sends the OTP email via AWS SES (v2). If SES isn't configured, logs the code to
// the server console and returns it so local dev still works end-to-end.
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { AWS_REGION } from "../aws/clients";

const FROM = process.env.SES_FROM_EMAIL;

export interface OtpDelivery {
  delivered: boolean;
  devCode?: string; // populated only when email wasn't actually sent
}

export async function sendOtpEmail(email: string, code: string): Promise<OtpDelivery> {
  if (!FROM || !process.env.AWS_ACCESS_KEY_ID) {
    console.log(`[MeterMatch] (dev) OTP for ${email}: ${code}`);
    return { delivered: false, devCode: code };
  }

  const client = new SESv2Client({ region: AWS_REGION });
  await client.send(
    new SendEmailCommand({
      FromEmailAddress: FROM,
      Destination: { ToAddresses: [email] },
      Content: {
        Simple: {
          Subject: { Data: `Your MeterMatch code: ${code}` },
          Body: {
            Text: {
              Data: `Your MeterMatch verification code is ${code}. It expires in 10 minutes.`,
            },
            Html: {
              Data: `<div style="font-family:system-ui,sans-serif;padding:24px">
                <p style="color:#64748b;font-size:13px;letter-spacing:.05em">METERMATCH</p>
                <p style="font-size:15px;color:#0f172a">Your verification code:</p>
                <p style="font-size:34px;font-weight:700;letter-spacing:.2em;color:#6366f1">${code}</p>
                <p style="color:#64748b;font-size:13px">Expires in 10 minutes. If you didn't request this, ignore it.</p>
              </div>`,
            },
          },
        },
      },
    })
  );
  return { delivered: true };
}
