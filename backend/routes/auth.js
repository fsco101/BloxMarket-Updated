import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendVerificationEmail } from '../services/emailService.js';

const router = express.Router();

// Send email verification code
router.post('/send-email-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isEmailVerified) {
      return res.status(400).json({ error: 'Email is already registered and verified' });
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    if (existingUser) {
      // Update existing unverified user
      existingUser.verificationCode = verificationCode;
      existingUser.verificationCodeExpires = verificationCodeExpires;
      await existingUser.save();
    } else {
      // Create temporary user record for verification
      const tempUser = new User({
        email,
        verificationCode,
        verificationCodeExpires,
        isEmailVerified: false,
        is_active: false // Don't activate until full registration
      });
      await tempUser.save();
    }

    // Send verification email
    await sendVerificationEmail(email, verificationCode);

    res.json({ message: 'Verification code sent successfully' });
  } catch (error) {
    console.error('Send email verification error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// Verify email code
router.post('/verify-email-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Email not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    if (!user.verificationCode || user.verificationCode !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (user.verificationCodeExpires < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Mark email as verified but keep user inactive until full registration
    user.isEmailVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email code error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, robloxUsername, messengerLink } = req.body;
    
    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email is verified
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(400).json({ error: 'Email not verified. Please verify your email first.' });
    }

    if (!existingUser.isEmailVerified) {
      return res.status(400).json({ error: 'Email not verified. Please verify your email first.' });
    }

    // Check if username is already taken
    const usernameExists = await User.findOne({ username });
    if (usernameExists && usernameExists._id.toString() !== existingUser._id.toString()) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Update the existing user record with full account details
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    existingUser.username = username;
    existingUser.password_hash = password_hash;
    existingUser.roblox_username = robloxUsername || null;
    existingUser.messenger_link = messengerLink || null;
    existingUser.is_active = true;
    existingUser.role = 'user';

    await existingUser.save();

    // Generate JWT token
    const secret = (process.env.JWT_SECRET || 'your-secret-key').trim();
    const expiresIn = ((process.env.JWT_EXPIRES_IN || '30d') + '').replace(/['"]/g, '').trim();

    const token = jwt.sign(
      { userId: existingUser._id, username: existingUser.username, role: existingUser.role },
      secret,
      { expiresIn }
    );

    // Ensure tokens array exists, push, and keep last 5
    existingUser.tokens = existingUser.tokens || [];
    existingUser.tokens.push({ token });
    if (existingUser.tokens.length > 5) existingUser.tokens = existingUser.tokens.slice(-5);
    await existingUser.save();

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: existingUser._id,
        username: existingUser.username,
        email: existingUser.email,
        role: existingUser.role,
        is_verified: existingUser.is_verified,
        is_middleman: existingUser.is_middleman,
        credibility_score: existingUser.credibility_score,
        roblox_username: existingUser.roblox_username,
        avatar_url: existingUser.avatar_url
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    // Handle both username and email fields
    const { username, email, password } = req.body;
    const loginIdentifier = username || email;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: loginIdentifier },
        { username: loginIdentifier }
      ]
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({ error: 'Please verify your email address before logging in.' });
    }

    // Check if user is banned
    if (user.role === 'banned') {
      return res.status(403).json({ error: 'Your account has been banned. Please contact support.' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const secret = (process.env.JWT_SECRET || 'your-secret-key').trim();
    const expiresIn = ((process.env.JWT_EXPIRES_IN || '30d') + '').replace(/['"]/g, '').trim();

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      secret,
      { expiresIn }
    );

    // Ensure tokens array exists, push, and keep last 5
    user.tokens = user.tokens || [];
    user.tokens.push({ token });
    if (user.tokens.length > 5) user.tokens = user.tokens.slice(-5);
    await user.save();

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
        is_middleman: user.is_middleman,
        credibility_score: user.credibility_score,
        roblox_username: user.roblox_username,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user route
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password_hash -tokens');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
      is_middleman: user.is_middleman,
      credibility_score: user.credibility_score,
      roblox_username: user.roblox_username,
      avatar_url: user.avatar_url,
      created_at: user.created_at
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// Logout route
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user) {
      // Remove the current token from the user's tokens array
      user.tokens = user.tokens.filter(tokenObj => tokenObj.token !== req.token);
      await user.save();
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;