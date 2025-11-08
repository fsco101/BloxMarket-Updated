import { useState, useEffect } from 'react';
import { PostModal } from './ui/post-modal';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { apiService } from '../services/api';
import { toast } from 'sonner';
import { ContentCard, UniversalCardHeader, UniversalCardContent } from './ui/universal-layout';
import { useApp } from '../App';

import { 
  Search, 
  TrendingUp,
  Gift,
  MessageSquare, 
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertCircle,
  Eye,
  ImageIcon,
  Flag
} from 'lucide-react';

// Type definitions
interface Trade {
  trade_id: string;
  item_offered: string;
  item_requested?: string;
  description?: string;
  status: string;
  created_at: string;
  username?: string; // Optional for backward compatibility
  roblox_username?: string; // Optional for backward compatibility
  credibility_score?: number; // Optional for backward compatibility
  user_id: string;
  user?: {
    _id: string;
    username: string;
    roblox_username: string;
    credibility_score: number;
    avatar_url?: string;
  };
  avatar_url?: string;
  images?: Array<{ 
    image_url: string; 
    uploaded_at?: string;
    filename?: string;
    path?: string; 
  }>;
  upvotes?: number;
  downvotes?: number;
  comment_count?: number;
}

interface ForumPost {
  post_id: string;
  title: string;
  content: string;
  category: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  username: string;
  credibility_score: number;
  user_id: string;
  avatar_url?: string;
  images?: Array<{ filename: string; originalName: string; path: string; size: number; mimetype: string }>;
  commentCount: number;
}

interface DashboardPost {
  id: string;
  type: 'trade' | 'forum' | 'event' | 'wishlist';
  title: string;
  description: string;
  user: {
    id?: string; // Add user ID field
    username: string;
    robloxUsername?: string;
    rating: number;
    vouchCount: number;
    verified?: boolean;
    moderator?: boolean;
    avatar_url?: string;
  };
  timestamp: string;
  comments?: number;
  upvotes?: number;
  downvotes?: number;
  items?: string[];
  wantedItems?: string[];
  offering?: string;
  images?: Array<{ url: string; type: 'trade' | 'forum' | 'event' }>;
  category?: string;
  status?: string;
  // Add event-specific fields
  prizes?: string[];
  requirements?: string[];
  eventType?: 'giveaway' | 'competition' | 'event';
  eventStatus?: 'active' | 'ended' | 'upcoming' | 'ending-soon';
  startDate?: string;
  endDate?: string;
  maxParticipants?: number;
  participantCount?: number;
}

