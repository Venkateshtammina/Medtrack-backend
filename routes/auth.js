// 📁 server/routes/auth.js
import axios from "axios"
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const User = require("../models/User");
require("dotenv").config();

// Register
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
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
    if (!user || user.resetOtp !== otp || Date.now() > user.resetOtpExpiry) {
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

module.exports = router;