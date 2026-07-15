// Kept for compatibility with existing imports. Vercel Cron is configured in
// vercel.json and calls the secured API job once per day.
const { sendExpiryAlerts } = require("../services/expiryAlerts");

module.exports = sendExpiryAlerts;
