import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Progress } from './ui/progress';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { apiService } from '../services/api';
import { useAuth, useApp } from '../App';
import { toast } from 'sonner';
import { PostModal } from './ui/post-modal';
import type { PostModalPost } from './ui/post-modal';
import { 
  Gift, 
  Calendar, 
  Search, 
  Clock,
  Trophy,
  MessageSquare,
  Loader2,
  Plus,
  Shield,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  ImageIcon
} from 'lucide-react';

// Helper function to transform Event to PostModalPost format
const transformEventToPostModal = (event: Event): PostModalPost => {
  return {
    id: event._id,
    type: 'event',
    title: event.title,
    description: event.description,
    user: {
      id: event.creator?.user_id || '',
      username: event.creator?.username || 'Unknown',
      avatar_url: event.creator?.avatar_url || '',
      verified: event.creator?.verified || false,
      credibility_score: 0 // Events don't have credibility scores
    },
    images: event.images?.map(img => ({
      url: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/uploads/event/${img.filename}`,
      type: 'event' as const
    })) || [],
    upvotes: event.upvotes || 0,
    downvotes: event.downvotes || 0,
    comments: event.comment_count || 0,
    timestamp: event.createdAt,
    // Event-specific metadata
    prizes: event.prizes,
    requirements: event.requirements,
    eventType: event.type,
    eventStatus: event.status,
    startDate: event.startDate,
    endDate: event.endDate,
    maxParticipants: event.maxParticipants,
    participantCount: event.interestedCount || 0
  };
};

// Helper function to get avatar URL
const getAvatarUrl = (avatarUrl?: string) => {
  if (!avatarUrl) return '';

  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }

  if (avatarUrl.startsWith('/uploads/') || avatarUrl.startsWith('/api/uploads/')) {
    return `http://localhost:5000${avatarUrl}`;
  }

  console.log('getAvatarUrl: Processing filename:', avatarUrl);
  const fullUrl = `http://localhost:5000/api/uploads/avatars/${avatarUrl}`;
  console.log('getAvatarUrl: Generated URL:', fullUrl);
  return fullUrl;
};

interface ImageDisplayProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

function ImageDisplay({ src, alt, className, fallback }: ImageDisplayProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    console.error('Image failed to load:', src);
    setImageLoading(false);
    setImageError(true);
  };

  if (imageError) {
    return fallback || (
      <div className={`bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-400">
          <ImageIcon className="w-8 h-8 mx-auto mb-1" />
          <span className="text-xs">Image unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover rounded ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

interface Event {
  _id: string;
  title: string;
  description: string;
  type: 'giveaway' | 'competition' | 'event';
  status: 'active' | 'ended' | 'upcoming' | 'ending-soon';
  prizes?: string[];
  requirements?: string[];
  maxParticipants?: number;
  interestedCount?: number;
  startDate: string;
  endDate: string;
  creator?: {
    user_id: string;
    username: string;
    avatar?: string;
    avatar_url?: string;
    verified?: boolean;
  };
  interested?: Array<{
    _id: string;
    username: string;
    avatar?: string;
  }>;
  createdAt: string;
  // Add images field
  images?: Array<{
    filename: string;
    originalName: string;
    path: string;
    size: number;
    mimetype: string;
  }>;
  // Add voting and comment fields
  upvotes?: number;
  downvotes?: number;
  comment_count?: number;
  comments?: EventComment[];
}

interface EventComment {
  comment_id: string;
  event_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string;
  credibility_score?: number;
  avatar_url?: string;
}

// Event Details Modal Component

export function EventsGiveaways() {
  const { user } = useAuth();
  const { setCurrentPage } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState<string | null>(null);
  
  // Utility function to get current date in proper format for datetime-local input
  const getCurrentDateTimeLocal = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  // Modal states
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // Add missing image modal state variables
  const [isEventImageModalOpen, setIsEventImageModalOpen] = useState(false);
  const [eventModalImages, setEventModalImages] = useState<Array<{
    filename: string;
    originalName: string;
    path: string;
    size: number;
    mimetype: string;
  }>>([]);
  const [currentEventImageIndex, setCurrentEventImageIndex] = useState(0);
  
  // Check if user is admin or moderator
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  
  // Initialize with default dates (current date for start, tomorrow for end)
  const getDefaultDates = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return {
      startDate: now.toISOString().slice(0, 16),
      endDate: tomorrow.toISOString().slice(0, 16)
    };
  };
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    type: 'event',
    startDate: getDefaultDates().startDate,
    endDate: getDefaultDates().endDate,
    prizes: [] as string[],
    requirements: [] as string[],
    maxParticipants: undefined as number | undefined
  });

  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Image handling state
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [uploadSelectedImages, setUploadSelectedImages] = useState<File[]>([]);
  const [editImagePreviewUrls, setEditImagePreviewUrls] = useState<string[]>([]);
  const [editUploadSelectedImages, setEditUploadSelectedImages] = useState<File[]>([]);

  // Add handlers for event image modal
  const handleEventImageClick = (images: Array<{
    filename: string;
    originalName: string;
    path: string;
    size: number;
    mimetype: string;
  }>, index: number) => {
    setEventModalImages(images);
    setCurrentEventImageIndex(index);
    setIsEventImageModalOpen(true);
  };

  const handleNextEventImage = () => {
    setCurrentEventImageIndex((prev) => (prev + 1) % eventModalImages.length);
  };

  const handlePreviousEventImage = () => {
    setCurrentEventImageIndex((prev) => (prev - 1 + eventModalImages.length) % eventModalImages.length);
  };

  // Load events from API
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.getEvents();
      
      // Fix: Extract events array from response object
      const eventsArray = response.events || response || [];
      
      // Add vote and comment counts to each event
      const eventsWithCounts = await Promise.all(eventsArray.map(async (event: Event) => {
        try {
          const [voteResponse, commentResponse] = await Promise.allSettled([
            apiService.getEventVotes(event._id),
            apiService.getEventComments(event._id)
          ]);

          let upvotes = 0, downvotes = 0, comment_count = 0;

          if (voteResponse.status === 'fulfilled') {
            upvotes = voteResponse.value.upvotes || 0;
            downvotes = voteResponse.value.downvotes || 0;
          }

          if (commentResponse.status === 'fulfilled') {
            comment_count = commentResponse.value.comments?.length || 0;
          }

          // Convert participants to interested if backend still uses participants terminology
          // Define a more specific type for the potentially different API response
          interface LegacyEventResponse extends Event {
            participantCount?: number;
            participants?: Array<{
              _id: string;
              username: string;
              avatar?: string;
            }>;
          }
          
          const eventWithLegacy = event as LegacyEventResponse;
          
          const remappedEvent = {
            ...event,
            upvotes,
            downvotes,
            comment_count,
            // Map participantCount to interestedCount if backend still uses old naming
            interestedCount: event.interestedCount || eventWithLegacy.participantCount || 0,
            // Map participants array to interested array if backend still uses old naming
            interested: event.interested || eventWithLegacy.participants || []
          };
          
          return remappedEvent;
        } catch (error) {
          console.error('Failed to load counts for event:', event._id, error);
          return {
            ...event,
            upvotes: 0,
            downvotes: 0,
            comment_count: 0
          };
        }
      }));

      setEvents(eventsWithCounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
      console.error('Load events error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleUserClick = (userId: string) => {
    if (!userId) {
      toast.error('User ID not available');
      return;
    }
    
    // Check if userId looks like a valid MongoDB ObjectId (24 hex characters)
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(userId)) {
      toast.error('Profile viewing not available for this user');
      return;
    }
    
    setCurrentPage(`profile-${userId}`);
  };

  // Image handling functions
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + uploadSelectedImages.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setUploadSelectedImages(prev => [...prev, ...validFiles]);
      
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreviewUrls(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
      
      setError('');
    }
  };

  const removeImagePreview = (index: number) => {
    setUploadSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const clearImages = () => {
    setUploadSelectedImages([]);
    setImagePreviewUrls([]);
  };

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + editUploadSelectedImages.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setEditUploadSelectedImages(prev => [...prev, ...validFiles]);
      
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setEditImagePreviewUrls(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
      
      setError('');
    }
  };

  const handleRemoveEditImage = (index: number) => {
    setEditUploadSelectedImages(prev => prev.filter((_, i) => i !== index));
    setEditImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const clearEditImages = () => {
    setEditUploadSelectedImages([]);
    setEditImagePreviewUrls([]);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate dates
    const now = new Date();
    const startDate = newEvent.startDate ? new Date(newEvent.startDate) : null;
    const endDate = newEvent.endDate ? new Date(newEvent.endDate) : null;
    
    if (!startDate || !endDate) {
      setError('Start date and end date are required');
      return;
    }
    
    if (startDate < now) {
      setError('Start date cannot be in the past');
      return;
    }
    
    if (endDate < startDate) {
      setError('End date must be after start date');
      return;
    }
    
    try {
      setCreateLoading(true);
      setError('');
      
      await apiService.createEvent({
        title: newEvent.title,
        description: newEvent.description,
        type: newEvent.type as 'giveaway' | 'competition' | 'event',
        startDate: newEvent.startDate,
        endDate: newEvent.endDate,
        prizes: newEvent.prizes.filter(p => p.trim()),
        requirements: newEvent.requirements.filter(r => r.trim()),
        maxParticipants: newEvent.maxParticipants
      }, uploadSelectedImages);
      
      setIsCreateDialogOpen(false);
      
      // Clear images
      clearImages();
      
      // Reload events to show the new one
      await loadEvents();
      toast.success('Event created successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
      toast.error('Failed to create event');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinEvent = async (eventId: string, eventType: string) => {
    try {
      setJoinLoading(eventId);
      setError('');
      
      await apiService.joinEvent(eventId);
      
      // Reload events to update interested count
      await loadEvents();
      toast.success(`Successfully marked interest in ${eventType}!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to mark interest in ${eventType}`);
      toast.error(`Failed to mark interest in ${eventType}`);
    } finally {
      setJoinLoading(null);
    }
  };

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    if (!confirm(`Are you sure you want to delete the event "${eventTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleteLoading(eventId);
      setError('');
      
      await apiService.deleteEvent(eventId);
      
      // Reload events to remove the deleted event
      await loadEvents();
      toast.success('Event deleted successfully!');
      
      // Close modal if it's the deleted event
      if (selectedEvent?._id === eventId) {
        handleCloseDetailsModal();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
      toast.error('Failed to delete event');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    
    // Get current date for validation
    const now = new Date();
    
    // Format dates, ensuring they're not in the past
    let startDateObj = event.startDate ? new Date(event.startDate) : now;
    if (startDateObj < now) startDateObj = now;
    
    let endDateObj = event.endDate ? new Date(event.endDate) : new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (endDateObj < now) endDateObj = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const startDate = startDateObj.toISOString().slice(0, 16);
    const endDate = endDateObj.toISOString().slice(0, 16);
    
    setNewEvent({
      title: event.title,
      description: event.description,
      type: event.type,
      startDate,
      endDate,
      prizes: event.prizes || [],
      requirements: event.requirements || [],
      maxParticipants: event.maxParticipants
    });
    // Clear edit images when opening edit dialog
    clearEditImages();
    setIsEditDialogOpen(true);
    // Close details modal
    setIsDetailsModalOpen(false);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    // Validate dates
    const now = new Date();
    const startDate = newEvent.startDate ? new Date(newEvent.startDate) : null;
    const endDate = newEvent.endDate ? new Date(newEvent.endDate) : null;
    
    if (!startDate || !endDate) {
      setError('Start date and end date are required');
      return;
    }
    
    if (startDate < now) {
      setError('Start date cannot be in the past');
      return;
    }
    
    if (endDate < startDate) {
      setError('End date must be after start date');
      return;
    }
    
    try {
      setCreateLoading(true);
      setError('');
      
      await apiService.updateEvent(editingEvent._id, {
        title: newEvent.title,
        description: newEvent.description,
        type: newEvent.type as 'giveaway' | 'competition' | 'event',
        startDate: newEvent.startDate,
        endDate: newEvent.endDate,
        prizes: newEvent.prizes.filter(p => p.trim()),
        requirements: newEvent.requirements.filter(r => r.trim()),
        maxParticipants: newEvent.maxParticipants
      }, editUploadSelectedImages);
      
      setIsEditDialogOpen(false);
      setEditingEvent(null);
      
      // Reset form with default dates
      const defaultDates = getDefaultDates();
      setNewEvent({
        title: '',
        description: '',
        type: 'event',
        startDate: defaultDates.startDate,
        endDate: defaultDates.endDate,
        prizes: [],
        requirements: [],
        maxParticipants: undefined
      });
      
      // Clear images
      clearImages();
      
      // Clear edit images
      clearEditImages();
      
      // Reload events to show the updated one
      await loadEvents();
      toast.success('Event updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event');
      toast.error('Failed to update event');
    } finally {
      setCreateLoading(false);
    }
  };

  // Helper functions for UI

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'ending-soon': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      case 'upcoming': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'ended': return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'ending-soon': return 'Ending Soon';
      case 'upcoming': return 'Upcoming';
      case 'ended': return 'Ended';
      default: return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'giveaway': return <Gift className="w-5 h-5" />;
      case 'competition': return <Trophy className="w-5 h-5" />;
      case 'event': return <Calendar className="w-5 h-5" />;
      default: return <Gift className="w-5 h-5" />;
    }
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch = searchTerm === '' || 
      event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || event.type === filterType;
    
    return matchesSearch && matchesType;
  });

  // Move EventImageModal component before the return statement
  function EventImageModal({ images, currentIndex, isOpen, onClose, onNext, onPrevious }: {
    images: Array<{
      filename: string;
      originalName: string;
      path: string;
      size: number;
      mimetype: string;
    }>;
    currentIndex: number;
    isOpen: boolean;
    onClose: () => void;
    onNext: () => void;
    onPrevious: () => void;
  }) {
    if (!isOpen || !images || images.length === 0) return null;

    const currentImage = images[currentIndex];

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Event Images</DialogTitle>
          </DialogHeader>
          <div className="relative bg-black rounded-lg overflow-hidden">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            {images.length > 1 && (
              <>
                <button
                  onClick={onPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={onNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
            
            <div className="relative aspect-video bg-black flex items-center justify-center">
              <ImageDisplay
                src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/uploads/event/${currentImage.filename}`}
                alt={currentImage.originalName || `Event image ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {currentIndex + 1} / {images.length}
              </div>
            )}
            
            <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
              {currentImage.originalName || `Image ${currentIndex + 1}`}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gift className="w-7 h-7 text-purple-500" />
              Events & Giveaways
            </h1>
            <p className="text-muted-foreground">Join exciting events and enter amazing giveaways</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Event Calendar
            </Button>
            {isAdminOrModerator && (
              <Dialog 
                open={isCreateDialogOpen} 
                onOpenChange={(open) => {
                  if (open) {
                    // Reset form with default dates when opening
                    const defaultDates = getDefaultDates();
                    setNewEvent(prev => ({
                      ...prev,
                      title: '',
                      description: '',
                      type: 'event',
                      startDate: defaultDates.startDate,
                      endDate: defaultDates.endDate,
                      prizes: [],
                      requirements: [],
                      maxParticipants: undefined
                    }));
                  }
                  setIsCreateDialogOpen(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Event
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                  <DialogDescription>
                    Create a new event or giveaway for the community
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="event-title">Title *</Label>
                    <Input
                      id="event-title"
                      placeholder="Enter event title"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="event-type">Type</Label>
                    <Select value={newEvent.type} onValueChange={(value) => setNewEvent(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="event">Community Event</SelectItem>
                        <SelectItem value="giveaway">Giveaway</SelectItem>
                        <SelectItem value="competition">Competition</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="event-description">Description</Label>
                    <Textarea
                      id="event-description"
                      placeholder="Describe your event..."
                      value={newEvent.description}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-date">Start Date</Label>
                      <Input
                        id="start-date"
                        type="datetime-local"
                        value={newEvent.startDate}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="end-date">End Date</Label>
                      <Input
                        id="end-date"
                        type="datetime-local"
                        value={newEvent.endDate}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, endDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="max-participants">Max Participants (optional)</Label>
                    <Input
                      id="max-participants"
                      type="number"
                      placeholder="No limit"
                      value={newEvent.maxParticipants || ''}
                      onChange={(e) => setNewEvent(prev => ({ 
                        ...prev, 
                        maxParticipants: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                      min="1"
                    />
                  </div>
                  
                  {(newEvent.type === 'giveaway' || newEvent.type === 'competition') && (
                    <div className="space-y-2">
                      <Label htmlFor="prizes">Prizes (comma-separated)</Label>
                      <Input
                        id="prizes"
                        placeholder="e.g., 1000 Robux, Limited Item, etc."
                        value={newEvent.prizes.join(', ')}
                        onChange={(e) => setNewEvent(prev => ({ 
                          ...prev, 
                          prizes: e.target.value.split(',').map(p => p.trim()).filter(p => p) 
                        }))}
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="requirements">Requirements (comma-separated, optional)</Label>
                    <Input
                      id="requirements"
                      placeholder="e.g., Follow on Twitter, Join Discord, etc."
                      value={newEvent.requirements.join(', ')}
                      onChange={(e) => setNewEvent(prev => ({ 
                        ...prev, 
                        requirements: e.target.value.split(',').map(r => r.trim()).filter(r => r) 
                      }))}
                    />
                  </div>
                  
                  {/* Image Upload Section */}
                  <div className="space-y-2">
                    <Label>Images (optional - up to 5 images)</Label>
                    <div 
                      className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg p-4 text-center transition-colors"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
                        if (files.length > 0) {
                          const input = document.getElementById('event-image-upload') as HTMLInputElement;
                          const dt = new DataTransfer();
                          files.forEach(file => dt.items.add(file));
                          input.files = dt.files;
                          handleImageSelect({ target: input } as React.ChangeEvent<HTMLInputElement>);
                        }
                      }}
                    >
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                        id="event-image-upload"
                        disabled={uploadSelectedImages.length >= 5}
                      />
                      <label
                        htmlFor="event-image-upload"
                        className={`cursor-pointer flex flex-col items-center gap-2 ${
                          uploadSelectedImages.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Upload className="w-8 h-8 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {uploadSelectedImages.length >= 5 
                            ? 'Maximum 5 images reached' 
                            : 'Click to upload images or drag and drop'
                          }
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          PNG, JPG, GIF up to 5MB each • {uploadSelectedImages.length}/5 selected
                        </span>
                      </label>
                    </div>

                    {/* Image Previews */}
                    {imagePreviewUrls.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {imagePreviewUrls.length} image{imagePreviewUrls.length !== 1 ? 's' : ''} selected
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={clearImages}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Clear All
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {imagePreviewUrls.map((url, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={url}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeImagePreview(index)}
                                className="absolute top-1 right-1 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white border-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {error && (
                    <div className="text-red-500 text-sm">{error}</div>
                  )}
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={createLoading}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white" disabled={createLoading}>
                      {createLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Event'
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
              </Dialog>
            )}

            {/* Edit Event Dialog */}
            {editingEvent && (
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Event</DialogTitle>
                    <DialogDescription>
                      Update the event details
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleUpdateEvent} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-event-title">Title *</Label>
                      <Input
                        id="edit-event-title"
                        placeholder="Enter event title"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-event-type">Type</Label>
                      <Select value={newEvent.type} onValueChange={(value) => setNewEvent(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="event">Community Event</SelectItem>
                          <SelectItem value="giveaway">Giveaway</SelectItem>
                          <SelectItem value="competition">Competition</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-event-description">Description</Label>
                      <Textarea
                        id="edit-event-description"
                        placeholder="Describe your event..."
                        value={newEvent.description}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                        className="min-h-[100px]"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-start-date">Start Date</Label>
                        <Input
                          id="edit-start-date"
                          type="datetime-local"
                          value={newEvent.startDate}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, startDate: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="edit-end-date">End Date</Label>
                        <Input
                          id="edit-end-date"
                          type="datetime-local"
                          value={newEvent.endDate}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, endDate: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-max-participants">Max Participants (optional)</Label>
                      <Input
                        id="edit-max-participants"
                        type="number"
                        placeholder="No limit"
                        value={newEvent.maxParticipants || ''}
                        onChange={(e) => setNewEvent(prev => ({ 
                          ...prev, 
                          maxParticipants: e.target.value ? parseInt(e.target.value) : undefined 
                        }))}
                        min="1"
                      />
                    </div>
                    
                    {(newEvent.type === 'giveaway' || newEvent.type === 'competition') && (
                      <div className="space-y-2">
                        <Label htmlFor="edit-prizes">Prizes (comma-separated)</Label>
                        <Input
                          id="edit-prizes"
                          placeholder="e.g., 1000 Robux, Limited Item, etc."
                          value={newEvent.prizes.join(', ')}
                          onChange={(e) => setNewEvent(prev => ({ 
                            ...prev, 
                            prizes: e.target.value.split(',').map(p => p.trim()).filter(p => p) 
                          }))}
                        />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-requirements">Requirements (comma-separated, optional)</Label>
                      <Input
                        id="edit-requirements"
                        placeholder="e.g., Follow on Twitter, Join Discord, etc."
                        value={newEvent.requirements.join(', ')}
                        onChange={(e) => setNewEvent(prev => ({ 
                          ...prev, 
                          requirements: e.target.value.split(',').map(r => r.trim()).filter(r => r) 
                        }))}
                      />
                    </div>
                    
                    {/* Image Upload Section */}
                    <div className="space-y-2">
                      <Label>Images (optional - up to 5 images)</Label>
                      <div 
                        className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg p-4 text-center transition-colors"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                          const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
                          if (files.length > 0) {
                            const input = document.getElementById('event-image-upload') as HTMLInputElement;
                            const dt = new DataTransfer();
                            files.forEach(file => dt.items.add(file));
                            input.files = dt.files;
                            handleImageSelect({ target: input } as React.ChangeEvent<HTMLInputElement>);
                          }
                        }}
                      >
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                          id="event-image-upload"
                          disabled={uploadSelectedImages.length >= 5}
                        />
                        <label
                          htmlFor="event-image-upload"
                          className={`cursor-pointer flex flex-col items-center gap-2 ${
                            uploadSelectedImages.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <Upload className="w-8 h-8 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {uploadSelectedImages.length >= 5 
                              ? 'Maximum 5 images reached' 
                              : 'Click to upload images or drag and drop'
                            }
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            PNG, JPG, GIF up to 5MB each • {uploadSelectedImages.length}/5 selected
                          </span>
                        </label>
                      </div>

                      {/* Image Previews */}
                      {imagePreviewUrls.length > 0 && (
                        <div className="space-y-2 mt-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {imagePreviewUrls.length} image{imagePreviewUrls.length !== 1 ? 's' : ''} selected
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={clearImages}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-3 h-3 mr-1" />
                              Clear All
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {imagePreviewUrls.map((url, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={url}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg border"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeImagePreview(index)}
                                  className="absolute top-1 right-1 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white border-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {error && (
                      <div className="text-red-500 text-sm">{error}</div>
                    )}
                    
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={createLoading}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white" disabled={createLoading}>
                        {createLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Event'
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-border p-4 bg-muted/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search events and giveaways..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="giveaway">Giveaways</SelectItem>
              <SelectItem value="competition">Competitions</SelectItem>
              <SelectItem value="event">Community Events</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-background p-4 border-b border-border">
        <div className="flex items-center justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-green-500" />
            <span>{filteredEvents.length} Events Found</span>
          </div>
          {!isAdminOrModerator && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-4 h-4 text-blue-500" />
              <span>Event creation restricted to staff members</span>
            </div>
          )}
          {loading && (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span>Loading...</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredEvents.map((event) => (
              <Card key={event._id} className="hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => handleEventClick(event)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={getAvatarUrl(event.creator?.avatar_url)} />
                        <AvatarFallback>{event.creator?.username?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span 
                            className="font-medium text-sm cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUserClick(event.creator?.user_id || '');
                            }}
                          >
                            {event.creator?.username || 'Unknown'}
                          </span>
                          {event.creator?.verified && (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                              ✓
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(event.status)}>
                        {getStatusText(event.status)}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {getTypeIcon(event.type)}
                        <span className="ml-1">{event.type}</span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Event Images in Card */}
                  {event.images && event.images.length > 0 && (
                    <div className="relative" onClick={(e) => {
                      e.stopPropagation();
                      handleEventImageClick(event.images!, 0);
                    }}>
                      <ImageDisplay
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/uploads/event/${event.images[0].filename}`}
                        alt={`${event.title} - Event image`}
                        className="w-full h-32 object-cover rounded-lg hover:opacity-90 transition-opacity"
                      />
                      {event.images.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                          <Eye className="w-3 h-3 inline mr-1" />
                          {event.images.length} images
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center opacity-0 hover:opacity-100">
                        <Eye className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                  </div>

                  {/* Prizes */}
                  {event.prizes && (
                    <div>
                      <span className="text-sm text-muted-foreground mb-2 block">Prizes:</span>
                      <div className="flex flex-wrap gap-1">
                        {event.prizes.slice(0, 3).map((prize, i) => (
                          <Badge key={i} className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            {prize}
                          </Badge>
                        ))}
                        {event.prizes.length > 3 && (
                          <Badge variant="outline">+{event.prizes.length - 3} more</Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Progress Bar */}
                  {event.maxParticipants && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Interested: {event.interestedCount || 0}</span>
                        <span>{event.maxParticipants} max</span>
                      </div>
                      <Progress value={((event.interestedCount || 0) / event.maxParticipants) * 100} className="h-2" />
                    </div>
                  )}

                  {/* Requirements */}
                  {event.requirements && event.requirements.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground mb-2 block">Requirements:</span>
                      <div className="flex flex-wrap gap-1">
                        {event.requirements.map((req, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {req}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Time and Stats */}
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span>Ends: {new Date(event.endDate).toLocaleDateString()}</span>
                      </div>
                      {event.startDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-green-500" />
                          <span>Started: {new Date(event.startDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Updated Stats with upvotes/downvotes */}
                  <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-green-600">
                        <ArrowUp className="w-3 h-3" />
                        <span>{event.upvotes || 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-red-600">
                        <ArrowDown className="w-3 h-3" />
                        <span>{event.downvotes || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{event.comment_count || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>View Details</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinEvent(event._id, event.type);
                      }}
                      disabled={joinLoading === event._id || event.status === 'ended'}
                    >
                      {joinLoading === event._id ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Interested...
                        </>
                      ) : (
                        event.type === 'giveaway' ? 'I\'m Interested' : 
                        event.type === 'competition' ? 'I\'m Interested' : 'I\'m Interested'
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MessageSquare className="w-3 h-3" />
                    </Button>
                    
                    {/* Admin/Moderator actions */}
                    {isAdminOrModerator && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-blue-600 hover:text-blue-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditEvent(event);
                          }}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(event._id, event.title);
                          }}
                          disabled={deleteLoading === event._id}
                        >
                          {deleteLoading === event._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-muted-foreground">
                  <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No events found</h3>
                  <p>Try adjusting your search or filter criteria.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <PostModal
          post={transformEventToPostModal(selectedEvent)}
          isOpen={isDetailsModalOpen}
          onClose={handleCloseDetailsModal}
          onUserClick={handleUserClick}
          currentUser={user}
          overlay={
            <div className="space-y-4">
              {/* Event-specific content */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {getTypeIcon(selectedEvent.type)}
                  <span className="ml-1">{selectedEvent.type}</span>
                </Badge>
                <Badge className={getStatusColor(selectedEvent.status)}>
                  {selectedEvent.status}
                </Badge>
              </div>

              {/* Prizes */}
              {selectedEvent.prizes && selectedEvent.prizes.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">Prizes</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.prizes.map((prize, i) => (
                      <Badge key={i} variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                        {prize}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements */}
              {selectedEvent.requirements && selectedEvent.requirements.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Requirements</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.requirements.map((req, i) => (
                      <Badge key={i} variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {req}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress */}
              {selectedEvent.maxParticipants && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Interest</h4>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{selectedEvent.interestedCount || 0} interested</span>
                    <span>{selectedEvent.maxParticipants} max</span>
                  </div>
                  <Progress value={((selectedEvent.interestedCount || 0) / selectedEvent.maxParticipants) * 100} className="h-2" />
                </div>
              )}

              {/* Event Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg text-sm">
                <div>
                  <span className="text-muted-foreground">Start Date:</span>
                  <div className="font-medium">{new Date(selectedEvent.startDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">End Date:</span>
                  <div className="font-medium">{new Date(selectedEvent.endDate).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-700 text-white"
                  onClick={() => handleJoinEvent(selectedEvent._id, selectedEvent.type)}
                  disabled={joinLoading === selectedEvent._id || selectedEvent.status === 'ended'}
                >
                  {joinLoading === selectedEvent._id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Marking as interested...
                    </>
                  ) : (
                    <>
                      {getTypeIcon(selectedEvent.type)}
                      <span className="ml-2">
                        {selectedEvent.type === 'giveaway' ? 'Interested in Giveaway' :
                         selectedEvent.type === 'competition' ? 'Interested in Competition' : 'Interested'}
                      </span>
                    </>
                  )}
                </Button>

                {isAdminOrModerator && (
                  <>
                    <Button variant="outline" onClick={() => handleEditEvent(selectedEvent)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDeleteEvent(selectedEvent._id, selectedEvent.title)}
                      disabled={deleteLoading === selectedEvent._id}
                      className="text-red-600 hover:text-red-700"
                    >
                      {deleteLoading === selectedEvent._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      {deleteLoading === selectedEvent._id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          }
        />
      )}

      {/* Event Image Modal */}
      <EventImageModal
        images={eventModalImages}
        currentIndex={currentEventImageIndex}
        isOpen={isEventImageModalOpen}
        onClose={() => setIsEventImageModalOpen(false)}
        onNext={handleNextEventImage}
        onPrevious={handlePreviousEventImage}
      />

      {/* Create Event Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>
              Create a new event or giveaway for the community
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Title *</Label>
              <Input
                id="event-title"
                placeholder="Enter event title"
                value={newEvent.title}
                onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="event-type">Type</Label>
              <Select value={newEvent.type} onValueChange={(value) => setNewEvent(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Community Event</SelectItem>
                  <SelectItem value="giveaway">Giveaway</SelectItem>
                  <SelectItem value="competition">Competition</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                placeholder="Describe your event..."
                value={newEvent.description}
                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[100px]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="datetime-local"
                  value={newEvent.startDate}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, startDate: e.target.value }))}
                  min={getCurrentDateTimeLocal()}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="datetime-local"
                  value={newEvent.endDate}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, endDate: e.target.value }))}
                  min={newEvent.startDate || getCurrentDateTimeLocal()}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max-participants">Max Interested (optional)</Label>
              <Input
                id="max-participants"
                type="number"
                placeholder="No limit"
                value={newEvent.maxParticipants || ''}
                onChange={(e) => setNewEvent(prev => ({ 
                  ...prev, 
                  maxParticipants: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
                min="1"
              />
            </div>
            
            {(newEvent.type === 'giveaway' || newEvent.type === 'competition') && (
              <div className="space-y-2">
                <Label htmlFor="prizes">Prizes (comma-separated)</Label>
                <Input
                  id="prizes"
                  placeholder="e.g., 1000 Robux, Limited Item, etc."
                  value={newEvent.prizes.join(', ')}
                  onChange={(e) => setNewEvent(prev => ({ 
                    ...prev, 
                    prizes: e.target.value.split(',').map(p => p.trim()).filter(p => p) 
                  }))}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="requirements">Requirements (comma-separated, optional)</Label>
              <Input
                id="requirements"
                placeholder="e.g., Follow on Twitter, Join Discord, etc."
                value={newEvent.requirements.join(', ')}
                onChange={(e) => setNewEvent(prev => ({ 
                  ...prev, 
                  requirements: e.target.value.split(',').map(r => r.trim()).filter(r => r) 
                }))}
              />
            </div>
            
            {/* Image Upload Section */}
            <div className="space-y-2">
              <Label>Images (optional - up to 5 images)</Label>
              <div 
                className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg p-4 text-center transition-colors"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                  const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
                  if (files.length > 0) {
                    const input = document.getElementById('event-image-upload') as HTMLInputElement;
                    const dt = new DataTransfer();
                    files.forEach(file => dt.items.add(file));
                    input.files = dt.files;
                    handleImageSelect({ target: input } as React.ChangeEvent<HTMLInputElement>);
                  }
                }}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="event-image-upload"
                  disabled={uploadSelectedImages.length >= 5}
                />
                <label
                  htmlFor="event-image-upload"
                  className={`cursor-pointer flex flex-col items-center gap-2 ${
                    uploadSelectedImages.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {uploadSelectedImages.length >= 5 
                      ? 'Maximum 5 images reached' 
                      : 'Click to upload images or drag and drop'
                    }
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    PNG, JPG, GIF up to 5MB each • {uploadSelectedImages.length}/5 selected
                  </span>
                </label>
              </div>

              {/* Image Previews */}
              {imagePreviewUrls.length > 0 && (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {imagePreviewUrls.length} image{imagePreviewUrls.length !== 1 ? 's' : ''} selected
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearImages}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear All
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {imagePreviewUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeImagePreview(index)}
                          className="absolute top-1 right-1 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white border-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={createLoading}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white" disabled={createLoading}>
                {createLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Event'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      {editingEvent && (
        <Dialog 
          open={isEditDialogOpen} 
          onOpenChange={(open) => {
            // Validate dates when reopening the form
            if (open && editingEvent) {
              const now = new Date();
              let startDateObj = editingEvent.startDate ? new Date(editingEvent.startDate) : now;
              if (startDateObj < now) startDateObj = now;
              
              let endDateObj = editingEvent.endDate ? new Date(editingEvent.endDate) : new Date(now.getTime() + 24 * 60 * 60 * 1000);
              if (endDateObj < now) endDateObj = new Date(now.getTime() + 24 * 60 * 60 * 1000);
              
              setNewEvent(prev => ({
                ...prev,
                startDate: startDateObj.toISOString().slice(0, 16),
                endDate: endDateObj.toISOString().slice(0, 16),
              }));
            }
            setIsEditDialogOpen(open);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
              <DialogDescription>
                Update the event details
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-event-title">Title *</Label>
                <Input
                  id="edit-event-title"
                  placeholder="Enter event title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-event-type">Type</Label>
                <Select value={newEvent.type} onValueChange={(value) => setNewEvent(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">Community Event</SelectItem>
                    <SelectItem value="giveaway">Giveaway</SelectItem>
                    <SelectItem value="competition">Competition</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-event-description">Description</Label>
                <Textarea
                  id="edit-event-description"
                  placeholder="Describe your event..."
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-start-date">Start Date</Label>
                  <Input
                    id="edit-start-date"
                    type="datetime-local"
                    value={newEvent.startDate}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, startDate: e.target.value }))}
                    min={getCurrentDateTimeLocal()}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-end-date">End Date</Label>
                  <Input
                    id="edit-end-date"
                    type="datetime-local"
                    value={newEvent.endDate}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, endDate: e.target.value }))}
                    min={newEvent.startDate || getCurrentDateTimeLocal()}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-max-participants">Max Interested (optional)</Label>
                <Input
                  id="edit-max-participants"
                  type="number"
                  placeholder="No limit"
                  value={newEvent.maxParticipants || ''}
                  onChange={(e) => setNewEvent(prev => ({ 
                    ...prev, 
                    maxParticipants: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  min="1"
                />
              </div>
              
              {(newEvent.type === 'giveaway' || newEvent.type === 'competition') && (
                <div className="space-y-2">
                  <Label htmlFor="edit-prizes">Prizes (comma-separated)</Label>
                  <Input
                    id="edit-prizes"
                    placeholder="e.g., 1000 Robux, Limited Item, etc."
                    value={newEvent.prizes.join(', ')}
                    onChange={(e) => setNewEvent(prev => ({ 
                      ...prev, 
                      prizes: e.target.value.split(',').map(p => p.trim()).filter(p => p) 
                    }))}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="edit-requirements">Requirements (comma-separated, optional)</Label>
                <Input
                  id="edit-requirements"
                  placeholder="e.g., Follow on Twitter, Join Discord, etc."
                  value={newEvent.requirements.join(', ')}
                  onChange={(e) => setNewEvent(prev => ({ 
                    ...prev, 
                    requirements: e.target.value.split(',').map(r => r.trim()).filter(r => r) 
                  }))}
                />
              </div>
              
              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label>Images (optional - up to 5 images)</Label>
                <div 
                  className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg p-4 text-center transition-colors"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
                    if (files.length > 0) {
                      const input = document.getElementById('edit-event-image-upload') as HTMLInputElement;
                      const dt = new DataTransfer();
                      files.forEach(file => dt.items.add(file));
                      input.files = dt.files;
                      handleEditImageSelect({ target: input } as React.ChangeEvent<HTMLInputElement>);
                    }
                  }}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleEditImageSelect}
                    className="hidden"
                    id="edit-event-image-upload"
                    disabled={editUploadSelectedImages.length >= 5}
                  />
                  <label
                    htmlFor="edit-event-image-upload"
                    className={`cursor-pointer flex flex-col items-center gap-2 ${
                      editUploadSelectedImages.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {editUploadSelectedImages.length >= 5 
                        ? 'Maximum 5 images reached' 
                        : 'Click to upload images or drag and drop'
                      }
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      PNG, JPG, GIF up to 5MB each • {editUploadSelectedImages.length}/5 selected
                    </span>
                  </label>
                </div>

                {/* Image Previews */}
                {editImagePreviewUrls.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {editImagePreviewUrls.length} image{editImagePreviewUrls.length !== 1 ? 's' : ''} selected
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearEditImages}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Clear All
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {editImagePreviewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveEditImage(index)}
                            className="absolute top-1 right-1 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white border-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}
              
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={createLoading}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white" disabled={createLoading}>
                  {createLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Event'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}