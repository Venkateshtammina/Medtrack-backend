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
    const userExists = await User.findOne({ email: trimmedEmail });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    // Verify OTP from in-memory storage
    if (!global.pendingRegistrations) {
      return res.status(400).json({ message: "No pending registration. Please request OTP first." });
    }

    const pendingReg = global.pendingRegistrations.get(trimmedEmail);
    if (!pendingReg || pendingReg.otp !== otp || Date.now() > pendingReg.expiry) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Create the real user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name: name || pendingReg.name,
      email: trimmedEmail,
      password: hashedPassword
    });
    await newUser.save();

    // Remove from pending registrations
    global.pendingRegistrations.delete(trimmedEmail);

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

    res.json({ 
      message: "Login successful", 
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
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

    // Log OTP to console for testing
    console.log(`\n🔐 OTP for ${trimmedEmail}: ${otp}`);

    // Try to send email (non-blocking, fire-and-forget)
    const sendEmailAsync = async () => {
      try {
        // Use Resend API if configured (works on Render without SMTP blocking)
        if (process.env.RESEND_API_KEY) {
          console.log("📧 Using Resend API for email sending");
          const resend = require('resend');
          const resendClient = new resend.Resend(process.env.RESEND_API_KEY);

          await resendClient.emails.send({
            from: 'MedTrack <onboarding@resend.dev>',
            to: trimmedEmail,
            subject: 'Your Password Reset OTP',
            html: `
              <p>Hi ${user.name},</p>
              <p>You requested a password reset. Your OTP is: <strong>${otp}</strong></p>
              <p>This OTP will expire in 10 minutes.</p>
              <p>Regards,<br/>MedTrack Team</p>
            `
          });
          console.log(`✅ Email sent via Resend to ${trimmedEmail}`);
        } else {
          // Fallback to SMTP (for local development)
          console.log("📧 Using SMTP for email sending");
          let transporter;

          if (process.env.EMAIL_HOST) {
            transporter = require("nodemailer").createTransport({
              host: process.env.EMAIL_HOST,
              port: process.env.EMAIL_PORT || 587,
              secure: process.env.EMAIL_PORT == 465,
              auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
              },
            });
          } else {
            transporter = require("nodemailer").createTransport({
              host: "smtp.gmail.com",
              port: 587,
              secure: false,
              auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
              },
            });
          }

          const mailOptions = {
            from: `"MedTrack Support" <venkatesht1243@gmail.com>`,
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
          console.log(`✅ Email sent via SMTP to ${trimmedEmail}`);
        }
      } catch (emailError) {
        console.error("❌ Email sending failed:", emailError.message);
      }
    };

    // Fire email sending without waiting
    sendEmailAsync();

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

// Reset Password with Token (for email links)
router.post("/reset-password", async (req, res) => {
  const { token, email, password } = req.body;

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const trimmedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: trimmedEmail });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (decoded.id !== user._id.toString()) {
      return res.status(401).json({ message: "Token does not match user" });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successfully." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(401).json({ message: "Invalid or expired token" });
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
  const { email, name } = req.body;
  try {
    const trimmedEmail = email.toLowerCase().trim();
    // Check if user already exists
    const userExists = await User.findOne({ email: trimmedEmail });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in memory with registration data (no database save)
    if (!global.pendingRegistrations) {
      global.pendingRegistrations = new Map();
    }
    global.pendingRegistrations.set(trimmedEmail, {
      otp,
      name: name || "",
      email: trimmedEmail,
      expiry: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    // Log OTP to console for testing
    console.log(`\n🔐 Registration OTP for ${trimmedEmail}: ${otp}`);

    // Try to send OTP to email (non-blocking, fire-and-forget)
    const sendEmailAsync = async () => {
      try {
        // Use Resend API if configured (works on Render without SMTP blocking)
        if (process.env.RESEND_API_KEY) {
          console.log("📧 Using Resend API for email sending");
          const resend = require('resend');
          const resendClient = new resend.Resend(process.env.RESEND_API_KEY);

          await resendClient.emails.send({
            from: 'MedTrack <onboarding@resend.dev>',
            to: trimmedEmail,
            subject: 'Your Registration OTP',
            html: `<p>Your OTP for MedTrack registration is: <strong>${otp}</strong></p><p>This OTP will expire in 10 minutes.</p>`
          });
          console.log(`✅ Registration email sent via Resend to ${trimmedEmail}`);
        } else {
          // Fallback to SMTP (for local development)
          console.log("📧 Using SMTP for email sending");
          let transporter;

          if (process.env.EMAIL_HOST) {
            transporter = require("nodemailer").createTransport({
              host: process.env.EMAIL_HOST,
              port: process.env.EMAIL_PORT || 587,
              secure: process.env.EMAIL_PORT == 465,
              auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
              },
            });
          } else {
            transporter = require("nodemailer").createTransport({
              host: "smtp.gmail.com",
              port: 587,
              secure: false,
              auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
              },
            });
          }

          await transporter.sendMail({
            from: `"MedTrack Support" <${process.env.EMAIL_USER}>`,
            to: trimmedEmail,
            subject: "Your Registration OTP",
            html: `<p>Your OTP for MedTrack registration is: <strong>${otp}</strong></p><p>This OTP will expire in 10 minutes.</p>`
          });
          console.log(`✅ Registration email sent via SMTP to ${trimmedEmail}`);
        }
      } catch (emailError) {
        console.error("❌ Email sending failed:", emailError.message);
      }
    };

    // Fire email sending without waiting
    sendEmailAsync();

    res.json({ message: "OTP sent to your email." });
  } catch (err) {
    console.error("Request OTP error:", err);
    res.status(500).json({ message: "Failed to send OTP." });
  }
});

module.exports = router;