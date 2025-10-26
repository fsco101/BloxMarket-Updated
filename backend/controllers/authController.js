import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { sendVerificationEmail, generateVerificationCode } from '../services/emailService.js';

// Dynamically read from environment at runtime to ensure correct value
const getJwtConfig = () => ({
  secret: process.env.JWT_SECRET?.trim() || 'your-secret-key',
  expiresIn: process.env.JWT_EXPIRES_IN?.trim() || '30d'
});

export const authController = {
  // Register new user (creates unverified user)
  register: async (req, res) => {
    try {
      const { username, email, password, robloxUsername, messengerLink } = req.body;

      // Validation
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: { $regex: new RegExp(`^${username}$`, 'i') } }
        ]
      });

      if (existingUser) {
        if (existingUser.email === email.toLowerCase()) {
          return res.status(400).json({ error: 'Email already exists' });
        }
        if (existingUser.username.toLowerCase() === username.toLowerCase()) {
          return res.status(400).json({ error: 'Username already exists' });
        }
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Generate verification code
      const verificationCode = generateVerificationCode();
      const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Create user (unverified)
      const user = new User({
        username: username.trim(),
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        roblox_username: robloxUsername?.trim() || null,
        messenger_link: messengerLink?.trim() || null,
        role: 'user',
        is_active: false, // User is inactive until email is verified
        isEmailVerified: false,
        verificationCode,
        verificationCodeExpires,
        credibility_score: 0
      });

      await user.save();

      // Send verification email
      try {
        await sendVerificationEmail(user.email, verificationCode, user.username);
        console.log(`Verification email sent to ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Don't fail registration if email fails, but log it
      }

      // Return success message (no token yet - user needs to verify email)
      res.status(201).json({
        message: 'User registered successfully. Please check your email for verification code.',
        userId: user._id.toString(),
        email: user.email,
        requiresVerification: true
      });

    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({ 
          error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
        });
      }
      
      res.status(500).json({ error: 'Registration failed' });
    }
  },

  // Send verification code (resend functionality)
  sendVerificationCode: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({ error: 'Email is already verified' });
      }

      // Generate new verification code
      const verificationCode = generateVerificationCode();
      const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Update user with new code
      user.verificationCode = verificationCode;
      user.verificationCodeExpires = verificationCodeExpires;
      await user.save();

      // Send verification email
      try {
        await sendVerificationEmail(user.email, verificationCode, user.username);
        console.log(`Verification email resent to ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        return res.status(500).json({ error: 'Failed to send verification email' });
      }

      res.json({
        message: 'Verification code sent successfully',
        email: user.email
      });

    } catch (error) {
      console.error('Send verification code error:', error);
      res.status(500).json({ error: 'Failed to send verification code' });
    }
  },

  // Verify email with code
  verifyEmail: async (req, res) => {
    try {
      const { email, verificationCode } = req.body;

      if (!email || !verificationCode) {
        return res.status(400).json({ error: 'Email and verification code are required' });
      }

      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({ error: 'Email is already verified' });
      }

      // Check if code is expired
      if (!user.verificationCodeExpires || user.verificationCodeExpires < new Date()) {
        return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
      }

      // Check if code matches
      if (user.verificationCode !== verificationCode.trim()) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      // Verify the user
      user.isEmailVerified = true;
      user.is_active = true; // Activate the user
      user.verificationCode = undefined; // Clear the code
      user.verificationCodeExpires = undefined; // Clear expiration
      await user.save();

      // Generate JWT token now that user is verified
      const { secret, expiresIn } = getJwtConfig();
      console.log(`Generating JWT token with expiration: ${expiresIn}`);
      const token = jwt.sign(
        {
          id: user._id.toString(),
          userId: user._id.toString(),
          _id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role
        },
        secret,
        { expiresIn }
      );

      // Add token to user's tokens array
      user.tokens.push({ token });
      await user.save();

      // Return user data and token
      res.json({
        message: 'Email verified successfully',
        token,
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          roblox_username: user.roblox_username,
          messenger_link: user.messenger_link,
          avatar_url: user.avatar_url,
          credibility_score: user.credibility_score,
          is_verified: user.is_verified,
          is_middleman: user.is_middleman,
          createdAt: user.createdAt
        }
      });

    } catch (error) {
      console.error('Verify email error:', error);
      res.status(500).json({ error: 'Failed to verify email' });
    }
  },

  // Login user
  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      // Find user by username or email
      const user = await User.findOne({
        $or: [
          { username: { $regex: new RegExp(`^${username}$`, 'i') } },
          { email: username.toLowerCase() }
        ]
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if account is banned
      if (user.role === 'banned') {
        return res.status(403).json({ 
          error: `Your account has been banned. Reason: ${user.ban_reason || 'No reason provided'}` 
        });
      }

      // Check if account is deactivated
      if (!user.is_active) {
        return res.status(403).json({ 
          error: `Your account has been deactivated. Reason: ${user.deactivation_reason || 'No reason provided'}` 
        });
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        return res.status(403).json({ 
          error: 'Please verify your email address before logging in. Check your email for the verification code.' 
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const { secret, expiresIn } = getJwtConfig();
      console.log(`Generating JWT token with expiration: ${expiresIn}`);
      const token = jwt.sign(
        { 
          id: user._id.toString(),           // Add this
          userId: user._id.toString(),       // Keep this for backward compatibility
          _id: user._id.toString(),          // Add this too
          username: user.username,
          email: user.email,
          role: user.role 
        },
        secret,
        { expiresIn }
      );

      // Add token to user's tokens array
      user.tokens.push({ token });
      user.lastLogin = new Date();
      await user.save();

      // Return user data and token
      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          roblox_username: user.roblox_username,
          avatar_url: user.avatar_url,
          credibility_score: user.credibility_score,
          is_verified: user.is_verified,
          is_middleman: user.is_middleman,
          createdAt: user.createdAt
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  },

  // Logout user (remove current token)
  logout: async (req, res) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      const user = await User.findById(req.user.userId);

      if (user && token) {
        user.tokens = user.tokens.filter(t => t.token !== token);
        await user.save();
      }

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  },

  // Logout from all devices
  logoutAll: async (req, res) => {
    try {
      const user = await User.findById(req.user.userId);

      if (user) {
        user.tokens = [];
        await user.save();
      }

      res.json({ message: 'Logged out from all devices successfully' });
    } catch (error) {
      console.error('Logout all error:', error);
      res.status(500).json({ error: 'Logout all failed' });
    }
  },

  // Get current user (for token verification)
  getCurrentUser: async (req, res) => {
    try {
      const user = await User.findById(req.user.userId).select('-password_hash -tokens');
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get wishlist count for the user
      const { Wishlist } = await import('../models/Wishlist.js');
      const { Vouch } = await import('../models/Vouch.js');
      const wishlistCount = await Wishlist.countDocuments({ user_id: user._id });
      const vouchCount = await Vouch.countDocuments({ user_id: user._id });

      res.json({
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        roblox_username: user.roblox_username,
        avatar_url: user.avatar_url,
        bio: user.bio,
        discord_username: user.discord_username,
        messenger_link: user.messenger_link,
        website: user.website,
        credibility_score: user.credibility_score,
        totalVouches: vouchCount,
        totalWishlistItems: wishlistCount,
        is_verified: user.is_verified,
        is_middleman: user.is_middleman,
        verification_requested: user.verification_requested,
        middleman_requested: user.middleman_requested,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Failed to get user data' });
    }
  }
};