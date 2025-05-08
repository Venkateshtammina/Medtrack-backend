const cron = require("node-cron");
const sendExpiryAlerts = require("./sendExpiryEmails"); // <-- renamed function file

const alertScheduler = () => {
  console.log("⏰ Starting alert scheduler...");

  cron.schedule("0 10 * * *", async () => {
    console.log("🔔 Running scheduled expiry alert job...");
    try {
      await sendExpiryAlerts();
    } catch (err) {
      console.error("❌ Error in scheduled job:", err);
    }
  });
};

module.exports = alertScheduler;
