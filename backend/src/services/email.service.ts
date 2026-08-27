import { Resend } from "resend";
import { env } from "../config/env.js";

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!env.resendApiKey) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(env.resendApiKey);
  }
  return resendClient;
}

export async function sendPasswordResetEmail(params: {
  to: string;
  employeeName: string;
  employeeId: string;
  newPassword: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const client = getResendClient();

  if (!client || !env.resendFromEmail) {
    console.warn(
      "[email] Resend is not configured. Password reset email was not sent.",
      {
        to: params.to,
        employeeId: params.employeeId,
      }
    );
    return {
      sent: false,
      reason: "Email service is not configured",
    };
  }

  const subject = "Altrium PerformX 360° — Password Reset";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2>Password Reset Completed</h2>
      <p>Hello ${params.employeeName},</p>
      <p>Your HR administrator has reset your password for <strong>Altrium PerformX 360°</strong>.</p>
      <p><strong>Employee ID:</strong> ${params.employeeId}</p>
      <p><strong>Temporary Password:</strong> ${params.newPassword}</p>
      <p>Please sign in and change this password when password change functionality becomes available.</p>
      <p>If you did not request this reset, contact HR immediately.</p>
    </div>
  `;

  await client.emails.send({
    from: env.resendFromEmail,
    to: params.to,
    subject,
    html,
  });

  return { sent: true };
}
