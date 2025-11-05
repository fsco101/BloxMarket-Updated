import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { apiService } from '../services/api';
import { alertService } from '../services/alertService';
import { 
  MessageSquare, 
  Search, 
  Plus,
  ArrowUp,
  ArrowDown,
  Clock,
  Eye,
  Pin,
  TrendingUp,
  Users,
  MessageCircle,
  Loader2,
  AlertCircle,
  Upload,
  X,
  ImageIcon,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Flag
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth, useApp } from '../App';
import { PostModal } from './ui/post-modal';
import type { PostModalPost } from './ui/post-modal';

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

// Transform ForumPost to PostModalPost format
const transformForumPostToPostModal = (forumPost: ForumPost): PostModalPost => {
  return {
    id: forumPost.post_id,
    type: 'forum',
    title: forumPost.title,
    description: forumPost.content,
    user: {
      id: forumPost.user_id,
      username: forumPost.username,
      avatar_url: forumPost.avatar_url,
      credibility_score: forumPost.credibility_score
    },
    timestamp: forumPost.created_at,
    images: forumPost.images?.map(image => ({
      url: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/uploads/forum/${image.filename}`,
      type: 'forum' as const
    })),
    comments: forumPost.commentCount || 0,
    upvotes: forumPost.upvotes,
    downvotes: forumPost.downvotes,
    category: forumPost.category
  };
};

interface User {
  id: string;
  username: string;
  email: string;
  robloxUsername?: string;
  role?: string;
  avatar_url?: string;
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
  images?: { filename: string; originalName?: string }[];
  commentCount: number;
  avatar_url?: string;
}

interface ForumImageModalProps {
  images: { filename: string; originalName?: string }[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, description: string) => void;
  loading: boolean;
}

// Enhanced Image Display Component - MOVED TO TOP
interface ImageDisplayProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

function ImageDisplay({ src, alt, className, fallback }: ImageDisplayProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    console.error('Image failed to load:', src);
    if (retryCount < 2) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setImageError(false);
        setImageLoading(true);
      }, 1000);
    } else {
      setImageLoading(false);
      setImageError(true);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    setImageError(false);
    setImageLoading(true);
  };

  if (imageError) {
    return fallback || (
      <div className={`bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-400">
          <Upload className="w-8 h-8 mx-auto mb-1" />
          <span className="text-xs block mb-1">Image unavailable</span>
          <button
            onClick={handleRetry}
            className="text-xs text-blue-500 hover:text-blue-600 underline focus:outline-none"
          >
            Retry
          </button>
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
        src={`${src}${retryCount > 0 ? `?v=${retryCount}` : ''}`}
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

// Forum Image Modal Component
function ForumImageModal({ images, currentIndex, isOpen, onClose, onNext, onPrevious }: ForumImageModalProps) {
  if (!isOpen || !images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
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
            <img
              src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/uploads/forum/${currentImage.filename}`}
              alt={currentImage.originalName || `Image ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          </div>
          
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Report Modal Component
function ReportModal({ isOpen, onClose, onSubmit, loading }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please select a reason for the report');
      return;
    }
    onSubmit(reason, description);
  };

  const reportReasons = [
    { value: 'Spam or inappropriate content', label: 'Spam or inappropriate content' },
    { value: 'Harassment or bullying', label: 'Harassment or bullying' },
    { value: 'Hate speech', label: 'Hate speech' },
    { value: 'Misinformation', label: 'Misinformation' },
    { value: 'Copyright violation', label: 'Copyright violation' },
    { value: 'Other', label: 'Other' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            Report Post
          </DialogTitle>
          <DialogDescription>
            Help us keep the community safe by reporting inappropriate content.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-1">
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-reason">Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reportReasons.map((reportReason) => (
                  <SelectItem key={reportReason.value} value={reportReason.value}>
                    {reportReason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-description">Additional Details (optional)</Label>
            <Textarea
              id="report-description"
              placeholder="Provide more details about why you're reporting this post..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reporting...
                </>
              ) : (
                <>
                  <Flag className="w-4 h-4 mr-2" />
                  Report
                </>
              )}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Forums() {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { setCurrentPage: setAppCurrentPage } = useApp();

  useEffect(() => {
    if (authLoading || !isLoggedIn || !apiService.isAuthenticated()) return;
    // fetch posts here
  }, [authLoading, isLoggedIn]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ForumPost | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'general'
  });

  const [editPost, setEditPost] = useState({
    title: '',
    content: '',
    category: 'general'
  });
  
  // Image upload states (for creating/editing posts)
  const [uploadSelectedImages, setUploadSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [editUploadSelectedImages, setEditUploadSelectedImages] = useState<File[]>([]);
  const [editImagePreviewUrls, setEditImagePreviewUrls] = useState<string[]>([]);

  // Modal states (for viewing images and post details)
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [isPostDetailsOpen, setIsPostDetailsOpen] = useState(false);
  const [isForumImageModalOpen, setIsForumImageModalOpen] = useState(false);
  const [modalSelectedImages, setModalSelectedImages] = useState<{ filename: string; originalName?: string }[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Report modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
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
    
    setAppCurrentPage(`profile-${userId}`);
  };
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await apiService.getCurrentUser();
        setCurrentUser(user);
      } catch (err) {
        console.error('Failed to load current user:', err);
      }
    };
    
    if (apiService.isAuthenticated()) {
      loadCurrentUser();
    }
  }, []);

  // Load posts from API
  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: 10
      };
      
      if (filterCategory !== 'all') {
        params.category = filterCategory;
      }
      
      const response = await apiService.getForumPosts(params);
      console.log('Forum posts response:', response);
      
      // Handle the response structure properly
      if (response && response.posts && Array.isArray(response.posts)) {
        setPosts(response.posts.map((post: any) => ({
          ...post,
          avatar_url: post.avatar_url || ''
        })));
        
        // Set pagination if available
        if (response.pagination) {
          setTotalPages(response.pagination.pages || 1);
          
          // Only update current page if response.pagination.page is valid
          if (response.pagination.page && response.pagination.page > 0) {
            setCurrentPage(response.pagination.page);
          }
        }
      } else if (Array.isArray(response)) {
        // If response is directly an array
        setPosts(response.map((post: any) => ({
          ...post,
          avatar_url: post.avatar_url || ''
        })));
      } else {
        // Fallback to empty array
        console.warn('Unexpected forum posts response structure:', response);
        setPosts([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterCategory]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Modal functions
  const handlePostClick = (post: ForumPost) => {
    setSelectedPost(post);
    setIsPostDetailsOpen(true);
  };

  const handleForumImageClick = (images: { filename: string; originalName?: string }[], index: number) => {
    setModalSelectedImages(images);
    setCurrentImageIndex(index);
    setIsForumImageModalOpen(true);
  };

  const handleNextForumImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % modalSelectedImages.length);
  };

  const handlePreviousForumImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + modalSelectedImages.length) % modalSelectedImages.length);
  };

  const handleEditFromModal = () => {
    if (selectedPost) {
      setIsPostDetailsOpen(false);
      handleEditPost(selectedPost);
    }
  };

  const handleDeleteFromModal = () => {
    if (selectedPost) {
      setIsPostDetailsOpen(false);
      handleDeletePost(selectedPost.post_id, selectedPost.title);
    }
  };

  // Report functions
  const handleReportPost = (post: ForumPost) => {
    setSelectedPost(post);
    setIsReportModalOpen(true);
  };

  const handleSubmitReport = async (reason: string, description: string) => {
    if (!selectedPost) return;

    try {
      setReportLoading(true);

      // Map frontend reason strings to backend enum values
      const reasonMapping: { [key: string]: string } = {
        'Spam or inappropriate content': 'Inappropriate Content',
        'Harassment or bullying': 'Harassment',
        'Hate speech': 'Hate Speech',
        'Misinformation': 'Misinformation',
        'Copyright violation': 'Copyright Violation',
        'Other': 'Other'
      };

      const backendReason = reasonMapping[reason] || 'Other';

      await apiService.createReport({
        post_id: selectedPost.post_id,
        post_type: 'forum',
        reason: description || backendReason, // Use description as reason if provided, otherwise use the selected reason
        type: backendReason as 'Scamming' | 'Harassment' | 'Inappropriate Content' | 'Spam' | 'Impersonation' | 'Other'
      });

      setIsReportModalOpen(false);
      toast.success('Report submitted successfully', {
        description: 'Thank you for helping keep the community safe.'
      });
    } catch (error) {
      console.error('Failed to submit report:', error);
      toast.error('Failed to submit report', {
        description: 'Please try again later.'
      });
    } finally {
      setReportLoading(false);
    }
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
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
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
    }
  };

  const handleRemoveEditImage = (index: number) => {
    setEditUploadSelectedImages(prev => prev.filter((_, i) => i !== index));
    setEditImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Permission functions
  const canEditPost = (post: ForumPost) => {
    return currentUser && currentUser.id === post.user_id;
  };

  const canDeletePost = (post: ForumPost) => {
    if (!currentUser) return false;
    return currentUser.id === post.user_id || 
           currentUser.role === 'admin' || 
           currentUser.role === 'moderator';
  };

  // CRUD functions
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPost.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!newPost.content.trim()) {
      setError('Content is required');
      return;
    }
    
    try {
      setCreateLoading(true);
      setError('');
      
      await apiService.createForumPost({
        title: newPost.title,
        content: newPost.content,
        category: newPost.category
      }, uploadSelectedImages);
      
      setIsCreateDialogOpen(false);
      setNewPost({
        title: '',
        content: '',
        category: 'general'
      });
      setUploadSelectedImages([]);
      setImagePreviewUrls([]);
      
      await loadPosts();
      
      toast.success('Post created successfully! 🎉', {
        description: 'Your post has been published and is now visible to the community.'
      });
    } catch (err: unknown) {
      console.error('Failed to create forum post:', err);
      let errorMessage = 'Failed to create post';
      
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
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditPost = (post: ForumPost) => {
    if (!currentUser || currentUser.id !== post.user_id) {
      toast.error('You can only edit your own posts');
      return;
    }
    
    setEditingPost(post);
    setEditPost({
      title: post.title,
      content: post.content,
      category: post.category
    });
    setEditUploadSelectedImages([]);
    setEditImagePreviewUrls([]);
    setIsEditDialogOpen(true);
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingPost) return;
    
    if (!editPost.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!editPost.content.trim()) {
      setError('Content is required');
      return;
    }
    
    try {
      setEditLoading(true);
      setError('');
      
      await apiService.updateForumPost(editingPost.post_id, {
        title: editPost.title,
        content: editPost.content,
        category: editPost.category
      }, editUploadSelectedImages);
      
      setIsEditDialogOpen(false);
      setEditingPost(null);
      setEditPost({
        title: '',
        content: '',
        category: 'general'
      });
      setEditUploadSelectedImages([]);
      setEditImagePreviewUrls([]);
      
      await loadPosts();
      
      toast.success('Post updated successfully! 🎉', {
        description: 'Your post has been updated and is now visible to the community.'
      });
    } catch (err: unknown) {
      console.error('Failed to update forum post:', err);
      let errorMessage = 'Failed to update post';
      
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
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeletePost = async (postId: string, postTitle: string) => {
    const confirmed = await alertService.confirm(
      'Delete Post',
      `Are you sure you want to delete the post "${postTitle}"? This action cannot be undone.`,
      'Delete',
      'Cancel'
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleteLoading(postId);
      setError('');
      
      await apiService.deleteForumPost(postId);
      
      await loadPosts();
      
      toast.success('Post deleted successfully', {
        description: 'The post has been removed from the community.'
      });
    } catch (err: unknown) {
      console.error('Failed to delete forum post:', err);
      let errorMessage = 'Failed to delete post';
      
      if (err instanceof Error) {
        if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (err.message.includes('403')) {
          errorMessage = 'You do not have permission to delete this post.';
        } else if (err.message.includes('404')) {
          errorMessage = 'Post not found. It may have already been deleted.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast.error('Failed to delete post', {
        description: errorMessage
      });
    } finally {
      setDeleteLoading(null);
    }
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'trading_tips', label: 'Trading Tips' },
    { value: 'scammer_reports', label: 'Scammer Reports' },
    { value: 'game_updates', label: 'Game Updates' },
    { value: 'general', label: 'General Discussion' }
  ];

  const filteredPosts = posts.filter((post: ForumPost) => {
    const matchesSearch = searchTerm === '' || 
      post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const sortedPosts = [...filteredPosts].sort((a: ForumPost, b: ForumPost) => {
    switch (sortBy) {
      case 'activity':
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'popular':
        return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
      default:
        return 0;
    }
  });

  return (
    <div className="flex-1 overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-7 h-7 text-blue-500" />
              Community Forums
            </h1>
            <p className="text-muted-foreground">Discuss trading, share tips, and connect with the community</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Create New Post</DialogTitle>
                <DialogDescription>
                  Share your thoughts with the community
                </DialogDescription>
              </DialogHeader>
              
              <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-1">
                <form onSubmit={handleCreatePost} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="post-title">Title *</Label>
                  <Input
                    id="post-title"
                    placeholder="Enter your post title"
                    value={newPost.title}
                    onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="post-content">Content *</Label>
                  <Textarea
                    id="post-content"
                    placeholder="Write your post content..."
                    value={newPost.content}
                    onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                    className="min-h-[150px]"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="post-category">Category</Label>
                  <Select value={newPost.category} onValueChange={(value) => setNewPost(prev => ({ ...prev, category: value }))}>
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
                        const input = document.getElementById('forum-image-upload') as HTMLInputElement;
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
                      id="forum-image-upload"
                      disabled={uploadSelectedImages.length >= 5}
                    />
                    <label
                      htmlFor="forum-image-upload"
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
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {imagePreviewUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <div className="aspect-square border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                              <ImageDisplay
                                src={url}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove image"
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
                      'Create Post'
                    )}
                  </Button>
                </div>
              </form>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Edit Post Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Edit Post</DialogTitle>
                <DialogDescription>
                  Update your post content
                </DialogDescription>
              </DialogHeader>
              
              <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-1">
                <form onSubmit={handleUpdatePost} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-post-title">Title *</Label>
                  <Input
                    id="edit-post-title"
                    placeholder="Enter your post title"
                    value={editPost.title}
                    onChange={(e) => setEditPost(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-post-content">Content *</Label>
                  <Textarea
                    id="edit-post-content"
                    placeholder="Write your post content..."
                    value={editPost.content}
                    onChange={(e) => setEditPost(prev => ({ ...prev, content: e.target.value }))}
                    className="min-h-[150px]"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-post-category">Category</Label>
                  <Select value={editPost.category} onValueChange={(value) => setEditPost(prev => ({ ...prev, category: value }))}>
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
                        const input = document.getElementById('edit-forum-image-upload') as HTMLInputElement;
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
                      id="edit-forum-image-upload"
                      disabled={editUploadSelectedImages.length >= 5}
                    />
                    <label
                      htmlFor="edit-forum-image-upload"
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
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {editImagePreviewUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <div className="aspect-square border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                              <ImageDisplay
                                src={url}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveEditImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove image"
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
                      'Update Post'
                    )}
                  </Button>
                </div>
              </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-border p-4 bg-muted/30">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search posts, tags, or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 flex-1 min-w-0"
                size="lg"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger size="lg">
                <SelectValue placeholder="Filter by category" />
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
              <SelectTrigger size="lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activity">Latest Activity</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="replies">Most Replies</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-background p-4 border-b border-border">
        <div className="flex items-center justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-blue-500" />
            <span>{sortedPosts.length} Posts Found</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-green-500" />
            <span>Page {currentPage}</span>
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
              <span className="ml-2">Loading posts...</span>
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center py-12">
              <AlertCircle className="w-8 h-8 text-red-500 mr-2" />
              <span className="text-red-500">{error}</span>
            </div>
          )}
          
          {!loading && !error && sortedPosts.map((post: ForumPost) => (
            <Card key={post.post_id} className="hover:shadow-lg transition-all duration-200 cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3" onClick={() => handlePostClick(post)}>
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={getAvatarUrl(post.avatar_url)} />
                      <AvatarFallback>{post.username?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg hover:text-blue-600 transition-colors">
                          {post.title}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <span 
                          className="font-medium text-sm cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUserClick(post.user_id);
                          }}
                        >
                          {post.username}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {post.content}
                      </p>
                      
                      {/* Images */}
                      {post.images && post.images.length > 0 && (
                        <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {post.images.slice(0, 3).map((image: any, imageIndex: number) => (
                              <div 
                                key={imageIndex} 
                                className="aspect-square overflow-hidden rounded-lg border cursor-pointer hover:shadow-md transition-shadow group"
                                onClick={() => handleForumImageClick(post.images!, imageIndex)}
                              >
                                <div className="relative w-full h-full">
                                  <ImageDisplay
                                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/uploads/forum/${image.filename}`}
                                    alt={image.originalName || `Image ${imageIndex + 1}`}
                                    className="w-full h-full"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <Eye className="w-5 h-5 text-white" />
                                  </div>
                                </div>
                              </div>
                            ))}
                            {post.images.length > 3 && (
                              <div 
                                className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg border flex items-center justify-center cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => handleForumImageClick(post.images!, 3)}
                              >
                                <div className="text-center text-gray-500 dark:text-gray-400">
                                  <ImageIcon className="w-6 h-6 mx-auto mb-1" />
                                  <span className="text-xs">+{post.images.length - 3} more</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Category */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        <Badge variant="outline" className="text-xs capitalize">
                          {post.category?.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right text-xs text-muted-foreground">
                    <div className="flex items-center gap-1 mb-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>ID: {post.post_id.slice(-6)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.commentCount || 0} replies</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950">
                        <ArrowUp className="w-4 h-4" />
                        <span className="ml-1">{post.upvotes}</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950">
                        <ArrowDown className="w-4 h-4" />
                        <span className="ml-1">{post.downvotes}</span>
                      </Button>
                    </div>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handlePostClick(post)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    
                    {canEditPost(post) && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditPost(post)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    )}
                    
                    {canDeletePost(post) && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeletePost(post.post_id, post.title)}
                        disabled={deleteLoading === post.post_id}
                        className="text-red-600 hover:text-red-700"
                      >
                        {deleteLoading === post.post_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3 mr-1" />
                        )}
                        {deleteLoading === post.post_id ? 'Deleting...' : 'Delete'}
                      </Button>
                    )}
                    
                        <Button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white" onClick={() => handleUserClick(post.user_id)}>
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Message
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {sortedPosts.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No posts found</h3>
                  <p>Try adjusting your search or filter criteria.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <PostModal
        post={selectedPost ? transformForumPostToPostModal(selectedPost) : null}
        isOpen={isPostDetailsOpen}
        onClose={() => setIsPostDetailsOpen(false)}
        onUserClick={handleUserClick}
        onReportClick={selectedPost && currentUser && currentUser.id !== selectedPost.user_id ? () => handleReportPost(selectedPost) : undefined}
      />

      {/* Forum-specific overlay for edit/delete actions */}
      {selectedPost && isPostDetailsOpen && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg p-4 flex gap-2">
          {canEditPost(selectedPost) && (
            <>
              <Button variant="outline" onClick={handleEditFromModal}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" onClick={handleDeleteFromModal} disabled={deleteLoading === selectedPost.post_id}>
                {deleteLoading === selectedPost.post_id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {deleteLoading === selectedPost.post_id ? 'Deleting...' : 'Delete'}
              </Button>
            </>
          )}
          {!canEditPost(selectedPost) && canDeletePost(selectedPost) && (
            <Button variant="outline" onClick={handleDeleteFromModal} disabled={deleteLoading === selectedPost.post_id}>
              {deleteLoading === selectedPost.post_id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              {deleteLoading === selectedPost.post_id ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </div>
      )}

      <ForumImageModal
        images={modalSelectedImages}
        currentIndex={currentImageIndex}
        isOpen={isForumImageModalOpen}
        onClose={() => setIsForumImageModalOpen(false)}
        onNext={handleNextForumImage}
        onPrevious={handlePreviousForumImage}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleSubmitReport}
        loading={reportLoading}
      />
    </div>
  );
}