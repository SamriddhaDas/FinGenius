const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const signRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password });
    const token = signToken(user._id);
    const refresh = signRefreshToken(user._id);

    user.refreshToken = refresh;
    await user.save({ validateBeforeSave: false });

    res.status(201).json({ success: true, token, refreshToken: refresh, user: user.toPublic() });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password +refreshToken');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken(user._id);
    const refresh = signRefreshToken(user._id);

    user.refreshToken = refresh;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, token, refreshToken: refresh, user: user.toPublic() });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// POST /api/auth/refresh
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Refresh token required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const newToken = signToken(user._id);
    const newRefresh = signRefreshToken(user._id);

    user.refreshToken = newRefresh;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, token: newToken, refreshToken: newRefresh });
  } catch {
    res.status(401).json({ success: false, message: 'Refresh token invalid or expired' });
  }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    req.user.refreshToken = undefined;
    await req.user.save({ validateBeforeSave: false });
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user.toPublic() });
};
