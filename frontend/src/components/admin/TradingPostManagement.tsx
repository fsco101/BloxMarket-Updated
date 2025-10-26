import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { apiService } from '../../services/api';
import { toast } from 'sonner';
import { DataTable } from '../ui/datatable';
import type { DataTableColumn } from '../ui/datatable';
import { 
  ShoppingCart, 
  Search, 
  Flag, 
  DollarSign,
  CheckCircle,
  Loader2,
  TrendingUp
} from 'lucide-react';

interface TradingPost {
  _id: string;
  title: string;
  description: string;
  author: {
    _id: string;
    username: string;
    avatar_url?: string;
    role: string;
  };
  type: 'sell' | 'buy' | 'trade';
  item_name: string;
  price?: number;
  currency?: string;
  images?: string[];
  status: 'active' | 'completed' | 'archived' | 'flagged' | 'deleted';
  createdAt: string;
  updatedAt?: string;
  views: number;
  interested_users: number;
  flagCount: number;
  isFlagged: boolean;
  expiresAt?: string;
}

export function TradingPostManagement() {
  const [posts, setPosts] = useState<TradingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPost, setSelectedPost] = useState<TradingPost | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadTradingPosts = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('Loading trading posts...');
      
      const response = await apiService.getTradingPostsDataTable({
        page,
        limit: 1000,
        search: searchTerm,
        type: typeFilter === 'all' ? '' : typeFilter,
        status: statusFilter === 'all' ? '' : statusFilter
      });
      
      console.log('Trading posts response:', response);
      
      if (!response || !response.posts) {
        throw new Error('Invalid response format from server');
      }
      
      setPosts(response.posts || []);
      setTotalPages(response.pagination?.totalPages || 1);
      
    } catch (error: unknown) {
      console.error('Error loading trading posts:', error);
      
      let errorMessage = 'Failed to load trading posts';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Try to handle API error responses
        const apiError = error as { response?: { status?: number } };
        if (apiError.response?.status === 403) {
          errorMessage = 'Access denied. Admin or moderator privileges required.';
        } else if (apiError.response?.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, typeFilter, statusFilter]);

  // Load posts when component mounts and when filters change
  useEffect(() => {
    if (!apiService.isAuthenticated()) {
      toast.error('You must be logged in to access this page');
      setLoading(false);
      return;
    }

    loadTradingPosts();
  }, [loadTradingPosts]);

  // Debounced search
  useEffect(() => {
    const delayedLoad = setTimeout(() => {
      if (searchTerm !== undefined) {
        loadTradingPosts();
      }
    }, 300);

    return () => clearTimeout(delayedLoad);
  }, [searchTerm, loadTradingPosts]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sell': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'buy': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'trade': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'archived': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'flagged': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'deleted': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.author.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || post.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // DataTable columns configuration
  const columns: DataTableColumn<TradingPost>[] = [
    {
      title: 'Post',
      data: 'title',
      render: (data: unknown, _type: string, row: TradingPost) => `<div class="font-bold">${String(data)}</div><div class="text-muted-foreground text-sm">${row.item_name}</div>`
    },
    {
      title: 'Author',
      data: 'author.username',
      render: (data: unknown) => String(data)
    },
    {
      title: 'Type',
      data: 'type',
      render: (data: unknown) => `<span class="badge ${getTypeColor(String(data))}">${String(data).toUpperCase()}</span>`
    },
    {
      title: 'Price',
      data: 'price',
      render: (data: unknown) => data ? `$${Number(data).toLocaleString()}` : '-'
    },
    {
      title: 'Status',
      data: 'status',
      render: (data: unknown) => `<span class="badge ${getStatusColor(String(data))}">${String(data).charAt(0).toUpperCase() + String(data).slice(1)}</span>`
    },
    {
      title: 'Created',
      data: 'createdAt',
      render: (data: unknown) => new Date(String(data)).toLocaleDateString()
    },
    {
      title: 'Actions',
      data: null,
      orderable: false,
      render: (_data: unknown, _type: string, row: TradingPost) => `
        <div class="flex items-center gap-2">
          <button class="view-btn px-2 py-1 bg-blue-100 text-blue-800 rounded" data-action="view" data-id="${row._id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button class="archive-btn px-2 py-1 bg-gray-100 text-gray-800 rounded" data-action="archive" data-id="${row._id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><rect width="20" height="5" x="2" y="3" rx="1"></rect><rect width="20" height="5" x="2" y="16" rx="1"></rect><path d="M12 9v7"></path><path d="m9 13 3 3 3-3"></path></svg>
          </button>
          <button class="delete-btn px-2 py-1 bg-red-100 text-red-800 rounded" data-action="delete" data-id="${row._id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>
          </button>
        </div>
      `
    }
  ];

  const handleDataTableAction = useCallback((action: string, row: TradingPost) => {
    switch (action) {
      case 'view':
        setSelectedPost(row);
        setIsViewDialogOpen(true);
        break;
        
      case 'archive':
        if (window.confirm('Are you sure you want to archive this trading post?')) {
          apiService.moderateTradingPost(row._id, 'archive')
            .then(() => {
              toast.success('Trading post archived successfully');
              loadTradingPosts();
            })
            .catch((error) => {
              console.error('Error archiving post:', error);
              toast.error('Failed to archive trading post');
            });
        }
        break;
        
      case 'delete':
        if (window.confirm('Are you sure you want to permanently delete this trading post? This action cannot be undone.')) {
          apiService.deleteTradingPostAdmin(row._id)
            .then(() => {
              toast.success('Trading post deleted successfully');
              loadTradingPosts();
            })
            .catch((error) => {
              console.error('Error deleting post:', error);
              toast.error('Failed to delete trading post');
            });
        }
        break;
        
      default:
        console.warn('Unknown action:', action);
    }
  }, [loadTradingPosts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Trading Post Management</h2>
          <p className="text-muted-foreground">Moderate trading posts and marketplace listings</p>
        </div>
        <Button onClick={loadTradingPosts} variant="outline">
          <ShoppingCart className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Posts</p>
                <p className="text-2xl font-bold">{posts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Posts</p>
                <p className="text-2xl font-bold">{posts.filter(p => p.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <Flag className="w-5 h-5 text-red-600 dark:text-red-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Flagged Posts</p>
                <p className="text-2xl font-bold text-red-600">{posts.filter(p => p.isFlagged).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  ${posts.reduce((sum, p) => sum + (p.price || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-64">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, item name, or author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="trade">Trade</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Trading Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Trading Posts ({filteredPosts.length})</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading trading posts...</p>
            </div>
          ) : (
            <DataTable
              data={filteredPosts}
              columns={columns}
              options={{
                pageLength: 25,
                responsive: true,
                order: [[5, 'desc']]
              }}
              onAction={handleDataTableAction}
              emptyMessage="No trading posts found matching your criteria"
            />
          )}
        </CardContent>
      </Card>

      {/* Post Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Trading Post Details</DialogTitle>
            <DialogDescription>
              View and moderate trading post
            </DialogDescription>
          </DialogHeader>
          
          {selectedPost && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">{selectedPost.title}</h2>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={selectedPost.author.avatar_url} />
                        <AvatarFallback>{selectedPost.author.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedPost.author.username}</p>
                        <p className="text-sm text-muted-foreground">{selectedPost.author.role}</p>
                      </div>
                    </div>
                    <Badge className={getTypeColor(selectedPost.type)}>
                      {selectedPost.type.toUpperCase()}
                    </Badge>
                    <Badge className={getStatusColor(selectedPost.status)}>
                      {selectedPost.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Item Details</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Item Name</label>
                      <p>{selectedPost.item_name}</p>
                    </div>
                    {selectedPost.price && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Price</label>
                        <p className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {selectedPost.price.toLocaleString()}
                          {selectedPost.currency && <span className="text-muted-foreground">({selectedPost.currency})</span>}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Statistics</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Views</span>
                      <span className="font-medium">{selectedPost.views}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Interested Users</span>
                      <span className="font-medium">{selectedPost.interested_users}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Flags</span>
                      <span className="font-medium">{selectedPost.flagCount}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Description</h4>
                <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted p-4 rounded-lg">
                  {selectedPost.description}
                </div>
              </div>
              
              {selectedPost.images && selectedPost.images.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Images</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedPost.images.map((image, i) => (
                      <img
                        key={i}
                        src={image}
                        alt={`Trading post image ${i + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}