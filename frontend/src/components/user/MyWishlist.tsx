import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../ui/card';
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
  Heart, 
  Edit, 
  Trash2, 
  Plus, 
  Search,
  Calendar,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  X,
  Upload,
  Filter,
  DollarSign
} from 'lucide-react';

interface Wishlist {
  wishlist_id: string;
  item_name: string;
  description: string;
  max_price: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at?: string;
  username: string;
  credibility_score: number;
  user_id: string;
  images?: { filename: string; originalName?: string }[];
  comment_count: number;
  watchers?: number;
}

export function MyWishlist() {
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingWishlist, setEditingWishlist] = useState<Wishlist | null>(null);
  
  // Form states
  const [newWishlist, setNewWishlist] = useState<{
    item_name: string;
    description: string;
    max_price: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
  }>({
    item_name: '',
    description: '',
    max_price: 'Negotiable',
    category: 'limiteds',
    priority: 'medium'
  });
  
  const [editWishlist, setEditWishlist] = useState<{
    item_name: string;
    description: string;
    max_price: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
  }>({
    item_name: '',
    description: '',
    max_price: 'Negotiable',
    category: 'limiteds',
    priority: 'medium'
  });
  
  // Image upload states
  const [newWishlistImages, setNewWishlistImages] = useState<File[]>([]);
  const [newWishlistImagePreviews, setNewWishlistImagePreviews] = useState<string[]>([]);
  const [editWishlistImages, setEditWishlistImages] = useState<File[]>([]);
  const [editWishlistImagePreviews, setEditWishlistImagePreviews] = useState<string[]>([]);

  const categories = [
    { value: 'limiteds', label: 'Limiteds' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'gear', label: 'Gear' },
    { value: 'event-items', label: 'Event Items' },
    { value: 'gamepasses', label: 'Game Passes' }
  ];

  const priorities = [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];

  const loadMyWishlists = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Get current user first
      const currentUser = await apiService.getCurrentUser();
      if (!currentUser?.id) {
        setError('Please log in to view your wishlist');
        setWishlists([]);
        return;
      }

      console.log('Loading wishlists for user:', currentUser.id);

      // Try to fetch user's wishlists
      try {
        console.log('Attempting to fetch user wishlists...');
        const response = await apiService.getWishlists({ user_id: currentUser.id, limit: 100 });
        
        let userWishlists: Wishlist[] = [];
        
        interface WishlistResponse {
          wishlist_id?: string;
          _id?: string;
          item_name: string;
          description?: string;
          max_price?: string;
          category: string;
          priority?: string;
          upvotes?: number;
          downvotes?: number;
          created_at?: string;
          createdAt?: string;
          updated_at?: string;
          updatedAt?: string;
          username?: string;
          credibility_score?: number;
          user_id?: string;
          images?: Array<{ filename: string; originalName?: string }>;
          comment_count?: number;
          watchers?: number;
        }
        
        const mapToWishlist = (item: WishlistResponse): Wishlist => ({
          wishlist_id: String(item.wishlist_id || item._id || ''),
          item_name: item.item_name,
          description: item.description || '',
          max_price: item.max_price || 'Negotiable',
          category: item.category,
          priority: (item.priority || 'medium') as 'high' | 'medium' | 'low',
          upvotes: item.upvotes || 0,
          downvotes: item.downvotes || 0,
          created_at: item.created_at || item.createdAt || new Date().toISOString(),
          updated_at: item.updated_at || item.updatedAt,
          username: item.username || currentUser.username,
          credibility_score: item.credibility_score || 0,
          user_id: String(item.user_id || currentUser.id),
          images: Array.isArray(item.images) ? item.images : [],
          comment_count: item.comment_count || 0,
          watchers: item.watchers || 0
        });
        
        if (response?.wishlists && Array.isArray(response.wishlists)) {
          userWishlists = response.wishlists.map(mapToWishlist);
        } else if (Array.isArray(response)) {
          userWishlists = response.map(mapToWishlist);
        }

        console.log('Successfully fetched user wishlists:', userWishlists.length);
        setWishlists(userWishlists);
        
        if (userWishlists.length === 0) {
          console.log('No wishlists found for current user');
        }
      } catch (error) {
        console.error('Error fetching user wishlists:', error);
        setError('Failed to fetch your wishlists. Please try again later.');
        setWishlists([]);
      }
    } catch (err) {
      console.error('Error loading my wishlists:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load your wishlists';
      setError(errorMessage);
      setWishlists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyWishlists();
  }, [loadMyWishlists]);

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
      const currentTotal = editWishlistImages.length;
      if (currentTotal + validFiles.length > 5) {
        toast.error('Maximum 5 images allowed per wishlist');
        return;
      }
      setEditWishlistImages(prev => [...prev, ...validFiles]);
    } else {
      const currentTotal = newWishlistImages.length;
      if (currentTotal + validFiles.length > 5) {
        toast.error('Maximum 5 images allowed per wishlist');
        return;
      }
      setNewWishlistImages(prev => [...prev, ...validFiles]);
    }

    // Create preview URLs
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (isEdit) {
          setEditWishlistImagePreviews(prev => [...prev, e.target?.result as string]);
        } else {
          setNewWishlistImagePreviews(prev => [...prev, e.target?.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number, isEdit: boolean = false) => {
    if (isEdit) {
      setEditWishlistImages(prev => prev.filter((_, i) => i !== index));
      setEditWishlistImagePreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      setNewWishlistImages(prev => prev.filter((_, i) => i !== index));
      setNewWishlistImagePreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleCreateWishlist = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newWishlist.item_name.trim()) {
      toast.error('Item name is required');
      return;
    }
    
    try {
      setActionLoading('create');
      
      const created = await apiService.createWishlistWithImages({
        item_name: newWishlist.item_name,
        description: newWishlist.description,
        max_price: newWishlist.max_price,
        category: newWishlist.category,
        priority: newWishlist.priority
      }, newWishlistImages);
      
      setIsCreateDialogOpen(false);
      setNewWishlist({ 
        item_name: '', 
        description: '', 
        max_price: 'Negotiable', 
        category: 'limiteds', 
        priority: 'medium' 
      });
      setNewWishlistImages([]);
      setNewWishlistImagePreviews([]);
      
      // Add the new wishlist to the beginning of the list (newest first)
      if (created?.wishlist) {
        setWishlists(prev => [created.wishlist, ...prev]);
      } else {
        // If the API doesn't return the created wishlist, reload all wishlists
        await loadMyWishlists();
      }
      
      toast.success('Wishlist item created successfully!');
    } catch (error) {
      console.error('Error creating wishlist:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create wishlist item');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditWishlist = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingWishlist) return;
    
    if (!editWishlist.item_name.trim()) {
      toast.error('Item name is required');
      return;
    }
    
    try {
      setActionLoading('edit');
      
      // Update the wishlist
      await apiService.updateWishlist(editingWishlist.wishlist_id, {
        item_name: editWishlist.item_name,
        description: editWishlist.description,
        max_price: editWishlist.max_price,
        category: editWishlist.category,
        priority: editWishlist.priority
      });
      
      // Upload new images if any
      if (editWishlistImages.length > 0) {
        await apiService.uploadWishlistImages(editingWishlist.wishlist_id, editWishlistImages);
      }
      
      setIsEditDialogOpen(false);
      setEditingWishlist(null);
      setEditWishlist({ 
        item_name: '', 
        description: '', 
        max_price: 'Negotiable', 
        category: 'limiteds', 
        priority: 'medium' 
      });
      setEditWishlistImages([]);
      setEditWishlistImagePreviews([]);
      
      // Reload wishlists to get updated data
      await loadMyWishlists();
      
      toast.success('Wishlist item updated successfully!');
    } catch (error) {
      console.error('Error updating wishlist:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update wishlist item');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteWishlist = async (wishlistId: string) => {
    if (!confirm('Are you sure you want to delete this wishlist item? This action cannot be undone.')) {
      return;
    }
    
    try {
      setActionLoading(wishlistId);
      
      await apiService.deleteWishlist(wishlistId);
      
      // Remove the wishlist from the list
      setWishlists(prev => prev.filter(item => item.wishlist_id !== wishlistId));
      toast.success('Wishlist item deleted successfully!');
    } catch (error) {
      console.error('Error deleting wishlist:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete wishlist item');
    } finally {
      setActionLoading(null);
    }
  };

  const openEditDialog = (wishlist: Wishlist) => {
    setEditingWishlist(wishlist);
    setEditWishlist({
      item_name: wishlist.item_name,
      description: wishlist.description,
      max_price: wishlist.max_price,
      category: wishlist.category,
      priority: wishlist.priority
    });
    setEditWishlistImages([]);
    setEditWishlistImagePreviews([]);
    setIsEditDialogOpen(true);
  };

  // Filter and sort wishlists
  const filteredAndSortedWishlists = wishlists
    .filter(wishlist => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' || 
        wishlist.item_name.toLowerCase().includes(searchLower) ||
        wishlist.description.toLowerCase().includes(searchLower);
    
      const matchesCategory = categoryFilter === 'all' || wishlist.category === categoryFilter;
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
          return (b.comment_count || 0) - (a.comment_count || 0);
        case 'priority': {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading your wishlist items...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500" />
            My Wishlist
          </h1>
          <p className="text-muted-foreground">
            Manage your wishlist items • {wishlists.length} total items
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600">
              <Plus className="w-4 h-4 mr-2" />
              New Wishlist Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Wishlist Item</DialogTitle>
              <DialogDescription>
                Add an item to your wishlist
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateWishlist} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-item-name">Item Name</Label>
                <Input
                  id="new-item-name"
                  placeholder="Enter item name..."
                  value={newWishlist.item_name}
                  onChange={(e) => setNewWishlist(prev => ({ ...prev, item_name: e.target.value }))}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-category">Category</Label>
                  <Select value={newWishlist.category} onValueChange={(value) => setNewWishlist(prev => ({ ...prev, category: value }))}>
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
                  <Label htmlFor="new-priority">Priority</Label>
                  <Select value={newWishlist.priority} onValueChange={(value: 'high' | 'medium' | 'low') => setNewWishlist(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map(priority => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-max-price">Max Price</Label>
                <Input
                  id="new-max-price"
                  placeholder="Enter max price or 'Negotiable'..."
                  value={newWishlist.max_price}
                  onChange={(e) => setNewWishlist(prev => ({ ...prev, max_price: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-description">Description</Label>
                <Textarea
                  id="new-description"
                  placeholder="Describe the item you're looking for..."
                  value={newWishlist.description}
                  onChange={(e) => setNewWishlist(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
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
                    id="new-wishlist-images"
                  />
                  <label htmlFor="new-wishlist-images" className="cursor-pointer">
                    <div className="text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload images (max 5, 5MB each)
                      </p>
                    </div>
                  </label>
                  
                  {newWishlistImagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
                      {newWishlistImagePreviews.map((preview, index) => (
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
                    'Create Wishlist Item'
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
                  placeholder="Search your wishlist..."
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
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="comments">Most Comments</SelectItem>
                  <SelectItem value="priority">By Priority</SelectItem>
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

      {/* Wishlists List */}
      {filteredAndSortedWishlists.length > 0 ? (
        <div className="space-y-4">
          {filteredAndSortedWishlists.map((wishlist) => (
            <Card key={wishlist.wishlist_id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h3 className="font-semibold text-lg mb-1">{wishlist.item_name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          wishlist.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                          wishlist.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                          'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        }>
                          {wishlist.priority} priority
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {categories.find(c => c.value === wishlist.category)?.label || wishlist.category}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(wishlist.created_at).toLocaleDateString()}
                      </span>
                      {wishlist.updated_at && wishlist.updated_at !== wishlist.created_at && (
                        <span className="text-xs text-blue-600">• Updated</span>
                      )}
                    </div>
                    
                    <p className="text-muted-foreground mb-3 line-clamp-2">
                      {wishlist.description || 'No description provided'}
                    </p>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <DollarSign className="w-4 h-4" />
                        {wishlist.max_price}
                      </span>
                    </div>
                    
                    {wishlist.images && wishlist.images.length > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                        <ImageIcon className="w-4 h-4" />
                        {wishlist.images.length} image{wishlist.images.length !== 1 ? 's' : ''}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 text-green-600">
                        <ArrowUp className="w-4 h-4" />
                        {wishlist.upvotes}
                      </span>
                      <span className="flex items-center gap-1 text-red-600">
                        <ArrowDown className="w-4 h-4" />
                        {wishlist.downvotes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {wishlist.comment_count}
                      </span>
                      <span className="flex items-center gap-1 text-blue-600">
                        <Heart className="w-4 h-4" />
                        {wishlist.watchers || 0}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(wishlist)}
                      disabled={actionLoading !== null}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteWishlist(wishlist.wishlist_id)}
                      disabled={actionLoading !== null}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {actionLoading === wishlist.wishlist_id ? (
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
            <Heart className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Wishlist Items Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || categoryFilter !== 'all' 
                ? 'No items match your current filters.' 
                : "You haven't added any items to your wishlist yet."}
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
                Add Your First Wishlist Item
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Wishlist Item</DialogTitle>
            <DialogDescription>
              Update your wishlist item details
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditWishlist} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-item-name">Item Name</Label>
              <Input
                id="edit-item-name"
                placeholder="Enter item name..."
                value={editWishlist.item_name}
                onChange={(e) => setEditWishlist(prev => ({ ...prev, item_name: e.target.value }))}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select value={editWishlist.category} onValueChange={(value) => setEditWishlist(prev => ({ ...prev, category: value }))}>
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
                <Label htmlFor="edit-priority">Priority</Label>
                <Select value={editWishlist.priority} onValueChange={(value: 'high' | 'medium' | 'low') => setEditWishlist(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map(priority => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-max-price">Max Price</Label>
              <Input
                id="edit-max-price"
                placeholder="Enter max price or 'Negotiable'..."
                value={editWishlist.max_price}
                onChange={(e) => setEditWishlist(prev => ({ ...prev, max_price: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Describe the item you're looking for..."
                value={editWishlist.description}
                onChange={(e) => setEditWishlist(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>
            
            {/* Current Images */}
            {editingWishlist?.images && editingWishlist.images.length > 0 && (
              <div className="space-y-2">
                <Label>Current Images</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {editingWishlist.images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={`${window.location.protocol}//${window.location.hostname}:5000/uploads/wishlists/${image.filename}`}
                        alt={image.originalName || `Image ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          console.error('Image failed to load:', image.filename);
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Image+Not+Found';
                        }}
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
                  id="edit-wishlist-images"
                />
                <label htmlFor="edit-wishlist-images" className="cursor-pointer">
                  <div className="text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload additional images
                    </p>
                  </div>
                </label>
                
                {editWishlistImagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
                    {editWishlistImagePreviews.map((preview, index) => (
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
                  'Update Wishlist Item'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}