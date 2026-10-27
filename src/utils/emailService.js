import sgMail from "@sendgrid/mail";

// ✅ Email validator
const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ✅ Set API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendVerificationEmail = async (email, link) => {

    if (!isValidEmail(email)) {
        console.log(`Invalid email format: ${email} - skipping`);
        return;
    }

    const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f9f9f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:40px 0;">
  <tr>
    <td align="center">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.05);border:1px solid #eeeeee;overflow:hidden;">
        
        <!-- Header Accent -->
        <tr>
          <td height="5" style="background-color:#00A68F;"></td>
        </tr>

        <!-- Brand Section -->
        <tr>
          <td style="padding:35px 40px 10px 40px;text-align:center;">
            <h1 style="margin:0;color:#00A68F;font-size:24px;font-weight:800;letter-spacing:1.5px;">
              GREENE VELVET
            </h1>
            <p style="margin:4px 0 0 0;color:#666666;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">
              Australia’s Premium Escort Directory
            </p>
          </td>
        </tr>

        <!-- Main Content -->
        <tr>
          <td style="padding:20px 40px 35px 40px;text-align:center;">
            <h2 style="margin:0 0 12px 0;color:#1a1a1a;font-size:20px;font-weight:600;">Confirm Your Email</h2>
            <p style="margin:0 0 20px 0;color:#555555;font-size:15px;line-height:22px;">
              Thank you for joining <strong>Greene Velvet</strong>! Please confirm your email address to activate your account and start using our directory.
            </p>

            <!-- Action Button -->
            <div style="margin:25px 0;">
              <a href="${link}" 
                 style="display:inline-block; background-color:#00A68F; color:#ffffff; padding:15px 30px; font-size:15px; font-weight:700; text-decoration:none; border-radius:8px; box-shadow: 0 4px 12px rgba(0, 166, 143, 0.2);">
                Complete My Registration
              </a>
            </div>

            <!-- 24-Hour Expiry Notice -->
            <div style="background-color:#FFFBEB; border-left:4px solid #F59E0B; padding:12px 16px; margin:20px 0; border-radius:4px; text-align:left;">
              <p style="margin:0; font-size:13px; color:#B45309; line-height:18px;">
                <strong>Please Note:</strong> This verification link is valid for <strong>24 hours</strong> only.
              </p>
            </div>

            <p style="margin:20px 0 0 0; color:#888888; font-size:13px; line-height:20px;">
              If you didn't create an account on Greene Velvet, you can safely ignore this email. <br>
              <span style="font-size:12px;">P.S. Check your spam folder if you can't find our future updates.</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;background-color:#fcfcfc;border-top:1px solid #eeeeee;text-align:center;">
            <p style="margin:0;font-size:12px;color:#888888;line-height:18px;">
              © ${new Date().getFullYear()} <b>Greene Velvet</b>. All rights reserved. <br>
              Australia's Exclusive Premium Escort Directory Platform.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

</body>
</html>
`;

    try {
        const msg = {
            to: email,
            from: `"GREENE VELVET" <${process.env.SENDER_EMAIL}>`,
            subject: "Verify Your Account - Greene Velvet",
            html: html,
        };

        await sgMail.send(msg);

        console.log(`Verification email sent to ${email}`);

    } catch (error) {
        console.error(
            `Email not sent to ${email}:`,
            error.response?.body || error.message
        );
    }
};