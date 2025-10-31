import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from './ui/card';import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogFooter, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogBody } from './ui/dialog';
import { PostModal } from './ui/post-modal';
import type { PostModalPost } from './ui/post-modal';
import { apiService } from '../services/api';
import { alertService } from '../services/alertService';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Filter, 
  MessageSquare, 
  TrendingUp,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  Upload,
  X,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  Send,
  ArrowUp,
  ArrowDown,
  Flag,
  ImageIcon,
  Heart
} from 'lucide-react';
import { useAuth, useApp } from '../App';
import { formatDistanceToNow } from 'date-fns';

const toISO = (v: unknown): string => {
  try {
    if (!v) return '';
    
    // Handle different date formats
    if (typeof v === 'string' || v instanceof Date || typeof v === 'number') {
      const d = new Date(v);
      return !isNaN(d.getTime()) ? d.toISOString() : '';
    }
    
    // Handle MongoDB date format with $date property
    if (v && typeof v === 'object' && '$date' in (v as object)) {
      const dateValue = (v as { $date: unknown }).$date;
      if (dateValue) {
        const d = new Date(String(dateValue));
        return !isNaN(d.getTime()) ? d.toISOString() : '';
      }
    }
    
    // If it's an object with a date property
    if (v && typeof v === 'object' && 'date' in (v as object)) {
      const dateValue = (v as { date: unknown }).date;
      if (dateValue) {
        const d = new Date(String(dateValue));
        return !isNaN(d.getTime()) ? d.toISOString() : '';
      }
    }
    
    console.warn("Unknown date format:", v);
    return '';
  } catch (error) {
    console.error("Error converting date to ISO:", error, "Value was:", v);
    return '';
  }
};

const formatDate = (dateString: string): string => {
  try {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown date';
    
    // Check if the formatDistanceToNow function is available
    if (typeof formatDistanceToNow !== 'function') {
      console.error("formatDistanceToNow is not a function. Check if date-fns is imported properly.");
      return new Date(dateString).toLocaleDateString();
    }
    
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error("Error formatting date:", error, "Date string was:", dateString);
    return 'Unknown date';
  }
};

