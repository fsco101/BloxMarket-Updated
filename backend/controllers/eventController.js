import { Event, EventComment, EventVote } from '../models/Event.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import mongoose from 'mongoose';
import fs from 'fs';

export const eventController = {
  // Get all events with pagination and filters
  getAllEvents: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const type = req.query.type;
      const status = req.query.status;
      const skip = (page - 1) * limit;

      let query = {};
      if (type && type !== 'all') query.type = type;
      if (status && status !== 'all') query.status = status;

      const events = await Event.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalEvents = await Event.countDocuments(query);

      // Add vote and comment counts to each event
      const eventsWithCounts = await Promise.all(events.map(async (event) => {
        const [commentCount, upvotes, downvotes] = await Promise.all([
          EventComment.countDocuments({ event_id: event._id }),
          EventVote.countDocuments({ event_id: event._id, vote_type: 'up' }),
          EventVote.countDocuments({ event_id: event._id, vote_type: 'down' })
        ]);

        return {
          ...event,
          comment_count: commentCount,
          upvotes,
          downvotes
        };
      }));

      res.json({
        events: eventsWithCounts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalEvents / limit),
          totalEvents,
          hasNext: page < Math.ceil(totalEvents / limit),
          hasPrev: page > 1
        }
      });

    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  },

  // Get single event by ID
  getEventById: async (req, res) => {
    try {
      const { eventId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ error: 'Invalid event ID' });
      }

      const event = await Event.findById(eventId).lean();
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Get vote and comment counts
      const [commentCount, upvotes, downvotes] = await Promise.all([
        EventComment.countDocuments({ event_id: event._id }),
        EventVote.countDocuments({ event_id: event._id, vote_type: 'up' }),
        EventVote.countDocuments({ event_id: event._id, vote_type: 'down' })
      ]);

      res.json({
        ...event,
        comment_count: commentCount,
        upvotes,
        downvotes
      });

    } catch (error) {
      console.error('Get event error:', error);
      res.status(500).json({ error: 'Failed to fetch event' });
    }
  },

  // Create new event (admin/moderator only)
  createEvent: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { title, description, type, startDate, endDate, prizes, requirements, maxParticipants } = req.body;
      const uploadedFiles = req.files;

      console.log('Create event request:', { title, type, filesCount: uploadedFiles?.length || 0 });

      // Check if user is admin or moderator
      const user = await User.findById(userId);
      if (!user || !['admin', 'moderator'].includes(user.role)) {
        // Clean up uploaded files if user is not authorized
        if (uploadedFiles && uploadedFiles.length > 0) {
          uploadedFiles.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        return res.status(403).json({ error: 'Only admins and moderators can create events' });
      }

      // Validate required fields
      if (!title || !description || !type || !startDate || !endDate) {
        // Clean up uploaded files if validation fails
        if (uploadedFiles && uploadedFiles.length > 0) {
          uploadedFiles.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        // Clean up uploaded files if validation fails
        if (uploadedFiles && uploadedFiles.length > 0) {
          uploadedFiles.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        return res.status(400).json({ error: 'End date must be after start date' });
      }

      // Process uploaded images
      const images = [];
      if (uploadedFiles && uploadedFiles.length > 0) {
        uploadedFiles.forEach(file => {
          images.push({
            filename: file.filename,
            originalName: file.originalname,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype
          });
        });
      }

      // Parse prizes and requirements from strings
      let parsedPrizes = [];
      let parsedRequirements = [];

      if (prizes) {
        if (typeof prizes === 'string') {
          parsedPrizes = prizes.split(',').map(p => p.trim()).filter(p => p);
        } else if (Array.isArray(prizes)) {
          parsedPrizes = prizes.filter(p => p && p.trim());
        }
      }

      if (requirements) {
        if (typeof requirements === 'string') {
          parsedRequirements = requirements.split(',').map(r => r.trim()).filter(r => r);
        } else if (Array.isArray(requirements)) {
          parsedRequirements = requirements.filter(r => r && r.trim());
        }
      }

      const newEvent = new Event({
        title,
        description,
        type,
        startDate: start,
        endDate: end,
        prizes: parsedPrizes,
        requirements: parsedRequirements,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
        images: images,
        creator: {
          user_id: userId,
          username: user.username,
          avatar_url: user.avatar_url,
          verified: user.verified || false
        }
      });

      const savedEvent = await newEvent.save();
      
      console.log('Event created successfully:', savedEvent._id);
      
      res.status(201).json({
        message: 'Event created successfully',
        eventId: savedEvent._id,
        imagesUploaded: images.length
      });

    } catch (error) {
      console.error('Create event error:', error);
      
      // Clean up uploaded files on error
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File size too large. Maximum 5MB per image.' });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(413).json({ error: 'Too many files. Maximum 5 images per event.' });
      }
      if (error.message === 'Only image files are allowed') {
        return res.status(400).json({ error: 'Only image files are allowed' });
      }
      
      res.status(500).json({ error: 'Failed to create event' });
    }
  },

  // Update event (admin/moderator only)
  updateEvent: async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = req.user.userId;
      const { title, description, type, startDate, endDate, prizes, requirements, maxParticipants, removeImages } = req.body;
      const uploadedFiles = req.files;

      console.log('Update event request:', { eventId, filesCount: uploadedFiles?.length || 0 });

      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        // Clean up uploaded files if validation fails
        if (uploadedFiles && uploadedFiles.length > 0) {
          uploadedFiles.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        return res.status(400).json({ error: 'Invalid event ID' });
      }

      // Check if user is admin or moderator
      const user = await User.findById(userId);
      if (!user || !['admin', 'moderator'].includes(user.role)) {
        // Clean up uploaded files if user is not authorized
        if (uploadedFiles && uploadedFiles.length > 0) {
          uploadedFiles.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        return res.status(403).json({ error: 'Only admins and moderators can update events' });
      }

      const event = await Event.findById(eventId);
      if (!event) {
        // Clean up uploaded files if event not found
        if (uploadedFiles && uploadedFiles.length > 0) {
          uploadedFiles.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        return res.status(404).json({ error: 'Event not found' });
      }

      // Handle image removal
      let currentImages = [...(event.images || [])];
      if (removeImages) {
        const imagesToRemove = Array.isArray(removeImages) ? removeImages : [removeImages];
        imagesToRemove.forEach(filename => {
          const imageIndex = currentImages.findIndex(img => img.filename === filename);
          if (imageIndex > -1) {
            const imagePath = currentImages[imageIndex].path;
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
            }
            currentImages.splice(imageIndex, 1);
          }
        });
      }

      // Process new uploaded images
      if (uploadedFiles && uploadedFiles.length > 0) {
        // Check if adding new images would exceed the limit
        if (currentImages.length + uploadedFiles.length > 5) {
          // Clean up uploaded files if would exceed limit
          uploadedFiles.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
          return res.status(400).json({ error: 'Maximum 5 images allowed per event' });
        }

        uploadedFiles.forEach(file => {
          currentImages.push({
            filename: file.filename,
            originalName: file.originalname,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype
          });
        });
      }

      // Parse prizes and requirements
      let parsedPrizes = event.prizes || [];
      let parsedRequirements = event.requirements || [];

      if (prizes !== undefined) {
        if (typeof prizes === 'string') {
          parsedPrizes = prizes.split(',').map(p => p.trim()).filter(p => p);
        } else if (Array.isArray(prizes)) {
          parsedPrizes = prizes.filter(p => p && p.trim());
        }
      }

      if (requirements !== undefined) {
        if (typeof requirements === 'string') {
          parsedRequirements = requirements.split(',').map(r => r.trim()).filter(r => r);
        } else if (Array.isArray(requirements)) {
          parsedRequirements = requirements.filter(r => r && r.trim());
        }
      }

      // Update event data
      const updateData = {
        title: title || event.title,
        description: description || event.description,
        type: type || event.type,
        startDate: startDate ? new Date(startDate) : event.startDate,
        endDate: endDate ? new Date(endDate) : event.endDate,
        prizes: parsedPrizes,
        requirements: parsedRequirements,
        maxParticipants: maxParticipants !== undefined ? (maxParticipants ? parseInt(maxParticipants) : undefined) : event.maxParticipants,
        images: currentImages,
        updatedAt: new Date()
      };

      // Validate dates if provided
      if (updateData.startDate >= updateData.endDate) {
        // Clean up uploaded files if validation fails
        if (uploadedFiles && uploadedFiles.length > 0) {
          uploadedFiles.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        return res.status(400).json({ error: 'End date must be after start date' });
      }

      await Event.findByIdAndUpdate(eventId, updateData);
      
      console.log('Event updated successfully:', eventId);
      
      res.json({ 
        message: 'Event updated successfully',
        imagesUploaded: uploadedFiles?.length || 0
      });

    } catch (error) {
      console.error('Update event error:', error);
      
      // Clean up uploaded files on error
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File size too large. Maximum 5MB per image.' });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(413).json({ error: 'Too many files. Maximum 5 images per event.' });
      }
      
      res.status(500).json({ error: 'Failed to update event' });
    }
  },

  // Delete event (admin/moderator only)
  deleteEvent: async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ error: 'Invalid event ID' });
      }

      // Check if user is admin or moderator
      const user = await User.findById(userId);
      if (!user || !['admin', 'moderator'].includes(user.role)) {
        return res.status(403).json({ error: 'Only admins and moderators can delete events' });
      }

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Delete event images from filesystem
      if (event.images && event.images.length > 0) {
        event.images.forEach(image => {
          if (fs.existsSync(image.path)) {
            fs.unlinkSync(image.path);
          }
        });
      }

      // Delete related comments and votes
      await Promise.all([
        EventComment.deleteMany({ event_id: eventId }),
        EventVote.deleteMany({ event_id: eventId })
      ]);

      await Event.findByIdAndDelete(eventId);
      
      console.log('Event deleted successfully:', eventId);
      
      res.json({ message: 'Event deleted successfully' });

    } catch (error) {
      console.error('Delete event error:', error);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  },

  // Join event
  joinEvent: async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ error: 'Invalid event ID' });
      }

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Check if event is still active
      if (event.status === 'ended') {
        return res.status(400).json({ error: 'This event has ended' });
      }

      // Check if user already joined
      const alreadyJoined = event.participants.some(p => p.user_id.equals(userId));
      if (alreadyJoined) {
        return res.status(400).json({ error: 'You have already joined this event' });
      }

      // Check if event is full
      if (event.maxParticipants && event.participantCount >= event.maxParticipants) {
        return res.status(400).json({ error: 'This event is full' });
      }

      const user = await User.findById(userId);
      
      // Add user to participants
      event.participants.push({
        user_id: userId,
        username: user.username,
        avatar_url: user.avatar_url
      });
      
      event.participantCount = event.participants.length;
      await event.save();

      res.json({
        message: 'Successfully joined event',
        participantCount: event.participantCount
      });

    } catch (error) {
      console.error('Join event error:', error);
      res.status(500).json({ error: 'Failed to join event' });
    }
  },

  // Leave event (add this method after joinEvent)
  leaveEvent: async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ error: 'Invalid event ID' });
      }

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Check if user has joined the event
      const participantIndex = event.participants.findIndex(p => p.user_id.equals(userId));
      if (participantIndex === -1) {
        return res.status(400).json({ error: 'You have not joined this event' });
      }

      // Remove user from participants
      event.participants.splice(participantIndex, 1);
      event.participantCount = event.participants.length;
      await event.save();

      res.json({
        message: 'Successfully left event',
        participantCount: event.participantCount
      });

    } catch (error) {
      console.error('Leave event error:', error);
      res.status(500).json({ error: 'Failed to leave event' });
    }
  },

  // Get event votes
  getEventVotes: async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ error: 'Invalid event ID' });
      }

      // Check if event exists
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Get total votes for this event
      const [upvotes, downvotes] = await Promise.all([
        EventVote.countDocuments({ event_id: eventId, vote_type: 'up' }),
        EventVote.countDocuments({ event_id: eventId, vote_type: 'down' })
      ]);

      // Check if current user has voted on this event
      const userVote = await EventVote.findOne({
        event_id: eventId,
        user_id: userId
      });

      res.json({
        upvotes,
        downvotes,
        userVote: userVote ? userVote.vote_type : null
      });

    } catch (error) {
      console.error('Get event votes error:', error);
      res.status(500).json({ error: 'Failed to fetch votes' });
    }
  },

  // Vote on event
  voteOnEvent: async (req, res) => {
    try {
      const { eventId } = req.params;
      const { voteType } = req.body;
      const userId = req.user.userId;

      console.log('Event vote request:', { eventId, voteType, userId });

      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ error: 'Invalid event ID' });
      }

      if (!['up', 'down'].includes(voteType)) {
        return res.status(400).json({ error: 'Invalid vote type. Must be "up" or "down"' });
      }

      // Check if event exists
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Check for existing vote
      const existingVote = await EventVote.findOne({
        event_id: eventId,
        user_id: userId
      });

      let userVote = null;

      if (existingVote) {
        // User has already voted
        if (existingVote.vote_type === voteType) {
          // Same vote type - remove the vote
          await EventVote.deleteOne({ _id: existingVote._id });
          console.log('Vote removed');
        } else {
          // Different vote type - change the vote
          existingVote.vote_type = voteType;
          await existingVote.save();
          userVote = voteType;
          console.log('Vote changed to:', voteType);
        }
      } else {
        // New vote
        const newVote = new EventVote({
          event_id: eventId,
          user_id: userId,
          vote_type: voteType
        });
        
        await newVote.save();
        userVote = voteType;
        console.log('New vote added:', voteType);
      }

      // Create notification for event creator (if not voting on own event and it's a new vote)
      if (!event.creator.user_id.equals(userId) && !existingVote) {
        try {
          const notificationType = voteType === 'up' ? 'event_upvote' : 'event_downvote';
          const actionText = voteType === 'up' ? 'upvoted' : 'downvoted';

          await Notification.createNotification({
            recipient: event.creator.user_id,
            sender: userId,
            type: notificationType,
            title: `Your Event Was ${actionText}`,
            message: `${req.user.username} ${actionText} your event "${event.title}"`,
            related_id: event._id,
            related_model: 'Event'
          });
        } catch (notificationError) {
          console.error('Failed to create event vote notification:', notificationError);
          // Don't fail the vote if notification fails
        }
      }

      // Get updated vote counts
      const [upvotes, downvotes] = await Promise.all([
        EventVote.countDocuments({ event_id: eventId, vote_type: 'up' }),
        EventVote.countDocuments({ event_id: eventId, vote_type: 'down' })
      ]);

      console.log('Final vote counts:', { upvotes, downvotes, userVote });

      res.json({
        message: 'Vote updated successfully',
        upvotes,
        downvotes,
        userVote
      });

    } catch (error) {
      console.error('Event vote error:', error);
      
      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({ error: 'You have already voted on this event' });
      }
      
      res.status(500).json({ error: 'Failed to record vote' });
    }
  },

  // Get event comments
  getEventComments: async (req, res) => {
    try {
      const { eventId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ error: 'Invalid event ID' });
      }

      // Check if event exists
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Get comments for this event
      const comments = await EventComment.find({ event_id: eventId })
        .populate('user_id', 'username credibility_score avatar_url')
        .sort({ created_at: -1 })
        .lean();

      const formattedComments = comments.map(comment => ({
        comment_id: comment._id,
        event_id: comment.event_id,
        user_id: comment.user_id._id || comment.user_id,
        content: comment.content,
        created_at: comment.created_at,
        username: comment.user_id.username,
        credibility_score: comment.user_id.credibility_score,
        avatar_url: comment.user_id.avatar_url
      }));

      res.json({
        comments: formattedComments
      });

    } catch (error) {
      console.error('Get event comments error:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  },

  // Add event comment
  addEventComment: async (req, res) => {
    try {
      const { eventId } = req.params;
      const { content } = req.body;
      const userId = req.user.userId;

      console.log('Add comment request:', { eventId, content, userId });

      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ error: 'Invalid event ID' });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Content is required' });
      }

      // Check if event exists
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Create comment
      const comment = new EventComment({
        event_id: eventId,
        user_id: userId,
        content: content.trim()
      });

      await comment.save();
      console.log('Comment saved:', comment._id);

      // Create notification for event creator (if not commenting on own event)
      if (!event.creator.user_id.equals(userId)) {
        try {
          await Notification.createNotification({
            recipient: event.creator.user_id,
            sender: userId,
            type: 'event_comment',
            title: 'New Comment on Your Event',
            message: `${req.user.username} commented on your event "${event.title}"`,
            related_id: comment._id,
            related_model: 'EventComment'
          });
        } catch (notificationError) {
          console.error('Failed to create event comment notification:', notificationError);
          // Don't fail the comment creation if notification fails
        }
      }

      // Populate user data
      await comment.populate('user_id', 'username credibility_score avatar_url');

      const responseData = {
        comment_id: comment._id,
        event_id: comment.event_id,
        user_id: comment.user_id._id || comment.user_id,
        content: comment.content,
        created_at: comment.created_at,
        username: comment.user_id.username,
        credibility_score: comment.user_id.credibility_score,
        avatar_url: comment.user_id.avatar_url
      };

      console.log('Comment response:', responseData);

      res.status(201).json(responseData);

    } catch (error) {
      console.error('Add event comment error:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  }
};