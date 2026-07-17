const Medicine = require("../models/Medicine");
const User = require("../models/User");
const { sendEmail } = require("../utils/mailer");

const DAY_MS = 24 * 60 * 60 * 1000;
const ARCHIVE_RETENTION_DAYS = 30;

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendExpiryAlerts() {
  const alertDays = Number(process.env.EXPIRY_ALERT_DAYS || 7);
  if (!Number.isInteger(alertDays) || alertDays < 1) {
    throw new Error("EXPIRY_ALERT_DAYS must be a positive integer");
  }

  const today = startOfUtcDay();
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const alertEnd = new Date(today.getTime() + (alertDays + 1) * DAY_MS);
  const archiveCutoff = new Date(Date.now() - ARCHIVE_RETENTION_DAYS * DAY_MS);
  const expiredArchivesDeleted = await Medicine.deleteMany({
    archivedAt: { $lt: archiveCutoff },
  });
  const expiredMedicines = await Medicine.find({
    expiryDate: { $lt: today },
    archivedAt: null,
  }).sort({ expiryDate: 1 });
  const medicines = await Medicine.find({
    expiryDate: { $gte: today, $lt: alertEnd },
    archivedAt: null,
  }).sort({ expiryDate: 1 });

  const medicinesByUser = new Map();
  for (const medicine of medicines) {
    const alreadyAlertedForThisExpiry =
      medicine.expiryAlertSentFor &&
      new Date(medicine.expiryAlertSentFor).getTime() === new Date(medicine.expiryDate).getTime();

    if (!alreadyAlertedForThisExpiry) {
      const userId = medicine.user.toString();
      medicinesByUser.set(userId, [...(medicinesByUser.get(userId) || []), medicine]);
    }
  }

  let emailsSent = 0;
  let medicinesArchived = 0;

  const expiredByUser = new Map();
  for (const medicine of expiredMedicines) {
    const userId = medicine.user.toString();
    expiredByUser.set(userId, [...(expiredByUser.get(userId) || []), medicine]);
  }

  for (const [userId, userMedicines] of expiredByUser) {
    const user = await User.findById(userId);
    if (user?.email) {
      const medicineRows = userMedicines
        .map((medicine) => {
          const expiryDate = new Date(medicine.expiryDate).toLocaleDateString("en-IN", {
            dateStyle: "long",
            timeZone: "UTC",
          });
          return `<li><strong>${escapeHtml(medicine.name)}</strong> &mdash; expired ${expiryDate}</li>`;
        })
        .join("");

      await sendEmail({
        to: user.email,
        subject: "Expired medicines archived in MedTrack",
        html: `
          <h2>Expired medicines archived</h2>
          <p>Hi ${escapeHtml(user.name || "there")},</p>
          <p>These medicines have expired and were moved out of your active inventory:</p>
          <ul>${medicineRows}</ul>
          <p>They will remain in your archive for ${ARCHIVE_RETENTION_DAYS} days before permanent deletion.</p>
        `,
      });
      emailsSent += 1;
    }

    const result = await Medicine.updateMany({
      _id: { $in: userMedicines.map((medicine) => medicine._id) },
      archivedAt: null,
    }, {
      $set: { archivedAt: new Date(), archiveReason: "expired" },
    });
    medicinesArchived += result.modifiedCount;
  }

  for (const [userId, userMedicines] of medicinesByUser) {
    const user = await User.findById(userId);
    if (!user?.email) continue;

    const medicineRows = userMedicines
      .map((medicine) => {
        const expiryDate = new Date(medicine.expiryDate).toLocaleDateString("en-IN", {
          dateStyle: "long",
          timeZone: "UTC",
        });
        return `<li><strong>${escapeHtml(medicine.name)}</strong> &mdash; expires ${expiryDate}</li>`;
      })
      .join("");

    await sendEmail({
      to: user.email,
      subject: "Medicine expiry alert from MedTrack",
      html: `
        <h2>Medicines expiring soon</h2>
        <p>Hi ${escapeHtml(user.name || "there")},</p>
        <p>The following medicines expire within the next ${alertDays} days:</p>
        <ul>${medicineRows}</ul>
        <p>Please review your inventory and take the appropriate action.</p>
      `,
    });

    await Medicine.bulkWrite(
      userMedicines.map((medicine) => ({
        updateOne: {
          filter: { _id: medicine._id },
          update: { $set: { expiryAlertSentFor: medicine.expiryDate, lastAlertSent: new Date() } },
        },
      }))
    );
    emailsSent += 1;
  }

  return {
    emailsSent,
    medicinesAlerted: [...medicinesByUser.values()].flat().length,
    medicinesArchived,
    expiredArchivesDeleted: expiredArchivesDeleted.deletedCount,
  };
}

module.exports = { sendExpiryAlerts };
