import admin from 'firebase-admin';
import { User } from '../models/User.js';
import path from 'path';
import fs from 'fs';

// Track Firebase initialization status
let firebaseInitialized = false;

// Initialize Firebase Admin SDK
const initializeFirebase = async () => {
  try {
    if (!admin.apps.length) {
      console.log('🔥 Initializing Firebase Admin SDK...');

      // Use environment variables for Firebase configuration
      console.log('🌍 Using Firebase environment variables');

      // Check if required environment variables are set
      const requiredEnvVars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_CLIENT_EMAIL'
      ];

      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      if (missingVars.length > 0) {
        console.error('❌ Missing Firebase environment variables:', missingVars.join(', '));
        console.log('⚠️ Firebase authentication will not be available');
        return;
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL
        })
      });

      firebaseInitialized = true;
      console.log('✅ Firebase Admin SDK initialized successfully');
    } else {
      firebaseInitialized = true;
      console.log('ℹ️ Firebase Admin SDK already initialized');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    console.error('Stack trace:', error.stack);
    console.log('⚠️ Firebase authentication will not be available');
    firebaseInitialized = false;
  }
};

export const firebaseService = {
  // Check if Firebase is initialized
  isInitialized: () => firebaseInitialized,

  // Initialize Firebase Admin
  init: initializeFirebase,

  // Verify Firebase ID token
  verifyIdToken: async (idToken) => {
    try {
      if (!firebaseInitialized) {
        throw new Error('Firebase Admin SDK not initialized. Please check your Firebase configuration.');
      }

      if (!admin.apps.length) {
        throw new Error('Firebase Admin SDK not initialized. Please check your Firebase configuration.');
      }

      if (!idToken || typeof idToken !== 'string') {
        throw new Error('Invalid ID token provided');
      }

      console.log('🔐 Verifying Firebase ID token...');
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      console.log('✅ Firebase token verified successfully for user:', decodedToken.email);
      return decodedToken;
    } catch (error) {
      console.error('❌ Error verifying Firebase token:', error.message);
      if (error.code) {
        console.error('Error code:', error.code);
      }
      throw new Error(`Invalid Firebase token: ${error.message}`);
    }
  },

  // Handle Google OAuth login/signup
  handleGoogleAuth: async (idToken) => {
    try {
      if (!firebaseInitialized) {
        throw new Error('Firebase authentication is not available. Please contact support.');
      }

      const decodedToken = await firebaseService.verifyIdToken(idToken);

      if (!decodedToken.email) {
        throw new Error('Email not provided by Google');
      }

      // Check if user already exists with this email
      let user = await User.findOne({ email: decodedToken.email.toLowerCase() });

      if (user) {
        // User exists, check if they have Firebase auth linked
        if (!user.firebaseUid) {
          // Link Firebase UID to existing account
          user.firebaseUid = decodedToken.uid;
          user.isEmailVerified = true; // Firebase emails are verified
          await user.save();
        }
      } else {
        // Create new user
        const username = await firebaseService.generateUniqueUsername(decodedToken.name || decodedToken.email.split('@')[0]);

        user = new User({
          username: username.trim(),
          email: decodedToken.email.toLowerCase().trim(),
          firebaseUid: decodedToken.uid,
          role: 'user',
          is_active: true,
          isEmailVerified: true, // Firebase emails are verified
          credibility_score: 0,
          avatar_url: decodedToken.picture || null
        });

        await user.save();
      }

      // Generate JWT token
      const jwt = await import('jsonwebtoken');
      const { secret, expiresIn } = getJwtConfig();
      const token = jwt.default.sign(
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

      return {
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
      };
    } catch (error) {
      console.error('Google auth error:', error);
      throw error;
    }
  },

  // Handle Facebook OAuth login/signup
  handleFacebookAuth: async (idToken) => {
    try {
      if (!firebaseInitialized) {
        throw new Error('Firebase authentication is not available. Please contact support.');
      }

      const decodedToken = await firebaseService.verifyIdToken(idToken);

      if (!decodedToken.email) {
        throw new Error('Email not provided by Facebook');
      }

      // Check if user already exists with this email
      let user = await User.findOne({ email: decodedToken.email.toLowerCase() });

      if (user) {
        // User exists, check if they have Firebase auth linked
        if (!user.firebaseUid) {
          // Link Firebase UID to existing account
          user.firebaseUid = decodedToken.uid;
          user.isEmailVerified = true; // Firebase emails are verified
          await user.save();
        }
      } else {
        // Create new user
        const username = await firebaseService.generateUniqueUsername(decodedToken.name || decodedToken.email.split('@')[0]);

        user = new User({
          username: username.trim(),
          email: decodedToken.email.toLowerCase().trim(),
          firebaseUid: decodedToken.uid,
          role: 'user',
          is_active: true,
          isEmailVerified: true, // Firebase emails are verified
          credibility_score: 0,
          avatar_url: decodedToken.picture || null
        });

        await user.save();
      }

      // Generate JWT token
      const jwt = await import('jsonwebtoken');
      const { secret, expiresIn } = getJwtConfig();
      const token = jwt.default.sign(
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

      return {
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
      };
    } catch (error) {
      console.error('Facebook auth error:', error);
      throw error;
    }
  },

  // Generate unique username
  generateUniqueUsername: async (baseUsername) => {
    let username = baseUsername.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (username.length < 3) username = username + 'user';
    if (username.length > 20) username = username.substring(0, 20);

    let finalUsername = username;
    let counter = 1;

    while (await User.findOne({ username: { $regex: new RegExp(`^${finalUsername}$`, 'i') } })) {
      finalUsername = `${username}${counter}`;
      counter++;
      if (finalUsername.length > 20) {
        finalUsername = finalUsername.substring(0, 20);
      }
    }

    return finalUsername;
  }
};

// Dynamically read from environment at runtime
const getJwtConfig = () => ({
  secret: process.env.JWT_SECRET?.trim() || 'your-secret-key',
  expiresIn: process.env.JWT_EXPIRES_IN?.trim() || '30d'
});