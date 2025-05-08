const mongoose = require('mongoose');
const dotenv = require('dotenv');
const InventoryLog = require('../models/InventoryLog');
dotenv.config();

async function cleanupLogs() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const result = await InventoryLog.deleteMany({});
    console.log(`Deleted ${result.deletedCount} inventory logs.`);
    process.exit(0);
  } catch (err) {
    console.error('Error cleaning up inventory logs:', err);
    process.exit(1);
  }
}

cleanupLogs();