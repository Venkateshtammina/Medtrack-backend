// Optional manual runner for local testing. Production alerts are triggered by
// Vercel Cron through /api/jobs/expiry-alerts.
require("dotenv").config();

const { connectDB, disconnectDB } = require("../db");
const { sendExpiryAlerts } = require("../services/expiryAlerts");

async function run() {
  await connectDB();
  const result = await sendExpiryAlerts();
  console.log("Expiry alerts processed:", result);
  await disconnectDB();
}

if (require.main === module) {
  run().catch(async (error) => {
    console.error("Failed to process expiry alerts:", error);
    await disconnectDB();
    process.exitCode = 1;
  });
}

module.exports = { sendExpiryAlerts };
