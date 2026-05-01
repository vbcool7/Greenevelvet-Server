import sgMail from "@sendgrid/mail";

// ✅ Email validator (same as before)
const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ✅ Set API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


// ✅ Main function (same signature)
export const sendMail = async (to, subject, html) => {

  if (!isValidEmail(to)) {
    console.log(`❌ Invalid email: ${to}`);
    return false;
  }

  try {
    console.log("📤 Sending email to:", to);

    const msg = {
      to,
      from: `"GREENE VELVET" <${process.env.SENDER_EMAIL}>`, // verified sender
      subject,
      html,
    };

    const response = await sgMail.send(msg);

    console.log("✅ Email sent:", response[0].statusCode);

    return true;

  } catch (err) {
    console.error(
      "❌ FULL EMAIL ERROR:",
      err.response?.body || err.message
    );

    return false;
  }
};