const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const user = await User.create({ name, email, password });
    const token = signToken(user);

    return res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to register user", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const validPassword = await user.comparePassword(password);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to login", error: error.message });
  }
});

module.exports = router;
