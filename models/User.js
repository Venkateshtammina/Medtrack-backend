const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  password: String,
  lastAlertSent: { type: Date, default: null }, // 🆕 Added field
  resetOtp: { type: String },
  resetOtpExpiry: { type: Date }
});

module.exports = mongoose.model("User", userSchema);