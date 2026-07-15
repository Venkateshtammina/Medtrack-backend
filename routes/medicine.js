const express = require("express");
const router = express.Router();
const Medicine = require("../models/Medicine");
const InventoryLog = require("../models/InventoryLog");
const auth = require("../middleware/auth");

// Create a new medicine
router.post("/", auth, async (req, res) => {
  try {
    console.log('POST /api/medicines - Request body:', req.body);
    console.log('POST /api/medicines - User:', req.user);
    
    const medicine = new Medicine({
      ...req.body,
      user: req.user._id
    });
    
    console.log('POST /api/medicines - Medicine object:', medicine);
    
    await medicine.save();
    console.log('POST /api/medicines - Medicine saved successfully');

    // Log the addition
    const log = new InventoryLog({
      action: "Added",
      medicineName: medicine.name,
      medicine: medicine._id,
      quantityChanged: medicine.quantity,
      user: req.user._id
    });
    await log.save();
    console.log('POST /api/medicines - Log saved successfully');

    res.status(201).json(medicine);
    console.log('POST /api/medicines - Response sent');
  } catch (err) {
    console.error('Error adding medicine:', err);
    console.error('Error details:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: err.message || "Failed to add medicine" });
  }
});

// Get all medicines
router.get("/", auth, async (req, res) => {
  try {
    const query = {
      user: req.user._id,
      // `$ne: null` also matches legacy records where the field is missing.
      // Only a stored archive timestamp identifies an archived medicine.
      archivedAt: req.query.archived === "true" ? { $type: "date" } : null,
    };
    const medicines = await Medicine.find(query).sort({ expiryDate: 1 });
    res.json(medicines);
  } catch (err) {
    console.error('Error fetching medicines:', err);
    res.status(500).json({ error: "Failed to fetch medicines" });
  }
});

// Get a single medicine by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const medicine = await Medicine.findOne({ _id: req.params.id, user: req.user._id, archivedAt: null });
    if (!medicine) {
      return res.status(404).json({ error: "Medicine not found" });
    }
    res.json(medicine);
  } catch (err) {
    console.error('Error fetching medicine:', err);
    res.status(500).json({ error: "Failed to fetch medicine" });
  }
});

// Update a medicine
router.patch("/:id", auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['name', 'description', 'quantity', 'expiryDate', 'price', 'category'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).json({ error: 'Invalid updates!' });
  }

  try {
    const medicine = await Medicine.findOne({ _id: req.params.id, user: req.user._id, archivedAt: null });
    
    if (!medicine) {
      return res.status(404).json({ error: "Medicine not found" });
    }

    // Log the change if quantity is being updated
    if (req.body.quantity !== undefined && req.body.quantity !== medicine.quantity) {
      const quantityChanged = req.body.quantity - medicine.quantity;
      const log = new InventoryLog({
        action: quantityChanged > 0 ? "Stock Added" : "Stock Used",
        medicineName: medicine.name,
        medicine: medicine._id,
        quantityChanged: Math.abs(quantityChanged),
        user: req.user._id
      });
      await log.save();
    }

    updates.forEach(update => medicine[update] = req.body[update]);
    await medicine.save();
    
    res.json(medicine);
  } catch (err) {
    console.error('Error updating medicine:', err);
    res.status(400).json({ error: err.message || "Failed to update medicine" });
  }
});

// Delete a medicine
router.delete("/:id", auth, async (req, res) => {
  try {
    const medicine = await Medicine.findOneAndDelete({ _id: req.params.id, user: req.user._id, archivedAt: null });
    
    if (!medicine) {
      return res.status(404).json({ error: "Medicine not found" });
    }

    // Log the deletion
    const log = new InventoryLog({
      action: "Deleted",
      medicineName: medicine.name,
      medicine: medicine._id,
      quantityChanged: 0,
      user: req.user._id
    });
    await log.save();

    res.json({ message: "Medicine deleted successfully" });
  } catch (err) {
    console.error('Error deleting medicine:', err);
    res.status(500).json({ error: "Failed to delete medicine" });
  }
});

// Other existing routes remain the same...
// ... (keep all other existing routes as they are)

module.exports = router;
