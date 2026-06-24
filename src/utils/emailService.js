import sgMail from "@sendgrid/mail";

// ✅ Email validator (same)
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
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:460px;background:#ffffff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.05);border:1px solid #eeeeee;overflow:hidden;">
        
        <!-- Header Accent -->
        <tr>
          <td height="5" style="background-color:#00A68F;"></td>
        </tr>

        <!-- Brand Section -->
        <tr>
          <td style="padding:35px 40px 10px 40px;text-align:center;">
            <h1 style="margin:0;color:#00A68F;font-size:24px;font-weight:800;letter-spacing:1px;">
              GREENE VELVET
            </h1>
          </td>
        </tr>

        <!-- Main Content -->
        <tr>
          <td style="padding:20px 40px 40px 40px;text-align:center;">
            <h2 style="margin:0 0 12px 0;color:#1a1a1a;font-size:20px;font-weight:600;">Confirm Your Email</h2>
            <p style="margin:0 0 25px 0;color:#555555;font-size:15px;line-height:22px;">
              Thank you for joining <strong>Greene Velvet</strong>! To get started, please confirm your email address by clicking the button below.
            </p>

            <!-- Action Button -->
            <div style="margin:30px 0;">
              <a href="${link}" 
                 style="display:inline-block; background-color:#00A68F; color:#ffffff; padding:16px 32px; font-size:16px; font-weight:700; text-decoration:none; border-radius:8px; box-shadow: 0 4px 12px rgba(0, 166, 143, 0.2);">
                Complete My Registration
              </a>
            </div>

            <p style="margin:20px 0 0 0; color:#888888; font-size:13px; line-height:20px;">
              If you didn't create an account, you can safely ignore this email. <br>
              <span style="font-size:12px;">P.S. Check your spam folder if you can't find our future updates.</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:25px 40px;background-color:#fcfcfc;border-top:1px solid #eeeeee;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:18px;">
              © ${new Date().getFullYear()} <b>Greene Velvet</b> Solutions. <br>
              Building digital excellence, one step at a time.
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
            from: `"GREENE VELVET" <${process.env.SENDER_EMAIL}>`, // verified sender
            subject: "Complete My Registration - GreeneVelvet",
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