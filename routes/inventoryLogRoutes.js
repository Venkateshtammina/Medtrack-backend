const express = require("express");
const router = express.Router();
const InventoryLog = require("../models/InventoryLog");
const auth = require("../middleware/auth");

// 🔹 Get all inventory logs for the logged-in user (most recent first)
router.get("/", auth, async (req, res) => {
  try {
    const logs = await InventoryLog.find({ user: req.user._id })
      .sort({ timestamp: -1 })
      .populate('medicine'); // Populate medicine reference
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch inventory logs" });
  }
});

module.exports = router;