const formatFullDate = (dateString: string): string => {
  try {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown date';
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error("Error formatting full date:", error, "Date string was:", dateString);
    return 'Unknown date';
  }
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

interface Trade {
  trade_id: string;
  item_offered: string;
  item_requested?: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  username: string;
  roblox_username: string;
  credibility_score: number;
  user_vouch_count?: number;
  avatar_url?: string;
  images?: { image_url: string; uploaded_at: string }[];
  user_id?: string;
  upvotes?: number;
  downvotes?: number;
  comments?: TradeComment[];
  comment_count?: number;
  vouch_count?: number;
}

interface User {
  id: string;
  username: string;
  email: string;
  robloxUsername?: string;
  role?: string;
  vouch_count?: number;
  avatar_url?: string;
}

interface TradeComment {
  comment_id: string;
  trade_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string;
  credibility_score?: number;
  avatar_url?: string;
}

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

// Add new interfaces for modals
interface ImageViewerProps {
  images: Array<{ url: string; type: 'trade' | 'forum' }>;
  currentIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onSetIndex: (index: number) => void;
}

interface TradeDetailsModalProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit: boolean;
  canDelete: boolean;
  deleteLoading: boolean;
  onReport?: () => void;
  currentUser: User | null;
  vouchLoading: string | null;
  userVouchedTrades: Set<string>;
  onVouch: (tradeId: string, tradeOwnerId: string) => void;
  setCurrentPage: (page: string) => void;
}

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
              <span className="text-sm">Image unavailable</span>
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
                className={`flex-shrink-0 w-12 h-12 rounded border-2 transition-colors ${
                  index === currentIndex
                    ? 'border-white'
                    : 'border-transparent hover:border-white/50'
                }`}
              >
                <ImageDisplay
                  src={image.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover rounded"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Report Modal Component
function ReportModal({ post, isOpen, onClose }: { post: Trade | null; isOpen: boolean; onClose: () => void }) {
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
        post_id: post.trade_id,
        post_type: 'trade',
        reason: reason.trim(),
        type: reportType
      });

      toast.success('Report submitted successfully');
      setReason('');
      setReportType('Other');
      onClose();
    } catch (error: any) {
      console.error('Failed to submit report:', error);
      if (error.message?.includes('already reported')) {
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
            Report Trade
          </DialogTitle>
          <DialogDescription>
            Help us keep the community safe by reporting inappropriate content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-type">Report Type</Label>
            <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
              <SelectTrigger>
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

          <div className="space-y-2">
            <Label htmlFor="report-reason">Reason for report *</Label>
            <Textarea
              id="report-reason"
              placeholder="Please provide details about this report..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={!reason.trim() || submitting} className="bg-red-500 hover:bg-red-600 text-white">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Flag className="w-4 h-4 mr-2" />
                Submit Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Enhanced Trade Details Modal Component with upvote/downvote and comments
function TradeDetailsModal({ trade, isOpen, onClose, onEdit, onDelete, canEdit, canDelete, deleteLoading, onReport, currentUser, vouchLoading, userVouchedTrades, onVouch, setCurrentPage }: TradeDetailsModalProps) {
  const [comments, setComments] = useState<TradeComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [votingLoading, setVotingLoading] = useState(false);

  // Define loadTradeData with useCallback to prevent unnecessary rerenders
  const loadTradeData = useCallback(async () => {
    if (!trade) return;

    try {
      setLoadingComments(true);
      console.log('Loading trade data for:', trade.trade_id);
      
      // Load comments and vote data
      const [commentsResponse, voteResponse] = await Promise.allSettled([
        apiService.getTradeComments(trade.trade_id),
        apiService.getTradeVotes(trade.trade_id)
      ]);

      // Handle comments - map backend response properly
      if (commentsResponse.status === 'fulfilled') {
        const mappedComments = commentsResponse.value.comments.map((comment: Record<string, unknown>) => {
          // Convert created_at to proper ISO string
          let createdAt = comment.created_at;
          if (createdAt && typeof createdAt === 'object' && '$date' in (createdAt as Record<string, unknown>)) {
            const dateValue = (createdAt as Record<string, unknown>).$date;
            if (typeof dateValue === 'string' || typeof dateValue === 'number') {
              createdAt = new Date(dateValue).toISOString();
            }
          } else if (createdAt && typeof createdAt === 'string') {
            // Try to ensure it's a valid date string
            const date = new Date(createdAt as string);
            if (!isNaN(date.getTime())) {
              createdAt = date.toISOString();
            }
          }

          return {
            comment_id: comment.comment_id as string,
            trade_id: trade.trade_id,
            user_id: (comment.user as Record<string, string>)._id,
            content: comment.content as string,
            created_at: createdAt as string,
            username: (comment.user as Record<string, string>).username,
            credibility_score: (comment.user as Record<string, number>).credibility_score,
            avatar_url: (comment.user as Record<string, string>).avatar_url || ''
          };
        });
        setComments(mappedComments);
      } else {
        console.error('Failed to load comments:', commentsResponse.reason);
        setComments([]);
      }

      // Handle votes
      if (voteResponse.status === 'fulfilled') {
        setUpvotes(voteResponse.value.upvotes || 0);
        setDownvotes(voteResponse.value.downvotes || 0);
        setUserVote(voteResponse.value.userVote || null);
      } else {
        console.error('Failed to load votes:', voteResponse.reason);
        setUpvotes(trade.upvotes || 0);
        setDownvotes(trade.downvotes || 0);
        setUserVote(null);
      }

    } catch (error) {
      console.error('Failed to load trade data:', error);
      toast.error('Failed to load trade data');
    } finally {
      setLoadingComments(false);
    }
  }, [trade]);

  // Load trade comments when modal opens
  useEffect(() => {
    if (isOpen && trade) {
      loadTradeData();
    }
  }, [isOpen, trade, loadTradeData]);

  const handleUpvote = async () => {
    if (!trade || votingLoading) return;

    // Check if user is authenticated
    if (!apiService.isAuthenticated()) {
      toast.error('Please log in to vote');
      return;
    }

    try {
      setVotingLoading(true);
      console.log('Upvoting trade:', trade.trade_id);
      
      const response = await apiService.voteTradePost(trade.trade_id, 'up');
      
      setUpvotes(response.upvotes);
      setDownvotes(response.downvotes);
      setUserVote(response.userVote);
      
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
      console.error('You cannot vote on your own trade:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('cannot vote on your own trade')) {
        toast.error('You cannot vote on your own trade');
      } else if (errorMessage.includes('401')) {
        toast.error('Please log in to vote');
      } else {
        toast.error('Failed to update vote');
      }
    } finally {
      setVotingLoading(false);
    }
  };

  const handleDownvote = async () => {
    if (!trade || votingLoading) return;

    // Check if user is authenticated
    if (!apiService.isAuthenticated()) {
      toast.error('Please log in to vote');
      return;
    }

    try {
      setVotingLoading(true);
      console.log('Downvoting trade:', trade.trade_id);
      
      const response = await apiService.voteTradePost(trade.trade_id, 'down');
      
      setUpvotes(response.upvotes);
      setDownvotes(response.downvotes);
      setUserVote(response.userVote);
      
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
      console.error('You cannot vote on your own trade:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('cannot vote on your own trade')) {
        toast.error('You cannot vote on your own trade');
      } else if (errorMessage.includes('401')) {
        toast.error('Please log in to vote');
      } else {
        toast.error('Failed to update vote');
      }
    } finally {
      setVotingLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !trade || submittingComment) return;

    try {
      setSubmittingComment(true);
      console.log('Adding comment to trade:', trade.trade_id);
      
      const response = await apiService.addTradeComment(trade.trade_id, newComment);
      
      // Map the response properly
      const mappedComment = {
        comment_id: response.comment.comment_id,
        trade_id: trade.trade_id,
        user_id: response.comment.user._id,
        content: response.comment.content,
        created_at: response.comment.created_at,
        username: response.comment.user.username,
        credibility_score: response.comment.user.credibility_score
      };
      
      setComments(prev => [mappedComment, ...prev]);
      setNewComment('');
      toast.success('Comment added!');
      
      // Dispatch event to update notifications
      window.dispatchEvent(new CustomEvent('notification-created'));
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!trade) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Trade Details</span>
            <Badge variant={trade.status === 'open' ? 'default' : 'secondary'}>
              {trade.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <DialogBody>
          {/* Trader Info */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Avatar className="w-12 h-12">
              <AvatarImage
                src={getAvatarUrl(trade.avatar_url)}
                className="object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '';
                }}
              />
              <AvatarFallback>{trade.username?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span 
                  className="font-medium cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => setCurrentPage(`profile-${trade.user_id}`)}
                >
                  {trade.username}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                @{trade.roblox_username}
              </div>
            </div>
            
            {/* Vote Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUpvote}
                disabled={votingLoading}
                className={`${userVote === 'up' ? 'text-green-600 bg-green-50 dark:bg-green-950' : 'text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950'} transition-colors`}
              >
                <ArrowUp className={`w-5 h-5 mr-2 ${userVote === 'up' ? 'fill-current' : ''}`} />
                {upvotes}
                {votingLoading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownvote}
                disabled={votingLoading}
                className={`${userVote === 'down' ? 'text-red-600 bg-red-50 dark:bg-red-950' : 'text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950'} transition-colors`}
              >
                <ArrowDown className={`w-5 h-5 mr-2 ${userVote === 'down' ? 'fill-current' : ''}`} />
                {downvotes}
                {votingLoading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
              </Button>
            </div>
            
            {/* Vouch Button */}
            {apiService.isAuthenticated() && currentUser && currentUser.id !== trade.user_id && trade.user_id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onVouch(trade.trade_id, trade.user_id!)}
                disabled={vouchLoading === trade.trade_id}
                className={`${userVouchedTrades.has(trade.trade_id) ? 'text-pink-600 bg-pink-50 dark:bg-pink-950' : 'text-muted-foreground hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950'} transition-colors`}
              >
                <Heart className={`w-5 h-5 mr-2 ${userVouchedTrades.has(trade.trade_id) ? 'fill-current' : ''}`} />
                {userVouchedTrades.has(trade.trade_id) ? 'Unvouch' : 'Vouch'} ({trade.vouch_count || 0})
                {vouchLoading === trade.trade_id && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
              </Button>
            )}
          </div>

          {/* Trade Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold text-green-700 dark:text-green-300 mb-2">Offering</h3>
              <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                {trade.item_offered}
              </Badge>
            </div>
            
            {trade.item_requested && (
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Looking for</h3>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {trade.item_requested}
                </Badge>
              </div>
            )}
          </div>

          {/* Description */}
          {trade.description && (
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{trade.description}</p>
            </div>
          )}

          {/* Images Grid */}
          {trade.images && trade.images.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Images ({trade.images.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {trade.images.map((image, index) => (
                  <div key={index} className="aspect-square overflow-hidden rounded-lg border cursor-pointer hover:shadow-md transition-shadow">
                    <ImageDisplay
                      src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${image.image_url.startsWith('/') ? image.image_url : `/uploads/trades/${image.image_url}`}`}
                      alt={`Trade image ${index + 1}`}
                      className="w-full h-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vote Stats */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg text-sm">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-green-600">
                <ArrowUp className="w-4 h-4" />
                <span className="font-medium">{upvotes}</span>
              </div>
              <span className="text-muted-foreground">Upvotes</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-red-600">
                <ArrowDown className="w-4 h-4" />
                <span className="font-medium">{downvotes}</span>
              </div>
              <span className="text-muted-foreground">Downvotes</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600">
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium">{comments.length}</span>
              </div>
              <span className="text-muted-foreground">Comments</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-pink-600">
                <Heart className="w-4 h-4" />
                <span className="font-medium">{trade.vouch_count || 0}</span>
              </div>
              <span className="text-muted-foreground">Vouches</span>
            </div>
          </div>

          {/* Comments Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                Comments ({comments.length})
                {loadingComments && <Loader2 className="w-4 h-4 animate-spin inline ml-2" />}
              </h3>
            </div>

            {/* Add Comment */}
            <div className="flex gap-3 p-4 border rounded-lg bg-muted/20">
              <Avatar className="w-8 h-8">
                <AvatarImage
                  src={getAvatarUrl(currentUser?.avatar_url)}
                  className="object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '';
                  }}
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                  {currentUser?.username?.[0]?.toUpperCase() || 'Y'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                  disabled={submittingComment}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submittingComment}
                >
                  {submittingComment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4 max-h-60 overflow-y-auto">
              {loadingComments ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.comment_id} className="flex gap-3 p-3 border rounded-lg">
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        src={getAvatarUrl(comment.avatar_url)}
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '';
                        }}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
                        {comment.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="font-medium text-sm cursor-pointer hover:text-primary transition-colors"
                          onClick={() => setCurrentPage(`profile-${comment.user_id}`)}
                        >
                          {comment.username}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(toISO(comment.created_at))}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No comments yet. Be the first to comment!</p>
                </div>
              )}
            </div>
          </div>

          {/* Trade Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg text-sm">
            <div>
              <span className="text-muted-foreground">Posted:</span>
              <div className="font-medium">{formatFullDate(toISO(trade.created_at))}</div>
              <div className="text-xs text-muted-foreground">{formatDate(toISO(trade.created_at))}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Trade ID:</span>
              <div className="font-medium font-mono">{trade.trade_id.slice(-8)}</div>
            </div>
            {trade.updated_at && trade.updated_at !== trade.created_at && (
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <div className="font-medium">{formatFullDate(toISO(trade.updated_at))}</div>
                <div className="text-xs text-muted-foreground">{formatDate(toISO(trade.updated_at))}</div>
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          {/* Report Button - Always visible for logged-in users */}
          {apiService.isAuthenticated() && onReport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReport}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Flag className="w-4 h-4 mr-2" />
              Report
            </Button>
          )}

          {canEdit ? (
            <>
              <Button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white" onClick={() => setCurrentPage(`profile-${trade.user_id}`)}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Message
              </Button>
              <Button variant="outline" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              
              {canDelete && (
                <Button 
                  variant="outline" 
                  onClick={onDelete}
                  disabled={deleteLoading}
                  className="text-red-600 hover:text-red-700"
                >
                  {deleteLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white" onClick={() => setCurrentPage(`profile-${trade.user_id}`)}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Contact Trader
              </Button>
              {canDelete && (
                <Button 
                  variant="outline" 
                  onClick={onDelete}
                  disabled={deleteLoading}
                  className="text-red-600 hover:text-red-700"
                >
                  {deleteLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TradingHub() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  // State for pagination - setCurrentPage is used in the loadTrades dependency array
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [newTrade, setNewTrade] = useState({
    itemOffered: '',
    itemRequested: '',
    description: ''
  });

  const [editTrade, setEditTrade] = useState({
    itemOffered: '',
    itemRequested: '',
    description: ''
  });

  // Image upload states (for creating/editing trades)
  const [uploadSelectedImages, setUploadSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [editUploadSelectedImages, setEditUploadSelectedImages] = useState<File[]>([]);
  const [editImagePreviewUrls, setEditImagePreviewUrls] = useState<string[]>([]);

  // Modal states (for viewing images and trade details)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isTradeDetailsOpen, setIsTradeDetailsOpen] = useState(false);
  // Post modal (Dashboard-style) state
  const [selectedPostForModal, setSelectedPostForModal] = useState<PostModalPost | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalSelectedImages, setModalSelectedImages] = useState<{ image_url: string; uploaded_at: string }[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);

  // Report modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Vouch state
  const [vouchLoading, setVouchLoading] = useState<string | null>(null);
  const [userVouchedTrades, setUserVouchedTrades] = useState<Set<string>>(new Set());

  const loadTrades = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params: Record<string, string | number> = { page: currentPage, limit: 10 };
      if (filterCategory !== 'all') params.status = filterCategory;

      const response = await apiService.getTrades(params);
      
      // Validate that we have trades data
      if (!response || !response.trades || !Array.isArray(response.trades)) {
        console.error('Invalid response format from getTrades:', response);
        throw new Error('Invalid response format from server');
      }

      // Define a more specific type for trade object
      interface TradeData {
        trade_id?: string;
        _id?: string;
        item_offered?: string;
        item_requested?: string;
        description?: string;
        status?: string;
        created_at?: string | Date;
        createdAt?: string | Date;
        updated_at?: string | Date;
        updatedAt?: string | Date;
        user?: {
          username?: string;
          roblox_username?: string;
          _id?: string;
          vouch_count?: number;
          credibility_score?: number;
          avatar_url?: string;
        };
        username?: string;
        roblox_username?: string;
        user_id?: string;
        credibility_score?: number;
        images?: unknown[];
        upvotes?: number | string[] | null;
        downvotes?: number | string[] | null;
        comment_count?: number;
        vouch_count?: number;
      }
      
      const mappedTrades = response.trades.map((trade: TradeData) => {
        try {
          // Safely extract created_at and updated_at
          const createdAtValue = trade.created_at || trade.createdAt;
          const updatedAtValue = trade.updated_at || trade.updatedAt;
          
          // Handle images safely
          // Define the image type structure
          type TradeImage = {
            image_url: string;
            uploaded_at: string;
          };
          
          let processedImages: TradeImage[] = [];
          if (Array.isArray(trade.images)) {
            processedImages = trade.images.map((img: unknown) => {
              try {
                if (typeof img === 'string') {
                  // Handle case where the image is just a string path
                  return { 
                    image_url: img.startsWith('/') ? img : `/uploads/trades/${img}`, 
                    uploaded_at: new Date().toISOString() 
                  };
                } else if (img && typeof img === 'object') {
                  const imgObj = img as Record<string, unknown>;
                  
                  // Extract the image URL with proper formatting
                  let imageUrl = '';
                  if (typeof imgObj.image_url === 'string') {
                    imageUrl = imgObj.image_url.startsWith('/') 
                      ? imgObj.image_url 
                      : `/uploads/trades/${imgObj.image_url}`;
                  } else if (typeof imgObj.filename === 'string') {
                    imageUrl = `/uploads/trades/${imgObj.filename}`;
                  } else if (img) {
                    // Last resort fallback
                    imageUrl = `/uploads/trades/${String(img).split('/').pop() || 'unknown'}`;
                  }
                  
                  // Extract the uploaded date
                  const uploadedAt = toISO(imgObj.uploaded_at);
                  
                  return {
                    image_url: imageUrl,
                    uploaded_at: uploadedAt
                  };
                }
                return {
                  image_url: '/uploads/trades/placeholder.png',
                  uploaded_at: new Date().toISOString()
                };
              } catch (imgErr) {
                console.error('Error processing image:', imgErr, img);
                return {
                  image_url: '/uploads/trades/placeholder.png',
                  uploaded_at: new Date().toISOString()
                };
              }
            });
          }
          
          return {
            trade_id: trade.trade_id as string || trade._id as string,
            item_offered: trade.item_offered as string || 'Unknown Item',
            item_requested: trade.item_requested as string || '',
            description: trade.description as string || '',
            status: trade.status as string || 'unknown',
            created_at: toISO(createdAtValue),
            updated_at: toISO(updatedAtValue),
            username: (trade.user?.username as string) || (trade.username as string) || 'Unknown User',
            roblox_username: (trade.user?.roblox_username as string) || (trade.roblox_username as string) || '',
            credibility_score: (trade.user?.credibility_score as number) ?? (trade.credibility_score as number) ?? 0,
            user_vouch_count: (trade.user?.vouch_count as number) ?? 0,
            avatar_url: (trade.user?.avatar_url as string) || '',
            user_id: (trade.user?._id as string) || (trade.user_id as string) || '',
            images: processedImages,
            upvotes: Array.isArray(trade.upvotes) ? trade.upvotes.length : (trade.upvotes as number) || 0,
            downvotes: Array.isArray(trade.downvotes) ? trade.downvotes.length : (trade.downvotes as number) || 0,
            comment_count: trade.comment_count as number || 0,
            vouch_count: trade.vouch_count as number || 0
          };
        } catch (tradeErr) {
          console.error('Error processing trade:', tradeErr, trade);
          // Return a minimal valid trade object as fallback
          return {
            trade_id: (trade.trade_id as string) || (trade._id as string) || 'unknown-id',
            item_offered: 'Error loading item',
            item_requested: '',
            description: '',
            status: 'error',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            username: 'Unknown',
            roblox_username: '',
            user_vouch_count: 0,
            user_id: '',
            images: [] as {image_url: string, uploaded_at: string}[],
            upvotes: 0,
            downvotes: 0,
            comment_count: 0,
            vouch_count: 0
          };
        }
      });

      setTrades(mappedTrades);
      if (response.pagination) setTotalPages(response.pagination.totalPages || 1);
    } catch (err) {
      console.error('Error loading trades:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trades');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterCategory]);

  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { setCurrentPage: setAppCurrentPage } = useApp();

  // Load current user data periodically to keep vouch count updated
  useEffect(() => {
    if (!isLoggedIn || !apiService.isAuthenticated()) return;

    const loadCurrentUser = async () => {
      try {
        const me = await apiService.getCurrentUser();
        setCurrentUser({
          id: me.id,
          username: me.username,
          email: me.email,
          robloxUsername: me.roblox_username,
          role: me.role,
          vouch_count: me.vouch_count,
          avatar_url: me.avatar_url
        });
      } catch (err) {
        console.error('Failed to refresh current user:', err);
        // Don't show error toast for background refresh
      }
    };

    // Load immediately
    loadCurrentUser();

    // Set up periodic refresh every 30 seconds
    const interval = setInterval(loadCurrentUser, 30000);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // Load trades only when authenticated
  useEffect(() => {
    if (authLoading || !isLoggedIn) return;
    loadTrades();
  }, [authLoading, isLoggedIn, loadTrades]);

  const categories = [
    { value: 'all', label: 'All Trades' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  // Update image handling functions to use the renamed variables
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + uploadSelectedImages.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    // Validate file types and sizes
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
      
      // Create preview URLs using URL.createObjectURL for better performance
      const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
      setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => {
      const newUrls = prev.filter((_, i) => i !== index);
      // Revoke the URL of the removed image to prevent memory leaks
      URL.revokeObjectURL(prev[index]);
      return newUrls;
    });
  };

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    // Validate file types and sizes
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
      // Clean up existing blob URLs to prevent memory leaks (only revoke blob URLs)
      editImagePreviewUrls.forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      
      // Replace all images instead of adding to existing ones
      setEditUploadSelectedImages(validFiles);
      
      // Create preview URLs using URL.createObjectURL for better performance
      const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
      setEditImagePreviewUrls(newPreviewUrls);
      
      // Reset the file input to allow selecting the same files again
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleRemoveEditImage = (index: number) => {
    setEditUploadSelectedImages(prev => prev.filter((_, i) => i !== index));
    setEditImagePreviewUrls(prev => {
      const newUrls = prev.filter((_, i) => i !== index);
      // Only revoke object URLs (blob URLs), not server URLs
      const urlToRemove = prev[index];
      if (urlToRemove && urlToRemove.startsWith('blob:')) {
        URL.revokeObjectURL(urlToRemove);
      }
      return newUrls;
    });
  };

  // Update modal functions to use the renamed variables
  const handleTradeClick = (trade: Trade) => {
    setSelectedTrade(trade);
    setIsTradeDetailsOpen(true);
  };

  // Map a Trade to the PostModalPost shape
  const mapTradeToPost = (trade: Trade): PostModalPost => ({
    id: trade.trade_id,
    type: 'trade',
    title: `Trading ${trade.item_offered}${trade.item_requested ? ` for ${trade.item_requested}` : ''}`,
    description: trade.description || '',
    user: {
      id: trade.user_id || '',
      username: trade.username,
      robloxUsername: trade.roblox_username,
      rating: Math.min(5, Math.max(1, Math.floor((trade.credibility_score || 0) / 20))),
      vouchCount: trade.vouch_count || 0,
      verified: false,
      moderator: false,
      avatar_url: trade.avatar_url || ''
    },
    timestamp: trade.created_at,
    images: (trade.images || []).map(img => ({ url: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${img.image_url.startsWith('/') ? img.image_url : `/uploads/trades/${img.image_url}`}`, type: 'trade' })),
    comments: trade.comment_count || 0,
    upvotes: trade.upvotes || 0,
    downvotes: trade.downvotes || 0
  });

  const openPostModal = (trade: Trade) => {
    setSelectedPostForModal(mapTradeToPost(trade));
    setIsPostModalOpen(true);
  };

  const handleImageClick = (images: { image_url: string; uploaded_at: string }[], index: number) => {
    setModalSelectedImages(images);
    setCurrentImageIndex(index);
    setIsImageModalOpen(true);
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % modalSelectedImages.length);
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + modalSelectedImages.length) % modalSelectedImages.length);
  };

  const handleEditFromModal = () => {
    if (selectedTrade) {
      setIsTradeDetailsOpen(false);
      handleEditTrade(selectedTrade);
    }
  };

  const handleDeleteFromModal = () => {
    if (selectedTrade) {
      setIsTradeDetailsOpen(false);
      handleDeleteTrade(selectedTrade.trade_id, selectedTrade.item_offered);
    }
  };

  const canEditTrade = (trade: Trade): boolean => {
    if (!currentUser) return false;
    return currentUser.id === trade.user_id || 
           currentUser.role === 'admin' || 
           currentUser.role === 'moderator';
  };

  const canDeleteTrade = (trade: Trade): boolean => {
    if (!currentUser) return false;
    return currentUser.id === trade.user_id || 
           currentUser.role === 'admin' || 
           currentUser.role === 'moderator';
  };

  const handleDeleteTrade = async (tradeId: string, tradeTitle: string) => {
    const confirmed = await alertService.confirm(`Are you sure you want to delete the trade "${tradeTitle}"?`);
    if (!confirmed) return;

    try {
      setDeleteLoading(tradeId);
      await apiService.deleteTrade(tradeId);
      
      setTrades(prev => prev.filter(trade => trade.trade_id !== tradeId));
      
      toast.success('Trade deleted successfully');
    } catch (error) {
      console.error('Failed to delete trade:', error);
      toast.error('Failed to delete trade');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleReopenTrade = async (tradeId: string, tradeTitle: string) => {
    try {
      setStatusUpdateLoading(tradeId);
      await apiService.updateTradeStatus(tradeId, 'open');
      
      // Update the trade in the local state
      setTrades(prev => prev.map(trade => 
        trade.trade_id === tradeId 
          ? { ...trade, status: 'open' }
          : trade
      ));
      
      toast.success(`Trade "${tradeTitle}" reopened!`);
    } catch (error) {
      console.error('Failed to reopen trade:', error);
      toast.error('Failed to reopen trade');
    } finally {
      setStatusUpdateLoading(null);
    }
  };

  const handleReportTrade = () => {
    setIsReportModalOpen(true);
  };

  const handleVouchTrade = async (tradeId: string, tradeOwnerId: string) => {
    if (!currentUser) {
      toast.error('Please log in to vouch');
      return;
    }

    // Check if user is trying to vouch for their own trade
    if (currentUser.id === tradeOwnerId) {
      toast.error('You cannot vouch for your own trade');
      return;
    }

    const hasVouched = userVouchedTrades.has(tradeId);

    try {
      setVouchLoading(tradeId);

      if (hasVouched) {
        // Unvouch
        await apiService.unvouchForTrade(tradeId);

        // Update local state
        setUserVouchedTrades(prev => {
          const newSet = new Set(prev);
          newSet.delete(tradeId);
          return newSet;
        });
        setTrades(prev => prev.map(trade =>
          trade.trade_id === tradeId
            ? { ...trade, vouch_count: Math.max((trade.vouch_count || 0) - 1, 0) }
            : trade
        ));

        toast.success('Vouch removed successfully!');
      } else {
        // Vouch
        await apiService.vouchForTrade(tradeId);

        // Update local state
        setUserVouchedTrades(prev => new Set(prev).add(tradeId));
        setTrades(prev => prev.map(trade =>
          trade.trade_id === tradeId
            ? { ...trade, vouch_count: (trade.vouch_count || 0) + 1 }
            : trade
        ));

        toast.success('Vouch added successfully!');
      }
    } catch (error) {
      console.error('Failed to update vouch:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update vouch';
      toast.error(errorMessage);
    } finally {
      setVouchLoading(null);
    }

    // Refresh trades after a short delay to ensure any server-side updates are reflected
    setTimeout(() => {
      loadTrades();
    }, 1000);
  };

  // Load user's vouched trades when component mounts
  useEffect(() => {
    const loadUserVouches = async () => {
      if (!currentUser) return;

      try {
        // Get all trades and check which ones the user has vouched for
        const vouchedTradeIds = new Set<string>();
        for (const trade of trades) {
          try {
            const response = await apiService.hasUserVouchedForTrade(trade.trade_id);
            if (response.hasVouched) {
              vouchedTradeIds.add(trade.trade_id);
            }
          } catch (error) {
            // Ignore errors for individual trades
            console.warn(`Could not check vouch status for trade ${trade.trade_id}:`, error);
          }
        }
        setUserVouchedTrades(vouchedTradeIds);
      } catch (error) {
        console.error('Failed to load user vouches:', error);
      }
    };

    if (currentUser && trades.length > 0) {
      loadUserVouches();
    }
  }, [currentUser, trades]);



  // Update create trade function
  const handleCreateTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!newTrade.itemOffered.trim()) {
      setError('Item offered is required');
      return;
    }
    if (!newTrade.itemRequested.trim()) {
      setError('Item requested is required');
      return;
    }
    
    try {
      setCreateLoading(true);
      setError('');
      
      console.log('Creating trade with images:', uploadSelectedImages.length);
      
      await apiService.createTrade({
        itemOffered: newTrade.itemOffered,
        itemRequested: newTrade.itemRequested,
        description: newTrade.description
      }, uploadSelectedImages);
      
      // Reset form
      setIsCreateDialogOpen(false);
      setNewTrade({
        itemOffered: '',
        itemRequested: '',
        description: ''
      });
      // Clean up object URLs to prevent memory leaks
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
      setUploadSelectedImages([]);
      setImagePreviewUrls([]);
      
      // Reload trades to show the new one
      await loadTrades();
      
      console.log('Trade created successfully');
      toast.success('Trade created successfully! 🎉', {
        description: 'Your trade has been posted and is now visible to other users.'
      });
    } catch (err) {
      console.error('Failed to create trade:', err);
      let errorMessage = 'Failed to create trade';
      
      if (err instanceof Error) {
        if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (err.message.includes('413')) {
          errorMessage = 'Images are too large. Please use smaller images (max 5MB each).';
        } else if (err.message.includes('400')) {
          errorMessage = 'Invalid data. Please check all fields and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast.error('Failed to create trade', {
        description: errorMessage
      });
    } finally {
      setCreateLoading(false);
    }
  };

  // Update edit trade function
  const handleEditTrade = (trade: Trade) => {
    if (!currentUser || currentUser.id !== trade.user_id) {
      toast.error('You can only edit your own trades');
      return;
    }
    
    // Clean up any existing object URLs before opening edit dialog (only revoke blob URLs)
    editImagePreviewUrls.forEach(url => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    
    setEditingTrade(trade);
    setEditTrade({
      itemOffered: trade.item_offered,
      itemRequested: trade.item_requested || '',
      description: trade.description || ''
    });
    
    // Load existing images for preview (these are server URLs, not File objects)
    if (trade.images && trade.images.length > 0) {
      const existingImageUrls = trade.images.map(img => 
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${img.image_url.startsWith('/') ? img.image_url : `/uploads/trades/${img.image_url}`}`
      );
      setEditImagePreviewUrls(existingImageUrls);
      // Note: existing images are not File objects, so editUploadSelectedImages stays empty
      setEditUploadSelectedImages([]);
    } else {
      setEditUploadSelectedImages([]);
      setEditImagePreviewUrls([]);
    }
    
    setIsEditDialogOpen(true);
  };

  const handleUpdateTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingTrade) return;
    
    // Validation
    if (!editTrade.itemOffered.trim()) {
      setError('Item offered is required');
      return;
    }
    
    try {
      setEditLoading(true);
      setError('');
      
      await apiService.updateTrade(editingTrade.trade_id, {
        itemOffered: editTrade.itemOffered,
        itemRequested: editTrade.itemRequested,
        description: editTrade.description
      }, editUploadSelectedImages);
      
      // Reset form
      setIsEditDialogOpen(false);
      setEditingTrade(null);
      setEditTrade({
        itemOffered: '',
        itemRequested: '',
        description: ''
      });
      // Clean up object URLs to prevent memory leaks (only revoke blob URLs, not server URLs)
      editImagePreviewUrls.forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      setEditUploadSelectedImages([]);
      setEditImagePreviewUrls([]);
      
      // Reload trades to show the updated one
      await loadTrades();
      
      toast.success('Trade updated successfully! 🎉', {
        description: 'Your trade has been updated and is now visible to other users.'
      });
    } catch (err) {
      console.error('Failed to update trade:', err);
      let errorMessage = 'Failed to update trade';
      
      if (err instanceof Error) {
        if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (err.message.includes('413')) {
          errorMessage = 'Images are too large. Please use smaller images (max 5MB each).';
        } else if (err.message.includes('400')) {
          errorMessage = 'Invalid data. Please check all fields and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast.error('Failed to update trade', {
        description: errorMessage
      });
    } finally {
      setEditLoading(false);
    }
  };

  const filteredTrades = trades.filter((trade) => {
    const matchesSearch = searchTerm === '' || 
      trade.item_offered?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.item_requested?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Update the image upload sections in the JSX to use the renamed variables
  return (
    <div className="flex-1 overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Trading Hub</h1>
            <p className="text-muted-foreground">Discover and create trades with the community</p>
            {currentUser && (
              <div className="flex items-center gap-2 mt-2">
              </div>
            )}
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Trade
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Trade</DialogTitle>
                <DialogDescription>
                  Fill out the details for your trade listing
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateTrade} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="item-offered">What you're offering *</Label>
                  <Input
                    id="item-offered"
                    placeholder="Enter the item you're trading away"
                    value={newTrade.itemOffered}
                    onChange={(e) => setNewTrade(prev => ({ ...prev, itemOffered: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="item-requested">What you want (optional)</Label>
                  <Input
                    id="item-requested"
                    placeholder="Enter what you're looking for"
                    value={newTrade.itemRequested}
                    onChange={(e) => setNewTrade(prev => ({ ...prev, itemRequested: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="trade-description">Description (optional)</Label>
                  <Textarea
                    id="trade-description"
                    placeholder="Add additional details about your trade..."
                    value={newTrade.description}
                    onChange={(e) => setNewTrade(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-[100px]"
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
                        const input = document.getElementById('image-upload') as HTMLInputElement;
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
                      id="image-upload"
                      disabled={uploadSelectedImages.length >= 5}
                    />
                    <label
                      htmlFor="image-upload"
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
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {imagePreviewUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
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
                  <Button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white" disabled={createLoading}>
                    {createLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Trade'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          
          {/* Edit Trade Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Trade</DialogTitle>
                <DialogDescription>
                  Update the details for your trade listing
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleUpdateTrade} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-item-offered">What you're offering *</Label>
                  <Input
                    id="edit-item-offered"
                    placeholder="Enter the item you're trading away"
                    value={editTrade.itemOffered}
                    onChange={(e) => setEditTrade(prev => ({ ...prev, itemOffered: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-item-requested">What you want (optional)</Label>
                  <Input
                    id="edit-item-requested"
                    placeholder="Enter what you're looking for"
                    value={editTrade.itemRequested}
                    onChange={(e) => setEditTrade(prev => ({ ...prev, itemRequested: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-trade-description">Description (optional)</Label>
                  <Textarea
                    id="edit-trade-description"
                    placeholder="Add additional details about your trade..."
                    value={editTrade.description}
                    onChange={(e) => setEditTrade(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-[100px]"
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
                        // Create a synthetic event
                        const syntheticEvent = {
                          target: { files: files }
                        } as unknown as React.ChangeEvent<HTMLInputElement>;
                        handleEditImageSelect(syntheticEvent);
                      }
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleEditImageSelect}
                      className="hidden"
                      id="edit-image-upload"
                      disabled={editImagePreviewUrls.length >= 5}
                    />
                    <label
                      htmlFor="edit-image-upload"
                      className={`cursor-pointer flex flex-col items-center gap-2 ${
                        editImagePreviewUrls.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {editImagePreviewUrls.length >= 5 
                          ? 'Maximum 5 images reached' 
                          : 'Click to upload images or drag and drop'
                        }
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        PNG, JPG, GIF up to 5MB each • {editImagePreviewUrls.length}/5 selected
                      </span>
                    </label>
                  </div>

                  {/* Edit Image Previews */}
                  {editImagePreviewUrls.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {editImagePreviewUrls.length} image{editImagePreviewUrls.length !== 1 ? 's' : ''} selected
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {editImagePreviewUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveEditImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
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
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)} 
                    disabled={editLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white" 
                    disabled={editLoading}
                  >
                    {editLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Trade'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-border p-4 bg-muted/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search trades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="value-high">Highest Value</SelectItem>
              <SelectItem value="value-low">Lowest Value</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-background p-4 border-b border-border">
        <div className="flex items-center justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span>{filteredTrades.length} Trades Found</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Page {currentPage} of {totalPages}</span>
          </div>
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
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Loading trades...</span>
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center py-12">
              <AlertCircle className="w-8 h-8 text-red-500 mr-2" />
              <span className="text-red-500">{error}</span>
            </div>
          )}
          
          {!loading && !error && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTrades.map((trade) => (
                <Card 
                  key={trade.trade_id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => openPostModal(trade)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage
                            src={getAvatarUrl(trade.avatar_url)}
                            className="object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '';
                            }}
                          />
                          <AvatarFallback>{trade.username?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span 
                              className="font-medium text-sm cursor-pointer hover:text-blue-600 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAppCurrentPage(`profile-${trade.user_id}`);
                              }}
                            >
                              {trade.username}
                            </span>

                            <Badge variant="secondary" className="text-xs bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300">
                              <Heart className="w-3 h-3 mr-1" />
                              {trade.user_vouch_count || 0}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            @{trade.roblox_username}
                          </div>
                        </div>
                      </div>
                      <Badge className={`${trade.status === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 
                        trade.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' : 
                        trade.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 
                        'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'}`}>
                        {trade.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* Trade Images */}
                    {trade.images && trade.images.length > 0 && (
                      <div className="relative" onClick={(e) => {
                        e.stopPropagation();
                        handleImageClick(trade.images!, 0);
                      }}>
                        <ImageDisplay
                          src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${trade.images[0].image_url.startsWith('/') ? trade.images[0].image_url : `/uploads/trades/${trade.images[0].image_url}`}`}
                          alt={`${trade.item_offered} - Trade item`}
                          className="w-full h-32 object-cover rounded-lg hover:opacity-90 transition-opacity"
                        />
                        {trade.images.length > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                            <Eye className="w-3 h-3 inline mr-1" />
                            {trade.images.length} images
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center opacity-0 hover:opacity-100">
                          <Eye className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                        Trading: {trade.item_offered}
                      </h3>
                      {trade.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {trade.description}
                        </p>
                      )}
                    </div>

                    {/* Trade Items */}
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-muted-foreground mb-1 block">Offering:</span>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                          {trade.item_offered}
                        </Badge>
                      </div>

                      {trade.item_requested && (
                        <>
                          <div className="flex items-center justify-center">
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </div>

                          <div>
                            <span className="text-xs text-muted-foreground mb-1 block">Looking for:</span>
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {trade.item_requested}
                            </Badge>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatDate(toISO(trade.created_at))}</span>
                        <span>ID: {trade.trade_id.slice(-6)}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-2">
                    {/* Trade Stats */}
                    <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground w-full">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-green-600">
                          <ArrowUp className="w-3 h-3" />
                          <span>{trade.upvotes || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-red-600">
                          <ArrowDown className="w-3 h-3" />
                          <span>{trade.downvotes || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-pink-600">
                          <Heart className="w-3 h-3" />
                          <span>{trade.vouch_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          <span>{trade.comment_count || 0}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>View Details</span>
                      </div>
                    </div>

                    {/* Actions - Keep stopPropagation on buttons */}
                    <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                      {canEditTrade(trade) ? (
                        <>
                          {/* Show different buttons based on trade status */}
                          {trade.status === 'open' || trade.status === 'in_progress' ? (
                            <>
                              <Button size="sm" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white" onClick={() => setAppCurrentPage(`profile-${trade.user_id}`)}>
                                <MessageSquare className="w-3 h-3 mr-1" />
                                Message
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => handleEditTrade(trade)}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </>
                          ) : trade.status === 'completed' ? (
                            <>
                              <Button size="sm" className="flex-1 bg-gray-500 hover:bg-gray-600 text-white" disabled>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Completed
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => handleReopenTrade(trade.trade_id, trade.item_offered)}
                                disabled={statusUpdateLoading === trade.trade_id}
                                title="Reopen trade"
                              >
                                {statusUpdateLoading === trade.trade_id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                )}
                                {statusUpdateLoading === trade.trade_id ? 'Reopening...' : 'Reopen'}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => handleEditTrade(trade)}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white" onClick={() => setAppCurrentPage(`profile-${trade.user_id}`)}>
                                <MessageSquare className="w-3 h-3 mr-1" />
                                Message
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => handleTradeClick(trade)}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View Details
                              </Button>
                            </>
                          )}
                          
                          {canDeleteTrade(trade) && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteTrade(trade.trade_id, trade.item_offered)}
                              disabled={deleteLoading === trade.trade_id}
                            >
                              {deleteLoading === trade.trade_id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3 mr-1" />
                              )}
                              {deleteLoading === trade.trade_id ? 'Deleting...' : 'Delete'}
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <Button size="sm" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white" onClick={() => setAppCurrentPage(`profile-${trade.user_id}`)}>
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Message
                          </Button>
                          {canDeleteTrade(trade) && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteTrade(trade.trade_id, trade.item_offered)}
                              disabled={deleteLoading === trade.trade_id}
                            >
                              {deleteLoading === trade.trade_id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3 mr-1" />
                              )}
                              {deleteLoading === trade.trade_id ? 'Deleting...' : 'Delete'}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {!loading && !error && filteredTrades.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No trades found</h3>
                  <p>Try adjusting your search or filter criteria.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <TradeDetailsModal
        trade={selectedTrade}
        isOpen={isTradeDetailsOpen}
        onClose={() => setIsTradeDetailsOpen(false)}
        onEdit={handleEditFromModal}
        onDelete={handleDeleteFromModal}
        canEdit={selectedTrade ? canEditTrade(selectedTrade) : false}
        canDelete={selectedTrade ? canDeleteTrade(selectedTrade) : false}
        deleteLoading={selectedTrade ? deleteLoading === selectedTrade.trade_id : false}
        onReport={handleReportTrade}
        currentUser={currentUser}
        vouchLoading={vouchLoading}
        userVouchedTrades={userVouchedTrades}
        onVouch={handleVouchTrade}
        setCurrentPage={setAppCurrentPage}
      />

      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <ImageViewer
            images={modalSelectedImages.map(img => ({
              url: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${img.image_url.startsWith('/') ? img.image_url : `/uploads/trades/${img.image_url}`}`,
              type: 'trade' as const
            }))}
            currentIndex={currentImageIndex}
            onNext={handleNextImage}
            onPrevious={handlePreviousImage}
            onSetIndex={setCurrentImageIndex}
          />
        </DialogContent>
      </Dialog>

      {/* Dashboard-style Post Modal (reused from Dashboard) */}
      <PostModal
        post={selectedPostForModal}
        isOpen={isPostModalOpen}
        onClose={() => { setIsPostModalOpen(false); setSelectedPostForModal(null); }}
        onUserClick={(userId: string) => setAppCurrentPage(`profile-${userId}`)}
        onReportClick={() => setIsReportModalOpen(true)}
      />

      <ReportModal
        post={selectedTrade}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 mb-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || loading}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Show current page and nearby pages
              let pageToShow: number;
              if (totalPages <= 5) {
                pageToShow = i + 1;
              } else if (currentPage <= 3) {
                pageToShow = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageToShow = totalPages - 4 + i;
              } else {
                pageToShow = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={i}
                  variant={currentPage === pageToShow ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageToShow)}
                  disabled={loading}
                  className={`w-9 h-9 p-0 ${currentPage === pageToShow ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}`}
                >
                  {pageToShow}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || loading}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}