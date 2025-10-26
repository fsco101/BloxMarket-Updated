import { Event } from '../../models/Event.js';
import { User } from '../../models/User.js';

class EventsDataTableController {
  // Get all events with DataTables support (for admin panel)
  async getEventsDataTable(req, res) {
    try {
      const {
        page = 1,
        limit = 1000,
        search = '',
        status = '',
        type = '',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build query
      const query = {};

      // Search filter
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { 'creator.username': { $regex: search, $options: 'i' } }
        ];
      }

      // Status filter (active/inactive based on dates)
      if (status === 'active') {
        const now = new Date();
        query.startDate = { $lte: now };
        query.endDate = { $gte: now };
      } else if (status === 'upcoming') {
        query.startDate = { $gt: new Date() };
      } else if (status === 'completed') {
        query.endDate = { $lt: new Date() };
      }

      // Type filter
      if (type) {
        query.type = type;
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const limitNum = parseInt(limit);

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query
      const [events, totalEvents] = await Promise.all([
        Event.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limitNum === -1 ? undefined : limitNum)
          .lean(),
        Event.countDocuments(query)
      ]);

      // Normalize events to match frontend interface
      const normalizedEvents = events.map(event => {
        const now = new Date();
        let status = 'upcoming';
        
        if (event.startDate && event.endDate) {
          if (now >= new Date(event.startDate) && now <= new Date(event.endDate)) {
            status = 'active';
          } else if (now > new Date(event.endDate)) {
            status = 'completed';
          }
        }

        return {
          _id: event._id,
          id: event._id,
          name: event.title,
          title: event.title,
          description: event.description,
          type: event.type,
          date: event.startDate,
          startDate: event.startDate,
          endDate: event.endDate,
          status: status,
          prizes: event.prizes,
          requirements: event.requirements,
          maxParticipants: event.maxParticipants,
          participants: event.participants,
          images: event.images,
          creator: event.creator,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt
        };
      });

      // Calculate stats
      const now = new Date();
      const allEvents = await Event.find({}).lean();
      
      const stats = {
        total: totalEvents,
        active: allEvents.filter(e => 
          e.startDate && e.endDate && 
          now >= new Date(e.startDate) && 
          now <= new Date(e.endDate)
        ).length,
        upcoming: allEvents.filter(e => 
          e.startDate && now < new Date(e.startDate)
        ).length,
        completed: allEvents.filter(e => 
          e.endDate && now > new Date(e.endDate)
        ).length,
        event: await Event.countDocuments({ type: 'event' }),
        giveaway: await Event.countDocuments({ type: 'giveaway' })
      };

      res.json({
        success: true,
        events: normalizedEvents,
        stats,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          totalPages: limitNum === -1 ? 1 : Math.ceil(totalEvents / limitNum),
          totalEvents
        }
      });
    } catch (error) {
      console.error('Error fetching events for DataTable:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch events',
        error: error.message
      });
    }
  }

  // Get single event details (for admin view)
  async getEventDetails(req, res) {
    try {
      const { eventId } = req.params;

      const event = await Event.findById(eventId).lean();

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      // Normalize event data
      const now = new Date();
      let status = 'upcoming';
      
      if (event.startDate && event.endDate) {
        if (now >= new Date(event.startDate) && now <= new Date(event.endDate)) {
          status = 'active';
        } else if (now > new Date(event.endDate)) {
          status = 'completed';
        }
      }

      const normalizedEvent = {
        ...event,
        name: event.title,
        date: event.startDate,
        status: status
      };

      res.json({
        success: true,
        event: normalizedEvent
      });
    } catch (error) {
      console.error('Error fetching event details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch event details',
        error: error.message
      });
    }
  }

  // Delete event (admin action)
  async deleteEvent(req, res) {
    try {
      const { eventId } = req.params;
      const userId = req.user.userId;

      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      // Check if user is admin or moderator
      const user = await User.findById(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      await Event.findByIdAndDelete(eventId);

      res.json({
        success: true,
        message: 'Event deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete event',
        error: error.message
      });
    }
  }

  // Bulk delete events
  async bulkDeleteEvents(req, res) {
    try {
      const { eventIds } = req.body;
      const userId = req.user.userId;

      if (!Array.isArray(eventIds) || eventIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Event IDs array is required'
        });
      }

      // Check if user is admin or moderator
      const user = await User.findById(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const result = await Event.deleteMany({
        _id: { $in: eventIds }
      });

      res.json({
        success: true,
        message: `${result.deletedCount} events deleted successfully`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error('Error bulk deleting events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete events',
        error: error.message
      });
    }
  }

  // Get event statistics for dashboard
  async getEventStatistics(req, res) {
    try {
      const now = new Date();
      const allEvents = await Event.find({}).lean();

      const stats = {
        total: allEvents.length,
        active: allEvents.filter(e => 
          e.startDate && e.endDate && 
          now >= new Date(e.startDate) && 
          now <= new Date(e.endDate)
        ).length,
        upcoming: allEvents.filter(e => 
          e.startDate && now < new Date(e.startDate)
        ).length,
        completed: allEvents.filter(e => 
          e.endDate && now > new Date(e.endDate)
        ).length,
        event: await Event.countDocuments({ type: 'event' }),
        giveaway: await Event.countDocuments({ type: 'giveaway' }),
        thisMonth: await Event.countDocuments({
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
          }
        }),
        lastMonth: await Event.countDocuments({
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        })
      };

      // Calculate growth
      stats.growth = stats.lastMonth > 0 
        ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth * 100).toFixed(1)
        : 0;

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Error fetching event statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch event statistics',
        error: error.message
      });
    }
  }

  // Export events to CSV
  async exportEventsCSV(req, res) {
    try {
      const { status, type } = req.query;
      const query = {};
      
      if (type) query.type = type;

      const now = new Date();
      if (status === 'active') {
        query.startDate = { $lte: now };
        query.endDate = { $gte: now };
      } else if (status === 'upcoming') {
        query.startDate = { $gt: now };
      } else if (status === 'completed') {
        query.endDate = { $lt: now };
      }

      const events = await Event.find(query).lean();

      // Create CSV content
      const csvHeaders = [
        'ID',
        'Title',
        'Description',
        'Type',
        'Status',
        'Start Date',
        'End Date',
        'Max Participants',
        'Current Participants',
        'Prizes',
        'Created By',
        'Created At'
      ].join(',');

      const csvRows = events.map(event => {
        let eventStatus = 'upcoming';
        if (event.startDate && event.endDate) {
          if (now >= new Date(event.startDate) && now <= new Date(event.endDate)) {
            eventStatus = 'active';
          } else if (now > new Date(event.endDate)) {
            eventStatus = 'completed';
          }
        }

        return [
          event._id,
          `"${(event.title || '').replace(/"/g, '""')}"`,
          `"${(event.description || '').replace(/"/g, '""')}"`,
          event.type || '',
          eventStatus,
          event.startDate ? new Date(event.startDate).toISOString() : '',
          event.endDate ? new Date(event.endDate).toISOString() : '',
          event.maxParticipants || 0,
          event.participants?.length || 0,
          `"${(event.prizes?.join('; ') || '').replace(/"/g, '""')}"`,
          event.creator?.username || '',
          new Date(event.createdAt).toISOString()
        ].join(',');
      });

      const csv = [csvHeaders, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=events-${Date.now()}.csv`);
      res.send(csv);
    } catch (error) {
      console.error('Error exporting events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export events',
        error: error.message
      });
    }
  }
}

export const eventsDataTableController = new EventsDataTableController();