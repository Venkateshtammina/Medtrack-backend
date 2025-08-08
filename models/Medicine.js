const mongoose = require("mongoose");

const MedicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: ""
  },
  quantity: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    default: 0
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  manufacturer: {
    type: String,
    default: ""
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
}, {
  timestamps: true
});

module.exports = mongoose.model("Medicine", MedicineSchema);