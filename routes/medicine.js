const express = require("express");
const router = express.Router();
const Medicine = require("../models/Medicine");
const InventoryLog = require("../models/InventoryLog");
const auth = require("../middleware/auth"); // ✅ Import auth middleware

// 🔹 Add Medicine
router.post("/", auth, async (req, res) => {
  try {
    const medicine = new Medicine({
      ...req.body,
      user: req.user._id // Add user ID to the medicine
    });
    await medicine.save();

    // Log the addition
    const log = new InventoryLog({
      action: "Added",
      medicineName: medicine.name,
      medicine: medicine._id,
      quantityChanged: medicine.quantity,
      user: req.user._id // Add user ID to the log
    });
    await log.save();

    res.status(201).json(medicine);
  } catch (err) {
    console.error('Error adding medicine:', err);
    res.status(500).json({ error: err.message || "Failed to add medicine" });
  }
});

// 🔹 Get All Medicines
router.get("/", auth, async (req, res) => {
  try {
    const medicines = await Medicine.find({ user: req.user._id }).sort({ expiryDate: 1 });
    res.json(medicines);
  } catch (err) {
    console.error('Error fetching medicines:', err);
    res.status(500).json({ error: "Failed to fetch medicines" });
  }
});

// 🔹 Update Medicine
router.put("/:id", auth, async (req, res) => {
  try {
    const medicine = await Medicine.findOne({ _id: req.params.id, user: req.user._id });
    if (!medicine) {
      return res.status(404).json({ error: "Medicine not found" });
    }

    const oldMed = medicine;
    const updatedMed = await Medicine.findByIdAndUpdate(
      req.params.id,
      { ...req.body, user: req.user._id },
      { new: true }
    );

    // Log the update
    const quantityChange = req.body.quantity - oldMed.quantity;
    const log = new InventoryLog({
      action: "Updated",
      medicineName: updatedMed.name,
      medicine: updatedMed._id,
      quantityChanged: quantityChange,
      user: req.user._id
    });
    await log.save();

    res.json(updatedMed);
  } catch (err) {
    console.error('Error updating medicine:', err);
    res.status(500).json({ error: "Failed to update medicine" });
  }
});

// 🔹 Delete Medicine
router.delete("/:id", auth, async (req, res) => {
  try {
    const medicine = await Medicine.findOne({ _id: req.params.id, user: req.user._id });
    if (!medicine) {
      return res.status(404).json({ error: "Medicine not found" });
    }

    const deletedMed = await Medicine.findByIdAndDelete(req.params.id);

    // Log the deletion
    const log = new InventoryLog({
      action: "Deleted",
      medicineName: deletedMed.name,
      medicine: deletedMed._id,
      quantityChanged: -deletedMed.quantity,
      user: req.user._id
    });
    await log.save();

    res.json({ message: "Medicine deleted" });
  } catch (err) {
    console.error('Error deleting medicine:', err);
    res.status(500).json({ error: "Failed to delete medicine" });
  }
});

module.exports = router;
