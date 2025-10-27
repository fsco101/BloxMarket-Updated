"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Flag,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  ImageIcon,
  Send,
  MoreHorizontal,
  TrendingUp,
  Gift,
  ChevronDown,
  ChevronUp,
  Search
} from "lucide-react";

import { cn } from "./utils";
import { Dialog, DialogContent } from "./dialog";
import { Button } from "./button";
import { Badge } from "./badge";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";
import { Input } from "./input";
import { apiService } from "../../services/api";
import { toast } from "sonner";

// Types for the PostModal
export interface PostModalPost {
  id: string;
  type: 'trade' | 'forum' | 'event' | 'wishlist';
  title: string;
  description: string;
  user: {
    id?: string;
    username: string;
    robloxUsername?: string;
    rating?: number;
    vouchCount?: number;
    verified?: boolean;
    moderator?: boolean;
    avatar_url?: string;
    credibility_score?: number;
  };
  timestamp: string;
  images?: Array<{ url: string; type: 'trade' | 'forum' | 'event' }>;
  comments?: number;
  upvotes?: number;
  downvotes?: number;
  // Trade-specific fields
  items?: string[];
  wantedItems?: string[];
  status?: string;
  // Forum-specific fields
  category?: string;
  // Event-specific fields
  prizes?: string[];
  requirements?: string[];
  eventType?: string;
  eventStatus?: string;
  startDate?: string;
  endDate?: string;
  maxParticipants?: number;
  participantCount?: number;
}

interface PostModalComment {
  comment_id?: string;
  id?: string;
  content: string;
  created_at?: string;
  time?: string;
  user?: {
    _id?: string;
    username: string;
    avatar_url?: string;
    credibility_score?: number;
  };
  username?: string;
  avatar_url?: string;
  credibility_score?: number;
  user_id?: string;
}

interface PostModalProps {
  post: PostModalPost | null;
  isOpen: boolean;
  onClose: () => void;
  onUserClick?: (userId: string) => void;
  onReportClick?: () => void;
  className?: string;
}

