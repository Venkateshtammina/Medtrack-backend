const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const medicineRoutes = require("./routes/medicine");
const inventoryLogRoutes = require("./routes/inventoryLogRoutes");
const alertScheduler = require("./scripts/expiryAlert"); // Make sure this is a function
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/inventory-logs", inventoryLogRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "MedTrack API is running",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      medicines: "/api/medicines",
      inventory: "/api/inventory-logs"
    }
  });
});

// REMOVE or COMMENT OUT the following lines for backend-only deployment on Render
// app.use(express.static(path.join(__dirname, "../frontend/build")));
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "../frontend/build/index.html"));
// });

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully ✅");

    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);

      // Start alert scheduler after successful DB connection
      alertScheduler(); // <-- This must be a function
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });
