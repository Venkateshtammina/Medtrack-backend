require('dotenv').config();
const express = require("express");
const { connectDB, connection } = require("./db");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const medicineRoutes = require("./routes/medicine");
const inventoryLogRoutes = require("./routes/inventoryLogRoutes");
const jobRoutes = require("./routes/jobs");

const app = express();

// Enable dynamic CORS matching for all Vercel deployments and localhost
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) return callback(null, true);
    
    const isLocalhost = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
    const isVercelDomain = origin.endsWith('.vercel.app'); // Dynamically supports all your frontend preview & production URLs
    
    if (isLocalhost || isVercelDomain) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS Policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serverless Database Middleware 
// (Guarantees the database connection is active before running any route logic)
app.use(async (req, res, next) => {
  try {
    if (connection.readyState !== 1) {
      await connectDB();
    }
    next();
  } catch (err) {
    next(new Error("Database connection failed: " + err.message));
  }
});

// Simple request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/inventory-logs", inventoryLogRoutes);
app.use("/api/jobs", jobRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date(),
    dbState: connection.readyState === 1 ? "connected" : "disconnected"
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: err.message || "Something went wrong!",
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Handle process termination
    const shutdown = () => {
      console.log('Shutting down server...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Keeps local execution running normally (npm start)
if (require.main === module) {
  startServer();
}

// Export the application instance for Vercel Serverless handling
module.exports = app;
