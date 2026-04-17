import { convexAuth } from "@convex-dev/auth/server";
import { Email } from "@convex-dev/auth/providers/Email";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Anonymous,
    Email({
      id: "resend-otp",
      sendVerificationRequest: async ({ identifier: email, token }) => {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.AUTH_RESEND_KEY);
        const { error } = await resend.emails.send({
          from: "BlockSense <onboarding@resend.dev>",
          to: [email],
          subject: "BlockSense — your sign-in code",
          html: `
            <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#F6F5F1;">
              <div style="background:#0F6E56;padding:24px;border-radius:8px;text-align:center;margin-bottom:32px;">
                <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">BlockSense</h1>
                <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px;">Smart Community Operating System</p>
              </div>
              <div style="background:#fff;border-radius:8px;padding:32px;border:0.5px solid #CCCCCC;">
                <h2 style="color:#1A1A1A;margin:0 0 8px;font-size:20px;">Your sign-in code</h2>
                <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">Enter this code to sign in to BlockSense. Valid for 10 minutes.</p>
                <div style="background:#F6F5F1;border-radius:8px;padding:24px;text-align:center;letter-spacing:12px;font-size:36px;font-weight:700;color:#0F6E56;font-variant-numeric:tabular-nums;">
                  ${token}
                </div>
                <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;text-align:center;">If you did not request this, ignore this email.</p>
              </div>
            </div>
          `,
        });
        if (error) throw new Error(`Failed to send OTP: ${error.message}`);
      },
    }),
  ],
});
