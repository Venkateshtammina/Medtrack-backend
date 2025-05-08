require("dotenv").config();
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const Medicine = require("../models/Medicine");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

async function sendExpiryEmails() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  try {
    const users = await User.find();
    const today = new Date();
    const next7Days = new Date();
    next7Days.setDate(today.getDate() + 7);

    for (const user of users) {
      // Find expiring medicines for this user that have not been alerted today
      const expiringMeds = await Medicine.find({
        user: user._id,
        expiryDate: { $lte: next7Days, $gte: today },
      });

      // Filter out medicines that have already been alerted today
      const medsToAlert = expiringMeds.filter(
        (med) => !med.lastAlertSent || !isSameDay(new Date(med.lastAlertSent), today)
      );

      if (medsToAlert.length === 0) continue;

      const html = `
        <h2>⏰ Medicines Expiring Soon</h2>
        <p>Hi ${user.name},</p>
        <p>The following medicines in your inventory are expiring within the next 7 days:</p>
        <ul>
          ${medsToAlert
            .map(
              (med) =>
                `<li><strong>${med.name}</strong> - Expires on ${new Date(
                  med.expiryDate
                ).toDateString()}</li>`
            )
            .join("")}
        </ul>
        <p>Please take necessary action.</p>
        <p>Regards,<br/>MedTrack</p>
      `;

      await transporter.sendMail({
        from: `MedTrack Alerts <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "🚨 Medicine Expiry Alert",
        html,
      });

      // Update lastAlertSent for these medicines
      for (const med of medsToAlert) {
        med.lastAlertSent = today;
        await med.save();
      }

      console.log(`✔️ Alert sent to ${user.email} for ${medsToAlert.length} medicines.`);
    }

    console.log("✅ All alerts processed.");
  } catch (error) {
    console.error("❌ Error sending alerts:", error);
  }
}

module.exports = sendExpiryEmails;
