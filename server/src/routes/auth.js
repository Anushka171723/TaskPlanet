const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

function buildAuthResponse(user) {
  const token = jwt.sign(
    { id: user._id.toString(), username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );

  return {
    token,
    user: {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
    },
  };
}

router.post('/signup', async (req, res) => {
  try {
    const { username = '', email = '', password = '' } = req.body;

    if (!username.trim() || !email.trim() || !password.trim()) {
      return res.status(400).json({ message: 'Username, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.trim() }],
    });

    if (existingUser) {
      return res.status(409).json({ message: 'Email or username is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
    });

    return res.status(201).json(buildAuthResponse(user));
  } catch (error) {
    return res.status(500).json({ message: 'Signup failed. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email = '', password = '' } = req.body;

    if (!email.trim() || !password.trim()) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    return res.json(buildAuthResponse(user));
  } catch (error) {
    return res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

module.exports = router;
