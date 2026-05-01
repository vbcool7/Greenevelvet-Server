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

  try {
    const msg = {
      to: email,
      from: `"GREENE VELVET" <${process.env.SENDER_EMAIL}>`, // verified sender
      subject: "Complete My Registration - GreeneVelvet",
      html: `
        <h2>Please Confirm Your Email Address</h2>
        <p>Thank you for registering with GreeneVelvet.</p>
        <p>Click the button below to complete your registration:</p>
        <a href="${link}" 
          style="display:inline-block;padding:12px 20px;
          background:#0a7cff;color:#fff;text-decoration:none;
          border-radius:5px;">
          Complete My Registration
        </a>
        <p>If you can't find the email, check your spam folder.</p>
      `
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