const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
  action: String, // add, update, delete
  medicineName: String,
  quantity: Number,
  expiryDate: Date,
  timestamp: {
    type: Date,
    default: Date.now,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

module.exports = mongoose.model("Log", logSchema);
