import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import {
  Heart,
  MoreHorizontal,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Flag,
  Trash2,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  User,
  Loader2,
  CalendarDays,
  DollarSign,
  Clock,
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
  user_id: string;
  username: string;
  credibility_score: number;
  watchers?: number;
  image_count: number;
  is_visible?: boolean;
  is_flagged?: boolean;
  flagged_reason?: string;
  hidden_reason?: string;
}

interface User {
  username: string;
  user_id: string;
  credibility_score: number;
}

interface WishlistStats {
  total: number;
  categories: { category: string; count: number }[];
  priorities: { priority: string; count: number }[];
  popular: {
    wishlist_id: string;
    item_name: string;
    category: string;
    upvotes: number;
    downvotes: number;
    popularity: number;
  }[];
  recent: {
    wishlist_id: string;
    item_name: string;
    category: string;
    created_at: string;
    username: string;
  }[];
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'limiteds', label: 'Limited Items' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'gear', label: 'Gear' },
  { value: 'event-items', label: 'Event Items' },
  { value: 'gamepasses', label: 'Game Passes' },
];

const priorities = [
  { value: 'all', label: 'All Priorities' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

// Format date to be more readable
const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return 'Invalid date';
  }
};

export function WishlistManagement() {
  // State variables
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedWishlist, setSelectedWishlist] = useState<Wishlist | null>(null);
  const [statistics, setStatistics] = useState<WishlistStats | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedWishlists, setSelectedWishlists] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Modal states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isModerateDialogOpen, setIsModerateDialogOpen] = useState(false);
  const [moderationAction, setModerationAction] = useState<'hide' | 'unhide' | 'flag' | 'unflag'>('hide');
  const [moderationReason, setModerationReason] = useState('');

  // Action loading states
  const [actionLoading, setActionLoading] = useState(false);

  // Load wishlists from API
  const loadWishlists = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params: Record<string, string | number> = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder,
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (filterCategory !== 'all') {
        params.category = filterCategory;
      }
      
      if (filterPriority !== 'all') {
        params.priority = filterPriority;
      }
      
      const response = await apiService.getWishlistsAdmin(params);
      
      if (response.wishlists && Array.isArray(response.wishlists)) {
        setWishlists(response.wishlists);
      } else if (response.data && Array.isArray(response.data)) {
        setWishlists(response.data);
      }
      
      if (response.pagination) {
        setPagination({
          page: response.pagination.current_page,
          limit: response.pagination.per_page,
          total: response.pagination.total,
          totalPages: response.pagination.last_page,
        });
      }
    } catch (err) {
      console.error('Error loading wishlists:', err);
      setError('Failed to load wishlists');
      setWishlists([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sortBy, sortOrder, searchTerm, filterCategory, filterPriority]);

  // Load statistics
  const loadStatistics = useCallback(async () => {
    try {
      const stats = await apiService.getWishlistStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error('Error loading wishlist statistics:', err);
    }
  }, []);

  useEffect(() => {
    loadWishlists();
    loadStatistics();
  }, [loadWishlists, loadStatistics]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    loadWishlists();
  };

  // Handle filter changes
  const handleCategoryChange = (value: string) => {
    setFilterCategory(value);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    // Delay to allow state update
    setTimeout(() => {
      loadWishlists();
    }, 0);
  };

  const handlePriorityChange = (value: string) => {
    setFilterPriority(value);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    // Delay to allow state update
    setTimeout(() => {
      loadWishlists();
    }, 0);
  };

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort column with default desc order
      setSortBy(column);
      setSortOrder('desc');
    }
    // Reset to first page
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedWishlists([]);
    } else {
      setSelectedWishlists(wishlists.map(wishlist => wishlist.wishlist_id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectWishlist = (wishlistId: string) => {
    if (selectedWishlists.includes(wishlistId)) {
      setSelectedWishlists(selectedWishlists.filter(id => id !== wishlistId));
      setSelectAll(false);
    } else {
      setSelectedWishlists([...selectedWishlists, wishlistId]);
      if (selectedWishlists.length + 1 === wishlists.length) {
        setSelectAll(true);
      }
    }
  };

  // View wishlist details
  const handleViewWishlist = (wishlist: Wishlist) => {
    setSelectedWishlist(wishlist);
    setIsViewDialogOpen(true);
  };

  // Delete wishlist
  const handleDeleteWishlist = async () => {
    if (!selectedWishlist) return;
    
    try {
      setActionLoading(true);
      await apiService.deleteWishlistAdmin(selectedWishlist.wishlist_id);
      
      // Remove from list
      setWishlists(wishlists.filter(w => w.wishlist_id !== selectedWishlist.wishlist_id));
      setSelectedWishlist(null);
      setIsDeleteDialogOpen(false);
      toast.success('Wishlist deleted successfully');
      
      // Also remove from selected items if present
      if (selectedWishlists.includes(selectedWishlist.wishlist_id)) {
        setSelectedWishlists(selectedWishlists.filter(id => id !== selectedWishlist.wishlist_id));
      }
      
      // Refresh stats
      loadStatistics();
    } catch (err) {
      console.error('Error deleting wishlist:', err);
      toast.error('Failed to delete wishlist');
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk delete wishlists
  const handleBulkDelete = async () => {
    if (selectedWishlists.length === 0) return;
    
    try {
      setActionLoading(true);
      await apiService.bulkDeleteWishlists(selectedWishlists);
      
      // Clear selection
      setSelectedWishlists([]);
      setSelectAll(false);
      setIsBulkDeleteDialogOpen(false);
      toast.success(`${selectedWishlists.length} wishlist(s) deleted successfully`);
      
      // Reload data
      loadWishlists();
      loadStatistics();
    } catch (err) {
      console.error('Error bulk deleting wishlists:', err);
      toast.error('Failed to delete wishlists');
    } finally {
      setActionLoading(false);
    }
  };

  // Moderate wishlist (hide/unhide, flag/unflag)
  const handleModerateWishlist = async () => {
    if (!selectedWishlist) return;
    
    try {
      setActionLoading(true);
      await apiService.moderateWishlist(
        selectedWishlist.wishlist_id,
        moderationAction,
        moderationReason
      );
      
      // Update wishlist in list
      setWishlists(wishlists.map(w => {
        if (w.wishlist_id === selectedWishlist.wishlist_id) {
          const updatedWishlist = { ...w };
          
          if (moderationAction === 'hide') {
            updatedWishlist.is_visible = false;
            updatedWishlist.hidden_reason = moderationReason;
          } else if (moderationAction === 'unhide') {
            updatedWishlist.is_visible = true;
            updatedWishlist.hidden_reason = undefined;
          } else if (moderationAction === 'flag') {
            updatedWishlist.is_flagged = true;
            updatedWishlist.flagged_reason = moderationReason;
          } else if (moderationAction === 'unflag') {
            updatedWishlist.is_flagged = false;
            updatedWishlist.flagged_reason = undefined;
          }
          
          return updatedWishlist;
        }
        return w;
      }));
      
      setIsModerateDialogOpen(false);
      setModerationReason('');
      toast.success(`Wishlist ${moderationAction}ed successfully`);
    } catch (err) {
      console.error(`Error ${moderationAction}ing wishlist:`, err);
      toast.error(`Failed to ${moderationAction} wishlist`);
    } finally {
      setActionLoading(false);
    }
  };

  // Export to CSV
  const handleExportToCsv = async () => {
    try {
      // Add filters if present
      const params: Record<string, string> = {};
      if (filterCategory !== 'all') params.category = filterCategory;
      if (filterPriority !== 'all') params.priority = filterPriority;
      
      // Use our API service to handle the export
      const response = await apiService.exportWishlistsCSV(params);
      
      // Create a Blob from the response
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `wishlists-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Wishlist data exported to CSV');
    } catch (err) {
      console.error('Error exporting CSV:', err);
      toast.error('Failed to export wishlist data');
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  // Get category display name
  const getCategoryLabel = (categoryValue: string) => {
    const category = categories.find(c => c.value === categoryValue);
    return category ? category.label : categoryValue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500" />
            Wishlist Management
          </h1>
          <p className="text-muted-foreground">
            Manage wishlists across the platform
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              loadWishlists();
              loadStatistics();
            }}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            onClick={handleExportToCsv}
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export to CSV
          </Button>

          {selectedWishlists.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedWishlists.length})
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Wishlists</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics?.total || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Total wishlist items in the database
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics?.categories?.[0]?.category ? 
                getCategoryLabel(statistics.categories[0].category) : 
                'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              {statistics?.categories?.[0]?.count || 0} wishlist items
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Most Popular Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {statistics?.priorities?.[0]?.priority || 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              {statistics?.priorities?.[0]?.count || 0} wishlist items
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Most Popular Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {statistics?.popular?.[0]?.item_name || 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              {statistics?.popular?.[0]?.popularity || 0} net votes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <form className="flex-1" onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search wishlists..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </form>
            
            <div className="flex gap-2">
              <div>
                <Select value={filterCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Select value={filterPriority} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter by priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wishlist Table */}
      <Card>
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox 
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('item_name')}
                  >
                    <div className="flex items-center gap-1">
                      Item Name
                      {sortBy === 'item_name' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-center">Images</TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      Created
                      {sortBy === 'created_at' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead 
                    className="cursor-pointer text-right"
                    onClick={() => handleSort('upvotes')}
                  >
                    <div className="flex items-center gap-1 justify-end">
                      Votes
                      {sortBy === 'upvotes' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">Loading wishlists...</p>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <AlertCircle className="w-6 h-6 mx-auto text-destructive" />
                      <p className="mt-2 text-sm text-destructive">{error}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={loadWishlists} 
                        className="mt-4"
                      >
                        Try Again
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : wishlists.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <Heart className="w-6 h-6 mx-auto text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">No wishlists found</p>
                      <p className="text-xs text-muted-foreground mt-1">Try changing your filters or search term</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  wishlists.map((wishlist) => (
                    <TableRow key={wishlist.wishlist_id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedWishlists.includes(wishlist.wishlist_id)}
                          onCheckedChange={() => handleSelectWishlist(wishlist.wishlist_id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div 
                          className="font-medium truncate max-w-[200px] cursor-pointer hover:underline"
                          onClick={() => handleViewWishlist(wishlist)}
                        >
                          {wishlist.item_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getCategoryLabel(wishlist.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(wishlist.priority)}>
                          {wishlist.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 mr-1 text-muted-foreground" />
                          <span>{wishlist.image_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(wishlist.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{wishlist.username}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Badge variant="outline" className="text-green-600">
                            <ArrowUp className="w-3 h-3 mr-1" />
                            {wishlist.upvotes}
                          </Badge>
                          <Badge variant="outline" className="text-red-600">
                            <ArrowDown className="w-3 h-3 mr-1" />
                            {wishlist.downvotes}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {wishlist.is_flagged && (
                            <Badge variant="outline" className="text-amber-600 border-amber-600">
                              <Flag className="w-3 h-3 mr-1" />
                              Flagged
                            </Badge>
                          )}
                          {wishlist.is_visible === false && (
                            <Badge variant="outline" className="text-gray-600 border-gray-600">
                              <EyeOff className="w-3 h-3 mr-1" />
                              Hidden
                            </Badge>
                          )}
                          {!wishlist.is_flagged && wishlist.is_visible !== false && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <Check className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewWishlist(wishlist)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuLabel>Moderation</DropdownMenuLabel>
                            {wishlist.is_visible === false ? (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedWishlist(wishlist);
                                  setModerationAction('unhide');
                                  setIsModerateDialogOpen(true);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Unhide
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedWishlist(wishlist);
                                  setModerationAction('hide');
                                  setIsModerateDialogOpen(true);
                                }}
                              >
                                <EyeOff className="w-4 h-4 mr-2" />
                                Hide
                              </DropdownMenuItem>
                            )}
                            
                            {wishlist.is_flagged ? (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedWishlist(wishlist);
                                  setModerationAction('unflag');
                                  setIsModerateDialogOpen(true);
                                }}
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Unflag
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedWishlist(wishlist);
                                  setModerationAction('flag');
                                  setIsModerateDialogOpen(true);
                                }}
                              >
                                <Flag className="w-4 h-4 mr-2" />
                                Flag
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedWishlist(wishlist);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {wishlists.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} wishlists
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm">
              Page {pagination.page} of {pagination.totalPages || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* View Wishlist Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedWishlist && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  {selectedWishlist.item_name}
                </DialogTitle>
                <DialogDescription>
                  Wishlist details and management
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={getPriorityColor(selectedWishlist.priority)}>
                    {selectedWishlist.priority} priority
                  </Badge>
                  <Badge variant="outline">
                    {getCategoryLabel(selectedWishlist.category)}
                  </Badge>
                  {selectedWishlist.is_flagged && (
                    <Badge variant="outline" className="text-amber-600 border-amber-600">
                      <Flag className="w-3 h-3 mr-1" />
                      Flagged
                    </Badge>
                  )}
                  {selectedWishlist.is_visible === false && (
                    <Badge variant="outline" className="text-gray-600 border-gray-600">
                      <EyeOff className="w-3 h-3 mr-1" />
                      Hidden
                    </Badge>
                  )}
                </div>
                
                {/* User Info */}
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{selectedWishlist.username}</span>
                      <Badge variant="secondary" className="text-xs">
                        {selectedWishlist.credibility_score || 0}★
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      User ID: {selectedWishlist.user_id}
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-4">
                  {/* Description */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">Description</h3>
                    <div className="p-4 border rounded-md whitespace-pre-wrap text-sm">
                      {selectedWishlist.description || 'No description provided'}
                    </div>
                  </div>
                  
                  {/* Price */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">Max Price</h3>
                    <div className="p-4 border rounded-md flex items-center">
                      <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                      <span>{selectedWishlist.max_price || 'Not specified'}</span>
                    </div>
                  </div>
                  
                  {/* Timestamps */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Created At</h3>
                      <div className="p-4 border rounded-md flex items-center">
                        <CalendarDays className="w-5 h-5 mr-2 text-muted-foreground" />
                        <span>{formatDate(selectedWishlist.created_at)}</span>
                      </div>
                    </div>
                    {selectedWishlist.updated_at && selectedWishlist.updated_at !== selectedWishlist.created_at && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Last Updated</h3>
                        <div className="p-4 border rounded-md flex items-center">
                          <Clock className="w-5 h-5 mr-2 text-muted-foreground" />
                          <span>{formatDate(selectedWishlist.updated_at)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Images */}
                  {selectedWishlist.image_count > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Images</h3>
                      <div className="p-4 border rounded-md">
                        <div className="flex items-center justify-center bg-muted/50 rounded-md h-20">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          <span className="ml-2 text-muted-foreground">
                            {selectedWishlist.image_count} image(s) attached
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground text-center">
                          View the wishlist in the main interface to see images
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Upvotes</h3>
                      <div className="p-4 border rounded-md flex items-center justify-center">
                        <ArrowUp className="w-5 h-5 mr-2 text-green-600" />
                        <span className="text-lg font-semibold">{selectedWishlist.upvotes}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium mb-2">Downvotes</h3>
                      <div className="p-4 border rounded-md flex items-center justify-center">
                        <ArrowDown className="w-5 h-5 mr-2 text-red-600" />
                        <span className="text-lg font-semibold">{selectedWishlist.downvotes}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium mb-2">Watchers</h3>
                      <div className="p-4 border rounded-md flex items-center justify-center">
                        <Heart className="w-5 h-5 mr-2 text-red-500" />
                        <span className="text-lg font-semibold">{selectedWishlist.watchers || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Moderation Info */}
                  {(selectedWishlist.is_flagged || selectedWishlist.is_visible === false) && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Moderation Notes</h3>
                      <div className="space-y-2">
                        {selectedWishlist.is_flagged && (
                          <div className="p-4 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 rounded-md">
                            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-medium mb-1">
                              <Flag className="w-4 h-4" />
                              Flagged
                            </div>
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              {selectedWishlist.flagged_reason || 'No reason provided'}
                            </p>
                          </div>
                        )}
                        
                        {selectedWishlist.is_visible === false && (
                          <div className="p-4 border border-gray-200 bg-gray-50 dark:bg-gray-950/20 dark:border-gray-800 rounded-md">
                            <div className="flex items-center gap-2 text-gray-800 dark:text-gray-400 font-medium mb-1">
                              <EyeOff className="w-4 h-4" />
                              Hidden
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {selectedWishlist.hidden_reason || 'No reason provided'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <div className="flex justify-between w-full">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setIsViewDialogOpen(false);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                  
                  <div className="space-x-2">
                    {selectedWishlist.is_visible === false ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsViewDialogOpen(false);
                          setModerationAction('unhide');
                          setIsModerateDialogOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Unhide
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsViewDialogOpen(false);
                          setModerationAction('hide');
                          setIsModerateDialogOpen(true);
                        }}
                      >
                        <EyeOff className="w-4 h-4 mr-2" />
                        Hide
                      </Button>
                    )}
                    
                    <Button
                      onClick={() => setIsViewDialogOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Wishlist Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Delete Wishlist Item
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this wishlist item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedWishlist && (
            <div className="p-4 border rounded-md bg-muted/50 mb-4">
              <p className="font-medium">{selectedWishlist.item_name}</p>
              <p className="text-sm text-muted-foreground">Created by: {selectedWishlist.username}</p>
              <p className="text-sm text-muted-foreground">
                Created on: {formatDate(selectedWishlist.created_at)}
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteWishlist}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Bulk Delete Wishlist Items
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedWishlists.length} wishlist item(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkDeleteDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete {selectedWishlists.length} Items
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Moderate Wishlist Dialog */}
      <Dialog open={isModerateDialogOpen} onOpenChange={setIsModerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {moderationAction === 'hide' || moderationAction === 'unhide' ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Flag className="w-5 h-5" />
              )}
              {moderationAction === 'hide' && 'Hide Wishlist Item'}
              {moderationAction === 'unhide' && 'Unhide Wishlist Item'}
              {moderationAction === 'flag' && 'Flag Wishlist Item'}
              {moderationAction === 'unflag' && 'Remove Flag from Wishlist Item'}
            </DialogTitle>
            <DialogDescription>
              {moderationAction === 'hide' && 'This will hide the wishlist item from regular users.'}
              {moderationAction === 'unhide' && 'This will make the wishlist item visible to all users.'}
              {moderationAction === 'flag' && 'This will flag the wishlist item for review.'}
              {moderationAction === 'unflag' && 'This will remove the flag from the wishlist item.'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedWishlist && (
            <div className="p-4 border rounded-md bg-muted/50 mb-4">
              <p className="font-medium">{selectedWishlist.item_name}</p>
              <p className="text-sm text-muted-foreground">Created by: {selectedWishlist.username}</p>
            </div>
          )}
          
          {(moderationAction === 'hide' || moderationAction === 'flag') && (
            <div className="space-y-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder={`Enter reason for ${moderationAction === 'hide' ? 'hiding' : 'flagging'}...`}
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  This will be visible to administrators and moderators.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsModerateDialogOpen(false);
                setModerationReason('');
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleModerateWishlist}
              disabled={actionLoading || ((moderationAction === 'hide' || moderationAction === 'flag') && !moderationReason.trim())}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {moderationAction === 'hide' && (
                    <EyeOff className="w-4 h-4 mr-2" />
                  )}
                  {moderationAction === 'unhide' && (
                    <Eye className="w-4 h-4 mr-2" />
                  )}
                  {moderationAction === 'flag' && (
                    <Flag className="w-4 h-4 mr-2" />
                  )}
                  {moderationAction === 'unflag' && (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Confirm
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}