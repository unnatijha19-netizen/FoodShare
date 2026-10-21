
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/User');
const { sendPasswordResetEmail } = require('../utils/email');

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
}

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      organizationName,
    } = req.body;

    if (!name?.trim() || !email?.trim() || !password || !role) {
      return res.status(400).json({
        message: 'Please fill all required fields.',
      });
    }

    if (!['donor', 'ngo'].includes(role)) {
      return res.status(400).json({
        message: 'Please select a valid role.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      phone: phone || '',
      organizationName: organizationName || '',
    });

    return res.status(201).json({
      message: 'Account created successfully.',
      token: createToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    return res.status(500).json({
      message: 'Could not create account.',
    });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: 'Please enter your email and password.',
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select('+password');

    if (
      !user ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    return res.status(200).json({
      message: 'Login successful.',
      token: createToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);

    return res.status(500).json({
      message: 'Could not login.',
    });
  }
});

// FORGOT PASSWORD: Email a reset link
router.post('/forgot-password', async (req, res) => {
  let user;

  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        message: 'Please enter your email address.',
      });
    }

    user = await User.findOne({ email });

    // Same response whether the account exists or not.
    if (!user) {
      return res.status(200).json({
        message:
          'If an account exists for this email, a reset link will be sent.',
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');

    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);

    await user.save();

    const clientUrl = process.env.CLIENT_URL;

    if (!clientUrl) {
      throw new Error('CLIENT_URL is missing from .env');
    }

    const resetUrl =
      `${clientUrl.replace(/\/$/, '')}/reset-password/${rawToken}`;

    await sendPasswordResetEmail(user.email, resetUrl);

    return res.status(200).json({
      message:
        'If an account exists for this email, a reset link will be sent.',
    });
  } catch (error) {
  console.error('Forgot password error:', error);
    // Do not leave a usable token if email delivery failed.
    if (user) {
      try {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
      } catch (cleanupError) {
        console.error('Reset token cleanup failed.');
      }
    }

    return res.status(500).json({
      message: 'Unable to send the reset email right now. Please try again later.',
    });
  }
});

// RESET PASSWORD: Validate token and save new password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({
        message: 'This reset link is invalid or expired.',
      });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters.',
      });
    }

    if (password.length > 128) {
      return res.status(400).json({
        message: 'Password is too long.',
      });
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({
        message: 'This reset link is invalid or expired.',
      });
    }

    user.password = await bcrypt.hash(password, 12);

    // Make this reset link single-use.
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.status(200).json({
      message: 'Password reset successful. Please login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error.message);

    return res.status(500).json({
      message: 'Could not reset your password. Please try again.',
    });
  }
});

module.exports = router;
