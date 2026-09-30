import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null = null;
  private readonly fromEmail: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    this.fromEmail =
      this.config.get<string>("EMAIL_FROM") || "DietHaven Consult <onboarding@resend.dev>";

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log("Resend client initialized");
    } else {
      this.logger.warn("RESEND_API_KEY is not configured; emails will be logged only");
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
    const { to, subject, html, text } = options;

    if (!this.resend) {
      this.logger.warn(
        `[Dev/Simulated] Email to "${to}" with subject "${subject}" was not sent via Resend because RESEND_API_KEY is not set.`,
      );
      return { success: true };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [to],
        subject,
        html,
        text,
      });

      if (error) {
        this.logger.error(`Failed to send email to ${to}: ${error.message} (${error.name})`);
        return { success: false, error: error.message };
      }

      this.logger.log(`Email successfully sent to ${to} (ID: ${data?.id})`);
      return { success: true, id: data?.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Unexpected error sending email to ${to}: ${message}`);
      return { success: false, error: message };
    }
  }

  async sendPatientInvite(params: { to: string; dietitianName: string; inviteUrl: string }) {
    const { to, dietitianName, inviteUrl } = params;
    const subject = `${dietitianName} invited you to DietHaven Consult`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#222222;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F5F5F0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background-color:#2E6B3E;padding:28px 32px;text-align:left;">
              <h1 style="margin:0;font-size:24px;color:#ffffff;font-weight:700;letter-spacing:-0.5px;">DietHaven Consult</h1>
              <p style="margin:4px 0 0 0;font-size:13px;color:#E6F0E8;">Your Food, Your Medicine</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px;">
              <h2 style="margin:0 0 16px 0;font-size:20px;color:#1F4A2C;font-weight:600;">You're invited to join DietHaven</h2>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#333333;">
                <strong>${dietitianName}</strong> has invited you to connect on DietHaven Consult to begin your clinical nutrition care plan and daily food logging.
              </p>
              <div style="margin:28px 0;text-align:center;">
                <a href="${inviteUrl}" target="_blank" style="background-color:#2E6B3E;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block;">Accept Invitation</a>
              </div>
              <p style="margin:24px 0 8px 0;font-size:13px;line-height:1.5;color:#666666;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 20px 0;font-size:12px;color:#2E6B3E;word-break:break-all;">
                <a href="${inviteUrl}" style="color:#2E6B3E;text-decoration:underline;">${inviteUrl}</a>
              </p>
              <p style="margin:0;font-size:12px;color:#888888;">
                This invitation link will expire in 7 days.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#fafafa;padding:20px 32px;border-top:1px solid #eeeeee;font-size:12px;color:#888888;text-align:center;">
              DietHaven Consult &bull; Clinical Nutrition Care Platform
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `DietHaven Consult - Your Food, Your Medicine\n\n${dietitianName} has invited you to connect on DietHaven Consult.\n\nAccept your invitation by visiting:\n${inviteUrl}\n\nThis link will expire in 7 days.`;

    return this.sendEmail({ to, subject, html, text });
  }

  async sendOtp(params: { to: string; code: string; heading?: string; intro?: string; validFor?: string }) {
    const {
      to,
      code,
      heading = "Sign in verification code",
      intro = "Use the following 6-digit code to complete your login to DietHaven:",
      validFor = "5 minutes",
    } = params;
    const subject = `${code} is your DietHaven verification code`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#222222;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F5F5F0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background-color:#2E6B3E;padding:24px 32px;text-align:left;">
              <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:700;">DietHaven Consult</h1>
              <p style="margin:3px 0 0 0;font-size:12px;color:#E6F0E8;">Your Food, Your Medicine</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 12px 0;font-size:18px;color:#1F4A2C;font-weight:600;">${heading}</h2>
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.5;color:#444444;">
                ${intro}
              </p>
              <div style="margin:24px 0;background-color:#F5F5F0;border:1px solid #E6F0E8;border-radius:8px;padding:18px;text-align:center;">
                <span style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#1F4A2C;">${code}</span>
              </div>
              <p style="margin:0 0 8px 0;font-size:13px;color:#666666;">
                This code is valid for <strong>${validFor}</strong>.
              </p>
              <p style="margin:0;font-size:12px;color:#888888;">
                If you did not request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#fafafa;padding:16px 32px;border-top:1px solid #eeeeee;font-size:12px;color:#888888;text-align:center;">
              DietHaven Consult &bull; Secure Authentication
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `DietHaven Consult\n\n${heading}: ${code}\n\nThis code expires in ${validFor}. If you did not request this, please ignore this email.`;

    return this.sendEmail({ to, subject, html, text });
  }

  async sendPasswordReset(params: { to: string; code: string }) {
    const { to, code } = params;
    const subject = `${code} is your DietHaven password reset code`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#222222;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F5F5F0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background-color:#2E6B3E;padding:24px 32px;text-align:left;">
              <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:700;">DietHaven Consult</h1>
              <p style="margin:3px 0 0 0;font-size:12px;color:#E6F0E8;">Your Food, Your Medicine</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 12px 0;font-size:18px;color:#1F4A2C;font-weight:600;">Reset your password</h2>
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.5;color:#444444;">
                We received a request to reset your password. Use the following code to proceed:
              </p>
              <div style="margin:24px 0;background-color:#F5F5F0;border:1px solid #E6F0E8;border-radius:8px;padding:18px;text-align:center;">
                <span style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#1F4A2C;">${code}</span>
              </div>
              <p style="margin:0 0 8px 0;font-size:13px;color:#666666;">
                This code is valid for <strong>15 minutes</strong>.
              </p>
              <p style="margin:0;font-size:12px;color:#888888;">
                If you did not request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#fafafa;padding:16px 32px;border-top:1px solid #eeeeee;font-size:12px;color:#888888;text-align:center;">
              DietHaven Consult &bull; Account Security
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `DietHaven Consult\n\nYour password reset code is: ${code}\n\nThis code expires in 15 minutes. If you did not request this, please ignore this email.`;

    return this.sendEmail({ to, subject, html, text });
  }
}
