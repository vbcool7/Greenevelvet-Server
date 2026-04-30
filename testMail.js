import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const test = async () => {
  try {
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

    console.log("Checking SMTP...");

    await transporter.verify();

    console.log("✅ SMTP READY");

    const useremail = "satishbhawsar92@gmail.com";

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: useremail,
      subject: "Test Email",
      text: "SMTP working",
    });

    console.log("✅ EMAIL SENT");
  } catch (err) {
    console.log("❌ ERROR:", err);
  }
};

test();