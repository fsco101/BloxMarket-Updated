import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { apiService } from '../services/api';
import { 
  Plus, 
  Search, 
  Heart, 
  Star, 
  MessageSquare, 
  Clock,
  DollarSign,
  TrendingUp,
  Filter,
  Loader2,
  Edit,
  Trash2,
  Send,
  AlertCircle,
  Eye,
  X,
  ArrowUp,
  ArrowDown,
  Flag
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth, useApp } from '../App';

interface WishlistItem {
  wishlist_id: string;
  item_name: string;
  description: string;
  max_price: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  updated_at?: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  watchers?: number;
  comment_count?: number;
  upvotes?: number;
  downvotes?: number;
  images?: { filename: string; originalName?: string }[]; // Add this line
}

interface WishlistComment {
  comment_id: string;
  wishlist_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string;
  avatar_url?: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  robloxUsername?: string;
  role?: string;
  avatar_url?: string;
}

interface WishlistDetailsModalProps {
  wishlist: WishlistItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit: boolean;
  canDelete: boolean;
  deleteLoading: boolean;
  onReport?: (wishlist: WishlistItem) => void;
  onUserClick?: (userId: string) => void;
  currentUser?: User | null;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reportData: { reason: string; description: string; wishlistId: string }) => Promise<void>;
  wishlistId: string;
}

// Date formatting helper
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
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

  // Enhanced Wishlist Details Modal Component with upvote/downvote and comments
