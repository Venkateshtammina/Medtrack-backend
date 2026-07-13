const nodemailer = require("nodemailer");
require("dotenv").config();

let transporter;

function getTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be configured");
  }

  if (!transporter) {
    if (process.env.EMAIL_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: Number(process.env.EMAIL_PORT) === 465,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    }
  }

  return transporter;
}

const DEFAULT_FROM_EMAIL = "venkatesht1243@gmail.com";

function getFromAddress() {
  const fromEmail =
    process.env.EMAIL_FROM ||
    (!process.env.EMAIL_HOST ? process.env.EMAIL_USER : DEFAULT_FROM_EMAIL);

  if (!fromEmail) {
    throw new Error(
      "EMAIL_FROM must be set to a verified sender address when using custom SMTP"
    );
  }

  return `"MedTrack Support" <${fromEmail}>`;
}

async function sendEmail({ to, subject, html }) {
  await getTransporter().sendMail({
    from: getFromAddress(),
    to,
    subject,
    html,
  });
}

async function sendOtpEmail({ to, name, otp, purpose }) {
  const isReset = purpose === "reset";
  const subject = isReset
    ? "Your Password Reset OTP"
    : "Your Registration OTP";

  const intro = isReset
    ? "You requested a password reset."
    : "Use this code to complete your MedTrack registration.";

  const html = `
    <p>Hi ${name || "there"},</p>
    <p>${intro} Your OTP is: <strong>${otp}</strong></p>
    <p>This OTP will expire in 10 minutes.</p>
    <p>Regards,<br/>MedTrack Team</p>
  `;

  await sendEmail({ to, subject, html });
}

const sendExpiryNotification = async (to, medicineName, expiryDate) => {
  const mailOptions = {
    from: getFromAddress(),
    to,
    subject: `Expiry Alert: ${medicineName}`,
    html: `
      <h3>Medicine Expiry Notification</h3>
      <p><strong>${medicineName}</strong> is expiring on <strong>${expiryDate}</strong>.</p>
      <p>Please check your inventory and take necessary actions.</p>
      <br/>
      <em>MedTrack</em>
    `,
  };

  try {
    await getTransporter().sendMail(mailOptions);
    console.log(`Email sent to ${to} for ${medicineName}`);
  } catch (err) {
    console.error("Error sending expiry email:", err.message);
    throw err;
  }
};

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendExpiryNotification,
};

