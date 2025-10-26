import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { apiService } from '../../services/api';
import { toast } from 'sonner';
import { 
  MessageSquare,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Trash2,
  Eye,
  Download
} from 'lucide-react';

declare global {
  interface Window {
    $: any;
    jQuery: any;
  }
}

interface ForumPost {
  post_id: string;
  _id: string;
  title: string;
  content: string;
  category: string;
  username: string;
  user_id: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  createdAt: string;
  updatedAt?: string;
}

export function ForumManagement() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jQueryReady, setJQueryReady] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const tableRef = useRef<HTMLTableElement>(null);
  const dataTableRef = useRef<any>(null);
  const isInitialized = useRef(false);

  // Check if jQuery and DataTables are loaded
  const checkJQueryReady = () => {
    return new Promise<boolean>((resolve) => {
      let attempts = 0;
      const maxAttempts = 50;
      
      const checkInterval = setInterval(() => {
        attempts++;
        
        if (window.$ && window.$.fn && window.$.fn.DataTable) {
          console.log('jQuery and DataTables are ready');
          clearInterval(checkInterval);
          resolve(true);
        } else if (attempts >= maxAttempts) {
          console.error('jQuery/DataTables failed to load after 5 seconds');
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  };

  useEffect(() => {
    const initJQuery = async () => {
      const ready = await checkJQueryReady();
      setJQueryReady(ready);
      
      if (!ready) {
        setError('Required libraries (jQuery/DataTables) failed to load. Please refresh the page.');
        setLoading(false);
      }
    };
    
    initJQuery();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Loading forum posts...');
      
      const response = await apiService.getForumPostsDataTable({
        page: 1,
        limit: 1000,
        search: '',
        category: ''
      });
      
      console.log('API Response:', response);
      
      if (!response || !response.posts) {
        throw new Error('Invalid response format');
      }
      
      const normalizedPosts = response.posts;
      
      console.log('Normalized posts:', normalizedPosts.length);
      setPosts(normalizedPosts);
      
      if (!jQueryReady) {
        console.log('Waiting for jQuery to be ready...');
        const ready = await checkJQueryReady();
        if (!ready) {
          setError('DataTables library not available');
          return;
        }
      }
      
      setTimeout(() => {
        if (dataTableRef.current) {
          console.log('Updating existing DataTable...');
          try {
            dataTableRef.current.clear();
            dataTableRef.current.rows.add(normalizedPosts);
            dataTableRef.current.draw();
          } catch (err) {
            console.error('Error updating DataTable:', err);
            dataTableRef.current.destroy();
            dataTableRef.current = null;
            isInitialized.current = false;
            initializeDataTable(normalizedPosts);
          }
        } else if (!isInitialized.current) {
          console.log('Initializing new DataTable...');
          initializeDataTable(normalizedPosts);
        }
      }, 200);
      
    } catch (error: any) {
      console.error('Error loading forum posts:', error);
      
      let errorMessage = 'Failed to load forum posts';
      
      if (error.response?.status === 403) {
        errorMessage = 'Access denied. Admin or moderator privileges required.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const initializeDataTable = (postData: ForumPost[]) => {
    if (!window.$ || !window.$.fn || !window.$.fn.DataTable) {
      console.error('jQuery or DataTables not available');
      setError('DataTables library not loaded. Please refresh the page.');
      return;
    }

    if (!tableRef.current) {
      console.error('Table ref not available');
      return;
    }

    const $ = window.$;
    
    console.log('Initializing DataTable with', postData.length, 'posts');
    
    try {
      if (dataTableRef.current) {
        try {
          dataTableRef.current.destroy();
        } catch (err) {
          console.log('No existing DataTable to destroy');
        }
      }

      dataTableRef.current = $(tableRef.current).DataTable({
        data: postData,
        destroy: true,
        responsive: true,
        pageLength: 25,
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
        order: [[5, 'desc']],
        columns: [
          {
            title: 'Title',
            data: 'title',
            render: (data: string, type: string, row: ForumPost) => {
              const excerpt = row.content.length > 100 
                ? row.content.substring(0, 100) + '...' 
                : row.content;
              return `
                <div>
                  <p class="font-medium">${data}</p>
                  <p class="text-sm text-gray-500">${excerpt}</p>
                </div>
              `;
            }
          },
          {
            title: 'Category',
            data: 'category',
            render: (data: string) => {
              const categoryColors: Record<string, string> = {
                'general': 'bg-blue-100 text-blue-800',
                'trading_tips': 'bg-green-100 text-green-800',
                'scammer_reports': 'bg-red-100 text-red-800',
                'game_updates': 'bg-purple-100 text-purple-800'
              };
              
              const colorClass = categoryColors[data] || categoryColors['general'];
              const label = data.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
              
              return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}">
                ${label}
              </span>`;
            }
          },
          {
            title: 'Author',
            data: 'username',
            render: (data: string) => {
              return `<div class="text-sm font-medium">${data}</div>`;
            }
          },
          {
            title: 'Votes',
            data: null,
            render: (data: ForumPost) => {
              return `
                <div class="flex items-center gap-2">
                  <span class="text-green-600">↑ ${data.upvotes}</span>
                  <span class="text-red-600">↓ ${data.downvotes}</span>
                </div>
              `;
            }
          },
          {
            title: 'Comments',
            data: 'commentCount',
            render: (data: number) => {
              return `<div class="text-center">${data}</div>`;
            }
          },
          {
            title: 'Created',
            data: 'createdAt',
            render: (data: string) => {
              if (!data) return '<span class="text-gray-400">Unknown</span>';
              const created = new Date(data).toLocaleDateString();
              return `<div class="text-sm">${created}</div>`;
            }
          },
          {
            title: 'Actions',
            data: null,
            orderable: false,
            width: '150px',
            render: (data: ForumPost) => {
              const postId = data._id || data.post_id;
              return `
                <div class="flex items-center gap-2">
                  <button class="btn btn-sm btn-primary view-btn" data-post-id="${postId}" title="View Details">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button class="btn btn-sm btn-danger delete-btn" data-post-id="${postId}" title="Delete Post">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              `;
            }
          }
        ],
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rtip',
        language: {
          search: "_INPUT_",
          searchPlaceholder: "Search posts...",
          lengthMenu: "Show _MENU_ posts",
          info: "Showing _START_ to _END_ of _TOTAL_ posts",
          infoEmpty: "No posts found",
          infoFiltered: "(filtered from _MAX_ total posts)",
          zeroRecords: "No matching posts found",
          emptyTable: "No forum posts available"
        }
      });

      isInitialized.current = true;
      console.log('DataTable initialized successfully');

      const handleViewPost = function(this: any, e: any) {
        e.preventDefault();
        const postId = $(this).data('post-id');
        const post = postData.find(p => p._id === postId || p.post_id === postId);
        if (post) {
          console.log('View post:', post);
          toast.info(`Viewing post: ${post.title}`);
        }
      };

      const handleDeletePost = async function(this: any, e: any) {
        e.preventDefault();
        const postId = $(this).data('post-id');
        const post = postData.find(p => p._id === postId || p.post_id === postId);
        
        if (post && confirm(`Are you sure you want to delete "${post.title}"?`)) {
          await deletePost(postId);
        }
      };

      $(tableRef.current).off();
      $(tableRef.current).on('click', '.view-btn', handleViewPost);
      $(tableRef.current).on('click', '.delete-btn', handleDeletePost);
      
    } catch (error) {
      console.error('Error initializing DataTable:', error);
      toast.error('Failed to initialize table');
      setError('Failed to initialize data table. Please refresh the page.');
    }
  };

  const deletePost = async (postId: string) => {
    try {
      setActionLoading(postId);
      await apiService.deleteForumPostAdmin(postId);
      toast.success('Forum post deleted successfully');
      await loadPosts();
    } catch (err) {
      console.error('Error deleting forum post:', err);
      toast.error('Failed to delete forum post');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (!apiService.isAuthenticated()) {
      setError('You must be logged in to access this page');
      setLoading(false);
      return;
    }
    
    if (jQueryReady) {
      loadPosts();
    }
    
    return () => {
      if (dataTableRef.current) {
        try {
          const $ = window.$;
          if ($ && tableRef.current) {
            $(tableRef.current).off();
          }
          dataTableRef.current.destroy();
          dataTableRef.current = null;
          isInitialized.current = false;
        } catch (err) {
          console.error('Error destroying DataTable:', err);
        }
      }
    };
  }, [jQueryReady]);

  if (error && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Forum Management</h2>
            <p className="text-muted-foreground">Manage forum posts</p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
        
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-xl font-semibold mb-2">Access Error</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => window.location.reload()} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Forum Management
          </h2>
          <p className="text-muted-foreground">Manage forum posts and discussions</p>
        </div>
        <Button onClick={loadPosts} disabled={loading} variant="outline">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Posts</p>
                <p className="text-2xl font-bold">{posts.length}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Comments</p>
                <p className="text-2xl font-bold">
                  {posts.reduce((sum, post) => sum + (post.commentCount || 0), 0)}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Upvotes</p>
                <p className="text-2xl font-bold">
                  {posts.reduce((sum, post) => sum + (post.upvotes || 0), 0)}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Downvotes</p>
                <p className="text-2xl font-bold">
                  {posts.reduce((sum, post) => sum + (post.downvotes || 0), 0)}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Forum Posts ({posts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading forum posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No forum posts found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table 
                ref={tableRef}
                className="display table table-striped table-hover w-full"
                style={{ width: '100%' }}
              >
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Author</th>
                    <th>Votes</th>
                    <th>Comments</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Data populated by DataTables */}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}