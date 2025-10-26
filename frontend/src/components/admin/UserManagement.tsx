import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { Label } from '../ui/label';
import { apiService } from '../../services/api';
import { toast } from 'sonner';
import { 
  Search, 
  Ban, 
  UserCheck, 
  Eye, 
  Shield,
  Crown,
  User,
  AlertTriangle,
  CheckCircle,
  Loader2,
  UserX,
  UserPlus,
  RefreshCw
} from 'lucide-react';

declare global {
  interface Window {
    $: any;
    jQuery: any;
  }
}

interface User {
  _id: string;
  username: string;
  email: string;
  roblox_username: string;
  role: string;
  avatar_url?: string;
  credibility_score: number;
  createdAt: string;
  lastActive?: string;
  totalTrades: number;
  totalVouches: number;
  isActive?: boolean;
  is_active?: boolean;
  ban_reason?: string;
  banned_at?: string;
  banned_by?: string;
  deactivation_reason?: string;
  deactivated_at?: string;
  deactivated_by?: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [jQueryReady, setJQueryReady] = useState(false);
  
  // Action dialogs
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [actionUser, setActionUser] = useState<User | null>(null);
  const [actionReason, setActionReason] = useState('');

  const tableRef = useRef<HTMLTableElement>(null);
  const dataTableRef = useRef<any>(null);
  const isInitialized = useRef(false);