// New Report Modal Component
function ReportModal({ post, isOpen, onClose }: { post: DashboardPost | null; isOpen: boolean; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [reportType, setReportType] = useState<'Scamming' | 'Harassment' | 'Inappropriate Content' | 'Spam' | 'Impersonation' | 'Other'>('Other');
  const [submitting, setSubmitting] = useState(false);

  const reportTypes = [
    { value: 'Scamming', label: 'Scamming' },
    { value: 'Harassment', label: 'Harassment' },
    { value: 'Inappropriate Content', label: 'Inappropriate Content' },
    { value: 'Spam', label: 'Spam' },
    { value: 'Impersonation', label: 'Impersonation' },
    { value: 'Other', label: 'Other' }
  ];

  const handleSubmit = async () => {
    if (!post || !reason.trim() || submitting) return;

    try {
      setSubmitting(true);
      await apiService.createReport({
        post_id: post.id,
        post_type: post.type as 'trade' | 'forum' | 'event' | 'wishlist',
        reason: reason.trim(),
        type: reportType
      });

      toast.success('Report submitted successfully');
      setReason('');
      setReportType('Other');
      onClose();
      
      // Dispatch event to update notifications
      window.dispatchEvent(new CustomEvent('notification-created'));
    } catch (error) {
      console.error('Failed to submit report:', error);
      if (error instanceof Error && error.message.includes('already reported')) {
        toast.error('You have already reported this post');
      } else {
        toast.error('You cannot report your own post.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setReason('');
      setReportType('Other');
      onClose();
    }
  };

  if (!post) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            Report Post
          </DialogTitle>
          <DialogDescription>
            Help us keep the community safe by reporting inappropriate content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="report-type" className="text-sm font-medium">
              Report Type
            </Label>
            <Select value={reportType} onValueChange={(value: typeof reportType) => setReportType(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason for Report
            </Label>
            <Textarea
              id="reason"
              placeholder="Please provide details about why you're reporting this post..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 min-h-[100px]"
              disabled={submitting}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Post: <span className="font-medium">{post.title}</span></p>
            <p>Type: <span className="capitalize font-medium">{post.type}</span></p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim() || submitting}
            className="bg-red-500 hover:bg-red-600"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

// Enhanced Image Display Component
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
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-400">
          <ImageIcon className="w-8 h-8 mx-auto mb-1" />
          <span className="text-xs">Image unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {imageLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}
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

export function Dashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [posts, setPosts] = useState<DashboardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    activeTraders: 0,
    activeTrades: 0,
    liveEvents: 0
  });
  const [selectedPost, setSelectedPost] = useState<DashboardPost | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const { setCurrentPage } = useApp();

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

  const handlePostClick = (post: DashboardPost) => {
    setSelectedPost(post);
    setIsPostModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsPostModalOpen(false);
    setSelectedPost(null);
  };

  // Load data from APIs
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch data from all APIs in parallel
        const [tradesData, forumData, eventsData] = await Promise.allSettled([
          apiService.getTrades({ limit: 10, status: 'open' }),
          apiService.getForumPosts({ limit: 10 }),
          apiService.getEvents()
        ]);

        const allPosts: DashboardPost[] = [];
        let activeTradeCount = 0;
        let activeEventCount = 0;

        // Process trades data with upvote/downvote system
        if (tradesData.status === 'fulfilled' && tradesData.value?.trades) {
          const trades: Trade[] = tradesData.value.trades;
          console.log("First trade from API:", trades[0]); // Log first trade for debugging
          activeTradeCount = trades.filter(trade => trade.status === 'open').length;
          
          trades.forEach(trade => {
            let timestamp = 'Recently';
            try {
              if (trade.created_at) {
                timestamp = new Date(trade.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              }
            } catch {
              console.warn('Invalid date format for trade:', trade.trade_id);
            }

            // Handle user data which might be nested
            const userData = trade.user || {
              _id: '',
              username: trade.username || '',
              roblox_username: trade.roblox_username || '',
              credibility_score: trade.credibility_score || 0,
              avatar_url: trade.avatar_url
            };
            
            console.log('Trade user data:', userData);
            console.log('Trade avatar_url:', userData.avatar_url);
            
            // Fix image processing
            let images: Array<{ url: string; type: 'trade' | 'forum' }> = [];
            if (trade.images && trade.images.length > 0) {
              images = trade.images.map(img => {
                // Handle different image data structures
                if (!img) return { url: '', type: 'trade' as const };
                
                // Extract the filename from image_url (preferred) or filename field
                let fileName;
                if (img.image_url) {
                  // Format: '/uploads/trades/filename.jpg' or just 'filename.jpg'
                  fileName = img.image_url.includes('/') 
                    ? img.image_url.split('/').pop() 
                    : img.image_url;
                } else if (img.filename) {
                  fileName = img.filename;
                } else {
                  // Fallback if no image info available
                  console.warn('Missing image information for trade', trade.trade_id);
                  return { url: '', type: 'trade' as const };
                }
                
                // Build the complete URL
                return {
                  url: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/uploads/trades/${fileName}`,
                  type: 'trade' as const
                };
              }).filter(img => img.url !== ''); // Remove any empty URLs
            }

            allPosts.push({
              id: trade.trade_id,
              type: 'trade',
              title: `Trading ${trade.item_offered}${trade.item_requested ? ` for ${trade.item_requested}` : ''}`,
              description: trade.description || `Looking to trade ${trade.item_offered}${trade.item_requested ? ` for ${trade.item_requested}` : '. Contact me for offers!'}`,
              user: {
                id: userData._id || trade.user_id, // Add user ID
                username: userData.username || trade.username || 'Unknown User',
                robloxUsername: userData.roblox_username || trade.roblox_username || 'Unknown',
                rating: Math.min(5, Math.max(1, Math.floor((userData.credibility_score || trade.credibility_score || 0) / 20))),
                vouchCount: Math.floor((userData.credibility_score || trade.credibility_score || 0) / 2),
                verified: false, // Default to false since the trade data doesn't include verification status
                moderator: false, // Default to false since the trade data doesn't include moderator status
                avatar_url: userData.avatar_url || trade.avatar_url
              },
              timestamp,
              items: [trade.item_offered],
              wantedItems: trade.item_requested ? [trade.item_requested] : undefined,
              status: trade.status,
              images,
              comments: trade.comment_count || 0,
              upvotes: trade.upvotes || 0,
              downvotes: trade.downvotes || 0
            });
          });
        }

        // Process forum posts data (unchanged)
        if (forumData.status === 'fulfilled' && Array.isArray(forumData.value)) {
          const forumPosts: ForumPost[] = forumData.value;
          
          forumPosts.forEach(post => {
            let timestamp = 'Recently';
            try {
              if (post.created_at) {
                timestamp = new Date(post.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              }
            } catch {
              console.warn('Invalid date format for forum post:', post.post_id);
            }

            console.log('Forum post user data:', post);
            console.log('Forum post avatar_url:', post.avatar_url);

            let images: Array<{ url: string; type: 'trade' | 'forum' }> = [];
            if (post.images && post.images.length > 0) {
              images = post.images.map(img => ({
                url: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/uploads/forum/${img.filename}`,
                type: 'forum' as const
              }));
            }

            allPosts.push({
              id: post.post_id,
              type: 'forum',
              title: post.title,
              description: post.content && post.content.length > 200 ? post.content.substring(0, 200) + '...' : (post.content || 'No content available'),
              user: {
                id: post.user_id, // Use the user_id from API response
                username: post.username || 'Unknown User',
                rating: Math.min(5, Math.max(1, Math.floor((post.credibility_score || 0) / 20))),
                vouchCount: Math.floor((post.credibility_score || 0) / 2),
                verified: false, // Default to false since the forum post data doesn't include verification status
                moderator: false, // Default to false since the forum post data doesn't include moderator status
                avatar_url: post.avatar_url
              },
              timestamp,
              comments: post.commentCount || 0,
              upvotes: post.upvotes || 0,
              downvotes: post.downvotes || 0,
              category: post.category,
              images
            });
          });
        }

        // Process events data - Updated to match EventsGiveaways structure
        if (eventsData.status === 'fulfilled') {
          // Fix: Extract events array from response object, same as EventsGiveaways
          const eventsArray = eventsData.value.events || eventsData.value || [];
          
          // Define the Event interface to remove any types
          interface EventData {
            _id: string;
            title: string;
            description?: string;
            type: 'giveaway' | 'competition' | 'event';
            status: 'active' | 'ended' | 'upcoming' | 'ending-soon';
            startDate?: string;
            endDate?: string;
            createdAt: string;
            prizes?: string[];
            requirements?: string[];
            maxParticipants?: number;
            participantCount?: number;
            creator?: {
              user_id: string;
              username: string;
              avatar?: string;
              verified?: boolean;
              avatar_url?: string;
            };
            images?: Array<{ filename: string; path: string }>;
          }
          
          // Type cast the events array
          const typedEventsArray = eventsArray as EventData[];
          
          activeEventCount = typedEventsArray.filter(event => 
            event.status === 'active' || event.status === 'upcoming'
          ).length;
          
          // Process events WITHOUT loading individual vote/comment counts to avoid rate limiting
          // These will be loaded lazily when the user opens a post modal
          typedEventsArray.forEach((event) => {
            let timestamp = 'Recently';
            try {
              if (event.createdAt) {
                timestamp = new Date(event.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              }
            } catch {
              console.warn('Invalid date format for event:', event._id);
            }

            // Process event images
            let images: Array<{ url: string; type: 'trade' | 'forum' }> = [];
            if (event.images && event.images.length > 0) {
              images = event.images.map((img) => ({
                url: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/uploads/event/${img.filename}`,
                type: 'forum' as const // Use 'forum' type for events since there's no 'event' type in the union
              }));
            }

            allPosts.push({
              id: event._id,
              type: 'event',
              title: event.title,
              description: event.description || 'Check out this community event!',
              user: {
                id: event.creator?.user_id, // Use the creator's user_id from API response
                username: event.creator?.username || 'Event Host',
                rating: 5,
                vouchCount: 999,
                verified: event.creator?.verified || true,
                moderator: true,
                avatar_url: event.creator?.avatar_url || event.creator?.avatar
              },
              timestamp,
              comments: 0, // Will be loaded lazily
              upvotes: 0,   // Will be loaded lazily
              downvotes: 0, // Will be loaded lazily
              images,
              // Add event-specific data
              prizes: event.prizes,
              requirements: event.requirements,
              eventType: event.type,
              eventStatus: event.status,
              startDate: event.startDate,
              endDate: event.endDate,
              maxParticipants: event.maxParticipants,
              participantCount: event.participantCount
            });
            
            console.log('Event creator data:', event.creator);
            console.log('Event avatar_url:', event.creator?.avatar_url || event.creator?.avatar);
          });
        }

        // Sort posts by timestamp
        allPosts.sort((a, b) => {
          try {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            
            if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
              return dateB.getTime() - dateA.getTime();
            }
            
            return a.timestamp.localeCompare(b.timestamp);
          } catch {
            return 0;
          }
        });
        
        // Calculate active traders
        let activeTraderCount = 0;
        if (tradesData.status === 'fulfilled' && tradesData.value?.trades) {
          const uniqueTraders = new Set();
          tradesData.value.trades.forEach((trade: Trade) => {
            if (trade.status === 'open') {
              uniqueTraders.add(trade.user_id);
            }
          });
          activeTraderCount = uniqueTraders.size;
        }
        
        setPosts(allPosts);
        setStats({
          activeTraders: activeTraderCount,
          activeTrades: activeTradeCount,
          liveEvents: activeEventCount
        });

      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Helper functions
  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'trade': return <TrendingUp className="w-4 h-4" />;
      case 'event': return <Gift className="w-4 h-4" />;
      case 'forum': return <MessageSquare className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'trade': return 'bg-blue-500';
      case 'event': return 'bg-green-500';
      case 'forum': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || post.type === filterType;
    return matchesSearch && matchesFilter;
  });

  // Show loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && posts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Home Feed</h1>
            <p className="text-muted-foreground text-lg">Latest trades, giveaways, and community updates</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 flex-1 min-w-0"
                  size="lg"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger size="lg">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="trade">Trades</SelectItem>
                  <SelectItem value="forum">Forum</SelectItem>
                  <SelectItem value="event">Events</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-muted/30 border-b border-border p-6">
        <div className="flex items-center justify-center gap-12 text-base">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" /><span>{stats.activeTraders.toLocaleString()}Active Traders</span>
          </div>
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-blue-500" /><span>{stats.activeTrades}Active Trades</span>
          </div>
          <div className="flex items-center gap-3">
            <Gift className="w-5 h-5 text-purple-500" /><span>{stats.liveEvents}Live Events</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8 space-y-8">
          {filteredPosts.map((post) => (
            <ContentCard
              key={post.id}
              className="relative hover:shadow-lg transition-shadow duration-200 cursor-pointer"
              onClick={() => handlePostClick(post)}
            >
              <UniversalCardHeader
                avatar={
                  <Avatar className="w-14 h-14">
                    <AvatarImage
                      src={getAvatarUrl(post.user.avatar_url)}
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '';
                      }}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg">
                      {post.user.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                }
                title={post.title}
                subtitle={`@${post.user.robloxUsername || post.user.username} • ${post.user.username}`}
                badges={[
                  ...(post.user.verified ? [<Badge key="verified" variant="secondary" className="text-xs bg-blue-100 text-blue-700">✓ Verified</Badge>] : []),
                  ...(post.user.moderator ? [<Badge key="mod" variant="secondary" className="text-xs bg-red-100 text-red-700">MOD</Badge>] : [])
                ]}
                timestamp={post.timestamp}
                actions={
                  <Badge className={`${getPostTypeColor(post.type)} text-white`}>
                    {getPostTypeIcon(post.type)}
                    <span className="ml-1 capitalize">{post.type}</span>
                  </Badge>
                }
                onUserClick={() => handleUserClick(post.user.id || post.user.username)}
              />

              <UniversalCardContent
                description={post.description}
                images={
                  post.images && post.images.length > 0 ? (
                    <div className="mb-4" onClick={(e) => e.stopPropagation()}>
                      {post.images.length === 1 ? (
                        // Single image - expand to full width with larger height but max size constraint
                        <div 
                          className="w-full h-64 md:h-80 max-h-80 overflow-hidden rounded-lg border cursor-pointer hover:shadow-md transition-shadow group"
                          onClick={() => handlePostClick(post)}
                        >
                          <div className="relative w-full h-full">
                            <ImageDisplay
                              src={post.images[0].url}
                              alt={`${post.type} image`}
                              className="w-full h-full"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <Eye className="w-8 h-8 text-white" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Multiple images - use grid layout with max height constraint
                        <div className="max-h-80 overflow-hidden">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {post.images.slice(0, 3).map((image, imageIndex) => (
                              <div 
                                key={imageIndex} 
                                className="aspect-square overflow-hidden rounded-lg border cursor-pointer hover:shadow-md transition-shadow group"
                                onClick={() => handlePostClick(post)}
                              >
                                <div className="relative w-full h-full">
                                  <ImageDisplay
                                    src={image.url}
                                    alt={`${post.type} image ${imageIndex + 1}`}
                                    className="w-full h-full"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <Eye className="w-6 h-6 text-white" />
                                  </div>
                                </div>
                              </div>
                            ))}
                            {post.images.length > 3 && (
                              <div 
                                className="aspect-square bg-gray-100 rounded-lg border flex items-center justify-center cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => handlePostClick(post)}
                              >
                                <div className="text-center text-gray-500">
                                  <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                                  <span className="text-sm">+{post.images.length - 3} more</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : undefined
                }
                metadata={[
                  { icon: <ArrowUp className="w-5 h-5 text-green-600" />, label: "upvotes", value: post.upvotes || 0 },
                  { icon: <ArrowDown className="w-5 h-5 text-red-600" />, label: "downvotes", value: post.downvotes || 0 },
                  { icon: <MessageSquare className="w-5 h-5" />, label: "comments", value: post.comments }
                ]}
                tags={[
                  ...(post.type === 'trade' && post.items ? post.items.map((item, i) => (
                    <Badge key={`offering-${i}`} variant="outline" className="bg-green-50 text-green-700">
                      {item}
                    </Badge>
                  )) : []),
                  ...(post.type === 'trade' && post.wantedItems ? post.wantedItems.map((item, i) => (
                    <Badge key={`wanted-${i}`} variant="outline" className="bg-blue-50 text-blue-700">
                      {item}
                    </Badge>
                  )) : []),
                  ...(post.type === 'trade' && post.status ? [
                    <Badge key="status" variant="outline" className={`${
                      post.status === 'open' ? 'bg-green-50 text-green-700' :
                      post.status === 'completed' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-50 text-gray-700'
                    }`}>
                      {post.status}
                    </Badge>
                  ] : []),
                  ...(post.type === 'forum' && post.category ? [
                    <Badge key="category" variant="outline" className="bg-purple-50 text-purple-700">
                      {post.category.replace('_', ' ').toUpperCase()}
                    </Badge>
                  ] : [])
                ]}
                actions={
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUserClick(post.user.id || post.user.username);
                      }}
                    >
                      Message
                    </Button>
                  </div>
                }
              />
            </ContentCard>
          ))}

          {filteredPosts.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No posts found</h3>
                  <p>Try adjusting your search or filter criteria.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Post Modal */}
      <PostModal
        post={selectedPost}
        isOpen={isPostModalOpen}
        onClose={handleCloseModal}
        onUserClick={handleUserClick}
        onReportClick={() => setIsReportModalOpen(true)}
      />

      {/* Report Modal */}
      <ReportModal
        post={selectedPost}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}