import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
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
import { useAuth, useApp } from '../App';
import { ProfileView } from './ProfileView';
import { 
  MessageSquare, 
  Flag, 
  Star, 
  TrendingUp, 
  Clock, 
  Search,
  Filter,
  Gift,
  Loader2,
  AlertCircle,
  Eye,
  ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Send,
  MoreHorizontal,
  User,
  ArrowUp,
  ArrowDown
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

interface Event {
  _id: string;
  title: string;
  description: string;
  type: 'giveaway' | 'competition' | 'event';
  status: 'active' | 'ended' | 'upcoming' | 'ending-soon';
  startDate?: string;
  endDate?: string;
  createdAt: string;
  creator?: {
    username: string;
    avatar?: string;
    verified?: boolean;
    avatar_url?: string;
  };
}

interface DashboardPost {
  id: string;
  type: 'trade' | 'forum' | 'event' | string; // Added string to accommodate potential type mismatches
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
  images?: Array<{ url: string; type: 'trade' | 'forum' }>;
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

// Add interfaces for modal components
interface PostModalProps {
  post: DashboardPost | null;
  isOpen: boolean;
  onClose: () => void;
  onUserClick: (userId: string) => void;
  onReportClick: () => void;
}

interface ImageViewerProps {
  images: Array<{ url: string; type: 'trade' | 'forum' }>;
  currentIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onSetIndex: (index: number) => void;
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

// ImageViewer Component
function ImageViewer({ images, currentIndex, onNext, onPrevious, onSetIndex }: ImageViewerProps) {
  const currentImage = images[currentIndex];
  const hasMultipleImages = images.length > 1;

  return (
    <div className="relative h-full flex items-center justify-center">
      {/* Main Image */}
      <ImageDisplay
        src={currentImage.url}
        alt={`Post image ${currentIndex + 1}`}
        className="max-w-full max-h-full object-contain"
        fallback={
          <div className="flex items-center justify-center h-full text-white/70">
            <div className="text-center">
              <ImageIcon className="w-16 h-16 mx-auto mb-4" />
              <p>Image unavailable</p>
            </div>
          </div>
        }
      />

      {/* Navigation Arrows - Only show if multiple images */}
      {hasMultipleImages && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrevious();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors z-10"
            disabled={images.length <= 1}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors z-10"
            disabled={images.length <= 1}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Image Counter */}
      {hasMultipleImages && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Thumbnail Strip - Only show if multiple images */}
      {hasMultipleImages && (
        <div className="absolute bottom-6 left-6 right-6 flex justify-center gap-2">
          <div className="flex gap-2 bg-black/50 rounded-lg p-2 max-w-full overflow-x-auto">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  onSetIndex(index);
                }}
                className={`flex-shrink-0 w-12 h-12 rounded border-2 overflow-hidden ${
                  index === currentIndex ? 'border-white' : 'border-transparent'
                }`}
              >
                <ImageDisplay
                  src={image.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  fallback={<div className="w-full h-full bg-gray-600 flex items-center justify-center text-xs text-white">?</div>}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
      {imageLoading && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded">
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
      <DialogContent className="sm:max-w-[500px]">
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
            <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
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

// New Post Modal Component with unified voting system
function PostModal({ post, isOpen, onClose, onUserClick, onReportClick }: PostModalProps) {
  const { user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [votingLoading, setVotingLoading] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  console.log('PostModal user data:', user);
  console.log('PostModal user avatar_url:', user?.avatar_url);

  // Load comments and votes when modal opens
  useEffect(() => {
    if (isOpen && post) {
      loadPostData();
    }
  }, [isOpen, post]);

  const loadPostData = async () => {
    if (!post) return;

    try {
      setLoadingComments(true);
      console.log('Loading post data for:', post.id, post.type);
      
      // Load comments and votes based on post type
      if (post.type === 'forum') {
        try {
          const response = await apiService.getForumPost(post.id);
          console.log('Forum post response:', response);
          
          const commentsData = response.comments || [];
          setComments(commentsData);
          setUpvotes(response.upvotes || 0);
          setDownvotes(response.downvotes || 0);
          
          if (response.userVote) {
            setUserVote(response.userVote);
            setHasVoted(true);
          } else {
            setUserVote(null);
            setHasVoted(false);
          }
        } catch (apiError) {
          console.error('Failed to load forum post:', apiError);
          setComments([]);
          setUpvotes(0);
          setDownvotes(0);
          setUserVote(null);
          setHasVoted(false);
        }
      } else if (post.type === 'trade') {
        try {
          // Load trade comments and votes
          const [commentsResponse, votesResponse] = await Promise.allSettled([
            apiService.getTradeComments(post.id),
            apiService.getTradeVotes(post.id)
          ]);

          // Handle comments
          if (commentsResponse.status === 'fulfilled') {
            setComments(commentsResponse.value.comments || []);
          } else {
            console.error('Failed to load trade comments:', commentsResponse.reason);
            setComments([]);
          }

          // Handle votes
          if (votesResponse.status === 'fulfilled') {
            setUpvotes(votesResponse.value.upvotes || 0);
            setDownvotes(votesResponse.value.downvotes || 0);
            setUserVote(votesResponse.value.userVote || null);
            setHasVoted(votesResponse.value.userVote !== null);
          } else {
            console.error('Failed to load trade votes:', votesResponse.reason);
            setUpvotes(post.upvotes || 0);
            setDownvotes(post.downvotes || 0);
            setUserVote(null);
            setHasVoted(false);
          }
        } catch (apiError) {
          console.error('Failed to load trade data:', apiError);
          setComments([]);
          setUpvotes(post.upvotes || 0);
          setDownvotes(post.downvotes || 0);
          setUserVote(null);
          setHasVoted(false);
        }
      } else if (post.type === 'event') {
        // Updated: Load event comments and votes like trades
        try {
          // Load event comments and votes
          const [commentsResponse, votesResponse] = await Promise.allSettled([
            apiService.getEventComments(post.id),
            apiService.getEventVotes(post.id)
          ]);

          // Handle comments
          if (commentsResponse.status === 'fulfilled') {
            setComments(commentsResponse.value.comments || []);
          } else {
            console.error('Failed to load event comments:', commentsResponse.reason);
            setComments([]);
          }

          // Handle votes
          if (votesResponse.status === 'fulfilled') {
            setUpvotes(votesResponse.value.upvotes || 0);
            setDownvotes(votesResponse.value.downvotes || 0);
            setUserVote(votesResponse.value.userVote || null);
            setHasVoted(votesResponse.value.userVote !== null);
          } else {
            console.error('Failed to load event votes:', votesResponse.reason);
            setUpvotes(post.upvotes || 0);
            setDownvotes(post.downvotes || 0);
            setUserVote(null);
            setHasVoted(false);
          }
        } catch (apiError) {
          console.error('Failed to load event data:', apiError);
          setComments([]);
          setUpvotes(post.upvotes || 0);
          setDownvotes(post.downvotes || 0);
          setUserVote(null);
          setHasVoted(false);
        }
      } else {
        // For unknown post types, use default values
        setComments([]);
        setUpvotes(post.upvotes || 0);
        setDownvotes(post.downvotes || 0);
        setUserVote(null);
        setHasVoted(false);
      }
      
    } catch (error) {
      console.error('Failed to load post data:', error);
      toast.error('Failed to load post data');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleUpvote = async () => {
    if (!post || votingLoading) return;

    try {
      setVotingLoading(true);
      console.log('Attempting upvote for post:', post.id, post.type);
      
      let response;
      if (post.type === 'forum') {
        response = await apiService.voteForumPost(post.id, 'up');
      } else if (post.type === 'trade') {
        response = await apiService.voteTradePost(post.id, 'up');
      } else if (post.type === 'event') {
        response = await apiService.voteEvent(post.id, 'up');
      } else {
        toast.info('Voting not available for this post type');
        return;
      }
      
      console.log('Upvote response:', response);
      
      // Update local state based on server response
      setUpvotes(response.upvotes);
      setDownvotes(response.downvotes);
      setUserVote(response.userVote);
      setHasVoted(response.userVote !== null);
      
      if (response.userVote === 'up') {
        toast.success('Upvoted!');
      } else if (response.userVote === null) {
        toast.success('Vote removed!');
      } else {
        toast.success('Changed to upvote!');
      }
      
      // Dispatch event to update notifications
      window.dispatchEvent(new CustomEvent('notification-created'));
    } catch (error) {
      console.error('Failed to upvote:', error);
      if (error instanceof Error && error.message.includes('already voted')) {
        toast.error('You have already voted on this post');
      } else if (error instanceof Error && error.message.includes('404')) {
        toast.error('Post not found');
      } else {
        toast.error('You can not vote on your own trade');
      }
    } finally {
      setVotingLoading(false);
    }
  };

  const handleDownvote = async () => {
    if (!post || votingLoading) return;

    try {
      setVotingLoading(true);
      console.log('Attempting downvote for post:', post.id, post.type);
      
      let response;
      if (post.type === 'forum') {
        response = await apiService.voteForumPost(post.id, 'down');
      } else if (post.type === 'trade') {
        response = await apiService.voteTradePost(post.id, 'down');
      } else if (post.type === 'event') {
        response = await apiService.voteEvent(post.id, 'down');
      } else {
        toast.info('Voting not available for this post type');
        return;
      }
      
      console.log('Downvote response:', response);
      
      // Update local state based on server response
      setUpvotes(response.upvotes);
      setDownvotes(response.downvotes);
      setUserVote(response.userVote);
      setHasVoted(response.userVote !== null);
      
      if (response.userVote === 'down') {
        toast.success('Downvoted!');
      } else if (response.userVote === null) {
        toast.success('Vote removed!');
      } else {
        toast.success('Changed to downvote!');
      }
      
      // Dispatch event to update notifications
      window.dispatchEvent(new CustomEvent('notification-created'));
    } catch (error) {
      console.error('Failed to downvote:', error);
      if (error instanceof Error && error.message.includes('already voted')) {
        toast.error('You have already voted on this post');
      } else if (error instanceof Error && error.message.includes('404')) {
        toast.error('Post not found');
      } else {
        toast.error('You can not vote on your own trade');
      }
    } finally {
      setVotingLoading(false);
    }
  };

  const handleComment = async () => {
    if (!comment.trim() || !post || submittingComment) return;

    try {
      setSubmittingComment(true);
      console.log('Attempting to add comment:', { postId: post.id, content: comment });
      
      let newComment;
      if (post.type === 'forum') {
        newComment = await apiService.addForumComment(post.id, comment);
      } else if (post.type === 'trade') {
        newComment = await apiService.addTradeComment(post.id, comment);
      } else if (post.type === 'event') {
        newComment = await apiService.addEventComment(post.id, comment);
      } else {
        // Fallback for unknown post types
        newComment = {
          comment_id: Date.now().toString(),
          content: comment,
          created_at: new Date().toISOString(),
          username: 'You',
          credibility_score: 100
        };
      }
      
      console.log('Comment added successfully:', newComment);
      
      if (newComment) {
        setComments(prev => [newComment, ...prev]);
        setComment('');
        toast.success('Comment added!');
        
        // Dispatch event to update notifications
        window.dispatchEvent(new CustomEvent('notification-created'));
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      if (error instanceof Error && error.message.includes('404')) {
        toast.error('Post not found');
      } else {
        toast.error('Failed to add comment');
      }
      
      // Dispatch event to update notifications even on error (in case notification was created)
      window.dispatchEvent(new CustomEvent('notification-created'));
    } finally {
      setSubmittingComment(false);
    }
  };

  // Helper functions for modal
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

  if (!post) return null;

  const handleNext = () => {
    if (post.images && post.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % post.images!.length);
    }
  };

  const handlePrevious = () => {
    if (post.images && post.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + post.images!.length) % post.images!.length);
    }
  };

  const handleSetImageIndex = (index: number) => {
    setCurrentImageIndex(index);
  };

  const handleUserClick = () => {
    onUserClick(post.user.id || post.user.username);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full p-0 overflow-hidden border-0 shadow-2xl">
        <div className="flex h-[98vh]">
          {/* Left side - Image Viewer */}
          <div className="flex-1 bg-black relative">
            <button
              onClick={onClose}
              className="absolute top-6 right-6 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            {post.images && post.images.length > 0 ? (
              <ImageViewer
                images={post.images}
                currentIndex={currentImageIndex}
                onNext={handleNext}
                onPrevious={handlePrevious}
                onSetIndex={handleSetImageIndex}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-white/70">
                <div className="text-center">
                  <ImageIcon className="w-20 h-20 mx-auto mb-6 opacity-50" />
                  <p className="text-lg">No images available</p>
                </div>
              </div>
            )}
          </div>

          {/* Right side - Post Details and Comments */}
          <div className="w-[600px] bg-background border-l flex flex-col shadow-2xl">
            {/* Post Header */}
            <div className="p-6 border-b">
              <div className="flex items-center gap-4">
                <button onClick={handleUserClick} className="flex items-center gap-4 hover:bg-muted/50 rounded-lg p-2 transition-colors">
                  <Avatar className="w-12 h-12">
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
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-base">{post.user.username}</span>
                      {post.user.verified && (
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          ✓
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{post.timestamp}</span>
                    </div>
                  </div>
                </button>
                <div className="ml-auto">
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Post Content */}
            <div className="p-6 border-b">
              <h3 className="font-semibold text-xl mb-3">{post.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{post.description}</p>
              
              {/* Post Type Badge */}
              <Badge className={`${getPostTypeColor(post.type)} text-white text-sm px-3 py-1`}>
                {getPostTypeIcon(post.type)}
                <span className="ml-2 capitalize">{post.type}</span>
              </Badge>

              {/* Trade Details */}
              {post.type === 'trade' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground font-medium">Offering:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {post.items?.map((item, i) => (
                        <Badge key={i} variant="outline" className="text-sm bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 px-3 py-1">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {post.wantedItems && (
                    <div>
                      <span className="text-sm text-muted-foreground font-medium">Looking for:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {post.wantedItems.map((item, i) => (
                          <Badge key={i} variant="outline" className="text-sm bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-3 py-1">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions - Unified voting system for all post types */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={handleUpvote}
                    disabled={votingLoading}
                    className={`${userVote === 'up' ? 'text-green-600 bg-green-50 dark:bg-green-950' : 'text-muted-foreground'} hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950 text-base px-4 py-3 relative`}
                    title={userVote === 'up' ? 'Click to remove upvote' : userVote === 'down' ? 'Change to upvote' : 'Upvote this post'}
                  >
                    <ArrowUp className={`w-6 h-6 mr-3 ${userVote === 'up' ? 'fill-current' : ''}`} />
                    {upvotes}
                    {votingLoading && (
                      <Loader2 className="w-4 h-4 animate-spin absolute -top-1 -right-1" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={handleDownvote}
                    disabled={votingLoading}
                    className={`${userVote === 'down' ? 'text-red-600 bg-red-50 dark:bg-red-950' : 'text-muted-foreground'} hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 text-base px-4 py-3 relative`}
                    title={userVote === 'down' ? 'Click to remove downvote' : userVote === 'up' ? 'Change to downvote' : 'Downvote this post'}
                  >
                    <ArrowDown className={`w-6 h-6 mr-3 ${userVote === 'down' ? 'fill-current' : ''}`} />
                    {downvotes}
                    {votingLoading && (
                      <Loader2 className="w-4 h-4 animate-spin absolute -top-1 -right-1" />
                    )}
                  </Button>
                  
                  {/* Vote status indicator */}
                  {hasVoted && (
                    <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                      {userVote === 'up' ? '✓ Upvoted' : '✓ Downvoted'}
                    </div>
                  )}
                  
                  <Button variant="ghost" size="lg" className="text-muted-foreground text-base px-4 py-3">
                    <MessageSquare className="w-6 h-6 mr-3" />
                    {comments.length}
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="lg" 
                  className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 px-4 py-3 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReportClick();
                  }}
                  title="Report this post for violating community guidelines"
                  aria-label="Report post"
                >
                  <Flag className="w-5 h-5 mr-2" />
                  <span className="hidden sm:inline">Report</span>
                </Button>
              </div>
            </div>

            {/* Comments Section */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-8 space-y-8">
                <h4 className="font-semibold text-lg text-muted-foreground">
                  Comments ({comments.length})
                  {loadingComments && <Loader2 className="w-4 h-4 animate-spin inline ml-2" />}
                </h4>
                
                {loadingComments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.comment_id || comment.id} className="flex gap-5">
                      <Avatar className="w-12 h-12">
                        <AvatarImage
                          src={getAvatarUrl(comment.user?.avatar_url || comment.avatar_url)}
                          className="object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '';
                          }}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-base font-semibold">
                          {(comment.user?.username || comment.username || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted/50 rounded-xl p-5">
                          <div className="flex items-center gap-4 mb-3">
                            <span 
                              className="font-semibold text-base cursor-pointer hover:text-primary transition-colors"
                              onClick={() => onUserClick && onUserClick(comment.user?._id || comment.user_id)}
                            >
                              {comment.user?.username || comment.username}
                            </span>
                            {comment.user?.credibility_score && (
                              <Badge variant="secondary" className="text-xs">
                                {comment.user.credibility_score}★
                              </Badge>
                            )}
                            {comment.credibility_score && !comment.user && (
                              <Badge variant="secondary" className="text-xs">
                                {comment.credibility_score}★
                              </Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {comment.created_at ? new Date(comment.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : comment.time}
                            </span>
                          </div>
                          <p className="text-base leading-relaxed">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No comments yet. Be the first to comment!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Comment Input */}
            <div className="p-8 border-t bg-muted/20">
              <div className="flex gap-5">
                <Avatar className="w-12 h-12">
                  <AvatarImage
                    src={getAvatarUrl(user?.avatar_url as string)}
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '';
                    }}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-base font-semibold">
                    Y
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 flex gap-4">
                  <Input
                    placeholder="Write a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleComment()}
                    className="text-base h-12 rounded-xl border-2 focus:border-primary"
                    disabled={submittingComment}
                  />
                  <Button 
                    size="lg" 
                    onClick={handleComment} 
                    disabled={!comment.trim() || submittingComment} 
                    className="px-6 h-12 rounded-xl"
                  >
                    {submittingComment ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Home Feed</h1>
            <p className="text-muted-foreground">Latest trades, giveaways, and community updates</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
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

      {/* Stats Bar */}
      <div className="bg-muted/30 border-b border-border p-4">
        <div className="flex items-center justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>{stats.activeTraders.toLocaleString()} Active Traders</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span>{stats.activeTrades} Active Trades</span>
          </div>
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-purple-500" />
            <span>{stats.liveEvents} Live Events</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {filteredPosts.map((post) => (
            <ContentCard
              key={post.id}
              className="relative hover:shadow-lg transition-shadow duration-200 cursor-pointer"
              onClick={() => handlePostClick(post)}
            >
              <UniversalCardHeader
                avatar={
                  <Avatar className="w-10 h-10">
                    <AvatarImage
                      src={getAvatarUrl(post.user.avatar_url)}
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '';
                      }}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {post.user.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                }
                title={post.user.username}
                subtitle={`@${post.user.robloxUsername || post.user.username}`}
                badges={[
                  ...(post.user.verified ? [<Badge key="verified" variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">✓ Verified</Badge>] : []),
                  ...(post.user.moderator ? [<Badge key="mod" variant="secondary" className="text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">MOD</Badge>] : [])
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
                description={`${post.title}\n\n${post.description}`}
                images={
                  post.images && post.images.length > 0 ? (
                    <div className="space-y-3">
                      {post.images.length === 1 ? (
                        <div className="rounded-lg overflow-hidden relative group">
                          <ImageDisplay
                            src={post.images[0].url}
                            alt={`${post.type} image`}
                            className="w-full h-48"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Eye className="w-8 h-8 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <ImageIcon className="w-4 h-4" />
                            <span>{post.images.length} images</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {post.images.slice(0, 6).map((image, index) => (
                              <div key={index} className="aspect-square overflow-hidden rounded-lg border hover:shadow-md transition-shadow cursor-pointer group">
                                <div className="relative w-full h-full">
                                  <ImageDisplay
                                    src={image.url}
                                    alt={`${post.type} image ${index + 1}`}
                                    className="w-full h-full"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <Eye className="w-5 h-5 text-white" />
                                  </div>
                                </div>
                              </div>
                            ))}
                            {post.images.length > 6 && (
                              <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg border flex items-center justify-center cursor-pointer hover:shadow-md transition-shadow">
                                <div className="text-center text-gray-500 dark:text-gray-400">
                                  <ImageIcon className="w-6 h-6 mx-auto mb-1" />
                                  <span className="text-xs">+{post.images.length - 6} more</span>
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
                  { icon: <ArrowUp className="w-4 h-4 text-green-600" />, label: "upvotes", value: post.upvotes || 0 },
                  { icon: <ArrowDown className="w-4 h-4 text-red-600" />, label: "downvotes", value: post.downvotes || 0 },
                  { icon: <MessageSquare className="w-4 h-4" />, label: "comments", value: post.comments }
                ]}
                tags={[
                  ...(post.type === 'trade' && post.items ? post.items.map((item, i) => (
                    <Badge key={`offering-${i}`} variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                      {item}
                    </Badge>
                  )) : []),
                  ...(post.type === 'trade' && post.wantedItems ? post.wantedItems.map((item, i) => (
                    <Badge key={`wanted-${i}`} variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {item}
                    </Badge>
                  )) : []),
                  ...(post.type === 'trade' && post.status ? [
                    <Badge key="status" variant="outline" className={`${
                      post.status === 'open' ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' :
                      post.status === 'completed' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                      'bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300'
                    }`}>
                      {post.status}
                    </Badge>
                  ] : []),
                  ...(post.type === 'forum' && post.category ? [
                    <Badge key="category" variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
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