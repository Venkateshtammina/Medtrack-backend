// 📁 server/routes/auth.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const OtpVerification = require("../models/OtpVerification");
const crypto = require("crypto");
const auth = require("../middleware/auth");
require("dotenv").config();

// Setup transporter (if not already present)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Request OTP for registration
router.post("/request-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  // Check if user already exists
  const trimmedEmail = email.toLowerCase().trim();
  const userExists = await User.findOne({ email: trimmedEmail });
  if (userExists) return res.status(400).json({ message: "User already exists" });

  const otp = (Math.floor(100000 + Math.random() * 900000)).toString(); // 6-digit OTP
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

  await OtpVerification.deleteMany({ email: trimmedEmail }); // Remove old OTPs

  await OtpVerification.create({ email: trimmedEmail, otp, expiresAt });

  // Send OTP email
  await transporter.sendMail({
    from: `MedTrack <${process.env.EMAIL_USER}>`,
    to: trimmedEmail,
    subject: "Your MedTrack Registration OTP",
    html: `<p>Your OTP is <b>${otp}</b>. It is valid for 10 minutes.</p>`
  });

  res.json({ message: "OTP sent to email." });
});

// Register with OTP verification
router.post("/register", async (req, res) => {
  const { name, email, password, otp } = req.body;
  if (!name || !email || !password || !otp) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const record = await OtpVerification.findOne({ email, otp });
  if (!record || record.expiresAt < new Date()) {
    return res.status(400).json({ message: "Invalid or expired OTP." });
  }

  const trimmedEmail = email.toLowerCase().trim();
  const userExists = await User.findOne({ email: trimmedEmail });
  if (userExists) return res.status(400).json({ message: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
    name,
    email: trimmedEmail,
    password: hashedPassword,
  });

  await newUser.save();
  await OtpVerification.deleteMany({ email }); // Clean up OTPs

  res.status(201).json({ message: "User registered successfully" });
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

// Forgot Password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const trimmedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: trimmedEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });

    const resetLink = `http://localhost:3000/reset-password/${token}`;

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
      subject: "Reset Your MedTrack Password",
      html: `
        <p>Hi ${user.name},</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetLink}" target="_blank">${resetLink}</a>
        <p>This link will expire in 15 minutes.</p>
        <p>Regards,<br/>MedTrack Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "Reset link sent to your email." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Something went wrong." });
  }
});

// Reset Password
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.trim() === "") {
    return res.status(400).json({ message: "Password is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.findOne({ _id: decoded.id });
    await User.findByIdAndUpdate(decoded.id, { password: hashedPassword });
    res.json({ message: "Password reset successfully." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(400).json({ message: "Invalid or expired token." });
  }
});

router.get("/me", auth, async (req, res) => {
  // req.user is set by the auth middleware
  res.json({
    name: req.user.name,
    email: req.user.email
    // add more fields if needed
  });
});

module.exports = router;