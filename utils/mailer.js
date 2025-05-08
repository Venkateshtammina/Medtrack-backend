const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // This is the 16-character app password
  },
});

const sendExpiryNotification = async (to, medicineName, expiryDate) => {
  const mailOptions = {
    from: `"MedTrack" <${process.env.EMAIL_USER}>`,
    to,
    subject: `⏰ Expiry Alert: ${medicineName}`,
    html: `
      <h3>Medicine Expiry Notification</h3>
      <p><strong>${medicineName}</strong> is expiring on <strong>${expiryDate}</strong>.</p>
      <p>Please check your inventory and take necessary actions.</p>
      <br/>
      <em>MedTrack</em>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to} for ${medicineName}`);
  } catch (err) {
    console.error("❌ Error sending email:", err);
  }
};

module.exports = sendExpiryNotification;
