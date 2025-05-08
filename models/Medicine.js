const mongoose = require("mongoose");

const MedicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastAlertSent: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model("Medicine", MedicineSchema);
