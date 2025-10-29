import { User } from '../models/User.js';
import { Trade } from '../models/Trade.js';
import { Vouch } from '../models/Vouch.js';
import { Wishlist } from '../models/Wishlist.js';
import mongoose from 'mongoose';
import fs from 'fs';
import bcrypt from 'bcryptjs';

export const userController = {
  // Get current user profile
  getCurrentUserProfile: async (req, res) => {
    try {
      const userId = req.user.userId;
      
      const user = await User.findById(userId).select('-password_hash');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user stats
      const [totalTrades, completedTrades, totalVouches] = await Promise.all([
        Trade.countDocuments({ user_id: userId }),
        Trade.countDocuments({ user_id: userId, status: 'completed' }),
        Vouch.countDocuments({ user_id: userId })
      ]);

      res.json({
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          roblox_username: user.roblox_username,
          role: user.role,
          credibility_score: user.credibility_score,
          avatar_url: user.avatar_url,
          bio: user.bio,
          discord_username: user.discord_username,
          messenger_link: user.messenger_link,
          website: user.website,
          location: user.location,
          verification_requested: user.verification_requested,
          middleman_requested: user.middleman_requested,
          is_verified: user.is_verified,
          is_middleman: user.is_middleman,
          createdAt: user.createdAt
        },
        stats: {
          totalTrades,
          completedTrades,
          totalVouches,
          successRate: totalTrades > 0 ? Math.round((completedTrades / totalTrades) * 100) : 0
        }
      });

    } catch (error) {
      console.error('Get current user profile error:', error);
      res.status(500).json({ error: 'Failed to get user profile' });
    }
  },

  // Get user by ID
  getUserById: async (req, res) => {
    try {
      const { userId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      const user = await User.findById(userId).select('-password_hash -email');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user stats
      const [totalTrades, completedTrades, totalVouches] = await Promise.all([
        Trade.countDocuments({ user_id: userId }),
        Trade.countDocuments({ user_id: userId, status: 'completed' }),
        Vouch.countDocuments({ user_id: userId })
      ]);

      res.json({
        user: {
          _id: user._id,
          username: user.username,
          roblox_username: user.roblox_username,
          role: user.role,
          credibility_score: user.credibility_score,
          avatar_url: user.avatar_url,
          bio: user.bio,
          discord_username: user.discord_username,
          messenger_link: user.messenger_link,
          website: user.website,
          location: user.location,
          is_verified: user.is_verified,
          is_middleman: user.is_middleman,
          createdAt: user.createdAt
        },
        stats: {
          totalTrades,
          completedTrades,
          totalVouches,
          successRate: totalTrades > 0 ? Math.round((completedTrades / totalTrades) * 100) : 0
        }
      });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const userId = req.user.userId;
      const {
        username,
        robloxUsername,
        bio,
        discordUsername,
        messengerLink,
        website,
        location,
        timezone,
        currentPassword,
        newPassword
      } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Handle password change
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Current password is required to change password' });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        user.password_hash = hashedPassword;
      }

      // Update profile fields
      if (username !== undefined) user.username = username;
      if (robloxUsername !== undefined) user.roblox_username = robloxUsername;
      if (bio !== undefined) user.bio = bio;
      if (discordUsername !== undefined) user.discord_username = discordUsername;
      if (messengerLink !== undefined) user.messenger_link = messengerLink;
      if (website !== undefined) user.website = website;
      if (location !== undefined) user.location = location;
      if (timezone !== undefined) user.timezone = timezone;

      await user.save();

      res.json({
        message: 'Profile updated successfully',
        user: {
          _id: user._id,
          username: user.username,
          roblox_username: user.roblox_username,
          bio: user.bio,
          discord_username: user.discord_username,
          messenger_link: user.messenger_link,
          website: user.website,
          location: user.location,
          timezone: user.timezone
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      
      // Handle MongoDB duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        const fieldName = field === 'username' ? 'Username' : field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        return res.status(400).json({ error: `${fieldName} already exists` });
      }
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ error: messages.join(', ') });
      }
      
      res.status(500).json({ error: 'Failed to update profile' });
    }
  },

  // Upload avatar
  uploadAvatar: async (req, res) => {
    try {
      const userId = req.user.userId;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const user = await User.findById(userId);
      if (!user) {
        // Clean up uploaded file if user not found
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ error: 'User not found' });
      }

      // Delete old avatar if exists
      if (user.avatar_url) {
        const oldAvatarPath = user.avatar_url.replace('/api/uploads/avatars/', './uploads/avatars/');
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }

      // Update user with new avatar URL
      user.avatar_url = `/api/uploads/avatars/${req.file.filename}`;
      await user.save();

      res.json({
        message: 'Avatar uploaded successfully',
        avatarUrl: user.avatar_url
      });

    } catch (error) {
      console.error('Upload avatar error:', error);
      
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Avatar file too large. Maximum 2MB allowed.' });
      }
      if (error.message === 'Only image files are allowed for avatars') {
        return res.status(400).json({ error: 'Only image files are allowed for avatars' });
      }
      
      res.status(500).json({ error: 'Failed to upload avatar' });
    }
  },

  // Get user's wishlist
  getUserWishlist: async (req, res) => {
    try {
      const { userId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      const wishlistItems = await Wishlist.find({ user_id: userId })
        .sort({ createdAt: -1 });

      res.json(wishlistItems.map(item => ({
        wishlist_id: item._id,
        item_name: item.item_name,
        created_at: item.createdAt
      })));

    } catch (error) {
      console.error('Get wishlist error:', error);
      res.status(500).json({ error: 'Failed to get wishlist' });
    }
  },

  // Add item to wishlist
  addToWishlist: async (req, res) => {
    try {
      const { itemName } = req.body;
      const userId = req.user.userId;

      if (!itemName) {
        return res.status(400).json({ error: 'Item name is required' });
      }

      const newWishlistItem = new Wishlist({
        user_id: userId,
        item_name: itemName
      });

      const savedItem = await newWishlistItem.save();

      res.status(201).json({
        message: 'Item added to wishlist',
        wishlistId: savedItem._id
      });

    } catch (error) {
      console.error('Add to wishlist error:', error);
      res.status(500).json({ error: 'Failed to add item to wishlist' });
    }
  },

  // Remove item from wishlist
  removeFromWishlist: async (req, res) => {
    try {
      const { wishlistId } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(wishlistId)) {
        return res.status(400).json({ error: 'Invalid wishlist ID' });
      }

      const deleted = await Wishlist.findOneAndDelete({
        _id: wishlistId,
        user_id: userId
      });

      if (!deleted) {
        return res.status(404).json({ error: 'Wishlist item not found' });
      }

      res.json({ message: 'Item removed from wishlist' });

    } catch (error) {
      console.error('Remove from wishlist error:', error);
      res.status(500).json({ error: 'Failed to remove item from wishlist' });
    }
  },

  // Request verification
  requestVerification: async (req, res) => {
    try {
      const userId = req.user.userId;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.is_verified) {
        return res.status(400).json({ error: 'User is already verified' });
      }

      if (user.verification_requested) {
        return res.status(400).json({ error: 'Verification already requested' });
      }

      user.verification_requested = true;
      await user.save();

      res.json({ message: 'Verification requested successfully' });

    } catch (error) {
      console.error('Request verification error:', error);
      res.status(500).json({ error: 'Failed to request verification' });
    }
  },

  // Request middleman status
  requestMiddleman: async (req, res) => {
    try {
      const userId = req.user.userId;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.is_middleman) {
        return res.status(400).json({ error: 'User is already a middleman' });
      }

      if (user.middleman_requested) {
        return res.status(400).json({ error: 'Middleman status already requested' });
      }

      user.middleman_requested = true;
      await user.save();

      res.json({ message: 'Middleman status requested successfully' });

    } catch (error) {
      console.error('Request middleman error:', error);
      res.status(500).json({ error: 'Failed to request middleman status' });
    }
  },

  // Search users
  searchUsers: async (req, res) => {
    try {
      const { query } = req.params;
      const limit = parseInt(req.query.limit) || 10;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
      }

      const users = await User.find({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { display_name: { $regex: query, $options: 'i' } }
        ]
      })
      .select('_id username display_name avatar_url')
      .limit(limit);

      res.json({
        users: users.map(user => ({
          user_id: user._id,
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url
        }))
      });

    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({ error: 'Failed to search users' });
    }
  }
};