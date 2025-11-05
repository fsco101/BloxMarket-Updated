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
import { alertService } from '../../services/alertService';
import { toast } from 'sonner';
import { 
  ShoppingCart, 
  Edit, 
  Trash2, 
  Plus, 
  Search,
  Calendar,
  DollarSign,
  Package,
  Eye,
  Users,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  X,
  Upload,
  Archive,
  ArrowUp,
  ArrowDown,
  MessageSquare
} from 'lucide-react';

// Update the interface to match TradingHub structure
interface TradingPost {
  trade_id: string;
  item_offered: string;
  item_requested?: string;
  description?: string;
  status: 'expired';
  created_at: string;
  updated_at?: string;
  username: string;
  user_id: string;
  images?: Array<{ image_url: string; uploaded_at: string }>;
  upvotes?: number;
  downvotes?: number;
  comment_count?: number;
}

export function MyTradePosts() {
  const [posts, setPosts] = useState<TradingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<TradingPost | null>(null);
  
  // Form states
  const [newPost, setNewPost] = useState({
    itemOffered: '',
    itemRequested: '',
    description: ''
  });
  const [editPost, setEditPost] = useState({
    itemOffered: '',
    itemRequested: '',
    description: ''
  });
  
  // Image upload states
  const [newPostImages, setNewPostImages] = useState<File[]>([]);
  const [newPostImagePreviews, setNewPostImagePreviews] = useState<string[]>([]);
  const [editPostImages, setEditPostImages] = useState<File[]>([]);
  const [editPostImagePreviews, setEditPostImagePreviews] = useState<string[]>([]);

  const tradeTypes = [
    { value: 'trade', label: 'Trade' },
    { value: 'sell', label: 'Sell' },
    { value: 'buy', label: 'Buy' }
  ];

  const statuses = [
    { value: 'expired', label: 'Expired', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' }
  ];

  const loadMyTrades = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get current user first
      const currentUser = await apiService.getCurrentUser();
      if (!currentUser) {
        setError('Please log in to view your trades');
        return;
      }

      console.log('Loading trades for user:', currentUser.id);

      // Try to get user-specific trade posts with multiple fallback strategies
      let myTrades: TradingPost[] = [];
      
      try {
        // Primary: Use dedicated user trades endpoint
        console.log('Attempting to fetch user-specific trades...');
        const userTradesResponse = await apiService.getUserTrades(currentUser.id);
        
        // Handle the response and map to our interface
        if (Array.isArray(userTradesResponse)) {
          myTrades = userTradesResponse.map((trade: any) => ({
            trade_id: trade.trade_id || trade._id,
            item_offered: trade.item_offered || trade.itemOffered,
            item_requested: trade.item_requested || trade.itemRequested,
            description: trade.description,
            status: trade.status || 'open',
            created_at: trade.created_at || trade.createdAt,
            updated_at: trade.updated_at || trade.updatedAt,
            username: trade.user?.username || trade.username || currentUser.username,
            user_id: trade.user_id || trade.userId || trade.user?._id || currentUser.id,
            images: trade.images || [],
            upvotes: trade.upvotes || 0,
            downvotes: trade.downvotes || 0,
            comment_count: trade.comment_count || trade.commentCount || 0
          }));
        }
        
        console.log('Successfully fetched user trades:', myTrades.length);
      } catch (userEndpointError) {
        console.log('User-specific endpoint failed, trying filtered approach:', userEndpointError);
        
        try {
          // Fallback: Get all trades and filter client-side
          const allTradesResponse = await apiService.getTrades({ limit: 1000 });
          let allTrades = [];
          
          // Handle different response formats
          if (allTradesResponse && Array.isArray(allTradesResponse.trades)) {
            allTrades = allTradesResponse.trades;
          } else if (Array.isArray(allTradesResponse)) {
            allTrades = allTradesResponse;
          } else if (allTradesResponse && allTradesResponse.data && Array.isArray(allTradesResponse.data)) {
            allTrades = allTradesResponse.data;
          }
          
          // Map and filter trades for current user
          myTrades = allTrades
            .map((trade: any) => ({
              trade_id: trade.trade_id || trade._id,
              item_offered: trade.item_offered || trade.itemOffered,
              item_requested: trade.item_requested || trade.itemRequested,
              description: trade.description,
              status: trade.status || 'open',
              created_at: trade.created_at || trade.createdAt,
              updated_at: trade.updated_at || trade.updatedAt,
              username: trade.user?.username || trade.username,
              user_id: trade.user_id || trade.userId || trade.user?._id,
              images: trade.images || [],
              upvotes: trade.upvotes || 0,
              downvotes: trade.downvotes || 0,
              comment_count: trade.comment_count || trade.commentCount || 0
            }))
            .filter(trade => {
              // More robust filtering with multiple ID checks
              const matchesId = trade.user_id === currentUser.id || 
                              trade.user_id === currentUser._id;
              const matchesUsername = trade.username === currentUser.username;
              
              return matchesId || matchesUsername;
            });
            
          console.log('Client-side filtered trades:', myTrades.length);
        } catch (fallbackError) {
          console.error('All fallback methods failed:', fallbackError);
          throw new Error('Unable to load your trade posts. Please try again later.');
        }
      }
      
      // Sort trades by creation date (newest first) for better UX
      const sortedTrades = myTrades.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setPosts(sortedTrades || []);
      
      if (sortedTrades.length === 0) {
        console.log('No trades found for current user');
      }
      
    } catch (err) {
      console.error('Error loading my trading posts:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load your trading posts';
      setError(errorMessage);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyTrades();
  }, [loadMyTrades]);

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
      if (currentTotal + validFiles.length > 10) {
        toast.error('Maximum 10 images allowed per trade post');
        return;
      }
      setEditPostImages(prev => [...prev, ...validFiles]);
    } else {
      const currentTotal = newPostImages.length;
      if (currentTotal + validFiles.length > 10) {
        toast.error('Maximum 10 images allowed per trade post');
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
    
    if (!newPost.itemOffered.trim()) {
      toast.error('Item offered is required');
      return;
    }
    
    try {
      setActionLoading('create');
      
      const tradeData = {
        itemOffered: newPost.itemOffered,
        itemRequested: newPost.itemRequested || '',
        description: newPost.description || ''
      };
      
      console.log('Creating trade with images:', newPostImages.length);
      
      const createdTrade = await apiService.createTrade(tradeData, newPostImages);
      
      setIsCreateDialogOpen(false);
      setNewPost({
        itemOffered: '',
        itemRequested: '',
        description: ''
      });
      setNewPostImages([]);
      setNewPostImagePreviews([]);
      
      // Add the new trade to the beginning of the list (newest first)
      if (createdTrade) {
        setPosts(prev => [createdTrade, ...prev]);
      } else {
        // If the API doesn't return the created trade, reload all trades
        await loadMyTrades();
      }
      
      toast.success('Trade post created successfully! 🎉', {
        description: 'Your trade has been posted and is now visible to other users.'
      });
    } catch (error) {
      console.error('Error creating trade post:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create trade post';
      toast.error('Failed to create trade', {
        description: errorMessage
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditPost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingPost) return;
    
    if (!editPost.itemOffered.trim()) {
      toast.error('Item offered is required');
      return;
    }
    
    try {
      setActionLoading('edit');
      
      const tradeData = {
        itemOffered: editPost.itemOffered,
        itemRequested: editPost.itemRequested || '',
        description: editPost.description || ''
      };
      
      console.log('Updating trade with images:', editPostImages.length);
      
      const updatedTrade = await apiService.updateTrade(editingPost.trade_id, tradeData, editPostImages);
      
      setIsEditDialogOpen(false);
      setEditingPost(null);
      setEditPost({
        itemOffered: '',
        itemRequested: '',
        description: ''
      });
      setEditPostImages([]);
      setEditPostImagePreviews([]);
      
      // Update the trade in the list
      if (updatedTrade) {
        setPosts(prev => prev.map(post => 
          post.trade_id === editingPost.trade_id ? updatedTrade : post
        ));
      } else {
        // If the API doesn't return the updated trade, reload all trades
        await loadMyTrades();
      }
      
      toast.success('Trade post updated successfully! 🎉', {
        description: 'Your trade has been updated and is now visible to other users.'
      });
    } catch (error) {
      console.error('Error updating trade post:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update trade post';
      toast.error('Failed to update trade', {
        description: errorMessage
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePost = async (tradeId: string) => {
    const confirmed = await alertService.confirm(
      'Delete Trade Post',
      'Are you sure you want to delete this trade post? This action cannot be undone.',
      'Delete',
      'Cancel'
    );
    
    if (!confirmed) {
      return;
    }
    
    try {
      setActionLoading(tradeId);
      
      await apiService.deleteTrade(tradeId);
      
      setPosts(prev => prev.filter(post => post.trade_id !== tradeId));
      toast.success('Trading post deleted successfully!');
    } catch (error) {
      console.error('Error deleting trade post:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete trade post');
    } finally {
      setActionLoading(null);
    }
  };

  // Removed handleStatusChange function as we no longer need status changes

  const openEditDialog = (post: TradingPost) => {
    setEditingPost(post);
    setEditPost({
      itemOffered: post.item_offered,
      itemRequested: post.item_requested || '',
      description: post.description || ''
    });
    setEditPostImages([]);
    setEditPostImagePreviews([]);
    setIsEditDialogOpen(true);
  };

  const getStatusIcon = () => {
    // We now only have expired status
    return <Archive className="w-4 h-4" />;
  };

  const filteredPosts = posts.filter(post => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' ||
                         post.item_offered.toLowerCase().includes(searchLower) ||
                         (post.item_requested && post.item_requested.toLowerCase().includes(searchLower)) ||
                         (post.description && post.description.toLowerCase().includes(searchLower));
    const matchesType = typeFilter === 'all' || post.status === typeFilter;
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading your trading posts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-green-500" />
            My Trading Posts
          </h1>
          <p className="text-muted-foreground">Manage your trading posts and offers</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Trade Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Trading Post</DialogTitle>
              <DialogDescription>
                Fill out the details for your trade listing
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-offered">What you're offering *</Label>
                <Input
                  id="new-offered"
                  placeholder="Enter the item you're trading away"
                  value={newPost.itemOffered}
                  onChange={(e) => setNewPost(prev => ({ ...prev, itemOffered: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-requested">What you want (optional)</Label>
                <Input
                  id="new-requested"
                  placeholder="Enter what you're looking for"
                  value={newPost.itemRequested}
                  onChange={(e) => setNewPost(prev => ({ ...prev, itemRequested: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-description">Description (optional)</Label>
                <Textarea
                  id="new-description"
                  placeholder="Add additional details about your trade..."
                  value={newPost.description}
                  onChange={(e) => setNewPost(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-[100px]"
                />
              </div>
              
              {/* Image Upload Section - Match TradingHub style */}
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
                      const input = document.getElementById('new-trade-images') as HTMLInputElement;
                      const dt = new DataTransfer();
                      files.forEach(file => dt.items.add(file));
                      input.files = dt.files;
                      handleImageUpload(input.files);
                    }
                  }}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files)}
                    className="hidden"
                    id="new-trade-images"
                    disabled={newPostImages.length >= 5}
                  />
                  <label
                    htmlFor="new-trade-images"
                    className={`cursor-pointer flex flex-col items-center gap-2 ${
                      newPostImages.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {newPostImages.length >= 5 
                        ? 'Maximum 5 images reached' 
                        : 'Click to upload images or drag and drop'
                      }
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      PNG, JPG, GIF up to 5MB each • {newPostImages.length}/5 selected
                    </span>
                  </label>
                </div>

                {/* Image Previews */}
                {newPostImagePreviews.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {newPostImagePreviews.length} image{newPostImagePreviews.length !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {newPostImagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
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
              
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={actionLoading === 'create'}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white" disabled={actionLoading === 'create'}>
                  {actionLoading === 'create' ? (
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
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search your trades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                size="lg"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger size="lg" className="w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {tradeTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger size="lg" className="w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
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
      {filteredPosts.length > 0 ? (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <Card key={post.trade_id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          Trading: {post.item_offered}
                          {post.item_requested && ` for ${post.item_requested}`}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Badge className={`text-xs ${statuses.find(s => s.value === post.status)?.color || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'}`}>
                            {getStatusIcon()}
                            <span className="ml-1">{statuses.find(s => s.value === post.status)?.label || post.status}</span>
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Offering:</p>
                        <p className="font-medium">{post.item_offered}</p>
                      </div>
                      {post.item_requested && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Requesting:</p>
                          <p className="font-medium">{post.item_requested}</p>
                        </div>
                      )}
                    </div>
                    
                    {post.description && (
                      <p className="text-muted-foreground mb-3 line-clamp-2">
                        {post.description}
                      </p>
                    )}
                    
                    {post.images && post.images.length > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                        <ImageIcon className="w-4 h-4" />
                        {post.images.length} image{post.images.length !== 1 ? 's' : ''}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ArrowUp className="w-4 h-4 text-green-600" />
                        {post.upvotes || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <ArrowDown className="w-4 h-4 text-red-600" />
                        {post.downvotes || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {post.comment_count || 0}
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
                      onClick={() => handleDeletePost(post.trade_id)}
                      disabled={actionLoading !== null}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {actionLoading === post.trade_id ? (
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
            <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Trading Posts Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'No posts match your current filters.' 
                : "You haven't created any trading posts yet."}
            </p>
            {!searchTerm && typeFilter === 'all' && statusFilter === 'all' && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Trade Post
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Trading Post</DialogTitle>
            <DialogDescription>
              Update the details for your trade listing
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditPost} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-offered">What you're offering *</Label>
              <Input
                id="edit-offered"
                placeholder="Enter the item you're trading away"
                value={editPost.itemOffered}
                onChange={(e) => setEditPost(prev => ({ ...prev, itemOffered: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-requested">What you want (optional)</Label>
              <Input
                id="edit-requested"
                placeholder="Enter what you're looking for"
                value={editPost.itemRequested}
                onChange={(e) => setEditPost(prev => ({ ...prev, itemRequested: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea
                id="edit-description"
                placeholder="Add additional details about your trade..."
                value={editPost.description}
                onChange={(e) => setEditPost(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[100px]"
              />
            </div>
            
            {/* Current Images */}
            {editingPost?.images && editingPost.images.length > 0 && (
              <div className="space-y-2">
                <Label>Current Images</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {editingPost.images.map((image, index) => {
                    // Handle different image URL formats
                    let imageUrl = image.image_url;
                    if (!imageUrl.startsWith('http')) {
                      // If it's a relative path, construct the full URL
                      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                      if (imageUrl.startsWith('/')) {
                        imageUrl = `${baseUrl}${imageUrl}`;
                      } else {
                        imageUrl = `${baseUrl}/api/uploads/trades/${imageUrl}`;
                      }
                    }
                    
                    return (
                      <div key={index} className="relative">
                        <img
                          src={imageUrl}
                          alt={`Trade Image ${index + 1}`}
                          className="w-full h-24 object-cover rounded border"
                          onError={(e) => {
                            // Fallback if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* New Image Upload - Match TradingHub style */}
            <div className="space-y-2">
              <Label>Add New Images (optional - up to 5 images total)</Label>
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
                    const input = document.getElementById('edit-trade-images') as HTMLInputElement;
                    const dt = new DataTransfer();
                    files.forEach(file => dt.items.add(file));
                    input.files = dt.files;
                    handleImageUpload(input.files, true);
                  }
                }}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files, true)}
                  className="hidden"
                  id="edit-trade-images"
                  disabled={editPostImages.length >= 5}
                />
                <label
                  htmlFor="edit-trade-images"
                  className={`cursor-pointer flex flex-col items-center gap-2 ${
                    editPostImages.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {editPostImages.length >= 5 
                      ? 'Maximum 5 images reached' 
                      : 'Click to upload additional images or drag and drop'
                    }
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    PNG, JPG, GIF up to 5MB each • {editPostImages.length}/5 selected
                  </span>
                </label>
              </div>
              
              {editPostImagePreviews.length > 0 && (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {editPostImagePreviews.length} new image{editPostImagePreviews.length !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {editPostImagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index, true)}
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
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={actionLoading === 'edit'}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white" disabled={actionLoading === 'edit'}>
                {actionLoading === 'edit' ? (
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
  );
}