import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'sonner';
import { DataTable } from '../ui/datatable';
import type { DataTableColumn } from '../ui/datatable';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
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

  // Modal states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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
  }, [pagination.page, pagination.limit, searchTerm, filterCategory, filterPriority]);

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

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== '') {
        setPagination(prev => ({ ...prev, page: 1 }));
        loadWishlists();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, loadWishlists]);

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

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination(prev => ({ ...prev, page: newPage }));
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
      
      // Refresh stats
      loadStatistics();
    } catch (err) {
      console.error('Error deleting wishlist:', err);
      toast.error('Failed to delete wishlist');
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

  // DataTable columns configuration
  const columns: DataTableColumn<Wishlist>[] = [
    {
      title: 'Item Name',
      data: 'item_name',
      orderable: true,
      render: (data, type, row) => `
        <div class="font-medium truncate max-w-[200px] cursor-pointer hover:underline" data-action="view" data-row-id="${row.wishlist_id}">
          ${data}
        </div>
      `,
    },
    {
      title: 'Category',
      data: 'category',
      render: (data) => `
        <span class="inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium">
          ${getCategoryLabel(data as string)}
        </span>
      `,
    },
    {
      title: 'Priority',
      data: 'priority',
      render: (data) => `
        <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getPriorityColor(data as string)}">
          ${data}
        </span>
      `,
    },
    {
      title: 'Images',
      data: 'image_count',
      className: 'text-center',
      render: (data) => `
        <div class="flex items-center justify-center">
          <svg class="w-4 h-4 mr-1 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <span>${data}</span>
        </div>
      `,
    },
    {
      title: 'Created',
      data: 'created_at',
      orderable: true,
      render: (data) => `
        <div class="text-sm text-muted-foreground">
          ${formatDate(data as string)}
        </div>
      `,
    },
    {
      title: 'Username',
      data: 'username',
      render: (data) => `
        <div class="flex items-center gap-2">
          <div class="font-medium">${data}</div>
        </div>
      `,
    },
    {
      title: 'Votes',
      data: null,
      orderable: false,
      className: 'text-right',
      render: (data, type, row) => `
        <div class="flex items-center justify-end gap-2">
          <span class="inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium text-green-600 border-green-600">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
            </svg>
            ${row.upvotes}
          </span>
          <span class="inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium text-red-600 border-red-600">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
            ${row.downvotes}
          </span>
        </div>
      `,
    },
    {
      title: 'Status',
      data: null,
      orderable: false,
      render: (data, type, row) => {
        const badges = [];
        if (row.is_flagged) {
          badges.push(`
            <span class="inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium text-amber-600 border-amber-600">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4a4 4 0 014-4h.582l.707-.707A4 4 0 0114.414 12H17a4 4 0 014 4v4M3 7l9-4 9 4M3 7v10M21 7v10M12 3v18"></path>
              </svg>
              Flagged
            </span>
          `);
        }
        if (row.is_visible === false) {
          badges.push(`
            <span class="inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium text-gray-600 border-gray-600">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
              </svg>
              Hidden
            </span>
          `);
        }
        if (!row.is_flagged && row.is_visible !== false) {
          badges.push(`
            <span class="inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium text-green-600 border-green-600">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Active
            </span>
          `);
        }
        return `<div class="flex items-center gap-2">${badges.join('')}</div>`;
      },
    },
    {
      title: 'Actions',
      data: null,
      orderable: false,
      className: 'w-[100px]',
      render: (data, type, row) => `
        <div class="dropdown position-static">
          <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
            </svg>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow-lg" style="z-index: 1050;">
            <li><a class="dropdown-item" href="#" data-action="view" data-row-id="${row.wishlist_id}">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
              View Details
            </a></li>
            ${row.is_visible === false ? 
              `<li><a class="dropdown-item" href="#" data-action="unhide" data-row-id="${row.wishlist_id}">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                </svg>
                Unhide
              </a></li>` :
              `<li><a class="dropdown-item" href="#" data-action="hide" data-row-id="${row.wishlist_id}">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                </svg>
                Hide
              </a></li>`
            }
            ${row.is_flagged ? 
              `<li><a class="dropdown-item" href="#" data-action="unflag" data-row-id="${row.wishlist_id}">
                <svg class="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Unflag
              </a></li>` :
              `<li><a class="dropdown-item" href="#" data-action="flag" data-row-id="${row.wishlist_id}">
                <svg class="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4a4 4 0 014-4h.582l.707-.707A4 4 0 0114.414 12H17a4 4 0 014 4v4M3 7l9-4 9 4M3 7v10M21 7v10M12 3v18"></path>
                </svg>
                Flag
              </a></li>`
            }
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-danger" href="#" data-action="delete" data-row-id="${row.wishlist_id}">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              Delete
            </a></li>
          </ul>
        </div>
      `,
    },
  ];

  // Handle DataTable actions
  const handleDataTableAction = (action: string, row: Wishlist) => {
    switch (action) {
      case 'view':
        handleViewWishlist(row);
        break;
      case 'hide':
        setSelectedWishlist(row);
        setModerationAction('hide');
        setIsModerateDialogOpen(true);
        break;
      case 'unhide':
        setSelectedWishlist(row);
        setModerationAction('unhide');
        setIsModerateDialogOpen(true);
        break;
      case 'flag':
        setSelectedWishlist(row);
        setModerationAction('flag');
        setIsModerateDialogOpen(true);
        break;
      case 'unflag':
        setSelectedWishlist(row);
        setModerationAction('unflag');
        setIsModerateDialogOpen(true);
        break;
      case 'delete':
        setSelectedWishlist(row);
        setIsDeleteDialogOpen(true);
        break;
    }
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
          <DataTable
            data={wishlists}
            columns={columns}
            options={{
              pageLength: pagination.limit,
              searching: false, // We handle search separately
              paging: false, // We handle pagination separately
              info: false,
              order: [[4, 'desc']], // Default sort by created_at desc
            }}
            onAction={handleDataTableAction}
            loading={loading}
            emptyMessage="No wishlists found. Try changing your filters or search term."
          />
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