function WishlistDetailsModal({ 
  wishlist, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete, 
  canEdit, 
  canDelete, 
  deleteLoading,
  onReport,
  onUserClick,
  currentUser
}: WishlistDetailsModalProps) {
  const [comments, setComments] = useState<WishlistComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [votingLoading, setVotingLoading] = useState(false);
  const [imageDeleteLoading, setImageDeleteLoading] = useState<string | null>(null);  // Load wishlist comments and votes when modal opens
  const loadWishlistData = useCallback(async () => {
    if (!wishlist) return;

    try {
      setLoadingComments(true);
      console.log('Loading wishlist data for:', wishlist.wishlist_id);
      
      // Load comments and vote data
      const [commentsResponse, voteResponse] = await Promise.allSettled([
        apiService.getWishlistComments(wishlist.wishlist_id),
        apiService.getWishlistVotes(wishlist.wishlist_id)
      ]);

      // Handle comments
      if (commentsResponse.status === 'fulfilled') {
        console.log('Comments response:', commentsResponse.value);
        if (commentsResponse.value?.comments && Array.isArray(commentsResponse.value.comments)) {
          setComments(commentsResponse.value.comments.map((comment: any) => ({
            ...comment,
            avatar_url: comment.avatar_url || ''
          })));
        } else if (Array.isArray(commentsResponse.value)) {
          // If the response is directly an array of comments
          setComments(commentsResponse.value.map((comment: any) => ({
            ...comment,
            avatar_url: comment.avatar_url || ''
          })));
        } else {
          console.warn('Unexpected comments response structure:', commentsResponse.value);
          setComments([]);
        }
      } else {
        console.error('Failed to load comments:', commentsResponse.reason);
        setComments([]);
      }

      // Handle votes
      if (voteResponse.status === 'fulfilled') {
        console.log('Votes response:', voteResponse.value);
        setUpvotes(voteResponse.value?.upvotes || 0);
        setDownvotes(voteResponse.value?.downvotes || 0);
        setUserVote(voteResponse.value?.userVote || null);
      } else {
        console.error('Failed to load votes:', voteResponse.reason);
        setUpvotes(wishlist.upvotes || 0);
        setDownvotes(wishlist.downvotes || 0);
        setUserVote(null);
      }

    } catch (error) {
      console.error('Failed to load wishlist data:', error);
      toast.error('Failed to load wishlist data');
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, [wishlist]);

  useEffect(() => {
    if (isOpen && wishlist) {
      loadWishlistData();
    }
  }, [isOpen, wishlist, loadWishlistData]);

  const handleUpvote = async () => {
    if (!wishlist || votingLoading) return;

    try {
      setVotingLoading(true);
      console.log('Upvoting wishlist:', wishlist.wishlist_id);
      
      const response = await apiService.voteWishlist(wishlist.wishlist_id, 'up');
      
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
    } catch (error) {
      console.error('Failed to upvote:', error);
      toast.error('Failed to update vote');
    } finally {
      setVotingLoading(false);
    }
  };

  const handleDownvote = async () => {
    if (!wishlist || votingLoading) return;

    try {
      setVotingLoading(true);
      console.log('Downvoting wishlist:', wishlist.wishlist_id);
      
      const response = await apiService.voteWishlist(wishlist.wishlist_id, 'down');
      
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
    } catch (error) {
      console.error('Failed to downvote:', error);
      toast.error('Failed to update vote');
    } finally {
      setVotingLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !wishlist || submittingComment) return;

    try {
      setSubmittingComment(true);
      console.log('Adding comment to wishlist:', wishlist.wishlist_id);
      
      const response = await apiService.addWishlistComment(wishlist.wishlist_id, newComment);
      
      // Check if the response has the comment structure we expect
      if (response && response.content) {
        setComments(prev => [response, ...prev]);
        setNewComment('');
        toast.success('Comment added!');
      } else {
        console.error('Invalid comment response:', response);
        toast.error('Unexpected server response');
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };
  
  const handleDeleteImage = async (filename: string) => {
    if (!wishlist || !canEdit) return;
    
    if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return;
    }
    
    try {
      setImageDeleteLoading(filename);
      console.log('Deleting image:', filename);
      
      await apiService.deleteWishlistImage(wishlist.wishlist_id, filename);
      
      // Update the wishlist in state
      if (wishlist.images) {
        wishlist.images = wishlist.images.filter(img => img.filename !== filename);
      }
      
      toast.success('Image deleted!');
    } catch (error) {
      console.error('Failed to delete image:', error);
      toast.error('Failed to delete image');
    } finally {
      setImageDeleteLoading(null);
    }
  };

  if (!wishlist) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            <span>{wishlist.item_name}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Author Info */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Avatar className="w-12 h-12">
              <AvatarImage src={getAvatarUrl(wishlist.avatar_url)} />
              <AvatarFallback>{wishlist.username?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span 
                  className="font-medium cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => onUserClick && onUserClick(wishlist.user_id)}
                >
                  {wishlist.username}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Posted on {new Date(wishlist.created_at).toLocaleDateString()} at {new Date(wishlist.created_at).toLocaleTimeString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={
                wishlist.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                wishlist.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              }>
                {wishlist.priority} priority
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {wishlist.category?.replace('-', ' ')}
              </Badge>
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
          </div>

          {/* Images Gallery (if any) */}
          {wishlist.images && wishlist.images.length > 0 && (
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-3">Images ({wishlist.images.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {wishlist.images.map((image, index) => (
                  <div key={index} className="relative aspect-square rounded-md overflow-hidden border group">
                    <img 
                      src={`${window.location.protocol}//${window.location.hostname}:5000/uploads/wishlists/${image.filename}`}
                      alt={`Item image ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      onClick={() => window.open(`${window.location.protocol}//${window.location.hostname}:5000/uploads/wishlists/${image.filename}`, '_blank')}
                      crossOrigin="anonymous"
                      onError={(e) => {
                        console.error('Image failed to load:', image.filename);
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Image+Not+Found';
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-xs text-white px-2 py-1">
                      Image {index + 1}
                    </div>
                    {canEdit && (
                      <button
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(image.filename);
                        }}
                        disabled={imageDeleteLoading === image.filename}
                      >
                        {imageDeleteLoading === image.filename ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wishlist Details */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Description</h3>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {wishlist.description || 'No description provided'}
            </div>
          </div>

          {/* Price & Category Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <span className="text-sm text-muted-foreground">Max Price:</span>
              <p className="font-semibold text-green-600 dark:text-green-400 text-lg">
                {wishlist.max_price}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Category:</span>
              <p className="font-medium capitalize">{wishlist.category.replace('-', ' ')}</p>
            </div>
          </div>

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
              <div className="flex items-center justify-center gap-1 text-red-500">
                <Heart className="w-4 h-4" />
                <span className="font-medium">{wishlist.watchers || 0}</span>
              </div>
              <span className="text-muted-foreground">Watchers</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600">
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium">{comments.length}</span>
              </div>
              <span className="text-muted-foreground">Comments</span>
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
                <AvatarImage src={getAvatarUrl(currentUser?.avatar_url)} />
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
                      <AvatarImage src={getAvatarUrl(comment.avatar_url)} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
                        {comment.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="font-medium text-sm cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUserClick?.(comment.user_id);
                          }}
                        >
                          {comment.username}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
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

          {/* Wishlist Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg text-sm">
            <div>
              <span className="text-muted-foreground">Created:</span>
              <div className="font-medium">{new Date(wishlist.created_at).toLocaleDateString()}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Wishlist ID:</span>
              <div className="font-medium font-mono">{wishlist.wishlist_id.slice(-8)}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            {/* Report Button - Always visible for logged-in users */}
            {apiService.isAuthenticated() && onReport && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReport(wishlist)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Flag className="w-4 h-4 mr-2" />
                Report
              </Button>
            )}

            {canEdit ? (
              <>
                <Button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white" onClick={() => onUserClick && onUserClick(wishlist.user_id)}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Make Offer
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
                <Button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white" onClick={() => onUserClick && onUserClick(wishlist.user_id)}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Make Offer
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reportData: { reason: string; description: string; wishlistId: string }) => Promise<void>;
  wishlistId: string;
}

// Report Modal Component
function ReportModal({ isOpen, onClose, onSubmit, wishlistId }: ReportModalProps) {
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim()) return;

    try {
      setSubmitting(true);
      await onSubmit({
        reason: reportReason,
        description: reportDescription,
        wishlistId
      });
      setReportReason('');
      setReportDescription('');
      onClose();
    } catch (error) {
      console.error('Failed to submit report:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const reportReasons = [
    'Spam or inappropriate content',
    'Harassment or bullying',
    'Scam or fraudulent activity',
    'Copyright infringement',
    'False information',
    'Other'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            Report Wishlist Item
          </DialogTitle>
          <DialogDescription>
            Help us keep the community safe by reporting inappropriate content.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-reason">Reason for report *</Label>
            <Select value={reportReason} onValueChange={setReportReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reportReasons.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-description">Additional details (optional)</Label>
            <Textarea
              id="report-description"
              placeholder="Provide more context about this report..."
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!reportReason.trim() || submitting} className="bg-red-500 hover:bg-red-600 text-white">
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Wishlist() {
  const { isLoggedIn } = useAuth();
  const { setCurrentPage } = useApp();

  // Debug authentication status
  useEffect(() => {
    console.log('Auth Status:', {
      isLoggedIn,
      hasToken: !!localStorage.getItem('token'),
      isAuthenticated: apiService.isAuthenticated()
    });
  }, [isLoggedIn]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedWishlist, setSelectedWishlist] = useState<WishlistItem | null>(null);
  const [editingWishlist, setEditingWishlist] = useState<WishlistItem | null>(null);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedWishlistForReport, setSelectedWishlistForReport] = useState<WishlistItem | null>(null);
  
  const [newWishlist, setNewWishlist] = useState({
    itemName: '',
    description: '',
    maxPrice: '',
    category: '',
    priority: 'medium'
  });
  
  const [wishlistImages, setWishlistImages] = useState<File[]>([]);

  const [editWishlist, setEditWishlist] = useState({
    itemName: '',
    description: '',
    maxPrice: '',
    category: '',
    priority: 'medium'
  });
  
  const [editWishlistImages, setEditWishlistImages] = useState<File[]>([]);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'limiteds', label: 'Limited Items' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'gear', label: 'Gear' },
    { value: 'event-items', label: 'Event Items' },
    { value: 'gamepasses', label: 'Gamepasses' }
  ];

  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await apiService.getCurrentUser();
        setCurrentUser({
          ...user,
          avatar_url: user.avatar_url || ''
        });
        console.log('Current user loaded:', user);
      } catch (err) {
        console.error('Failed to load current user:', err);
      }
    };
    
    if (apiService.isAuthenticated()) {
      loadCurrentUser();
    }
  }, []);

  // Load wishlists from API
  const loadWishlists = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params: Record<string, string | number> = {
        page: pageNumber,
        limit: 10
      };
      
      if (filterCategory !== 'all') {
        params.category = filterCategory;
      }
      
      console.log('Loading wishlists with params:', params);
      const response = await apiService.getWishlists(params);
      console.log('Wishlist API response:', response);
      
      // Handle the response structure properly
      if (response && response.wishlists && Array.isArray(response.wishlists)) {
        setWishlistItems(response.wishlists.map((item: any) => ({
          ...item,
          avatar_url: item.avatar_url || ''
        })));
        
        // Set pagination if available
        if (response.pagination) {
          setTotalPages(response.pagination.pages || 1);
          
          // Only update current page if response.pagination.page is valid
          if (response.pagination.page && response.pagination.page > 0) {
            setPageNumber(response.pagination.page);
          }
        }
      } else if (Array.isArray(response)) {
        // If response is directly an array
        setWishlistItems(response.map((item: any) => ({
          ...item,
          avatar_url: item.avatar_url || ''
        })));
      } else {
        // Fallback to empty array
        console.warn('Unexpected wishlist response structure:', response);
        setWishlistItems([]);
      }
    } catch (err: unknown) {
      console.error('Error loading wishlists:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wishlists');
      setWishlistItems([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  }, [pageNumber, filterCategory]);

  useEffect(() => {
    loadWishlists();
  }, [loadWishlists]);

  // Permission functions - UPDATE THESE
  const canEditWishlist = (wishlist: WishlistItem) => {
    if (!currentUser) return false;
    
    // Only the owner can edit
    const isOwner = currentUser.id === wishlist.user_id;
    
    console.log('Checking edit permission:', {
      currentUserId: currentUser.id,
      wishlistUserId: wishlist.user_id,
      isOwner
    });
    
    return isOwner;
  };

  const canDeleteWishlist = (wishlist: WishlistItem) => {
    if (!currentUser) return false;
    
    // Owner, admin, or moderator can delete
    const isOwner = currentUser.id === wishlist.user_id;
    const isAdmin = currentUser.role === 'admin';
    const isModerator = currentUser.role === 'moderator';
    
    console.log('Checking delete permission:', {
      currentUserId: currentUser.id,
      wishlistUserId: wishlist.user_id,
      role: currentUser.role,
      isOwner,
      isAdmin,
      isModerator,
      canDelete: isOwner || isAdmin || isModerator
    });
    
    return isOwner || isAdmin || isModerator;
  };

  // Modal functions
  const handleWishlistClick = (wishlist: WishlistItem) => {
    setSelectedWishlist(wishlist);
    setIsDetailsDialogOpen(true);
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

  const handleEditFromModal = () => {
    if (selectedWishlist) {
      setIsDetailsDialogOpen(false);
      handleEditWishlist(selectedWishlist);
    }
  };

  const handleDeleteFromModal = () => {
    if (selectedWishlist) {
      setIsDetailsDialogOpen(false);
      handleDeleteWishlist(selectedWishlist.wishlist_id, selectedWishlist.item_name);
    }
  };

  const handleReportWishlist = (wishlist: WishlistItem) => {
    setSelectedWishlistForReport(wishlist);
    setIsReportModalOpen(true);
  };

  const handleSubmitReport = async (reportData: { reason: string; description: string }) => {
    if (!selectedWishlistForReport) return;

    try {
      // Map frontend reason strings to backend enum values
      const reasonMapping: Record<string, 'Scamming' | 'Harassment' | 'Inappropriate Content' | 'Spam' | 'Impersonation' | 'Other'> = {
        'Spam or inappropriate content': 'Inappropriate Content',
        'Harassment or bullying': 'Harassment',
        'Scam or fraudulent activity': 'Scamming',
        'Copyright infringement': 'Other',
        'False information': 'Other',
        'Other': 'Other'
      };

      await apiService.createReport({
        post_id: selectedWishlistForReport.wishlist_id,
        post_type: 'wishlist',
        reason: reportData.description || reportData.reason, // Use description as reason if provided, otherwise use the selected reason
        type: reasonMapping[reportData.reason] || 'Other'
      });

      setIsReportModalOpen(false);
      setSelectedWishlistForReport(null);
      
      toast.success('Report submitted successfully', {
        description: 'Thank you for helping keep our community safe.'
      });
    } catch (err: unknown) {
      console.error('Failed to submit report:', err);
      let errorMessage = 'Failed to submit report';
      
      if (err instanceof Error) {
        if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      toast.error('Failed to submit report', { description: errorMessage });
    }
  };

  const handleCreateButtonClick = () => {
    if (!isLoggedIn) {
      toast.error('Please log in to add items to your wishlist', {
        description: 'You need to be logged in to create wishlist items'
      });
      return;
    }
    setIsCreateDialogOpen(true);
  };

  // CRUD functions
  const handleCreateWishlist = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is logged in
    if (!isLoggedIn) {
      toast.error('Please log in to create wishlist items');
      return;
    }
    
    if (!newWishlist.itemName.trim()) {
      setError('Item name is required');
      return;
    }
    
    if (!newWishlist.category) {
      setError('Category is required');
      return;
    }
    
    try {
      setCreateLoading(true);
      setError('');
      
      console.log('Creating wishlist with data:', {
        item_name: newWishlist.itemName,
        description: newWishlist.description,
        max_price: newWishlist.maxPrice,
        category: newWishlist.category,
        priority: newWishlist.priority,
        imagesCount: wishlistImages.length
      });
      
      // Check if token exists
      if (!apiService.isAuthenticated()) {
        throw new Error('Not authenticated. Please log in again.');
      }
      
      // If we have images, use the createWishlistWithImages method
      if (wishlistImages.length > 0) {
        await apiService.createWishlistWithImages(
          {
            item_name: newWishlist.itemName,
            description: newWishlist.description,
            max_price: newWishlist.maxPrice,
            category: newWishlist.category,
            priority: newWishlist.priority as 'high' | 'medium' | 'low'
          },
          wishlistImages
        );
      } else {
        // Otherwise use the regular createWishlist method
        await apiService.createWishlist({
          item_name: newWishlist.itemName,
          description: newWishlist.description,
          max_price: newWishlist.maxPrice,
          category: newWishlist.category,
          priority: newWishlist.priority as 'high' | 'medium' | 'low'
        });
      }
      
      setIsCreateDialogOpen(false);
      setNewWishlist({
        itemName: '',
        description: '',
        maxPrice: '',
        category: '',
        priority: 'medium'
      });
      setWishlistImages([]);
      
      await loadWishlists();
      
      toast.success('Wishlist item created successfully! 🎉', {
        description: 'Your wishlist item has been added and is now visible to the community.'
      });
    } catch (err: unknown) {
      console.error('Failed to create wishlist item:', err);
      let errorMessage = 'Failed to create wishlist item';
      
      if (err instanceof Error) {
        if (err.message.includes('Not authenticated') || err.message.includes('401')) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast.error('Failed to create wishlist item', { description: errorMessage });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditWishlist = (wishlist: WishlistItem) => {
    if (!currentUser || currentUser.id !== wishlist.user_id) {
      toast.error('You can only edit your own wishlist items');
      return;
    }
    
    setEditingWishlist(wishlist);
    setEditWishlist({
      itemName: wishlist.item_name,
      description: wishlist.description,
      maxPrice: wishlist.max_price,
      category: wishlist.category,
      priority: wishlist.priority
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateWishlist = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingWishlist) return;
    
    if (!editWishlist.itemName.trim()) {
      setError('Item name is required');
      return;
    }
    
    try {
      setEditLoading(true);
      setError('');
      
      // First update the basic wishlist details
      await apiService.updateWishlist(editingWishlist.wishlist_id, {
        item_name: editWishlist.itemName,
        description: editWishlist.description,
        max_price: editWishlist.maxPrice,
        category: editWishlist.category,
        priority: editWishlist.priority as 'high' | 'medium' | 'low'
      });
      
      // If new images are selected, upload them
      if (editWishlistImages.length > 0) {
        await apiService.uploadWishlistImages(editingWishlist.wishlist_id, editWishlistImages);
      }
      
      setIsEditDialogOpen(false);
      setEditingWishlist(null);
      setEditWishlist({
        itemName: '',
        description: '',
        maxPrice: '',
        category: '',
        priority: 'medium'
      });
      setEditWishlistImages([]);
      
      await loadWishlists();
      
      toast.success('Wishlist item updated successfully! 🎉', {
        description: 'Your wishlist item has been updated.'
      });
    } catch (err: unknown) {
      console.error('Failed to update wishlist item:', err);
      let errorMessage = 'Failed to update wishlist item';
      
      if (err instanceof Error) {
        if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast.error('Failed to update wishlist item', { description: errorMessage });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteWishlist = async (wishlistId: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete "${itemName}" from your wishlist? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleteLoading(wishlistId);
      setError('');
      
      await apiService.deleteWishlist(wishlistId);
      
      await loadWishlists();
      
      toast.success('Wishlist item deleted successfully', {
        description: 'The item has been removed from your wishlist.'
      });
    } catch (err: unknown) {
      console.error('Failed to delete wishlist item:', err);
      let errorMessage = 'Failed to delete wishlist item';
      
      if (err instanceof Error) {
        if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (err.message.includes('403')) {
          errorMessage = 'You do not have permission to delete this item.';
        } else if (err.message.includes('404')) {
          errorMessage = 'Item not found. It may have already been deleted.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast.error('Failed to delete wishlist item', { description: errorMessage });
    } finally {
      setDeleteLoading(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const filteredItems = wishlistItems.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="flex-1 overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="w-7 h-7 text-red-500" />
              Community Wishlist
            </h1>
            <p className="text-muted-foreground">See what the community is looking for</p>
          </div>
          
          {/* Create Dialog */}
          {isLoggedIn ? (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Wishlist
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Item to Wishlist</DialogTitle>
                  <DialogDescription>
                    Let others know what you're looking for
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleCreateWishlist} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="item-name">Item Name *</Label>
                    <Input
                      id="item-name"
                      placeholder="Enter the item name"
                      value={newWishlist.itemName}
                      onChange={(e) => setNewWishlist(prev => ({ ...prev, itemName: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="item-description">Description</Label>
                    <Textarea
                      id="item-description"
                      placeholder="Why do you want this item?"
                      value={newWishlist.description}
                      onChange={(e) => setNewWishlist(prev => ({ ...prev, description: e.target.value }))}
                      className="min-h-[80px]"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max-price">Max Price</Label>
                      <Input
                        id="max-price"
                        placeholder="e.g., 10,000 Robux"
                        value={newWishlist.maxPrice}
                        onChange={(e) => setNewWishlist(prev => ({ ...prev, maxPrice: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={newWishlist.priority} onValueChange={(value) => setNewWishlist(prev => ({ ...prev, priority: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High Priority</SelectItem>
                          <SelectItem value="medium">Medium Priority</SelectItem>
                          <SelectItem value="low">Low Priority</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="wishlist-category">Category *</Label>
                    <Select value={newWishlist.category} onValueChange={(value) => setNewWishlist(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.filter(cat => cat.value !== 'all').map(category => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="wishlist-images">Images (Max 5)</Label>
                    <div className="grid gap-2">
                      <Input
                        id="wishlist-images"
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.gif,.webp"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 5) {
                            toast.error('Maximum 5 images allowed');
                            e.target.value = '';
                            return;
                          }
                          setWishlistImages(files);
                        }}
                      />
                      <div className="text-xs text-muted-foreground">
                        Supported formats: JPG, PNG, GIF, WebP (max 5MB per image)
                      </div>
                      {wishlistImages.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {wishlistImages.map((file, index) => (
                            <div key={index} className="relative group">
                              <div className="border rounded-md p-1 bg-muted/30">
                                <div className="text-xs truncate max-w-[100px]">
                                  {file.name}
                                </div>
                              </div>
                              <button 
                                type="button"
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100"
                                onClick={() => {
                                  setWishlistImages(prev => prev.filter((_, i) => i !== index));
                                }}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
                        'Add to Wishlist'
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          ) : (
            <Button 
              onClick={handleCreateButtonClick}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add to Wishlist
            </Button>
          )}
        </div>
      </div>

      {/* Edit Post Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Wishlist Item</DialogTitle>
            <DialogDescription>
              Update your wishlist item details
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateWishlist} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-item-name">Item Name *</Label>
              <Input
                id="edit-item-name"
                placeholder="Enter the item name"
                value={editWishlist.itemName}
                onChange={(e) => setEditWishlist(prev => ({ ...prev, itemName: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-item-description">Description</Label>
              <Textarea
                id="edit-item-description"
                placeholder="Why do you want this item?"
                value={editWishlist.description}
                onChange={(e) => setEditWishlist(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-max-price">Max Price</Label>
                <Input
                  id="edit-max-price"
                  placeholder="e.g., 10,000 Robux"
                  value={editWishlist.maxPrice}
                  onChange={(e) => setEditWishlist(prev => ({ ...prev, maxPrice: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <Select value={editWishlist.priority} onValueChange={(value) => setEditWishlist(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-wishlist-category">Category *</Label>
              <Select value={editWishlist.category} onValueChange={(value) => setEditWishlist(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(cat => cat.value !== 'all').map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-wishlist-images">Add More Images (Max 5 total)</Label>
              <div className="grid gap-2">
                <Input
                  id="edit-wishlist-images"
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.gif,.webp"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 5) {
                      toast.error('Maximum 5 images allowed');
                      e.target.value = '';
                      return;
                    }
                    setEditWishlistImages(files);
                  }}
                />
                <div className="text-xs text-muted-foreground">
                  Supported formats: JPG, PNG, GIF, WebP (max 5MB per image)
                </div>
                {editWishlistImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editWishlistImages.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="border rounded-md p-1 bg-muted/30">
                          <div className="text-xs truncate max-w-[100px]">
                            {file.name}
                          </div>
                        </div>
                        <button 
                          type="button"
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100"
                          onClick={() => {
                            setEditWishlistImages(prev => prev.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                  'Update Item'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="border-b border-border p-4 bg-muted/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search wishlist items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
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
        </div>
      </div>

      {/* Stats */}
      <div className="bg-background p-4 border-b border-border">
        <div className="flex items-center justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500" />
            <span>{filteredItems.length} Wishlist Items</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span>Page {pageNumber}</span>
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
        <div className="max-w-5xl mx-auto p-6 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Loading wishlist items...</span>
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center py-12">
              <AlertCircle className="w-8 h-8 text-red-500 mr-2" />
              <span className="text-red-500">{error}</span>
            </div>
          )}
          
          {!loading && !error && filteredItems.map((item) => (
            <Card 
              key={item.wishlist_id} 
              className="hover:shadow-lg transition-all duration-200 cursor-pointer"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3" onClick={() => handleWishlistClick(item)}>
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={getAvatarUrl(item.avatar_url)} />
                      <AvatarFallback>{item.username?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg hover:text-blue-600 transition-colors">
                          {item.item_name}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <span 
                          className="font-medium text-sm cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUserClick(item.user_id);
                          }}
                        >
                          {item.username}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {item.description || 'No description provided'}
                      </p>
                      
                      {/* Category */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.category?.replace('-', ' ')}
                        </Badge>
                        <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                          {item.priority} priority
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right text-xs text-muted-foreground">
                    <div className="flex items-center gap-1 mb-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span>{item.max_price}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>{item.comment_count || 0} comments</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950">
                        <ArrowUp className="w-4 h-4" />
                        <span className="ml-1">{item.upvotes || 0}</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950">
                        <ArrowDown className="w-4 h-4" />
                        <span className="ml-1">{item.downvotes || 0}</span>
                      </Button>
                    </div>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleWishlistClick(item)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    
                    {canEditWishlist(item) && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditWishlist(item)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    )}
                    
                    {canDeleteWishlist(item) && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteWishlist(item.wishlist_id, item.item_name)}
                        disabled={deleteLoading === item.wishlist_id}
                        className="text-red-600 hover:text-red-700"
                      >
                        {deleteLoading === item.wishlist_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3 mr-1" />
                        )}
                        {deleteLoading === item.wishlist_id ? 'Deleting...' : 'Delete'}
                      </Button>
                    )}
                    
                    <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white" onClick={() => handleUserClick(item.user_id)}>
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Message
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* ...existing empty state... */}
        </div>
      </div>

      {/* Details Modal */}
      <WishlistDetailsModal
        wishlist={selectedWishlist}
        isOpen={isDetailsDialogOpen}
        onClose={() => setIsDetailsDialogOpen(false)}
        onEdit={handleEditFromModal}
        onDelete={handleDeleteFromModal}
        canEdit={selectedWishlist ? canEditWishlist(selectedWishlist) : false}
        canDelete={selectedWishlist ? canDeleteWishlist(selectedWishlist) : false}
        deleteLoading={selectedWishlist ? deleteLoading === selectedWishlist.wishlist_id : false}
        onReport={handleReportWishlist}
        onUserClick={handleUserClick}
        currentUser={currentUser}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleSubmitReport}
        wishlistId={selectedWishlistForReport?.wishlist_id || ''}
      />
    </div>
  );
}