// ImageViewer Component for better image showcasing
function ImageViewer({
  images,
  currentIndex,
  onNext,
  onPrevious,
  onSetIndex
}: {
  images: Array<{ url: string; type: 'trade' | 'forum' | 'event' }>;
  currentIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onSetIndex: (index: number) => void;
}) {
  const currentImage = images[currentIndex];
  const hasMultipleImages = images.length > 1;

  return (
    <div className="relative h-full flex items-center justify-center bg-black">
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
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors z-10"
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

// Main PostModal Component
export function PostModal({
  post,
  isOpen,
  onClose,
  onUserClick,
  onReportClick,
  className
}: PostModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<PostModalComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [votingLoading, setVotingLoading] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [visibleCommentsCount] = useState(5);

  // Load comments and votes when modal opens
  const loadPostData = useCallback(async () => {
    if (!post) return;

    try {
      setLoadingComments(true);

      // Load comments and votes based on post type
      if (post.type === 'forum') {
        try {
          const response = await apiService.getForumPost(post.id);
          setComments(response.comments || []);
          setUpvotes(response.upvotes || 0);
          setDownvotes(response.downvotes || 0);
          setUserVote(response.userVote || null);
        } catch (apiError) {
          console.error('Failed to load forum post:', apiError);
          setComments([]);
          setUpvotes(0);
          setDownvotes(0);
          setUserVote(null);
        }
      } else if (post.type === 'trade') {
        try {
          const [commentsResponse, votesResponse] = await Promise.allSettled([
            apiService.getTradeComments(post.id),
            apiService.getTradeVotes(post.id)
          ]);

          if (commentsResponse.status === 'fulfilled') {
            setComments(commentsResponse.value.comments || []);
          } else {
            setComments([]);
          }

          if (votesResponse.status === 'fulfilled') {
            setUpvotes(votesResponse.value.upvotes || 0);
            setDownvotes(votesResponse.value.downvotes || 0);
            setUserVote(votesResponse.value.userVote || null);
          } else {
            setUpvotes(post.upvotes || 0);
            setDownvotes(post.downvotes || 0);
            setUserVote(null);
          }
        } catch (apiError) {
          console.error('Failed to load trade data:', apiError);
          setComments([]);
          setUpvotes(post.upvotes || 0);
          setDownvotes(post.downvotes || 0);
          setUserVote(null);
        }
      } else if (post.type === 'event') {
        try {
          const [commentsResponse, votesResponse] = await Promise.allSettled([
            apiService.getEventComments(post.id),
            apiService.getEventVotes(post.id)
          ]);

          if (commentsResponse.status === 'fulfilled') {
            setComments(commentsResponse.value.comments || []);
          } else {
            setComments([]);
          }

          if (votesResponse.status === 'fulfilled') {
            setUpvotes(votesResponse.value.upvotes || 0);
            setDownvotes(votesResponse.value.downvotes || 0);
            setUserVote(votesResponse.value.userVote || null);
          } else {
            setUpvotes(post.upvotes || 0);
            setDownvotes(post.downvotes || 0);
            setUserVote(null);
          }
        } catch (apiError) {
          console.error('Failed to load event data:', apiError);
          setComments([]);
          setUpvotes(post.upvotes || 0);
          setDownvotes(post.downvotes || 0);
          setUserVote(null);
        }
      } else {
        setComments([]);
        setUpvotes(post.upvotes || 0);
        setDownvotes(post.downvotes || 0);
        setUserVote(null);
      }
    } catch (error) {
      console.error('Failed to load post data:', error);
      toast.error('Failed to load post data');
    } finally {
      setLoadingComments(false);
    }
  }, [post]);

  useEffect(() => {
    if (isOpen && post) {
      loadPostData();
    }
  }, [isOpen, post, loadPostData]);

  const handleUpvote = async () => {
    if (!post || votingLoading) return;

    try {
      setVotingLoading(true);

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

      window.dispatchEvent(new CustomEvent('notification-created'));
    } catch (error) {
      console.error('Failed to upvote:', error);
      toast.error('Failed to upvote');
    } finally {
      setVotingLoading(false);
    }
  };

  const handleDownvote = async () => {
    if (!post || votingLoading) return;

    try {
      setVotingLoading(true);

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

      window.dispatchEvent(new CustomEvent('notification-created'));
    } catch (error) {
      console.error('Failed to downvote:', error);
      toast.error('Failed to downvote');
    } finally {
      setVotingLoading(false);
    }
  };

  const handleComment = async () => {
    if (!comment.trim() || !post || submittingComment) return;

    try {
      setSubmittingComment(true);

      let newComment;
      if (post.type === 'forum') {
        newComment = await apiService.addForumComment(post.id, comment);
      } else if (post.type === 'trade') {
        newComment = await apiService.addTradeComment(post.id, comment);
      } else if (post.type === 'event') {
        newComment = await apiService.addEventComment(post.id, comment);
      } else {
        newComment = {
          comment_id: Date.now().toString(),
          content: comment,
          created_at: new Date().toISOString(),
          username: 'You',
          credibility_score: 100
        };
      }

      if (newComment) {
        setComments(prev => [newComment, ...prev]);
        setComment('');
        toast.success('Comment added!');

        window.dispatchEvent(new CustomEvent('notification-created'));
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

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
    if (onUserClick) {
      onUserClick(post.user.id || post.user.username);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent scrollMode="modal" className={cn("max-w-[95vw] w-full p-0 shadow-2xl bg-background custom-scrollbar", className)}>
        <div className="flex flex-col lg:flex-row min-h-0">
          {/* Left side - Image Viewer - More responsive */}
          <div className="flex-1 bg-black relative order-1 lg:order-1 min-h-[200px] lg:min-h-0">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 bg-black/60 hover:bg-black/80 text-white rounded-full p-2.5 transition-all duration-200 shadow-lg lg:top-6 lg:right-6 lg:p-3"
            >
              <X className="w-5 h-5 lg:w-6 lg:h-6" />
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
              <div className="h-full flex items-center justify-center text-white/60 bg-gradient-to-br from-gray-900 to-black">
                <div className="text-center p-8">
                  <div className="w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 lg:w-10 lg:h-10 opacity-60" />
                  </div>
                  <p className="text-sm lg:text-lg font-medium">No images</p>
                  <p className="text-xs lg:text-sm opacity-60 mt-1">Focus on the content below</p>
                </div>
              </div>
            )}
          </div>

          {/* Right side - Post Details and Comments - Improved layout */}
          <div className="w-full lg:w-[480px] xl:w-[560px] bg-background flex flex-col shadow-2xl order-2 lg:order-2">
            {/* Content Area (dialog handles scrolling) */}
            <div className="flex-1 min-h-0">
              {/* Post Header - Enhanced */}
              <div className="p-4 lg:p-6 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-start justify-between gap-4">
                  <button 
                    onClick={handleUserClick} 
                    className="flex items-center gap-3 hover:bg-muted/50 rounded-lg p-2 transition-all duration-200 flex-1 min-w-0"
                  >
                    <Avatar className="w-12 h-12 lg:w-14 lg:h-14 flex-shrink-0 ring-2 ring-muted/20">
                      <AvatarImage
                        src={getAvatarUrl(post.user.avatar_url)}
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '';
                        }}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-semibold">
                        {post.user.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base lg:text-lg truncate">{post.user.username}</span>
                        {post.user.verified && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex-shrink-0">
                            ✓ Verified
                          </Badge>
                        )}
                        {post.user.moderator && (
                          <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 flex-shrink-0">
                            MOD
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{post.timestamp}</span>
                      </div>
                      {post.user.robloxUsername && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          @{post.user.robloxUsername}
                        </div>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`${getPostTypeColor(post.type)} text-white px-3 py-1.5 text-sm font-medium`}>
                      {getPostTypeIcon(post.type)}
                      <span className="ml-2 capitalize">{post.type}</span>
                    </Badge>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Post Content - Better organized */}
              <div className="p-4 lg:p-6 border-b">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-xl lg:text-2xl leading-tight mb-3 text-foreground">{post.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-base">{post.description}</p>
                  </div>

                  {/* Trade Details - Enhanced */}
                  {post.type === 'trade' && (
                    <div className="space-y-4 pt-2">
                      {post.items && post.items.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            Offering
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {post.items.map((item, i) => (
                              <Badge key={i} variant="outline" className="text-sm bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 px-3 py-1.5 border-green-200 dark:border-green-800">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {post.wantedItems && post.wantedItems.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Search className="w-4 h-4 text-blue-600" />
                            Looking for
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {post.wantedItems.map((item, i) => (
                              <Badge key={i} variant="outline" className="text-sm bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-3 py-1.5 border-blue-200 dark:border-blue-800">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {post.status && (
                        <div className="flex items-center gap-2 pt-2">
                          <span className="text-sm font-medium text-muted-foreground">Status:</span>
                          <Badge variant="outline" className={`${
                            post.status === 'open' ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200' :
                            post.status === 'completed' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200' :
                            'bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300 border-gray-200'
                          } px-3 py-1`}>
                            {post.status}
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Event Details - Enhanced */}
                  {post.type === 'event' && (
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        {post.eventStatus && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-muted-foreground">Status:</span>
                            <Badge variant="outline" className={`${
                              post.eventStatus === 'active' ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' :
                              post.eventStatus === 'upcoming' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                              post.eventStatus === 'ending-soon' ? 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300' :
                              'bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300'
                            } px-2 py-1`}>
                              {post.eventStatus.replace('-', ' ')}
                            </Badge>
                          </div>
                        )}
                        {post.eventType && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-muted-foreground">Type:</span>
                            <span className="capitalize">{post.eventType}</span>
                          </div>
                        )}
                        {post.startDate && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-muted-foreground">Starts:</span>
                            <span>{new Date(post.startDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        {post.endDate && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-muted-foreground">Ends:</span>
                            <span>{new Date(post.endDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {post.prizes && post.prizes.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Gift className="w-4 h-4 text-purple-600" />
                            Prizes
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {post.prizes.map((prize, i) => (
                              <Badge key={i} variant="outline" className="text-sm bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 px-3 py-1.5">
                                {prize}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {post.requirements && post.requirements.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-sm font-semibold text-foreground">Requirements</span>
                          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                            {post.requirements.map((req, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-muted-foreground mt-1.5">•</span>
                                <span>{req}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {(post.maxParticipants || post.participantCount) && (
                        <div className="flex items-center gap-4 text-sm pt-2 border-t">
                          {post.participantCount !== undefined && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-muted-foreground">Participants:</span>
                              <span>{post.participantCount}</span>
                              {post.maxParticipants && <span className="text-muted-foreground">/ {post.maxParticipants}</span>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Forum Category */}
                  {post.type === 'forum' && post.category && (
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-sm font-medium text-muted-foreground">Category:</span>
                      <Badge variant="outline" className="text-sm bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                        {post.category.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions - Enhanced layout */}
              <div className="p-4 lg:p-6 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 lg:gap-4">
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={handleUpvote}
                      disabled={votingLoading}
                      className={`${userVote === 'up' ? 'text-green-600 bg-green-50 dark:bg-green-950 border-green-200' : 'text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950'} border transition-colors px-4 py-3 h-auto relative`}
                    >
                      <ArrowUp className={`w-5 h-5 mr-2 ${userVote === 'up' ? 'fill-current' : ''}`} />
                      <span className="font-semibold">{upvotes}</span>
                      {votingLoading && (
                        <Loader2 className="w-3 h-3 animate-spin absolute -top-1 -right-1" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={handleDownvote}
                      disabled={votingLoading}
                      className={`${userVote === 'down' ? 'text-red-600 bg-red-50 dark:bg-red-950 border-red-200' : 'text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950'} border transition-colors px-4 py-3 h-auto relative`}
                    >
                      <ArrowDown className={`w-5 h-5 mr-2 ${userVote === 'down' ? 'fill-current' : ''}`} />
                      <span className="font-semibold">{downvotes}</span>
                      {votingLoading && (
                        <Loader2 className="w-3 h-3 lg:w-4 lg:h-4 animate-spin absolute -top-1 -right-1" />
                      )}
                    </Button>
                    <div className="flex items-center gap-2 px-4 py-3 text-muted-foreground">
                      <MessageSquare className="w-5 h-5" />
                      <span className="font-semibold">{comments.length}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 px-4 py-3 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReportClick?.();
                    }}
                  >
                    <Flag className="w-5 h-5 mr-2" />
                    <span className="hidden sm:inline font-medium">Report</span>
                  </Button>
                </div>
              </div>

              {/* Comments Section - Enhanced */}
              <div className="p-4 lg:p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-lg text-foreground flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Comments
                      <span className="text-muted-foreground font-normal">({comments.length})</span>
                      {loadingComments && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                    </h4>
                    {comments.length > visibleCommentsCount && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCommentsExpanded(!commentsExpanded)}
                        className="text-sm hover:bg-muted/50 transition-colors"
                      >
                        {commentsExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4 mr-1" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4 mr-1" />
                            Show {comments.length - visibleCommentsCount} More
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {loadingComments ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Loading comments...</p>
                      </div>
                    </div>
                  ) : comments.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                      {comments.slice(0, commentsExpanded ? comments.length : visibleCommentsCount).map((comment, index) => (
                        <div key={comment.comment_id || comment.id || index} className="group">
                          <div className="flex gap-3">
                            <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-transparent group-hover:ring-muted/30 transition-all">
                              <AvatarImage
                                src={getAvatarUrl(comment.user?.avatar_url || comment.avatar_url)}
                                className="object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '';
                                }}
                              />
                              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm font-semibold">
                                {(comment.user?.username || comment.username || 'U')[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="bg-muted/40 hover:bg-muted/60 rounded-xl p-4 transition-all duration-200 border border-transparent hover:border-muted/30">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span
                                    className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors truncate"
                                    onClick={() => {
                                      const userId = comment.user?._id || comment.user_id;
                                      if (userId && onUserClick) {
                                        onUserClick(userId);
                                      }
                                    }}
                                  >
                                    {comment.user?.username || comment.username}
                                  </span>
                                  {(comment.user?.credibility_score || comment.credibility_score) && (
                                    <Badge variant="secondary" className="text-xs flex-shrink-0 bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                                      {(comment.user?.credibility_score || comment.credibility_score)}★
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground flex-shrink-0">
                                    {comment.created_at ? new Date(comment.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : comment.time}
                                  </span>
                                </div>
                                <p className="text-sm leading-relaxed break-words text-foreground/90">{comment.content}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {!commentsExpanded && comments.length > visibleCommentsCount && (
                        <div className="text-center py-6">
                          <div className="w-full h-px bg-gradient-to-r from-transparent via-muted to-transparent mb-4" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCommentsExpanded(true)}
                            className="text-sm hover:bg-muted/50 transition-colors border-muted/50"
                          >
                            <ChevronDown className="w-4 h-4 mr-2" />
                            Load {comments.length - visibleCommentsCount} more comments
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                        <MessageSquare className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-lg font-medium mb-2 text-muted-foreground">No comments yet</h3>
                      <p className="text-sm text-muted-foreground/70">Be the first to share your thoughts!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Comment Input - Enhanced */}
            <div className="p-4 lg:p-6 border-t bg-muted/10 flex-shrink-0">
              <div className="flex gap-3">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage
                    src={getAvatarUrl('')}
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                        target.src = '';
                      }}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold">
                    Y
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 flex gap-3">
                  <Input
                    placeholder="Write a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleComment()}
                    className="text-sm h-11 rounded-xl border-2 focus:border-primary flex-1"
                    disabled={submittingComment}
                  />
                  <Button
                    size="lg"
                    onClick={handleComment}
                    disabled={!comment.trim() || submittingComment}
                    className="px-5 h-11 rounded-xl flex-shrink-0"
                  >
                    {submittingComment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
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