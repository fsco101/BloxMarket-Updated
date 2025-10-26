import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { apiService } from '../../services/api';
import { toast } from 'sonner';
import { 
  MessageSquare, 
  Edit, 
  Trash2, 
  Plus, 
  Search,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  X,
  Upload,
  Filter
} from 'lucide-react';

interface ForumPost {
  post_id: string;
  title: string;
  content: string;
  category: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at?: string;
  username: string;
  credibility_score: number;
  user_id: string;
  images?: { filename: string; originalName?: string }[];
  commentCount: number;
}

export function MyForumPosts() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ForumPost | null>(null);
  
  // Form states
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
  
  // Image upload states
  const [newPostImages, setNewPostImages] = useState<File[]>([]);
  const [newPostImagePreviews, setNewPostImagePreviews] = useState<string[]>([]);
  const [editPostImages, setEditPostImages] = useState<File[]>([]);
  const [editPostImagePreviews, setEditPostImagePreviews] = useState<string[]>([]);

  const categories = [
    { value: 'general', label: 'General Discussion' },
    { value: 'trading_tips', label: 'Trading Tips' },
    { value: 'scammer_reports', label: 'Scammer Reports' },
    { value: 'game_updates', label: 'Game Updates' }
  ];

  const loadMyPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Get current user first
      const currentUser = await apiService.getCurrentUser();
      if (!currentUser?.id) {
        setError('Please log in to view your posts');
        setPosts([]);
        return;
      }

      console.log('Loading forum posts for user:', currentUser.id);

      // Try user-specific endpoint first, with robust mapping
      let myPosts: ForumPost[] = [];
      try {
        console.log('Attempting to fetch user-specific forum posts...');
        const userPostsResponse = await apiService.getUserForumPosts(currentUser.id);

        if (Array.isArray(userPostsResponse)) {
          myPosts = userPostsResponse.map((post: any) => ({
            post_id: post.post_id || post._id,
            title: post.title,
            content: post.content,
            category: post.category || 'general',
            upvotes: post.upvotes || 0,
            downvotes: post.downvotes || 0,
            created_at: post.created_at || post.createdAt,
            updated_at: post.updated_at || post.updatedAt,
            username: post.username || post.user?.username || currentUser.username,
            credibility_score: post.credibility_score || post.user?.credibility_score || 0,
            user_id: post.user_id || post.userId || post.user?._id || currentUser.id,
            images: Array.isArray(post.images) ? post.images.map((img: any) => ({
              filename: img.filename || img.image_url || String(img).split('/').pop(),
              originalName: img.originalName
            })) : [],
            commentCount: post.commentCount || post.comments_count || (Array.isArray(post.comments) ? post.comments.length : 0)
          }));
        }

        console.log('Successfully fetched user forum posts:', myPosts.length);
      } catch (userEndpointError) {
        console.log('User-specific forum endpoint failed, trying filtered approach:', userEndpointError);

        try {
          // Fallback: fetch all forum posts, then filter client-side
          const allForumResp = await apiService.getForumPosts({ limit: 1000 });
          let allPosts: any[] = [];

          if (allForumResp && Array.isArray(allForumResp.posts)) {
            allPosts = allForumResp.posts;
          } else if (Array.isArray(allForumResp)) {
            allPosts = allForumResp;
          } else if (allForumResp && allForumResp.data && Array.isArray(allForumResp.data)) {
            allPosts = allForumResp.data;
          }

          myPosts = allPosts
            .map((post: any) => ({
              post_id: post.post_id || post._id,
              title: post.title,
              content: post.content,
              category: post.category || 'general',
              upvotes: post.upvotes || 0,
              downvotes: post.downvotes || 0,
              created_at: post.created_at || post.createdAt,
              updated_at: post.updated_at || post.updatedAt,
              username: post.user?.username || post.username,
              credibility_score: post.user?.credibility_score || post.credibility_score || 0,
              user_id: post.user_id || post.userId || post.user?._id,
              images: Array.isArray(post.images) ? post.images.map((img: any) => ({
                filename: img.filename || img.image_url || String(img).split('/').pop(),
                originalName: img.originalName
              })) : [],
              commentCount: post.commentCount || post.comments_count || (Array.isArray(post.comments) ? post.comments.length : 0)
            }))
            .filter((post: ForumPost) => {
              const matchesId = post.user_id === currentUser.id || post.user_id === currentUser._id;
              const matchesUsername = post.username === currentUser.username;
              return matchesId || matchesUsername;
            });

          console.log('Client-side filtered forum posts:', myPosts.length);
        } catch (fallbackError) {
          console.error('All fallback methods for forum posts failed:', fallbackError);
          throw new Error('Unable to load your forum posts. Please try again later.');
        }
      }

      // Sort newest first
      const sortedPosts = myPosts.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setPosts(sortedPosts || []);
      if (sortedPosts.length === 0) {
        console.log('No forum posts found for current user');
      }
    } catch (err) {
      console.error('Error loading my forum posts:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load your forum posts';
      setError(errorMessage);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyPosts();
  }, [loadMyPosts]);

  const handleImageUpload = (files: FileList | null, isEdit: boolean = false) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return false;
      }
      return true;
    });

    if (isEdit) {
      const currentTotal = editPostImages.length;
      if (currentTotal + validFiles.length > 5) {
        toast.error('Maximum 5 images allowed per post');
        return;
      }
      setEditPostImages(prev => [...prev, ...validFiles]);
    } else {
      const currentTotal = newPostImages.length;
      if (currentTotal + validFiles.length > 5) {
        toast.error('Maximum 5 images allowed per post');
        return;
      }
      setNewPostImages(prev => [...prev, ...validFiles]);
    }

    // Create preview URLs
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (isEdit) {
          setEditPostImagePreviews(prev => [...prev, e.target?.result as string]);
        } else {
          setNewPostImagePreviews(prev => [...prev, e.target?.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number, isEdit: boolean = false) => {
    if (isEdit) {
      setEditPostImages(prev => prev.filter((_, i) => i !== index));
      setEditPostImagePreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      setNewPostImages(prev => prev.filter((_, i) => i !== index));
      setNewPostImagePreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPost.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!newPost.content.trim()) {
      toast.error('Content is required');
      return;
    }
    
    try {
      setActionLoading('create');
      
      const createdPost = await apiService.createForumPost({
        title: newPost.title,
        content: newPost.content,
        category: newPost.category
      }, newPostImages);
      
      setIsCreateDialogOpen(false);
      setNewPost({ title: '', content: '', category: 'general' });
      setNewPostImages([]);
      setNewPostImagePreviews([]);
      
      // Add the new post to the beginning of the list (newest first)
      if (createdPost) {
        setPosts(prev => [createdPost, ...prev]);
      } else {
        // If the API doesn't return the created post, reload all posts
        await loadMyPosts();
      }
      
      toast.success('Forum post created successfully!');
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create post');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditPost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingPost) return;
    
    if (!editPost.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!editPost.content.trim()) {
      toast.error('Content is required');
      return;
    }
    
    try {
      setActionLoading('edit');
      
      const updatedPost = await apiService.updateForumPost(editingPost.post_id, {
        title: editPost.title,
        content: editPost.content,
        category: editPost.category
      }, editPostImages);
      
      setIsEditDialogOpen(false);
      setEditingPost(null);
      setEditPost({ title: '', content: '', category: 'general' });
      setEditPostImages([]);
      setEditPostImagePreviews([]);
      
      // Update the post in the list
      if (updatedPost) {
        setPosts(prev => prev.map(post => 
          post.post_id === editingPost.post_id ? updatedPost : post
        ));
      } else {
        // If the API doesn't return the updated post, reload all posts
        await loadMyPosts();
      }
      
      toast.success('Forum post updated successfully!');
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update post');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }
    
    try {
      setActionLoading(postId);
      
      await apiService.deleteForumPost(postId);
      
      // Remove the post from the list
      setPosts(prev => prev.filter(post => post.post_id !== postId));
      toast.success('Forum post deleted successfully!');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete post');
    } finally {
      setActionLoading(null);
    }
  };

  const openEditDialog = (post: ForumPost) => {
    setEditingPost(post);
    setEditPost({
      title: post.title,
      content: post.content,
      category: post.category
    });
    setEditPostImages([]);
    setEditPostImagePreviews([]);
    setIsEditDialogOpen(true);
  };

  // Filter and sort posts
  const filteredAndSortedPosts = posts
    .filter(post => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' || 
        post.title.toLowerCase().includes(searchLower) ||
        post.content.toLowerCase().includes(searchLower) ||
        (post.category && post.category.toLowerCase().includes(searchLower));
    
      const matchesCategory = categoryFilter === 'all' || post.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'popular':
          return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
        case 'comments':
          return (b.commentCount || 0) - (a.commentCount || 0);
        case 'updated':
          // Sort by last updated date
          const aDate = new Date(a.updated_at || a.created_at).getTime();
          const bDate = new Date(b.updated_at || b.created_at).getTime();
          return bDate - aDate;
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading your forum posts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-500" />
            My Forum Posts
          </h1>
          <p className="text-muted-foreground">
            Manage your forum posts and discussions • {posts.length} total posts
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Forum Post</DialogTitle>
              <DialogDescription>
                Share your thoughts with the community
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-title">Title</Label>
                <Input
                  id="new-title"
                  placeholder="Enter post title..."
                  value={newPost.title}
                  onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-category">Category</Label>
                <Select value={newPost.category} onValueChange={(value) => setNewPost(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
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
              
              <div className="space-y-2">
                <Label htmlFor="new-content">Content</Label>
                <Textarea
                  id="new-content"
                  placeholder="Write your post content..."
                  value={newPost.content}
                  onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                  rows={6}
                  required
                />
              </div>
              
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Images (Optional)</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files)}
                    className="hidden"
                    id="new-post-images"
                  />
                  <label htmlFor="new-post-images" className="cursor-pointer">
                    <div className="text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload images (max 5, 5MB each)
                      </p>
                    </div>
                  </label>
                  
                  {newPostImagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
                      {newPostImagePreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 w-6 h-6 p-0"
                            onClick={() => removeImage(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading === 'create'}>
                  {actionLoading === 'create' ? (
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
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search your posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="updated">Recently Updated</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="comments">Most Comments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Posts List */}
      {filteredAndSortedPosts.length > 0 ? (
        <div className="space-y-4">
          {filteredAndSortedPosts.map((post) => (
            <Card key={post.post_id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{post.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Badge variant="outline" className="text-xs">
                            {categories.find(c => c.value === post.category)?.label || post.category}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                          {post.updated_at && post.updated_at !== post.created_at && (
                            <span className="text-xs text-blue-600">• Updated</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground mb-3 line-clamp-3">
                      {post.content}
                    </p>
                    
                    {post.images && post.images.length > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                        <ImageIcon className="w-4 h-4" />
                        {post.images.length} image{post.images.length !== 1 ? 's' : ''}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 text-green-600">
                        <ThumbsUp className="w-4 h-4" />
                        {post.upvotes}
                      </span>
                      <span className="flex items-center gap-1 text-red-600">
                        <ThumbsDown className="w-4 h-4" />
                        {post.downvotes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        {post.commentCount}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(post)}
                      disabled={actionLoading !== null}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePost(post.post_id)}
                      disabled={actionLoading !== null}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {actionLoading === post.post_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Forum Posts Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || categoryFilter !== 'all' 
                ? 'No posts match your current filters.' 
                : "You haven't created any forum posts yet."}
            </p>
            {searchTerm || categoryFilter !== 'all' ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                }}
              >
                <Filter className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            ) : (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Post
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Forum Post</DialogTitle>
            <DialogDescription>
              Update your forum post
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditPost} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                placeholder="Enter post title..."
                value={editPost.title}
                onChange={(e) => setEditPost(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select value={editPost.category} onValueChange={(value) => setEditPost(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
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
            
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                placeholder="Write your post content..."
                value={editPost.content}
                onChange={(e) => setEditPost(prev => ({ ...prev, content: e.target.value }))}
                rows={6}
                required
              />
            </div>
            
            {/* Current Images */}
            {editingPost?.images && editingPost.images.length > 0 && (
              <div className="space-y-2">
                <Label>Current Images</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {editingPost.images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/uploads/forum/${image.filename}`}
                        alt={image.originalName || `Image ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* New Image Upload */}
            <div className="space-y-2">
              <Label>Add New Images (Optional)</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files, true)}
                  className="hidden"
                  id="edit-post-images"
                />
                <label htmlFor="edit-post-images" className="cursor-pointer">
                  <div className="text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload additional images
                    </p>
                  </div>
                </label>
                
                {editPostImagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
                    {editPostImagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`New Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 w-6 h-6 p-0"
                          onClick={() => removeImage(index, true)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading === 'edit'}>
                {actionLoading === 'edit' ? (
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
        </DialogContent>
      </Dialog>
    </div>
  );
}