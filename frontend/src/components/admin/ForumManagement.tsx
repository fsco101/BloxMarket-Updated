import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { apiService } from '../../services/api';
import { toast } from 'sonner';
import { DataTable } from '../ui/datatable';
import type { DataTableColumn } from '../ui/datatable';
import { 
  MessageSquare,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Trash2,
  Eye,
  Download
} from 'lucide-react';

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
  const [actionLoading, setActionLoading] = useState<string | null>(null);

    const loadPosts = useCallback(async () => {
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
      
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Error loading forum posts:', err);
      
      let errorMessage = 'Failed to load forum posts';
      
      if (err.message?.includes('403')) {
        errorMessage = 'Access denied. Admin or moderator privileges required.';
      } else if (err.message?.includes('401')) {
        errorMessage = 'Authentication required. Please log in again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const columns: DataTableColumn<ForumPost>[] = [
    {
      title: 'Title',
      data: 'title',
      render: (data: unknown, _type: string, row: ForumPost) => {
        const title = data as string;
        const excerpt = row.content.length > 100
          ? row.content.substring(0, 100) + '...'
          : row.content;
        return `
          <div>
            <p class="font-medium">${title}</p>
            <p class="text-sm text-gray-500">${excerpt}</p>
          </div>
        `;
      }
    },
    {
      title: 'Category',
      data: 'category',
      render: (data: unknown, type: string, row: ForumPost) => {
        const category = data as string;
        const categoryColors: Record<string, string> = {
          'general': 'bg-blue-100 text-blue-800',
          'trading_tips': 'bg-green-100 text-green-800',
          'scammer_reports': 'bg-red-100 text-red-800',
          'game_updates': 'bg-purple-100 text-purple-800'
        };

        const colorClass = categoryColors[category] || categoryColors['general'];
        const label = category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}">
          ${label}
        </span>`;
      }
    },
    {
      title: 'Author',
      data: 'username',
      render: (data: unknown, _type: string, _row: ForumPost) => {
        const username = data as string;
        return `<div class="text-sm font-medium">${username}</div>`;
      }
    },
    {
      title: 'Votes',
      data: null,
      render: (_data: unknown, _type: string, row: ForumPost) => {
        return `
          <div class="flex items-center gap-2">
            <span class="text-green-600">↑ ${row.upvotes}</span>
            <span class="text-red-600">↓ ${row.downvotes}</span>
          </div>
        `;
      }
    },
    {
      title: 'Comments',
      data: 'commentCount',
      render: (data: unknown, _: string, __: ForumPost) => {
        const count = data as number;
        return `<div class="text-center">${count}</div>`;
      }
    },
    {
      title: 'Created',
      data: 'createdAt',
      render: (data: unknown, _: string, __: ForumPost) => {
        const createdAt = data as string;
        if (!createdAt) return '<span class="text-gray-400">Unknown</span>';
        const created = new Date(createdAt).toLocaleDateString();
        return `<div class="text-sm">${created}</div>`;
      }
    },
    {
      title: 'Actions',
      data: null,
      orderable: false,
      width: '150px',
      render: (_data: unknown, _type: string, row: ForumPost) => {
        const postId = row._id || row.post_id;
        return `
          <div class="flex items-center gap-2">
            <button class="btn btn-sm btn-primary" data-action="view" data-post-id="${postId}" title="View Details">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-danger" data-action="delete" data-post-id="${postId}" title="Delete Post">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;
      }
    }
  ];

  const deletePost = useCallback(async (postId: string) => {
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
  }, [loadPosts]);

  const handleAction = useCallback((action: string, row: ForumPost, _index: number) => {
    if (action === 'view') {
      console.log('View post:', row);
      toast.info(`Viewing post: ${row.title}`);
    } else if (action === 'delete') {
      if (confirm(`Are you sure you want to delete "${row.title}"?`)) {
        deletePost(row._id || row.post_id);
      }
    }
  }, [deletePost]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

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
            <DataTable
              data={posts}
              columns={columns}
              onAction={handleAction}
              loading={loading}
              options={{
                pageLength: 25,
                lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
                order: [[5, 'desc']],
                responsive: true,
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
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}