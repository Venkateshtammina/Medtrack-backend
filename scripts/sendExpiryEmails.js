const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
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
    today.setHours(0, 0, 0, 0); // Start of today
    const next7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const user of users) {
      // 1. Expired Today
      const expiredTodayMeds = await Medicine.find({
        user: user._id,
        expiryDate: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      });

      for (const med of expiredTodayMeds) {
        if (med.lastAlertSent && isSameDay(new Date(med.lastAlertSent), today)) {
          continue; // Already alerted today
        }

        await transporter.sendMail({
          from: `MedTrack Alerts <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: `Medicine Expiry Alert: ${med.name}`,
          html: `
            <h2>⏰ Medicine Expired</h2>
            <p>Hi ${user.name},</p>
            <p>Your medicine <strong>${med.name}</strong> expired today (${new Date(
            med.expiryDate
          ).toDateString()}).</p>
            <p>Please take necessary action.</p>
            <p>Regards,<br/>MedTrack</p>
          `,
        });

        med.lastAlertSent = today;
        await med.save();
        console.log(`✔️ Expired alert sent to ${user.email} for medicine: ${med.name}`);
      }

      // 2. Expiring Soon (within next 7 days, but not today or in the past)
      const expiringSoonMeds = await Medicine.find({
        user: user._id,
        expiryDate: {
          $gt: today,
          $lte: next7Days,
        },
      });

      // Only alert for those not already alerted today
      const medsToAlert = expiringSoonMeds.filter(
        (med) => !med.lastAlertSent || !isSameDay(new Date(med.lastAlertSent), today)
      );

      if (medsToAlert.length > 0) {
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

        console.log(`✔️ Soon-to-expire alert sent to ${user.email} for ${medsToAlert.length} medicines.`);
      }
    }

    console.log("✅ All expiry alerts processed.");
  } catch (error) {
    console.error("❌ Error sending alerts:", error);
  }
}

sendExpiryEmails();