  // Check if jQuery and DataTables are loaded
  const checkJQueryReady = () => {
    return new Promise<boolean>((resolve) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds total
      
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
    // Initialize jQuery check
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

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Loading users...');
      
      const response = await apiService.getUsers({
        page: 1,
        limit: 1000,
        search: '',
        role: '',
        status: ''
      });
      
      console.log('API Response:', response);
      
      if (!response || !response.users) {
        throw new Error('Invalid response format');
      }
      
      // Normalize the user data
      const normalizedUsers = response.users.map((user: any) => ({
        ...user,
        isActive: user.isActive !== undefined ? user.isActive : user.is_active !== undefined ? user.is_active : true
      }));
      
      console.log('Normalized users:', normalizedUsers.length);
      setUsers(normalizedUsers);
      
      // Wait for jQuery to be ready before initializing DataTable
      if (!jQueryReady) {
        console.log('Waiting for jQuery to be ready...');
        const ready = await checkJQueryReady();
        if (!ready) {
          setError('DataTables library not available');
          return;
        }
      }
      
      // Wait for DOM to update and table to be rendered
      setTimeout(() => {
        if (dataTableRef.current) {
          console.log('Updating existing DataTable...');
          try {
            dataTableRef.current.clear();
            dataTableRef.current.rows.add(normalizedUsers);
            dataTableRef.current.draw();
          } catch (err) {
            console.error('Error updating DataTable:', err);
            // Reinitialize if update fails
            dataTableRef.current.destroy();
            dataTableRef.current = null;
            isInitialized.current = false;
            initializeDataTable(normalizedUsers);
          }
        } else if (!isInitialized.current) {
          console.log('Initializing new DataTable...');
          initializeDataTable(normalizedUsers);
        }
      }, 200);
      
    } catch (error: any) {
      console.error('Error loading users:', error);
      
      let errorMessage = 'Failed to load users';
      
      if (error.response?.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
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

  const initializeDataTable = (userData: User[]) => {
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
    
    console.log('Initializing DataTable with', userData.length, 'users');
    
    try {
      // Destroy existing instance if exists
      if (dataTableRef.current) {
        try {
          dataTableRef.current.destroy();
        } catch (err) {
          console.log('No existing DataTable to destroy');
        }
      }

      dataTableRef.current = $(tableRef.current).DataTable({
        data: userData,
        destroy: true,
        responsive: true,
        pageLength: 25,
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
        order: [[4, 'desc']],
        columns: [
          {
            title: 'User',
            data: null,
            orderable: false,
            render: (data: User) => {
              const avatarHtml = data.avatar_url 
                ? `<img src="${data.avatar_url}" alt="${data.username}" class="w-10 h-10 rounded-full object-cover" />`
                : `<div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center"><span class="font-medium text-sm">${data.username[0]?.toUpperCase()}</span></div>`;
              
              return `
                <div class="flex items-center gap-3">
                  ${avatarHtml}
                  <div>
                    <p class="font-medium">${data.username}</p>
                    <p class="text-sm text-gray-500">${data.email}</p>
                    ${data.roblox_username ? `<p class="text-xs text-blue-600">@${data.roblox_username}</p>` : ''}
                  </div>
                </div>
              `;
            }
          },
          {
            title: 'Role',
            data: 'role',
            render: (data: string) => {
              const roleColors: Record<string, string> = {
                'admin': 'bg-yellow-100 text-yellow-800',
                'moderator': 'bg-blue-100 text-blue-800',
                'middleman': 'bg-green-100 text-green-800',
                'verified': 'bg-indigo-100 text-indigo-800',
                'banned': 'bg-red-100 text-red-800',
                'user': 'bg-gray-100 text-gray-800'
              };
              
              const colorClass = roleColors[data] || roleColors['user'];
              
              return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}">
                ${data.charAt(0).toUpperCase() + data.slice(1)}
              </span>`;
            }
          },
          {
            title: 'Stats',
            data: null,
            orderable: false,
            render: (data: User) => {
              const credibility = data.credibility_score || 0;
              return `
                <div class="text-sm">
                  <p><strong>${data.totalTrades || 0}</strong> trades</p>
                  <p><strong>${data.totalVouches || 0}</strong> vouches</p>
                  <div class="flex items-center gap-1 mt-1">
                    <div class="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div class="h-full bg-blue-500" style="width: ${credibility}%"></div>
                    </div>
                    <span class="text-xs text-gray-500">${credibility}%</span>
                  </div>
                </div>
              `;
            }
          },
          {
            title: 'Status',
            data: null,
            render: (data: User) => {
              const isActive = data.isActive !== undefined ? data.isActive : data.is_active;
              const isBanned = data.role === 'banned';
              
              let statusHtml = '';
              
              if (isBanned) {
                statusHtml = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Banned</span>';
                if (data.ban_reason) {
                  statusHtml += `<div class="text-xs text-red-600 mt-1 p-1 bg-red-50 rounded max-w-xs truncate" title="${data.ban_reason}">Reason: ${data.ban_reason}</div>`;
                }
              } else if (isActive) {
                statusHtml = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>';
              } else {
                statusHtml = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Inactive</span>';
                if (data.deactivation_reason) {
                  statusHtml += `<div class="text-xs text-orange-600 mt-1 p-1 bg-orange-50 rounded max-w-xs truncate" title="${data.deactivation_reason}">Reason: ${data.deactivation_reason}</div>`;
                }
              }
              
              return statusHtml;
            }
          },
          {
            title: 'Joined',
            data: 'createdAt',
            render: (data: string, type: string, row: User) => {
              const joinDate = new Date(data).toLocaleDateString();
              const lastActive = row.lastActive ? new Date(row.lastActive).toLocaleDateString() : 'Never';
              
              return `
                <div class="text-sm">
                  <p><strong>Joined:</strong> ${joinDate}</p>
                  <p class="text-xs text-gray-500"><strong>Last:</strong> ${lastActive}</p>
                </div>
              `;
            }
          },
          {
            title: 'Actions',
            data: null,
            orderable: false,
            width: '250px',
            render: (data: User) => {
              const isBanned = data.role === 'banned';
              const isActive = data.isActive !== undefined ? data.isActive : data.is_active;
              
              return `
                <div class="flex flex-wrap items-center gap-2">
                  <select class="role-select form-select form-select-sm" style="width: 120px;" data-user-id="${data._id}" ${isBanned ? 'disabled' : ''}>
                    <option value="user" ${data.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="verified" ${data.role === 'verified' ? 'selected' : ''}>Verified</option>
                    <option value="middleman" ${data.role === 'middleman' ? 'selected' : ''}>Middleman</option>
                    <option value="moderator" ${data.role === 'moderator' ? 'selected' : ''}>Moderator</option>
                    <option value="admin" ${data.role === 'admin' ? 'selected' : ''}>Admin</option>
                  </select>
                  
                  ${!isBanned ? `
                    <button class="btn btn-sm btn-danger ban-btn" data-user-id="${data._id}" title="Ban User">
                      <i class="fas fa-ban"></i>
                    </button>
                  ` : `
                    <button class="btn btn-sm btn-success unban-btn" data-user-id="${data._id}" title="Unban User">
                      <i class="fas fa-check-circle"></i>
                    </button>
                  `}
                  
                  ${!isBanned ? (isActive ? `
                    <button class="btn btn-sm btn-warning deactivate-btn" data-user-id="${data._id}" title="Deactivate">
                      <i class="fas fa-user-times"></i>
                    </button>
                  ` : `
                    <button class="btn btn-sm btn-info activate-btn" data-user-id="${data._id}" title="Activate">
                      <i class="fas fa-user-check"></i>
                    </button>
                  `) : ''}
                  
                  <button class="btn btn-sm btn-primary view-btn" data-user-id="${data._id}" title="View Details">
                    <i class="fas fa-eye"></i>
                  </button>
                </div>
              `;
            }
          }
        ],
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rtip',
        language: {
          search: "_INPUT_",
          searchPlaceholder: "Search users...",
          lengthMenu: "Show _MENU_ users",
          info: "Showing _START_ to _END_ of _TOTAL_ users",
          infoEmpty: "No users found",
          infoFiltered: "(filtered from _MAX_ total users)",
          zeroRecords: "No matching users found",
          emptyTable: "No users available"
        }
      });

      isInitialized.current = true;
      console.log('DataTable initialized successfully');

      // Event handlers using arrow functions to preserve context
      const handleRoleChangeEvent = async function(this: any) {
        const userId = $(this).data('user-id');
        const newRole = $(this).val();
        const user = userData.find(u => u._id === userId);
        if (user && user.role !== newRole) {
          await handleRoleChange(userId, newRole);
        }
      };

      const handleBanEvent = function(this: any, e: any) {
        e.preventDefault();
        const userId = $(this).data('user-id');
        const user = userData.find(u => u._id === userId);
        if (user) openBanDialog(user);
      };

      const handleUnbanEvent = function(this: any, e: any) {
        e.preventDefault();
        const userId = $(this).data('user-id');
        handleBanUser(userId, 'unban');
      };

      const handleDeactivateEvent = function(this: any, e: any) {
        e.preventDefault();
        const userId = $(this).data('user-id');
        const user = userData.find(u => u._id === userId);
        if (user) openDeactivateDialog(user);
      };

      const handleActivateEvent = function(this: any, e: any) {
        e.preventDefault();
        const userId = $(this).data('user-id');
        handleStatusChange(userId, 'activate');
      };

      const handleViewEvent = function(this: any, e: any) {
        e.preventDefault();
        const userId = $(this).data('user-id');
        const user = userData.find(u => u._id === userId);
        if (user) {
          setSelectedUser(user);
          setIsEditDialogOpen(true);
        }
      };

      // Attach event handlers
      $(tableRef.current).off(); // Remove old handlers
      $(tableRef.current).on('change', '.role-select', handleRoleChangeEvent);
      $(tableRef.current).on('click', '.ban-btn', handleBanEvent);
      $(tableRef.current).on('click', '.unban-btn', handleUnbanEvent);
      $(tableRef.current).on('click', '.deactivate-btn', handleDeactivateEvent);
      $(tableRef.current).on('click', '.activate-btn', handleActivateEvent);
      $(tableRef.current).on('click', '.view-btn', handleViewEvent);
      
    } catch (error) {
      console.error('Error initializing DataTable:', error);
      toast.error('Failed to initialize table');
      setError('Failed to initialize data table. Please refresh the page.');
    }
  };

  useEffect(() => {
    // Check authentication
    if (!apiService.isAuthenticated()) {
      setError('You must be logged in to access this page');
      setLoading(false);
      return;
    }
    
    // Only load users if jQuery is ready
    if (jQueryReady) {
      loadUsers();
    }
    
    // Cleanup
    return () => {
      if (dataTableRef.current) {
        try {
          const $ = window.$;
          if ($ && tableRef.current) {
            $(tableRef.current).off(); // Remove event handlers
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

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setActionLoading(userId);
      await apiService.updateUserRole(userId, newRole);
      toast.success('User role updated successfully');
      await loadUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
      await loadUsers();
    } finally {
      setActionLoading(null);
    }
  };

  const handleBanUser = async (userId: string, action: 'ban' | 'unban', reason?: string) => {
    try {
      setActionLoading(userId);
      await apiService.banUser(userId, action, reason);
      toast.success(`User ${action}ned successfully`);
      await loadUsers();
      setBanDialogOpen(false);
      setActionReason('');
    } catch (error) {
      console.error(`Error ${action}ning user:`, error);
      toast.error(`Failed to ${action} user`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (userId: string, action: 'activate' | 'deactivate', reason?: string) => {
    try {
      setActionLoading(userId);
      await apiService.updateUserStatus(userId, action, reason);
      toast.success(`User ${action}d successfully`);
      await loadUsers();
      setDeactivateDialogOpen(false);
      setActionReason('');
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      toast.error(`Failed to ${action} user`);
    } finally {
      setActionLoading(null);
    }
  };

  const openBanDialog = (user: User) => {
    setActionUser(user);
    setBanDialogOpen(true);
    setActionReason('');
  };

  const openDeactivateDialog = (user: User) => {
    setActionUser(user);
    setDeactivateDialogOpen(true);
    setActionReason('');
  };

  // Show error state
  if (error && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">User Management</h2>
            <p className="text-muted-foreground">Manage user accounts, roles, and permissions</p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
        
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            User Management
          </h2>
          <p className="text-muted-foreground">Manage user accounts, roles, and permissions</p>
        </div>
        <Button onClick={loadUsers} disabled={loading} variant="outline">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <User className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => (u.isActive !== undefined ? u.isActive : u.is_active) && u.role !== 'banned').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Banned Users</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'banned').length}</p>
              </div>
              <Ban className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Staff Members</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role === 'moderator' || u.role === 'admin').length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DataTable */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No users found</p>
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
                    <th>User</th>
                    <th>Role</th>
                    <th>Stats</th>
                    <th>Status</th>
                    <th>Joined</th>
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

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" />
              Ban User
            </DialogTitle>
            <DialogDescription>
              Permanently ban {actionUser?.username} from the platform. This action will immediately revoke all access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ban-reason">Ban Reason *</Label>
              <Textarea
                id="ban-reason"
                placeholder="Enter detailed reason for banning this user..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => actionUser && handleBanUser(actionUser._id, 'ban', actionReason)}
              disabled={!actionReason.trim() || actionLoading === actionUser?._id}
            >
              {actionLoading === actionUser?._id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Ban className="w-4 h-4 mr-2" />
              )}
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Dialog */}
      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-orange-500" />
              Deactivate User
            </DialogTitle>
            <DialogDescription>
              Temporarily deactivate {actionUser?.username}'s account. They can be reactivated later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deactivate-reason">Deactivation Reason *</Label>
              <Textarea
                id="deactivate-reason"
                placeholder="Enter reason for deactivating this user..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => actionUser && handleStatusChange(actionUser._id, 'deactivate', actionReason)}
              disabled={!actionReason.trim() || actionLoading === actionUser?._id}
            >
              {actionLoading === actionUser?._id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <UserX className="w-4 h-4 mr-2" />
              )}
              Deactivate User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              User Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedUser.avatar_url} />
                  <AvatarFallback className="text-xl">
                    {selectedUser.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{selectedUser.username}</h3>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                  {selectedUser.roblox_username && (
                    <p className="text-blue-600">@{selectedUser.roblox_username}</p>
                  )}
                </div>
                <Badge>{selectedUser.role}</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Total Trades</Label>
                  <p className="text-2xl font-bold">{selectedUser.totalTrades || 0}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Total Vouches</Label>
                  <p className="text-2xl font-bold">{selectedUser.totalVouches || 0}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Member Since</Label>
                  <p className="font-semibold">
                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Last Active</Label>
                  <p className="font-semibold">
                    {selectedUser.lastActive 
                      ? new Date(selectedUser.lastActive).toLocaleDateString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>

              {(selectedUser.ban_reason || selectedUser.deactivation_reason) && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {selectedUser.ban_reason && (
                      <div>
                        <strong>Ban Reason:</strong> {selectedUser.ban_reason}
                      </div>
                    )}
                    {selectedUser.deactivation_reason && (
                      <div>
                        <strong>Deactivation Reason:</strong> {selectedUser.deactivation_reason}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}