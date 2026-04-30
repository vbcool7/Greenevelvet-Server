import nodemailer from "nodemailer";

// ✅ Email validator
const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ✅ GLOBAL transporter (IMPORTANT)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

// ✅ (Optional but recommended) - verify once on server start
transporter.verify()
  .then(() => console.log("✅ SMTP Ready"))
  .catch((err) => console.error("❌ SMTP Error:", err));


// ✅ Main function
export const sendMail = async (to, subject, html) => {

  if (!isValidEmail(to)) {
    console.log(`❌ Invalid email: ${to}`);
    return false;
  }

  try {
    console.log("📤 Sending email to:", to);

    const info = await transporter.sendMail({
      from: `"GREENE VELVET" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent:", info.response);

    return true; // ✅ important

  } catch (err) {
    console.error("❌ FULL EMAIL ERROR:", err); // full error

    return false; // ✅ important
  }
};