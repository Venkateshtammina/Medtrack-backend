const express = require("express");
const { sendExpiryAlerts } = require("../services/expiryAlerts");

const router = express.Router();

router.get("/expiry-alerts", async (req, res, next) => {
  const authorization = req.get("authorization");
  const expectedAuthorization = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authorization !== expectedAuthorization) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const result = await sendExpiryAlerts();
    res.status(200).json({ message: "Expiry alerts processed", ...result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
