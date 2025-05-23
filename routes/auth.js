// 📁 server/routes/auth.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const User = require("../models/User");
require("dotenv").config();

// Register with OTP verification
router.post("/register", async (req, res) => {
  const { name, email, password, otp } = req.body;
  try {
    const trimmedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const userExists = await User.findOne({ email: trimmedEmail, password: { $ne: null } });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    // Find temp user with OTP
    const tempUser = await User.findOne({ email: trimmedEmail, password: null });
    if (!tempUser || tempUser.resetOtp !== otp || Date.now() > tempUser.resetOtpExpiry) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Create the real user
    const hashedPassword = await bcrypt.hash(password, 10);
    tempUser.name = name;
    tempUser.password = hashedPassword;
    tempUser.resetOtp = undefined;
    tempUser.resetOtpExpiry = undefined;
    await tempUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const trimmedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: trimmedEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Forgot Password - Send OTP
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const trimmedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: trimmedEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    transporter.verify((error, success) => {
      if (error) {
        console.error("Email config error:", error);
      } else {
        console.log("Ready to send email!");
      }
    });

    const mailOptions = {
      from: `"MedTrack Support" <${process.env.EMAIL_USER}>`,
      to: trimmedEmail,
      subject: "Your Password Reset OTP",
      html: `
        <p>Hi ${user.name},</p>
        <p>You requested a password reset. Your OTP is: <strong>${otp}</strong></p>
        <p>This OTP will expire in 10 minutes.</p>
        <p>Regards,<br/>MedTrack Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "OTP sent to your email." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Something went wrong." });
  }
});

// Reset Password with OTP
router.post("/reset-password-with-otp", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const trimmedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: trimmedEmail });
    
    // Debug logging
    console.log('Reset attempt:', {
      email: trimmedEmail,
      providedOtp: otp,
      storedOtp: user?.resetOtp,
      expiry: user?.resetOtpExpiry,
      currentTime: Date.now()
    });

    if (!user) {
      console.log('User not found');
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    
    if (user.resetOtp !== otp) {
      console.log('OTP mismatch');
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    
    if (Date.now() > user.resetOtpExpiry) {
      console.log('OTP expired');
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successfully." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Something went wrong." });
  }
});

// Get current user info (requires authentication)
router.get("/me", async (req, res) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
});

// Request OTP for registration
router.post("/request-otp", async (req, res) => {
  const { email } = req.body;
  try {
    const trimmedEmail = email.toLowerCase().trim();
    // Check if user already exists
    const userExists = await User.findOne({ email: trimmedEmail });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in a temporary user document (or upsert)
    let tempUser = await User.findOne({ email: trimmedEmail, password: null });
    if (!tempUser) {
      tempUser = new User({ name: "", email: trimmedEmail, password: null });
    }
    tempUser.resetOtp = otp;
    tempUser.resetOtpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await tempUser.save();

    // Send OTP to email
    const transporter = require("nodemailer").createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    await transporter.sendMail({
      from: `"MedTrack Support" <${process.env.EMAIL_USER}>`,
      to: trimmedEmail,
      subject: "Your Registration OTP",
      html: `<p>Your OTP for MedTrack registration is: <strong>${otp}</strong></p><p>This OTP will expire in 10 minutes.</p>`
    });

    res.json({ message: "OTP sent to your email." });
  } catch (err) {
    console.error("Request OTP error:", err);
    res.status(500).json({ message: "Failed to send OTP." });
  }
});

module.exports = router;