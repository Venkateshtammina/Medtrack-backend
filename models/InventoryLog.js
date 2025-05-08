const mongoose = require("mongoose");

const inventoryLogSchema = new mongoose.Schema({
  medicineName: String,
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true
  },
  action: String, // "added", "deleted", "updated"
  quantity: Number,
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

module.exports = mongoose.model("InventoryLog", inventoryLogSchema);
